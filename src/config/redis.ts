import { createClient } from "redis";

export const redisClient = createClient({
  url: "redis://default:HT4yXdt5NzVYV7aJuxaVqNU9zvpNUrYO@redis-19483.crce182.ap-south-1-1.ec2.redns.redis-cloud.com:19483",
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));
redisClient.on("ready", () => console.log("✅ Redis connected successfully"));

export async function connectRedis() {
  await redisClient.connect();
}
