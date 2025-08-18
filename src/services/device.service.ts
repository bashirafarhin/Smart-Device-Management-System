import Device, { IDevice } from "../models/device.model";
import { AppError } from "../utils/errorHandler";

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

  return device;
};

export const getDevices = async (filters: any): Promise<IDevice[]> => {
  return Device.find(filters).sort({ createdAt: -1 });
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
  return device;
};

export const deleteDevice = async (deviceId: number, ownerId: number) => {
  const deletedDevice = await Device.findOneAndDelete({
    id: deviceId,
    owner_id: ownerId,
  });
  if (!deletedDevice) throw new AppError("Device not found", 404);
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
  return device.last_active_at!;
};
