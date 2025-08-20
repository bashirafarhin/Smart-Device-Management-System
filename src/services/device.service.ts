import Device, { IDevice } from "../models/device.model";
import { AppError } from "../utils/errorHandler";
import { getFromCache, setToCache } from "../utils/cache";
import { redisClient } from "../config/redis.config";

export const createDevice = async (
  name: string,
  type: IDevice["type"],
  status: IDevice["status"],
  ownerId: number
) => {
  const device = await Device.create({
    name,
    type,
    status,
    owner_id: ownerId,
  });
  await invalidateDeviceListingCache(ownerId);
  return device;
};

export const getDevices = async (filters: any): Promise<IDevice[]> => {
  const cacheKey = `device-listing:userId=${filters.owner_id}:type=${
    filters.type || "all"
  }:status=${filters.status || "all"}`;
  // Try to read cached data
  const cachedDevices = await getFromCache<IDevice[]>(cacheKey);
  if (cachedDevices) {
    return cachedDevices;
  }
  const devices = await Device.find(filters).sort({ createdAt: -1 }).lean();
  // Store result in Redis cache, set TTL to 15 minutes (900 seconds)
  await setToCache(cacheKey, devices, 900);
  return devices;
};

export const updateDevice = async (
  deviceId: number,
  ownerId: number,
  updateData: Partial<IDevice>
): Promise<IDevice> => {
  const device = await Device.findOne({ id: deviceId, owner_id: ownerId });
  if (!device) throw new AppError("Device not found", 404);

  Object.assign(device, updateData);
  await device.save();
  await invalidateDeviceListingCache(ownerId);
  return device;
};

export const deleteDevice = async (deviceId: number, ownerId: number) => {
  const deletedDevice = await Device.findOneAndDelete({
    id: deviceId,
    owner_id: ownerId,
  });
  if (!deletedDevice) {
    throw new AppError("Device not found", 404);
  } else {
    await invalidateDeviceListingCache(ownerId);
  }
};

export const updateHeartbeat = async (
  deviceId: number,
  ownerId: number,
  status: "active" | "inactive"
) => {
  const device = await Device.findOne({ id: deviceId, owner_id: ownerId });
  if (!device) throw new AppError("Device not found", 404);
  device.status = status;
  device.last_active_at = new Date();
  await device.save();
  await invalidateDeviceListingCache(ownerId);
  return device.last_active_at!;
};

export const findInactiveDevices = async (cutoff: Date): Promise<number[]> => {
  const devices = await Device.find(
    { last_active_at: { $lt: cutoff }, status: "active" },
    { id: 1, _id: 0 }
  );
  return devices.map((d) => d.id);
};

export const deactivateDevice = async (deviceId: number) => {
  const device = await Device.findOne({ id: deviceId });
  if (device) {
    device.status = "inactive";
    await device.save();
  }
};

export const invalidateDeviceListingCache = async (ownerId: number) => {
  const pattern = `device-listing:userId=${ownerId}*`;
  const keys = await redisClient.keys(pattern);
  if (keys.length > 0) {
    await redisClient.del(keys);
  }
};
