import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { AppError } from "./errorHandler";
import crypto from "crypto";
dotenv.config();

export const generateAccessToken = (payload: object) => {
  const accessJti = crypto.randomBytes(16).toString("hex");
  const secret = process.env.ACCESS_TOKEN_SECRET as string;
  if (!secret) throw new AppError("ACCESS_TOKEN_SECRET not set", 500);
  return jwt.sign({ ...payload, jti: accessJti }, secret, { expiresIn: "15m" });
};

export const generateRefreshToken = (payload: object) => {
  const refreshJti = crypto.randomBytes(16).toString("hex");
  const secret = process.env.REFRESH_TOKEN_SECRET as string;
  if (!secret) throw new AppError("REFRESH_TOKEN_SECRET not set", 500);
  return jwt.sign({ ...payload, jti: refreshJti }, secret, { expiresIn: "7d" });
};
