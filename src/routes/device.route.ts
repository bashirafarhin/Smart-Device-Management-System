import { Router } from "express";
import {
  getDevices,
  registerDevice,
  updateDevice,
  deleteDevice,
  recordHeartbeat,
} from "../controllers/device.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  registerDeviceValidation,
  validateDeviceQuery,
  validateDeviceUpdate,
} from "../middlewares/validations/device.validation";
import { validateRequest } from "../utils/validateRequest";

// import for device logs
import {
  createLog,
  getDeviceLogs,
  getDeviceUsage,
  exportDeviceLogs,
  submitLargeExportJob,
  getJobStatus,
} from "../controllers/deviceLog.controller";
import { validateLogEntry } from "../middlewares/validations/deviceLog.validation";
import { rateLimiter } from "../middlewares/rateLimiter";

const router = Router();

const deviceRateLimiter = rateLimiter({
  endpoint: "device",
  rate_limit: { time: 1 * 60, limit: 10 }, // 10 requests per 1 minutes
});

router.post(
  "/",
  authMiddleware,
  registerDeviceValidation,
  validateRequest,
  registerDevice
);

router.get(
  "/",
  authMiddleware,
  deviceRateLimiter,
  validateDeviceQuery,
  getDevices
);
router.patch(
  "/:id",
  authMiddleware,
  deviceRateLimiter,
  validateDeviceUpdate,
  updateDevice
);
router.delete("/:id", authMiddleware, deviceRateLimiter, deleteDevice);
router.post(
  "/:id/heartbeat",
  authMiddleware,
  deviceRateLimiter,
  recordHeartbeat
);

// device Logs routes
router.post(
  "/:id/logs",
  authMiddleware,
  deviceRateLimiter,
  validateLogEntry,
  createLog
);
router.get("/:id/logs", authMiddleware, deviceRateLimiter, getDeviceLogs);
router.get("/:id/usage", authMiddleware, deviceRateLimiter, getDeviceUsage);

// data exports for smaller range
router.get(
  "/:id/logs/export",
  authMiddleware,
  deviceRateLimiter,
  exportDeviceLogs
);

// data exports for large range
router.post("/exports/large", authMiddleware, submitLargeExportJob);
router.get("/exports/large/:jobId/status", authMiddleware, getJobStatus);

export default router;
