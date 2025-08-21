// test/services/user.service.test.ts

import {
  registerUser,
  loginUser,
  blacklistToken,
  refreshTokens,
  getUserProfile,
} from "../../src/services/auth.service";

import User from "../../src/models/user.model";
import BlacklistToken from "../../src/models/blacklistToken.model";
import { generateAccessToken, generateRefreshToken } from "../../src/utils/jwt";
import jwt from "jsonwebtoken";
import { getFromCache, setToCache } from "../../src/utils/cache";
import { AppError } from "../../src/utils/errorHandler";

// Mock dependencies
jest.mock("../../src/models/user.model");
jest.mock("../../src/models/blacklistToken.model");
jest.mock("../../src/utils/jwt");
jest.mock("jsonwebtoken");
jest.mock("../../src/utils/cache");

describe("User Service", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("registerUser", () => {
    it("should register user if email doesn't exist", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);
      (User.create as jest.Mock).mockResolvedValue({ id: "user1" });

      const data = {
        name: "John",
        email: "john@example.com",
        password: "pass",
        role: "user",
      };
      const res = await registerUser(data);

      expect(User.findOne).toHaveBeenCalledWith({ email: data.email });
      expect(User.create).toHaveBeenCalledWith(data);
      expect(res.message).toBe("User registered successfully");
      expect(res.user).toBeDefined();
    });

    it("should throw error if email exists", async () => {
      (User.findOne as jest.Mock).mockResolvedValue({ id: "user1" });

      await expect(
        registerUser({
          name: "John",
          email: "john@example.com",
          password: "pass",
          role: "user",
        })
      ).rejects.toThrow(AppError);
    });
  });

  describe("loginUser", () => {
    it("should login user with valid credentials", async () => {
      const fakeUser = {
        id: "user1",
        email: "john@example.com",
        role: "user",
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      const selectMock = jest.fn().mockResolvedValue(fakeUser);

      (User.findOne as jest.Mock).mockReturnValue({
        select: selectMock,
      });

      (generateAccessToken as jest.Mock).mockReturnValue("access123");
      (generateRefreshToken as jest.Mock).mockReturnValue("refresh123");

      const res = await loginUser("john@example.com", "password");

      expect(User.findOne).toHaveBeenCalledWith({ email: "john@example.com" });
      expect(selectMock).toHaveBeenCalledWith("+password");
      expect(fakeUser.comparePassword).toHaveBeenCalledWith("password");
      expect(res.accessToken).toBe("access123");
      expect(res.refreshToken).toBe("refresh123");
      expect(res.user.id).toBe("u" + fakeUser.id);
    });

    it("should throw error if user not found", async () => {
      const selectMock = jest.fn().mockResolvedValue(null);

      (User.findOne as jest.Mock).mockReturnValue({
        select: selectMock,
      });

      await expect(loginUser("nouser@example.com", "pass")).rejects.toThrow(
        AppError
      );
      expect(selectMock).toHaveBeenCalledWith("+password");
    });

    it("should throw error if password doesn't match", async () => {
      const fakeUser = { comparePassword: jest.fn().mockResolvedValue(false) };

      const selectMock = jest.fn().mockResolvedValue(fakeUser);

      (User.findOne as jest.Mock).mockReturnValue({
        select: selectMock,
      });

      await expect(loginUser("john@example.com", "wrongpass")).rejects.toThrow(
        AppError
      );
      expect(selectMock).toHaveBeenCalledWith("+password");
      expect(fakeUser.comparePassword).toHaveBeenCalledWith("wrongpass");
    });
  });

  describe("blacklistToken", () => {
    it("should create a blacklist token entry", async () => {
      (BlacklistToken.create as jest.Mock).mockResolvedValue("created");

      const result = await blacklistToken("token1", "user1", "access", 10);

      expect(BlacklistToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          token: "token1",
          userId: "user1",
          type: "access",
          expiresAt: expect.any(Date),
        })
      );
      expect(result).toBe("created");
    });
  });

  describe("refreshTokens", () => {
    const fakeDecoded = {
      id: "user1",
      email: "john@example.com",
      role: "user",
      jti: "tokenId",
      exp: Math.floor(Date.now() / 1000) + 600,
    };

    it("should throw error if no token provided", async () => {
      await expect(refreshTokens("")).rejects.toThrow(AppError);
    });

    it("should throw error on invalid token", async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid token");
      });

      await expect(refreshTokens("badToken")).rejects.toThrow(AppError);
    });

    it("should throw error if token is blacklisted", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(fakeDecoded);
      (BlacklistToken.findOne as jest.Mock).mockResolvedValue(true);

      await expect(refreshTokens("validToken")).rejects.toThrow(AppError);
    });

    it("should refresh tokens successfully", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(fakeDecoded);
      (BlacklistToken.findOne as jest.Mock).mockResolvedValue(null);
      (BlacklistToken.create as jest.Mock).mockResolvedValue(true);

      (User.findOne as jest.Mock).mockResolvedValue({
        id: "user1",
        email: "john@example.com",
        role: "user",
      });

      (generateAccessToken as jest.Mock).mockReturnValue("newAccess");
      (generateRefreshToken as jest.Mock).mockReturnValue("newRefresh");

      const tokens = await refreshTokens("validToken");

      expect(tokens.newAccessToken).toBe("newAccess");
      expect(tokens.newRefreshToken).toBe("newRefresh");
    });
  });

  describe("getUserProfile", () => {
    it("should return cached profile if present", async () => {
      const cachedProfile = { id: "user1", name: "John" };
      (getFromCache as jest.Mock).mockResolvedValue(cachedProfile);

      const profile = await getUserProfile("user1");
      expect(profile).toEqual(cachedProfile);
      expect(getFromCache).toHaveBeenCalledWith("user-profile:user1");
      expect(User.findOne).not.toHaveBeenCalled();
    });

    it("should query DB and cache result if not cached", async () => {
      const dbProfile = { id: "user1", name: "John" };
      (getFromCache as jest.Mock).mockResolvedValue(null);

      const leanMock = jest.fn().mockResolvedValue(dbProfile);

      (User.findOne as jest.Mock).mockReturnValue({
        lean: leanMock,
      });

      (setToCache as jest.Mock).mockResolvedValue(null);

      const profile = await getUserProfile("user1");

      expect(leanMock).toHaveBeenCalled();
      expect(profile).toEqual(dbProfile);
      expect(setToCache).toHaveBeenCalledWith(
        "user-profile:user1",
        dbProfile,
        1800
      );
    });

    it("should return null if DB has no user", async () => {
      (getFromCache as jest.Mock).mockResolvedValue(null);

      const leanMock = jest.fn().mockResolvedValue(null);

      (User.findOne as jest.Mock).mockReturnValue({
        lean: leanMock,
      });

      const profile = await getUserProfile("user1");

      expect(leanMock).toHaveBeenCalled();
      expect(profile).toBeNull();
    });
  });
});
