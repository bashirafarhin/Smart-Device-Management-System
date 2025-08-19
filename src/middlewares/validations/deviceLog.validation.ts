import { check, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";
import { AppError } from "../../utils/errorHandler";

export const validateLogEntry = [
  check("event").notEmpty().withMessage("Event is required"),
  check("value").isNumeric().withMessage("Value must be a number"),
  (req: Request, _res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0];
      return next(new AppError(firstError.msg, 400));
    }
    next();
  },
];
