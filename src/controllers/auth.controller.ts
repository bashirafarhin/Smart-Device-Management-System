import { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.service";

export const signup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, password, role } = req.body;
    const result = await authService.registerUser({
      name,
      email,
      password,
      role,
    });
    return res.status(201).json({ success: true, message: result.message });
  } catch (err) {
    next(err);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
