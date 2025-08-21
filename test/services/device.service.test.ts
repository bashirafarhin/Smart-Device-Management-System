// test/services/device.service.test.ts

import {
  createDevice,
  getDevices,
  updateDevice,
  deleteDevice,
  updateHeartbeat,
  findInactiveDevices,
  deactivateDevice,
} from "../../src/services/device.service";

import Device from "../../src/models/device.model";
import { AppError } from "../../src/utils/errorHandler";
import * as cacheUtils from "../../src/utils/cache";
import { redisClient } from "../../src/config/redis.config";

jest.mock("../../src/models/device.model");
jest.mock("../../src/utils/cache");
jest.mock("../../src/config/redis.config");

describe("Device service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Redis methods
    (redisClient.keys as jest.Mock).mockResolvedValue([]);
    (redisClient.del as jest.Mock).mockResolvedValue(0);
  });

  describe("createDevice", () => {
    it("should create and return a device and invalidate cache", async () => {
      const fakeDevice = { id: 1, name: "Sensor", save: jest.fn() };
      (Device.create as jest.Mock).mockResolvedValue(fakeDevice);

      // Simulate keys returned for invalidation
      (redisClient.keys as jest.Mock).mockResolvedValue([
        "device-listing:userId=101:type=all:status=all",
      ]);
      (redisClient.del as jest.Mock).mockResolvedValue(1);

      const result = await createDevice("Sensor", "meter", "active", 101);

      expect(Device.create).toHaveBeenCalledWith({
        name: "Sensor",
        type: "meter",
        status: "active",
        owner_id: 101,
      });
      expect(redisClient.keys).toHaveBeenCalledWith(
        "device-listing:userId=101*"
      );
      expect(redisClient.del).toHaveBeenCalledWith([
        "device-listing:userId=101:type=all:status=all",
      ]);
      expect(result).toBe(fakeDevice);
    });
  });

  describe("getDevices", () => {
    it("should return cached devices if present", async () => {
      const cachedDevices = [{ id: 1 }, { id: 2 }];
      (cacheUtils.getFromCache as jest.Mock).mockResolvedValue(cachedDevices);

      const result = await getDevices({ owner_id: 101 });

      expect(cacheUtils.getFromCache).toHaveBeenCalled();
      expect(result).toEqual(cachedDevices);
      expect(Device.find).not.toHaveBeenCalled();
      expect(cacheUtils.setToCache).not.toHaveBeenCalled();
    });

    it("should find devices and set cache if no cached devices", async () => {
      (cacheUtils.getFromCache as jest.Mock).mockResolvedValue(null);
      (cacheUtils.setToCache as jest.Mock).mockResolvedValue(null);

      const leanMock = jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const sortMock = jest.fn().mockReturnValue({ lean: leanMock });

      (Device.find as jest.Mock).mockReturnValue({ sort: sortMock });

      const result = await getDevices({ owner_id: 101 });

      expect(Device.find).toHaveBeenCalledWith({ owner_id: 101 });
      expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
      expect(leanMock).toHaveBeenCalled();
      expect(cacheUtils.setToCache).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        900
      );
      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });
  });

  describe("updateDevice", () => {
    it("should throw error if device not found", async () => {
      (Device.findOne as jest.Mock).mockResolvedValue(null);

      await expect(updateDevice(1, 101, { name: "Updated" })).rejects.toThrow(
        AppError
      );
    });

    it("should update and save device, invalidate cache", async () => {
      const fakeDevice = {
        id: 1,
        name: "Old",
        save: jest.fn().mockResolvedValue(true),
      };
      (Device.findOne as jest.Mock).mockResolvedValue(fakeDevice);

      // Mock redis keys and del for cache invalidation
      (redisClient.keys as jest.Mock).mockResolvedValue(["somekey"]);
      (redisClient.del as jest.Mock).mockResolvedValue(1);

      const result = await updateDevice(1, 101, { name: "Updated" });

      expect(fakeDevice.name).toBe("Updated");
      expect(fakeDevice.save).toHaveBeenCalled();
      expect(redisClient.keys).toHaveBeenCalledWith(
        "device-listing:userId=101*"
      );
      expect(redisClient.del).toHaveBeenCalledWith(["somekey"]);

      expect(result).toBe(fakeDevice);
    });
  });

  describe("deleteDevice", () => {
    it("should throw error if device not found", async () => {
      (Device.findOneAndDelete as jest.Mock).mockResolvedValue(null);

      await expect(deleteDevice(1, 101)).rejects.toThrow(AppError);
    });

    it("should delete device if found and invalidate cache", async () => {
      const fakeDevice = { id: 1 };
      (Device.findOneAndDelete as jest.Mock).mockResolvedValue(fakeDevice);

      (redisClient.keys as jest.Mock).mockResolvedValue(["somekey"]);
      (redisClient.del as jest.Mock).mockResolvedValue(1);

      await deleteDevice(1, 101);

      expect(Device.findOneAndDelete).toHaveBeenCalledWith({
        id: 1,
        owner_id: 101,
      });
      expect(redisClient.keys).toHaveBeenCalledWith(
        "device-listing:userId=101*"
      );
      expect(redisClient.del).toHaveBeenCalledWith(["somekey"]);
    });
  });

  describe("updateHeartbeat", () => {
    it("should throw error if device not found", async () => {
      (Device.findOne as jest.Mock).mockResolvedValue(null);
      await expect(updateHeartbeat(1, 101, "active")).rejects.toThrow(AppError);
    });

    it("should update status, last_active_at and invalidate cache", async () => {
      const fakeDevice = {
        id: 1,
        status: "inactive",
        last_active_at: null,
        save: jest.fn().mockResolvedValue(true),
      };
      (Device.findOne as jest.Mock).mockResolvedValue(fakeDevice);

      (redisClient.keys as jest.Mock).mockResolvedValue(["somekey"]);
      (redisClient.del as jest.Mock).mockResolvedValue(1);

      const result = await updateHeartbeat(1, 101, "active");

      expect(fakeDevice.status).toBe("active");
      expect(fakeDevice.last_active_at).toBeInstanceOf(Date);
      expect(fakeDevice.save).toHaveBeenCalled();

      expect(redisClient.keys).toHaveBeenCalledWith(
        "device-listing:userId=101*"
      );
      expect(redisClient.del).toHaveBeenCalledWith(["somekey"]);
      expect(result).toBe(fakeDevice.last_active_at);
    });
  });

  describe("findInactiveDevices", () => {
    it("should return IDs of inactive devices", async () => {
      const fakeDevices = [{ id: 1 }, { id: 2 }];
      (Device.find as jest.Mock).mockResolvedValue(fakeDevices);

      const cutoff = new Date();
      const result = await findInactiveDevices(cutoff);

      expect(Device.find).toHaveBeenCalledWith(
        { last_active_at: { $lt: cutoff }, status: "active" },
        { id: 1, _id: 0 }
      );
      expect(result).toEqual([1, 2]);
    });
  });

  describe("deactivateDevice", () => {
    it("should do nothing if device not found", async () => {
      (Device.findOne as jest.Mock).mockResolvedValue(null);

      await deactivateDevice(1);

      expect(Device.findOne).toHaveBeenCalledWith({ id: 1 });
    });

    it("should set status to inactive and save if device exists", async () => {
      const fakeDevice = {
        id: 1,
        status: "active",
        save: jest.fn().mockResolvedValue(true),
      };
      (Device.findOne as jest.Mock).mockResolvedValue(fakeDevice);

      await deactivateDevice(1);

      expect(fakeDevice.status).toBe("inactive");
      expect(fakeDevice.save).toHaveBeenCalled();
    });
  });
});
