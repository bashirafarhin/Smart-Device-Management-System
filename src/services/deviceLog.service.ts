import DeviceLog, { IDeviceLog } from "../models/deviceLog.model";
import Device from "../models/device.model";
import { AppError } from "../utils/errorHandler";
import { getFromCache, setToCache } from "../utils/cache";
import { redisClient } from "../config/redis.config";
import { inngest } from "../backgroundJobs/inngest/index";
import { v4 as uuidv4 } from "uuid";
import Job from "../models/job.model";

interface ExportJobParams {
  userId: string;
  deviceId: string;
  startDate: string;
  endDate: string;
  format: string;
}

interface UsageReport {
  labels: string[];
  datasets: { label: string; data: number[] }[];
}

export const createDeviceLog = async (
  deviceId: number,
  ownerId: number,
  event: string,
  value: number
): Promise<IDeviceLog> => {
  const device = await Device.findOne({ id: deviceId, owner_id: ownerId });
  if (!device) throw new AppError("Device not found", 404);
  await invalidateDeviceLogCache(ownerId, deviceId);
  const log = await DeviceLog.create({ device_id: deviceId, event, value });
  return log;
};

export const fetchDeviceLogs = async (
  deviceId: number,
  ownerId: number,
  limit: number
): Promise<IDeviceLog[]> => {
  const device = await Device.findOne({ id: deviceId, owner_id: ownerId });
  if (!device) throw new AppError("Device not found", 404);

  const cacheKey = `device-logs:userId=${ownerId}:deviceId=${deviceId}:limit=${limit}`;
  const cachedLogs = await getFromCache<IDeviceLog[]>(cacheKey);
  if (cachedLogs) {
    return cachedLogs;
  }

  const logs = await DeviceLog.find({ device_id: deviceId })
    .sort({ timestamp: -1 })
    .limit(limit);

  await setToCache(cacheKey, logs, 300);

  return logs;
};

export const calculateDeviceUsage = async (
  deviceId: number,
  ownerId: number,
  range: string
): Promise<number> => {
  const device = await Device.findOne({ id: deviceId, owner_id: ownerId });
  if (!device) throw new AppError("Device not found", 404);

  let startTime = new Date();
  if (range.endsWith("h")) {
    const hours = parseInt(range.replace("h", ""), 10);
    startTime.setHours(startTime.getHours() - hours);
  } else {
    startTime = new Date(0);
  }

  const logs = await DeviceLog.find({
    device_id: deviceId,
    timestamp: { $gte: startTime },
    event: "units_consumed",
  });

  const totalUnits = logs.reduce((sum, log) => sum + log.value, 0);
  return totalUnits;
};

export const invalidateDeviceLogCache = async (
  ownerId: number,
  deviceId: number
) => {
  const pattern = `device-logs:userId=${ownerId}:deviceId=${deviceId}:*`;
  const keys = await redisClient.keys(pattern);
  if (keys.length > 0) {
    await redisClient.del(keys);
  }
};

export const fetchDeviceLogsByDateRangeType = async (
  deviceId: number,
  ownerId: number,
  startDate: Date,
  endDate: Date
): Promise<IDeviceLog[]> => {
  const device = await Device.findOne({ id: deviceId, owner_id: ownerId });
  if (!device) throw new AppError("Device not found", 404);

  const logs = await DeviceLog.find({
    device_id: deviceId,
    timestamp: { $gte: startDate, $lte: endDate },
  })
    .sort({ timestamp: -1 })
    .lean();

  return logs;
};

export const fetchUserDeviceIds = async (
  ownerId: number
): Promise<number[]> => {
  const devices = await Device.find({ owner_id: ownerId }, { id: 1 });
  return devices.map((d) => d.id);
};

/**
 * Generate the MongoDB group _id object based on groupBy option.
 */
export const getGroupId = (groupBy: "day" | "hour") => {
  if (groupBy === "hour") {
    return {
      year: { $year: "$timestamp" },
      month: { $month: "$timestamp" },
      day: { $dayOfMonth: "$timestamp" },
      hour: { $hour: "$timestamp" },
    };
  }
  return {
    year: { $year: "$timestamp" },
    month: { $month: "$timestamp" },
    day: { $dayOfMonth: "$timestamp" },
  };
};

/**
 * Aggregate device logs usage across multiple devices.
 */
export const aggregateDeviceUsage = async (
  deviceIds: number[],
  startDate: Date,
  endDate: Date,
  groupBy: "day" | "hour"
): Promise<{ _id: any; totalUnits: number }[]> => {
  if (deviceIds.length === 0) return [];

  return await DeviceLog.aggregate([
    {
      $match: {
        device_id: { $in: deviceIds },
        timestamp: { $gte: startDate, $lte: endDate },
        event: "units_consumed",
      },
    },
    {
      $group: {
        _id: getGroupId(groupBy),
        totalUnits: { $sum: "$value" },
      },
    },
    {
      $sort: {
        "_id.year": 1,
        "_id.month": 1,
        "_id.day": 1,
        ...(groupBy === "hour" ? { "_id.hour": 1 } : {}),
      },
    },
  ]);
};

/**
 * Format aggregation output to labels and datasets for charts.
 */
export const formatUsageReport = (
  aggregationResults: { _id: any; totalUnits: number }[],
  groupBy: "day" | "hour"
): UsageReport => {
  const labels: string[] = [];
  const data: number[] = [];

  aggregationResults.forEach((item) => {
    const { year, month, day, hour } = item._id;
    let label = `${year}-${String(month).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
    if (groupBy === "hour") {
      label += ` ${String(hour).padStart(2, "0")}:00`;
    }
    labels.push(label);
    data.push(item.totalUnits);
  });

  return {
    labels,
    datasets: [
      {
        label: "units_consumed",
        data,
      },
    ],
  };
};

/**
 * Main service function to generate usage report.
 */
export const generateUsageReportForUser = async (
  ownerId: number,
  startDate: Date,
  endDate: Date,
  groupBy: "day" | "hour" = "day"
): Promise<UsageReport> => {
  const deviceIds = await fetchUserDeviceIds(ownerId);

  if (deviceIds.length === 0) {
    return { labels: [], datasets: [{ label: "units_consumed", data: [] }] };
  }

  const aggregationResults = await aggregateDeviceUsage(
    deviceIds,
    startDate,
    endDate,
    groupBy
  );
  return formatUsageReport(aggregationResults, groupBy);
};

/**
 * Create job record in DB and send event to Inngest for async processing.
 */
export const createExportJob = async (
  params: ExportJobParams
): Promise<string> => {
  const jobId = uuidv4();

  // Save job in DB with status "accepted"
  await Job.create({
    jobId,
    userId: params.userId,
    deviceId: params.deviceId,
    startDate: params.startDate,
    endDate: params.endDate,
    format: params.format,
    status: "accepted",
    createdAt: new Date(),
  });

  // Send event to Inngest to trigger async export processing
  await inngest.send({
    name: "export/large",
    data: {
      ...params,
      jobId,
    },
  });

  return jobId;
};

/**
 * Fetch job status and info from DB for status API.
 */
export const fetchJobStatus = async (jobId: string) => {
  return Job.findOne({ jobId }).lean().exec();
};
