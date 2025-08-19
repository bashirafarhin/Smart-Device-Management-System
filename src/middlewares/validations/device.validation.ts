import { check } from "express-validator";
import { Request, Response, NextFunction } from "express";
import { AppError } from "../../utils/errorHandler";

export const registerDeviceValidation = [
  check("name").notEmpty().withMessage("Device name is required"),
  check("type")
    .isIn(["light", "thermostat", "meter", "camera", "lock"])
    .withMessage("Invalid device type"),
  check("status")
    .optional()
    .isIn(["active", "inactive"])
    .withMessage("Invalid status"),
];

export const validateDeviceQuery = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { type, status } = req.query;

  const allowedTypes = ["light", "thermostat", "meter", "camera", "lock"];
  const allowedStatus = ["active", "inactive"];

  if (type && !allowedTypes.includes(type as string)) {
    return next(new AppError("Invalid device type", 400));
  }

  if (status && !allowedStatus.includes(status as string)) {
    return next(new AppError("Invalid device status", 400));
  }

  next();
};

export const validateDeviceUpdate = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { name, type, status } = req.body;
  const allowedTypes = ["light", "thermostat", "meter", "camera", "lock"];
  const allowedStatus = ["active", "inactive"];

  if (name !== undefined && name.trim() === "") {
    return next(new AppError("Device name cannot be empty", 400));
  }

  if (type !== undefined && !allowedTypes.includes(type)) {
    return next(new AppError("Invalid device type", 400));
  }

  if (status !== undefined && !allowedStatus.includes(status)) {
    return next(new AppError("Invalid device status", 400));
  }

  next();
};
