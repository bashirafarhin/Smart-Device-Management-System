import {
  createDeviceLog,
  fetchDeviceLogs,
  calculateDeviceUsage,
} from "../../src/services/deviceLog.service";

import Device from "../../src/models/device.model";
import DeviceLog from "../../src/models/deviceLog.model";
import { AppError } from "../../src/utils/errorHandler";

jest.mock("../../src/models/device.model");
jest.mock("../../src/models/deviceLog.model");

describe("DeviceLog service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createDeviceLog", () => {
    it("should throw error if device not found", async () => {
      (Device.findOne as jest.Mock).mockResolvedValue(null);

      await expect(createDeviceLog(1, 101, "start", 50)).rejects.toThrow(
        AppError
      );
    });

    it("should create and return device log if device exists", async () => {
      const fakeDevice = { id: 1, owner_id: 101 };
      const fakeLog = { id: 99, device_id: 1, event: "start", value: 50 };
      (Device.findOne as jest.Mock).mockResolvedValue(fakeDevice);
      (DeviceLog.create as jest.Mock).mockResolvedValue(fakeLog);

      const result = await createDeviceLog(1, 101, "start", 50);

      expect(Device.findOne).toHaveBeenCalledWith({ id: 1, owner_id: 101 });
      expect(DeviceLog.create).toHaveBeenCalledWith({
        device_id: 1,
        event: "start",
        value: 50,
      });
      expect(result).toBe(fakeLog);
    });
  });

  describe("fetchDeviceLogs", () => {
    it("should throw error if device not found", async () => {
      (Device.findOne as jest.Mock).mockResolvedValue(null);

      await expect(fetchDeviceLogs(1, 101, 10)).rejects.toThrow(AppError);
    });

    it("should fetch logs if device exists", async () => {
      const fakeDevice = { id: 1 };
      const fakeLogs = [{ id: 1 }, { id: 2 }];
      const limitMock = jest.fn().mockResolvedValue(fakeLogs);
      const sortMock = jest.fn().mockReturnValue({ limit: limitMock });
      (Device.findOne as jest.Mock).mockResolvedValue(fakeDevice);
      (DeviceLog.find as jest.Mock).mockReturnValue({ sort: sortMock });

      const result = await fetchDeviceLogs(1, 101, 5);

      expect(Device.findOne).toHaveBeenCalledWith({ id: 1, owner_id: 101 });
      expect(DeviceLog.find).toHaveBeenCalledWith({ device_id: 1 });
      expect(sortMock).toHaveBeenCalledWith({ timestamp: -1 });
      expect(limitMock).toHaveBeenCalledWith(5);
      expect(result).toBe(fakeLogs);
    });
  });

  describe("calculateDeviceUsage", () => {
    it("should throw error if device not found", async () => {
      (Device.findOne as jest.Mock).mockResolvedValue(null);

      await expect(calculateDeviceUsage(1, 101, "24h")).rejects.toThrow(
        AppError
      );
    });

    it("should calculate total units for given range", async () => {
      const fakeDevice = { id: 1 };
      const fakeLogs = [{ value: 10 }, { value: 20 }, { value: 5 }];
      (Device.findOne as jest.Mock).mockResolvedValue(fakeDevice);
      (DeviceLog.find as jest.Mock).mockResolvedValue(fakeLogs);

      const result = await calculateDeviceUsage(1, 101, "24h");

      expect(Device.findOne).toHaveBeenCalledWith({ id: 1, owner_id: 101 });
      expect(DeviceLog.find).toHaveBeenCalledWith(
        expect.objectContaining({
          device_id: 1,
          event: "units_consumed",
        })
      );
      expect(result).toBe(35);
    });

    it("should default to all logs if invalid range format", async () => {
      const fakeDevice = { id: 1 };
      const fakeLogs = [{ value: 5 }, { value: 15 }];
      (Device.findOne as jest.Mock).mockResolvedValue(fakeDevice);
      (DeviceLog.find as jest.Mock).mockResolvedValue(fakeLogs);

      const result = await calculateDeviceUsage(1, 101, "invalid");

      expect(result).toBe(20);
    });
  });
});
