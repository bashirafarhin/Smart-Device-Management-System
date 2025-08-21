import {
  rateLimiter,
  RateLimiterRule,
} from "../../src/middlewares/rateLimiter.middleware";
import { redisClient } from "../../src/config/redis.config";

jest.mock("../../src/config/redis.config", () => ({
  redisClient: {
    incr: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
  },
}));

const mockedRedis = redisClient as jest.Mocked<typeof redisClient>;

describe("rateLimiter middleware", () => {
  let req: any;
  let res: any;
  let next: jest.Mock;

  const endpoint = "/api/test";
  const rule: RateLimiterRule = {
    endpoint,
    rate_limit: {
      time: 10,
      limit: 3,
    },
  };

  beforeEach(() => {
    req = {
      ip: "127.0.0.1",
      // user may or may not be present
      // for testing both scenarios
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };
    next = jest.fn();

    jest.clearAllMocks();
  });

  it("should allow request if under rate limit and no authenticated user", async () => {
    mockedRedis.incr.mockResolvedValue(1);
    mockedRedis.expire.mockResolvedValue(1);

    const middleware = rateLimiter(rule);
    await middleware(req, res, next);

    expect(mockedRedis.incr).toHaveBeenCalledWith(`${endpoint}:${req.ip}`);
    expect(mockedRedis.expire).toHaveBeenCalledWith(
      `${endpoint}:${req.ip}`,
      rule.rate_limit.time
    );
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should allow request if under rate limit with authenticated user", async () => {
    req.user = { id: "user1" };
    mockedRedis.incr.mockResolvedValue(2);
    mockedRedis.expire.mockResolvedValue(1);

    const middleware = rateLimiter(rule);
    await middleware(req, res, next);

    expect(mockedRedis.incr).toHaveBeenCalledWith(`${endpoint}:user1`);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should block request with 429 if rate limit exceeded", async () => {
    req.user = { id: "user1" };
    mockedRedis.incr.mockResolvedValue(4);
    mockedRedis.ttl.mockResolvedValue(5);

    const middleware = rateLimiter(rule);
    await middleware(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith("Retry-After", "5");
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      message: "Too many requests. Please try again in 5 seconds.",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should allow request if redis error occurs", async () => {
    mockedRedis.incr.mockRejectedValue(new Error("redis error"));

    const middleware = rateLimiter(rule);
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    // No error response sent, request allowed through
  });

  it("should not set expire if request count not 1", async () => {
    mockedRedis.incr.mockResolvedValue(2);

    const middleware = rateLimiter(rule);
    await middleware(req, res, next);

    expect(mockedRedis.expire).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});
