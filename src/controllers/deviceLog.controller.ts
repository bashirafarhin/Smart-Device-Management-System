import type { Request, Response, NextFunction } from "express";
import * as deviceLogService from "../services/deviceLog.service";
import { AppError } from "../utils/errorHandler";
import { AuthRequest } from "../middlewares/auth.middleware";

export const createLog = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const deviceId = Number(req.params.id.replace("d", ""));
    if (!req.user) throw new AppError("Unauthorized", 401);

    const { event, value } = req.body;

    const log = await deviceLogService.createDeviceLog(
      deviceId,
      req.user.id,
      event,
      value
    );

    res.status(201).json({
      success: true,
      log: {
        id: "l" + log.id,
        device_id: "d" + log.device_id,
        event: log.event,
        value: log.value,
        timestamp: log.timestamp,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getDeviceLogs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const deviceId = Number(req.params.id.replace("d", ""));
    const limit = Number(req.query.limit) || 10;

    const logs = await deviceLogService.fetchDeviceLogs(
      deviceId,
      req.user.id,
      limit
    );

    res.status(200).json({
      success: true,
      logs: logs.map((log) => ({
        id: "l" + log.id,
        event: log.event,
        value: log.value,
        timestamp: log.timestamp,
      })),
    });
  } catch (err) {
    next(err);
  }
};

export const getDeviceUsage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const deviceId = Number(req.params.id.replace("d", ""));
    const range = req.query.range?.toString() || "24h";

    const totalUnits = await deviceLogService.calculateDeviceUsage(
      deviceId,
      req.user.id,
      range
    );

    res.status(200).json({
      success: true,
      device_id: "d" + deviceId,
      total_units_last_24h: totalUnits,
    });
  } catch (err) {
    next(err);
  }
};
