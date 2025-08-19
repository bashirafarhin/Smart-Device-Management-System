import { Request, Response, NextFunction } from "express";
import { check, validationResult } from "express-validator";
import { AppError } from "../../utils/errorHandler";

export const validateSignup = [
  check("name").isLength({ min: 2 }).withMessage("Name is required"),
  check("email").isEmail().withMessage("Valid email is required"),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map((err) => err.msg);
      return next(new AppError(errorMessages.join(", "), 400));
    }
    next();
  },
];

export const validatePassword = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const password = req.body.password;
  const errors: string[] = [];
  if (password.length < 6)
    errors.push("Password must be at least 6 characters long");
  if (!/[A-Z]/.test(password))
    errors.push("Password must include at least one uppercase letter");
  if (!/[a-z]/.test(password))
    errors.push("Password must include at least one lowercase letter");
  if (!/[0-9]/.test(password))
    errors.push("Password must include at least one number");
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password))
    errors.push("Password must include at least one special character");

  if (errors.length > 0) {
    return next(new AppError(errors.join(", "), 400));
  }

  next();
};

export const validateRole = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const role = req.body.role;
  if (!["user"].includes(role)) {
    return next(new AppError("Role must be user", 400));
  }
  next();
};
