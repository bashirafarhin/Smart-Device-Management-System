import { createClient } from "redis";

export const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));
redisClient.on("ready", () => console.log("✅ Redis connected successfully"));

export async function connectRedis() {
  await redisClient.connect();
}
