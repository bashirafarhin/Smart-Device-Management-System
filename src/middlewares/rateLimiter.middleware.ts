import { NextFunction, Request, Response } from "express";
import { redisClient } from "../config/redis.config";
import { AuthRequest } from "./auth.middleware";

export interface RateLimiterRule {
  endpoint: string;
  rate_limit: {
    time: number; // duration in seconds
    limit: number; // max requests allowed within time
  };
}

export const rateLimiter = (rule: RateLimiterRule) => {
  const { endpoint, rate_limit } = rule;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Use user ID if authenticated, else IP address
      const identifier = (req as AuthRequest).user?.id || req.ip;
      const redisKey = `${endpoint}:${identifier}`;

      // Increment the number of requests for this key
      const requests = await redisClient.incr(redisKey);

      // If first request, set expiration to rate limit window
      if (requests === 1) {
        await redisClient.expire(redisKey, rate_limit.time);
      }

      // If request count exceeded limit, block request
      if (requests > rate_limit.limit) {
        const ttl = await redisClient.ttl(redisKey); // get seconds until reset
        res.setHeader("Retry-After", ttl.toString());
        return res.status(429).json({
          message: `Too many requests. Please try again in ${ttl} seconds.`,
        });
      }

      // Allow request
      next();
    } catch (error) {
      console.error("Rate limiter error:", error);
      // Optionally, allow on error or respond with 500
      next();
    }
  };
};
