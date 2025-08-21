// The module you're testing must import redisClient from here:
jest.mock("../../src/config/redis.config", () => ({
  redisClient: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

import { redisClient } from "../../src/config/redis.config"; // import after jest.mock
import { getFromCache, setToCache } from "../../src/utils/cache";

describe("Cache Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getFromCache", () => {
    it("should return parsed object when redisClient.get returns a value", async () => {
      const fakeData = { a: 1, b: 2 };
      (redisClient.get as jest.Mock).mockResolvedValue(
        JSON.stringify(fakeData)
      );

      const result = await getFromCache("testKey");
      expect(redisClient.get).toHaveBeenCalledWith("testKey");
      expect(result).toEqual(fakeData);
    });

    it("should return null when redisClient.get returns null", async () => {
      (redisClient.get as jest.Mock).mockResolvedValue(null);

      const result = await getFromCache("missingKey");
      expect(redisClient.get).toHaveBeenCalledWith("missingKey");
      expect(result).toBeNull();
    });
  });

  describe("setToCache", () => {
    it("should call redisClient.set with correct params", async () => {
      (redisClient.set as jest.Mock).mockResolvedValue("OK");

      const valueToCache = { x: 5 };
      await setToCache("key1", valueToCache, 60);

      expect(redisClient.set).toHaveBeenCalledWith(
        "key1",
        JSON.stringify(valueToCache),
        { EX: 60 }
      );
    });
  });
});
