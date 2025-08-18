import DeviceLog, { IDeviceLog } from "../models/deviceLog.model";
import Device from "../models/device.model";
import { AppError } from "../utils/errorHandler";

export const createDeviceLog = async (
  deviceId: number,
  ownerId: number,
  event: string,
  value: number
): Promise<IDeviceLog> => {
  const device = await Device.findOne({ id: deviceId, owner_id: ownerId });
  if (!device) throw new AppError("Device not found", 404);

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

  const logs = await DeviceLog.find({ device_id: deviceId })
    .sort({ timestamp: -1 })
    .limit(limit);

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
    startTime = new Date(0); // fallback: include all logs
  }

  const logs = await DeviceLog.find({
    device_id: deviceId,
    timestamp: { $gte: startTime },
    event: "units_consumed",
  });

  const totalUnits = logs.reduce((sum, log) => sum + log.value, 0);
  return totalUnits;
};
