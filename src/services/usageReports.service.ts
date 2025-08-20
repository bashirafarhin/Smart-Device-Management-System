import Device from "../models/device.model";
import DeviceLog from "../models/deviceLog.model";

interface UsageReport {
  labels: string[];
  datasets: { label: string; data: number[] }[];
}

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
