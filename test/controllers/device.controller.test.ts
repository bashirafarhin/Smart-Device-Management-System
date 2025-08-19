import {
  registerDevice,
  getDevices,
  updateDevice,
  deleteDevice,
  recordHeartbeat,
} from "../../src/controllers/device.controller";
import * as deviceService from "../../src/services/device.service";
import { AppError } from "../../src/utils/errorHandler";
import { Response, NextFunction } from "express";

jest.mock("../../src/services/device.service"); // mock device service

describe("Device Controller", () => {
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

  describe("registerDevice", () => {
    it("should create device and return 201", async () => {
      const fakeDevice = {
        id: 1,
        name: "Meter",
        type: "meter",
        status: "active",
        last_active_at: null,
        owner_id: 101,
      };
      (deviceService.createDevice as jest.Mock).mockResolvedValue(fakeDevice);

      const mockReq: any = {
        body: { name: "Meter", type: "meter", status: "active" },
        user: mockUser,
      };

      await registerDevice(mockReq, mockRes as Response, mockNext);

      expect(deviceService.createDevice).toHaveBeenCalledWith(
        "Meter",
        "meter",
        "active",
        101
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        device: {
          id: "d1",
          name: "Meter",
          type: "meter",
          status: "active",
          last_active_at: null,
          owner_id: "u101",
        },
      });
    });

    it("should call next with error if no user", async () => {
      const mockReq: any = {
        body: { name: "Meter", type: "meter", status: "active" },
      };
      await registerDevice(mockReq, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe("getDevices", () => {
    it("should return filtered devices", async () => {
      const fakeDevices = [
        {
          id: 1,
          name: "Meter1",
          type: "meter",
          status: "active",
          last_active_at: null,
          owner_id: 101,
        },
      ];
      (deviceService.getDevices as jest.Mock).mockResolvedValue(fakeDevices);
      const mockReq: any = { user: mockUser, query: { type: "meter" } };

      await getDevices(mockReq, mockRes as Response, mockNext);

      expect(deviceService.getDevices).toHaveBeenCalledWith({
        owner_id: 101,
        type: "meter",
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        devices: [
          {
            id: "d1",
            name: "Meter1",
            type: "meter",
            status: "active",
            last_active_at: null,
            owner_id: "u101",
          },
        ],
      });
    });
  });

  describe("updateDevice", () => {
    it("should update device and return updated data", async () => {
      const fakeDevice = {
        id: 1,
        name: "Meter1",
        type: "meter",
        status: "active",
        last_active_at: null,
        owner_id: 101,
      };
      (deviceService.updateDevice as jest.Mock).mockResolvedValue(fakeDevice);
      const mockReq: any = {
        user: mockUser,
        params: { id: "d1" },
        body: { name: "Meter1" },
      };

      await updateDevice(mockReq, mockRes as Response, mockNext);

      expect(deviceService.updateDevice).toHaveBeenCalledWith(1, 101, {
        name: "Meter1",
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        device: {
          id: "d1",
          name: "Meter1",
          type: "meter",
          status: "active",
          last_active_at: null,
          owner_id: "u101",
        },
      });
    });
  });

  describe("deleteDevice", () => {
    it("should delete device and return success message", async () => {
      (deviceService.deleteDevice as jest.Mock).mockResolvedValue(undefined);
      const mockReq: any = { user: mockUser, params: { id: "d1" } };

      await deleteDevice(mockReq, mockRes as Response, mockNext);

      expect(deviceService.deleteDevice).toHaveBeenCalledWith(1, 101);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Device removed successfully",
      });
    });
  });

  describe("recordHeartbeat", () => {
    it("should update heartbeat and return last_active_at", async () => {
      const lastActive = new Date();
      (deviceService.updateHeartbeat as jest.Mock).mockResolvedValue(
        lastActive
      );
      const mockReq: any = {
        user: mockUser,
        params: { id: "d1" },
        body: { status: "active" },
      };

      await recordHeartbeat(mockReq, mockRes as Response, mockNext);

      expect(deviceService.updateHeartbeat).toHaveBeenCalledWith(
        1,
        101,
        "active"
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Device heartbeat recorded",
        last_active_at: lastActive.toISOString(),
      });
    });
  });
});
