import { Request, Response, NextFunction } from "express";
import { check, validationResult } from "express-validator";
import { AppError } from "../utils/errorHandler";
import jwt from "jsonwebtoken";

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

interface JwtPayload {
  id: number;
  email: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const authMiddleware = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("Unauthorized: No token provided", 401));
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err) {
    return next(new AppError("Unauthorized: Invalid token", 401));
  }
};
