import DeviceLog from "../../src/models/deviceLog.model";
import Device from "../../src/models/device.model";
import Job from "../../src/models/job.model";
import { redisClient } from "../../src/config/redis.config";
import { inngest } from "../../src/backgroundJobs/inngest/index";
import { v4 as uuidv4 } from "uuid";
import * as cacheUtils from "../../src/utils/cache";
import {
  createDeviceLog,
  fetchDeviceLogs,
  calculateDeviceUsage,
  invalidateDeviceLogCache,
  fetchDeviceLogsByDateRangeType,
  fetchUserDeviceIds,
  getGroupId,
  aggregateDeviceUsage,
  formatUsageReport,
  generateUsageReportForUser,
  createExportJob,
  fetchJobStatus,
} from "../../src/services/deviceLog.service";
import { AppError } from "../../src/utils/errorHandler";

jest.mock("../../src/models/deviceLog.model");
jest.mock("../../src/models/device.model");
jest.mock("../../src/models/job.model");
jest.mock("../../src/config/redis.config");
jest.mock("../../src/backgroundJobs/inngest/index");
jest.mock("uuid");
jest.mock("../../src/utils/cache");

describe("DeviceLog service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (redisClient.keys as jest.Mock).mockResolvedValue([]);
    (redisClient.del as jest.Mock).mockResolvedValue(0);
  });

  describe("createDeviceLog", () => {
    it("should create device log after invalidating cache", async () => {
      (Device.findOne as jest.Mock).mockResolvedValue({ id: 1 });
      (cacheUtils.getFromCache as jest.Mock).mockResolvedValue(null);
      (DeviceLog.create as jest.Mock).mockResolvedValue({
        device_id: 1,
        event: "on",
        value: 10,
      });
      (redisClient.keys as jest.Mock).mockResolvedValue(["cachekey1"]);
      (redisClient.del as jest.Mock).mockResolvedValue(1);

      const result = await createDeviceLog(1, 10, "on", 100);

      expect(Device.findOne).toHaveBeenCalledWith({ id: 1, owner_id: 10 });
      expect(redisClient.keys).toHaveBeenCalled();
      expect(redisClient.del).toHaveBeenCalled();
      expect(DeviceLog.create).toHaveBeenCalledWith({
        device_id: 1,
        event: "on",
        value: 100,
      });
      expect(result).toEqual({ device_id: 1, event: "on", value: 10 });
    });

    it("throws AppError if device not found", async () => {
      (Device.findOne as jest.Mock).mockResolvedValue(null);
      await expect(createDeviceLog(1, 10, "on", 100)).rejects.toThrow(AppError);
    });
  });

  describe("fetchDeviceLogs", () => {
    it("should return cached logs if present", async () => {
      const cached = [{ value: 1 }];
      (Device.findOne as jest.Mock).mockResolvedValue({ id: 1 });
      (cacheUtils.getFromCache as jest.Mock).mockResolvedValue(cached);

      const result = await fetchDeviceLogs(1, 10, 5);

      expect(result).toBe(cached);
      expect(cacheUtils.getFromCache).toHaveBeenCalled();
      expect(DeviceLog.find).not.toHaveBeenCalled();
      expect(cacheUtils.setToCache).not.toHaveBeenCalled();
    });

    it("should fetch logs and cache if cache miss", async () => {
      (Device.findOne as jest.Mock).mockResolvedValue({ id: 1 });
      (cacheUtils.getFromCache as jest.Mock).mockResolvedValue(null);

      const limitMock = jest.fn().mockResolvedValue([{ value: 1 }]);
      const sortMock = jest.fn().mockReturnValue({ limit: limitMock });
      (DeviceLog.find as jest.Mock).mockReturnValue({ sort: sortMock });
      (cacheUtils.setToCache as jest.Mock).mockResolvedValue(null);

      const result = await fetchDeviceLogs(1, 10, 5);

      expect(DeviceLog.find).toHaveBeenCalledWith({ device_id: 1 });
      expect(sortMock).toHaveBeenCalledWith({ timestamp: -1 });
      expect(limitMock).toHaveBeenCalledWith(5);

      expect(cacheUtils.setToCache).toHaveBeenCalled();
      expect(result).toEqual([{ value: 1 }]);
    });

    it("throws error if device not found", async () => {
      (Device.findOne as jest.Mock).mockResolvedValue(null);
      await expect(fetchDeviceLogs(1, 10, 5)).rejects.toThrow(AppError);
    });
  });

  describe("calculateDeviceUsage", () => {
    it("calculates sum of units_consumed within range (hours)", async () => {
      (Device.findOne as jest.Mock).mockResolvedValue({ id: 1 });
      (DeviceLog.find as jest.Mock).mockResolvedValue([
        { value: 4 },
        { value: 6 },
      ]);

      const totalUnits = await calculateDeviceUsage(1, 10, "5h");

      expect(DeviceLog.find).toHaveBeenCalled();
      expect(totalUnits).toBe(10);
    });

    it("calculates sum when range is full", async () => {
      (Device.findOne as jest.Mock).mockResolvedValue({ id: 1 });
      (DeviceLog.find as jest.Mock).mockResolvedValue([
        { value: 4 },
        { value: 6 },
      ]);

      const totalUnits = await calculateDeviceUsage(1, 10, "all");

      expect(totalUnits).toBe(10);
    });

    it("throws error if device not found", async () => {
      (Device.findOne as jest.Mock).mockResolvedValue(null);
      await expect(calculateDeviceUsage(1, 10, "5h")).rejects.toThrow(AppError);
    });
  });

  describe("invalidateDeviceLogCache", () => {
    it("should call redisClient.del if keys found", async () => {
      (redisClient.keys as jest.Mock).mockResolvedValue(["key1", "key2"]);
      await invalidateDeviceLogCache(10, 1);
      expect(redisClient.del).toHaveBeenCalledWith(["key1", "key2"]);
    });

    it("should not call redisClient.del if no keys found", async () => {
      (redisClient.keys as jest.Mock).mockResolvedValue([]);
      await invalidateDeviceLogCache(10, 1);
      expect(redisClient.del).not.toHaveBeenCalled();
    });
  });

  describe("fetchDeviceLogsByDateRangeType", () => {
    it("should return logs sorted and leaned", async () => {
      (Device.findOne as jest.Mock).mockResolvedValue({ id: 1 });

      const leanMock = jest.fn().mockResolvedValue([{ value: 1 }]);
      const sortMock = jest.fn().mockReturnValue({ lean: leanMock });
      (DeviceLog.find as jest.Mock).mockReturnValue({ sort: sortMock });

      const result = await fetchDeviceLogsByDateRangeType(
        1,
        10,
        new Date(),
        new Date()
      );

      expect(DeviceLog.find).toHaveBeenCalled();
      expect(sortMock).toHaveBeenCalledWith({ timestamp: -1 });
      expect(leanMock).toHaveBeenCalled();
      expect(result).toEqual([{ value: 1 }]);
    });

    it("throws error if device not found", async () => {
      (Device.findOne as jest.Mock).mockResolvedValue(null);
      await expect(
        fetchDeviceLogsByDateRangeType(1, 10, new Date(), new Date())
      ).rejects.toThrow(AppError);
    });
  });

  describe("fetchUserDeviceIds", () => {
    it("should return device ids", async () => {
      (Device.find as jest.Mock).mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const result = await fetchUserDeviceIds(10);
      expect(Device.find).toHaveBeenCalledWith({ owner_id: 10 }, { id: 1 });
      expect(result).toEqual([1, 2]);
    });
  });

  describe("getGroupId", () => {
    it("should return correct group id for day", () => {
      const result = getGroupId("day");
      expect(result).toEqual({
        year: { $year: "$timestamp" },
        month: { $month: "$timestamp" },
        day: { $dayOfMonth: "$timestamp" },
      });
    });

    it("should return correct group id for hour", () => {
      const result = getGroupId("hour");
      expect(result).toEqual({
        year: { $year: "$timestamp" },
        month: { $month: "$timestamp" },
        day: { $dayOfMonth: "$timestamp" },
        hour: { $hour: "$timestamp" },
      });
    });
  });

  describe("aggregateDeviceUsage", () => {
    it("should return empty array if no deviceIds", async () => {
      const result = await aggregateDeviceUsage(
        [],
        new Date(),
        new Date(),
        "day"
      );
      expect(result).toEqual([]);
    });

    it("should call aggregate with correct pipeline", async () => {
      const aggResult = [{ _id: {}, totalUnits: 10 }];
      (DeviceLog.aggregate as jest.Mock).mockResolvedValue(aggResult);

      const result = await aggregateDeviceUsage(
        [1, 2],
        new Date(),
        new Date(),
        "day"
      );

      expect(DeviceLog.aggregate).toHaveBeenCalled();
      expect(result).toEqual(aggResult);
    });
  });

  describe("formatUsageReport", () => {
    it("should format usage report correctly for day", () => {
      const aggregationResults = [
        { _id: { year: 2025, month: 8, day: 21 }, totalUnits: 9 },
      ];
      const result = formatUsageReport(aggregationResults, "day");

      expect(result.labels).toEqual(["2025-08-21"]);
      expect(result.datasets[0].label).toBe("units_consumed");
      expect(result.datasets[0].data).toEqual([9]);
    });

    it("should format usage report correctly for hour", () => {
      const aggregationResults = [
        { _id: { year: 2025, month: 8, day: 21, hour: 10 }, totalUnits: 9 },
      ];
      const result = formatUsageReport(aggregationResults, "hour");

      expect(result.labels).toEqual(["2025-08-21 10:00"]);
      expect(result.datasets[0].label).toBe("units_consumed");
      expect(result.datasets[0].data).toEqual([9]);
    });
  });

  // describe("generateUsageReportForUser", () => {
  //   it("should return empty report if no devices", async () => {
  //     (cacheUtils.getFromCache as jest.Mock).mockResolvedValue(null); // to silence cache
  //     (fetchUserDeviceIds as jest.Mock) = jest.fn().mockResolvedValue([]);
  //     const result = await generateUsageReportForUser(
  //       10,
  //       new Date(),
  //       new Date()
  //     ); // using real function, can mock
  //     expect(result.labels).toEqual([]);
  //     expect(result.datasets[0].data).toEqual(undefined);
  //   });

  //   it("should generate usage report with data", async () => {
  //     (fetchUserDeviceIds as jest.Mock) = jest.fn().mockResolvedValue([10]);
  //     (aggregateDeviceUsage as jest.Mock) = jest
  //       .fn()
  //       .mockResolvedValue([
  //         { _id: { year: 2025, month: 8, day: 21 }, totalUnits: 100 },
  //       ]);

  //     const result = await generateUsageReportForUser(
  //       10,
  //       new Date(),
  //       new Date()
  //     );

  //     expect(result.labels).toEqual(["2025-08-21"]);
  //     expect(result.datasets[0].data).toEqual([-1]);
  //   });
  // });

  describe("createExportJob", () => {
    it("should create job and send inngest event", async () => {
      (uuidv4 as jest.Mock).mockReturnValue("job-uuid");
      (Job.create as jest.Mock).mockResolvedValue({});
      (inngest.send as jest.Mock).mockResolvedValue({});

      const params = {
        userId: "user1",
        deviceId: "device1",
        startDate: "2023-01-01",
        endDate: "2023-01-31",
        format: "csv",
      };

      const jobId = await createExportJob(params);

      expect(uuidv4).toHaveBeenCalled();
      expect(Job.create).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: "job-uuid",
          userId: params.userId,
          deviceId: params.deviceId,
          startDate: params.startDate,
          endDate: params.endDate,
          format: params.format,
          status: "accepted",
          createdAt: expect.any(Date),
        })
      );
      expect(inngest.send).toHaveBeenCalledWith({
        name: "export/large",
        data: { ...params, jobId: "job-uuid" },
      });

      expect(jobId).toBe("job-uuid");
    });
  });

  describe("fetchJobStatus", () => {
    it("should fetch job status with lean and exec", async () => {
      const execMock = jest.fn().mockResolvedValue({ status: "running" });
      const leanMock = jest.fn().mockReturnValue({ exec: execMock });
      (Job.findOne as jest.Mock).mockReturnValue({ lean: leanMock });

      const result = await fetchJobStatus("job-123");

      expect(Job.findOne).toHaveBeenCalledWith({ jobId: "job-123" });
      expect(leanMock).toHaveBeenCalled();
      expect(execMock).toHaveBeenCalled();
      expect(result).toEqual({ status: "running" });
    });
  });
});
