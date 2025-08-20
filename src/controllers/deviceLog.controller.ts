import type { Request, Response, NextFunction } from "express";
import * as deviceLogService from "../services/deviceLog.service";
import { AppError } from "../utils/errorHandler";
import { AuthRequest } from "../middlewares/auth.middleware";
import { Parser as Json2csvParser } from "json2csv";

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

export const exportDeviceLogs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const deviceId = Number(req.params.id.replace("d", ""));
    const ownerId = req.user.id; // assuming userId from auth middleware
    const { startDate, endDate, format } = req.query;

    // Validate date query parameters
    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "startDate and endDate query parameters required" });
    }

    // Fetch logs filtered by date range
    const logs = await deviceLogService.fetchDeviceLogsByDateRangeType(
      deviceId,
      ownerId,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    if (format === "csv") {
      const fields = ["id", "device_id", "event", "value", "timestamp"];
      const json2csvParser = new Json2csvParser({ fields });
      const csv = json2csvParser.parse(logs);

      res.header("Content-Type", "text/csv");
      res.attachment(`device_logs_${deviceId}_${startDate}_to_${endDate}.csv`);
      res.send(csv);
    } else {
      res.json(logs);
    }
  } catch (error) {
    next(error);
  }
};

export const submitLargeExportJob = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { deviceId, startDate, endDate, format } = req.body;

  try {
    const jobId = await deviceLogService.createExportJob({
      userId,
      deviceId,
      startDate,
      endDate,
      format,
    });

    res.status(202).json({ jobId });
  } catch (error) {
    console.error("Failed to submit export job:", error);
    res.status(500).json({ message: "Failed to submit export job" });
  }
};

export const getJobStatus = async (req: Request, res: Response) => {
  const { jobId } = req.params;

  try {
    const job = await deviceLogService.fetchJobStatus(jobId);
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json(job);
  } catch (error) {
    console.error("Failed to fetch job status:", error);
    res.status(500).json({ message: "Failed to fetch job status" });
  }
};
