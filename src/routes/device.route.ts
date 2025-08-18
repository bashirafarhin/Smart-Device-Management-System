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
} from "../middlewares/device.middleware";
import { validateRequest } from "../utils/validateRequest";

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

export default router;
