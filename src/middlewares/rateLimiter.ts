import { Response, NextFunction } from "express";
import { redisClient } from "../config/redis";
import { AuthRequest } from "./auth.middleware";

const WINDOW_SIZE_IN_SECONDS = 60; // 1 minute
const MAX_REQUESTS = 10;

export const rateLimiter = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const identifier = req.user?.id || req.ip; // per user ID if logged in, else per IP
    const key = `rate-limit:${identifier}`;

    const current = await redisClient.get(key);

    if (current && parseInt(current) >= MAX_REQUESTS) {
      return res
        .status(429)
        .json({ message: "Too many requests. Try again later." });
    }

    const tx = redisClient.multi();

    if (!current) {
      tx.set(key, "1", { EX: WINDOW_SIZE_IN_SECONDS });
    } else {
      tx.incr(key);
    }

    await tx.exec();
    next();
  } catch (err) {
    console.error("Rate limiter error:", err);
    next();
  }
};
