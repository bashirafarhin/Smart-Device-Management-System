import { Request, Response, NextFunction } from "express";
import * as deviceService from "../services/device.service";
import { AuthRequest } from "../middlewares/auth.middleware";
import { AppError } from "../utils/errorHandler";

export const registerDevice = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, type, status } = req.body;

    if (!req.user) {
      return next(new AppError("Unauthorized", 401));
    }

    const device = await deviceService.createDevice(
      name,
      type,
      status,
      req.user.id
    );

    res.status(201).json({
      success: true,
      device: {
        id: "d" + device.id,
        name: device.name,
        type: device.type,
        status: device.status,
        last_active_at: device.last_active_at,
        owner_id: "u" + device.owner_id,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getDevices = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) return next(new AppError("Unauthorized", 401));

    const { type, status } = req.query;
    const filters: any = { owner_id: req.user.id };
    if (type) filters.type = type;
    if (status) filters.status = status;

    const devices = await deviceService.getDevices(filters);

    res.status(200).json({
      success: true,
      devices: devices.map((device) => ({
        id: "d" + device.id,
        name: device.name,
        type: device.type,
        status: device.status,
        last_active_at: device.last_active_at,
        owner_id: "u" + device.owner_id,
      })),
    });
  } catch (err) {
    next(err);
  }
};

export const updateDevice = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) return next(new AppError("Unauthorized", 401));

    const deviceId = Number(req.params.id.trim().replace("d", ""));
    const updateData = req.body;
    const updatedDevice = await deviceService.updateDevice(
      deviceId,
      req.user.id,
      updateData
    );

    res.status(200).json({
      success: true,
      device: {
        id: "d" + updatedDevice.id,
        name: updatedDevice.name,
        type: updatedDevice.type,
        status: updatedDevice.status,
        last_active_at: updatedDevice.last_active_at,
        owner_id: "u" + updatedDevice.owner_id,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteDevice = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) return next(new AppError("Unauthorized", 401));

    const deviceId = Number(req.params.id.replace("d", ""));
    await deviceService.deleteDevice(deviceId, req.user.id);

    res
      .status(200)
      .json({ success: true, message: "Device removed successfully" });
  } catch (err) {
    next(err);
  }
};

export const recordHeartbeat = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) return next(new AppError("Unauthorized", 401));

    const deviceId = Number(req.params.id.replace("d", ""));
    const { status } = req.body;

    const lastActiveAt = await deviceService.updateHeartbeat(
      deviceId,
      req.user.id,
      status
    );

    res.status(200).json({
      success: true,
      message: "Device heartbeat recorded",
      last_active_at: lastActiveAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
};
