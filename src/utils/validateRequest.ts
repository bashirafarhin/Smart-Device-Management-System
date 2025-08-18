import { validationResult } from "express-validator";
import { AppError } from "./errorHandler";
import type { Request, Response, NextFunction } from "express";

export const validateRequest = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    return next(new AppError(firstError.msg, 400));
  }
  next();
};
