import { redisClient } from "../config/redis.config";

export async function getFromCache<T>(key: string): Promise<T | null> {
  const cached = await redisClient.get(key);
  if (!cached) return null;
  return JSON.parse(cached) as T;
}

export async function setToCache<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  await redisClient.set(key, JSON.stringify(value), {
    EX: ttlSeconds,
  });
}
