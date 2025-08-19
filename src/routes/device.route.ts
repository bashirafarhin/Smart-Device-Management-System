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
} from "../controllers/deviceLog.controller";
import { validateLogEntry } from "../middlewares/validations/deviceLog.validation";

const router = Router();

router.post(
  "/",
  authMiddleware,
  registerDeviceValidation,
  validateRequest,
  registerDevice
);

router.get("/", authMiddleware, validateDeviceQuery, getDevices);
router.patch("/:id", authMiddleware, validateDeviceUpdate, updateDevice);
router.delete("/:id", authMiddleware, deleteDevice);
router.post("/:id/heartbeat", authMiddleware, recordHeartbeat);

// device Logs routes
router.post("/:id/logs", authMiddleware, validateLogEntry, createLog);
router.get("/:id/logs", authMiddleware, getDeviceLogs);
router.get("/:id/usage", authMiddleware, getDeviceUsage);

export default router;
