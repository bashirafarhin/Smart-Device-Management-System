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

jest.mock("../../src/models/device.model");

describe("Device service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createDevice", () => {
    it("should create and return a device", async () => {
      const fakeDevice = { id: 1, name: "Sensor", save: jest.fn() };
      (Device.create as jest.Mock).mockResolvedValue(fakeDevice);

      const result = await createDevice("Sensor", "meter", "active", 101);

      expect(Device.create).toHaveBeenCalledWith({
        name: "Sensor",
        type: "meter",
        status: "active",
        owner_id: 101,
      });
      expect(result).toBe(fakeDevice);
    });
  });

  describe("getDevices", () => {
    it("should find devices with filters", async () => {
      const fakeDevices = [{ id: 1 }, { id: 2 }];
      const sortMock = jest.fn().mockResolvedValue(fakeDevices);
      (Device.find as jest.Mock).mockReturnValue({ sort: sortMock });

      const result = await getDevices({ owner_id: 101 });

      expect(Device.find).toHaveBeenCalledWith({ owner_id: 101 });
      expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toBe(fakeDevices);
    });
  });

  describe("updateDevice", () => {
    it("should throw error if device not found", async () => {
      (Device.findOne as jest.Mock).mockResolvedValue(null);

      await expect(updateDevice(1, 101, { name: "Updated" })).rejects.toThrow(
        AppError
      );
    });

    it("should update and save device if found", async () => {
      const fakeDevice = {
        id: 1,
        name: "Old",
        save: jest.fn().mockResolvedValue(true),
      };
      (Device.findOne as jest.Mock).mockResolvedValue(fakeDevice);

      const result = await updateDevice(1, 101, { name: "Updated" });

      expect(fakeDevice.name).toBe("Updated");
      expect(fakeDevice.save).toHaveBeenCalled();
      expect(result).toBe(fakeDevice);
    });
  });

  describe("deleteDevice", () => {
    it("should throw error if device not found", async () => {
      (Device.findOneAndDelete as jest.Mock).mockResolvedValue(null);

      await expect(deleteDevice(1, 101)).rejects.toThrow(AppError);
    });

    it("should delete device if found", async () => {
      const fakeDevice = { id: 1 };
      (Device.findOneAndDelete as jest.Mock).mockResolvedValue(fakeDevice);

      await deleteDevice(1, 101);

      expect(Device.findOneAndDelete).toHaveBeenCalledWith({
        id: 1,
        owner_id: 101,
      });
    });
  });

  describe("updateHeartbeat", () => {
    it("should throw error if device not found", async () => {
      (Device.findOne as jest.Mock).mockResolvedValue(null);

      await expect(updateHeartbeat(1, 101, "active")).rejects.toThrow(AppError);
    });

    it("should update status and last_active_at if device exists", async () => {
      const fakeDevice = {
        id: 1,
        status: "inactive",
        last_active_at: new Date(),
        save: jest.fn().mockResolvedValue(true),
      };
      (Device.findOne as jest.Mock).mockResolvedValue(fakeDevice);

      const result = await updateHeartbeat(1, 101, "active");

      expect(fakeDevice.status).toBe("active");
      expect(fakeDevice.last_active_at).toBeInstanceOf(Date);
      expect(fakeDevice.save).toHaveBeenCalled();
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
        last_active_at: new Date(),
        save: jest.fn().mockResolvedValue(true),
      };
      (Device.findOne as jest.Mock).mockResolvedValue(fakeDevice);

      await deactivateDevice(1);

      expect(fakeDevice.status).toBe("inactive");
      expect(fakeDevice.save).toHaveBeenCalled();
    });
  });
});
