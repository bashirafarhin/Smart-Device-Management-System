import {
  createLog,
  getDeviceLogs,
  getDeviceUsage,
} from "../../src/controllers/deviceLog.controller";
import * as deviceLogService from "../../src/services/deviceLog.service";
import { AppError } from "../../src/utils/errorHandler";
import { Response, NextFunction } from "express";

jest.mock("../../src/services/deviceLog.service");

describe("DeviceLog Controller", () => {
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  const mockUser = { id: 101, email: "user@test.com" };

  describe("createLog", () => {
    it("should create a log and return 201", async () => {
      const fakeLog = {
        id: 1,
        device_id: 1,
        event: "temperature",
        value: 42,
        timestamp: new Date(),
      };
      (deviceLogService.createDeviceLog as jest.Mock).mockResolvedValue(
        fakeLog
      );

      const mockReq: any = {
        params: { id: "d1" },
        body: { event: "temperature", value: 42 },
        user: mockUser,
      };

      await createLog(mockReq, mockRes as Response, mockNext);

      expect(deviceLogService.createDeviceLog).toHaveBeenCalledWith(
        1,
        101,
        "temperature",
        42
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        log: {
          id: "l1",
          device_id: "d1",
          event: "temperature",
          value: 42,
          timestamp: fakeLog.timestamp,
        },
      });
    });

    it("should call next with AppError if no user", async () => {
      const mockReq: any = {
        params: { id: "d1" },
        body: { event: "temperature", value: 42 },
      };
      await createLog(mockReq, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe("getDeviceLogs", () => {
    it("should return logs with limit", async () => {
      const fakeLogs = [
        { id: 1, event: "temperature", value: 42, timestamp: new Date() },
      ];
      (deviceLogService.fetchDeviceLogs as jest.Mock).mockResolvedValue(
        fakeLogs
      );

      const mockReq: any = {
        params: { id: "d1" },
        query: { limit: "5" },
        user: mockUser,
      };

      await getDeviceLogs(mockReq, mockRes as Response, mockNext);

      expect(deviceLogService.fetchDeviceLogs).toHaveBeenCalledWith(1, 101, 5);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        logs: [
          {
            id: "l1",
            event: "temperature",
            value: 42,
            timestamp: fakeLogs[0].timestamp,
          },
        ],
      });
    });

    it("should call next with AppError if no user", async () => {
      const mockReq: any = { params: { id: "d1" }, query: {} };
      await getDeviceLogs(mockReq, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe("getDeviceUsage", () => {
    it("should calculate device usage and return total units", async () => {
      (deviceLogService.calculateDeviceUsage as jest.Mock).mockResolvedValue(
        120
      );
      const mockReq: any = {
        params: { id: "d1" },
        query: { range: "24h" },
        user: mockUser,
      };

      await getDeviceUsage(mockReq, mockRes as Response, mockNext);

      expect(deviceLogService.calculateDeviceUsage).toHaveBeenCalledWith(
        1,
        101,
        "24h"
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        device_id: "d1",
        total_units_last_24h: 120,
      });
    });

    it("should call next with AppError if no user", async () => {
      const mockReq: any = { params: { id: "d1" }, query: {} };
      await getDeviceUsage(mockReq, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });
  });
});
