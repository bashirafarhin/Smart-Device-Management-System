import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { AppError } from "./errorHandler";
dotenv.config();

export const generateToken = (payload: object) => {
  const JWT_SECRET = process.env.JWT_SECRET as string;
  if (!JWT_SECRET) {
    throw new AppError("JWT_SECRET is not defined", 500);
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });
};
