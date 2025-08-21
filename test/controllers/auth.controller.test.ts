import {
  signup,
  login,
  logout,
  refreshTokenHandler,
  getProfile,
} from "../../src/controllers/auth.controller";

import * as authService from "../../src/services/auth.service";
import jwt from "jsonwebtoken";

// Mock entire authService module so .mockResolvedValue etc. works
jest.mock("../../src/services/auth.service");

// Mock jsonwebtoken module, overriding only `verify` method
jest.mock("jsonwebtoken", () => {
  const originalModule = jest.requireActual("jsonwebtoken");
  return {
    __esModule: true,
    ...originalModule,
    verify: jest.fn(),
  };
});

// Cast jwt to jest.Mocked to safely mock in TypeScript
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe("Auth Controller", () => {
  let req: any;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    req = {
      body: {},
      cookies: {},
      user: null,
      tokenId: null,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe("signup", () => {
    it("registers user and returns 201", async () => {
      req.body = {
        name: "John",
        email: "john@example.com",
        password: "pass",
        role: "user",
      };

      (authService.registerUser as jest.Mock).mockResolvedValue({
        message: "User registered",
      });

      await signup(req, res, next);

      expect(authService.registerUser).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "User registered",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("calls next on error", async () => {
      const error = new Error("fail");
      (authService.registerUser as jest.Mock).mockRejectedValue(error);

      await signup(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("login", () => {
    it("logs in user and sets cookie", async () => {
      req.body = { email: "john@example.com", password: "pass" };
      const result = {
        accessToken: "access",
        refreshToken: "refresh",
        user: { id: "user1" },
      };
      (authService.loginUser as jest.Mock).mockResolvedValue(result);

      await login(req, res, next);

      expect(authService.loginUser).toHaveBeenCalledWith(
        "john@example.com",
        "pass"
      );
      expect(res.cookie).toHaveBeenCalledWith(
        "refreshToken",
        "refresh",
        expect.objectContaining({
          httpOnly: true,
          secure: expect.any(Boolean),
          sameSite: "strict",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        accessToken: "access",
        user: result.user,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("calls next on error", async () => {
      const error = new Error("fail");
      (authService.loginUser as jest.Mock).mockRejectedValue(error);

      await login(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // describe("logout", () => {
  //   it("returns 400 if no refresh token", async () => {
  //     req.cookies = {};

  //     await logout(req, res);

  //     expect(res.status).toHaveBeenCalledWith(400);
  //     expect(res.json).toHaveBeenCalledWith({
  //       message: "No refresh token found",
  //     });
  //   });

  //   it("clears cookie and returns success if token invalid", async () => {
  //     req.cookies = { refreshToken: "badtoken" };
  //     mockedJwt.verify.mockImplementation(() => {
  //       throw new Error("invalid");
  //     });

  //     await logout(req, res);

  //     expect(res.clearCookie).toHaveBeenCalledWith("refreshToken");
  //     expect(res.status).toHaveBeenCalledWith(200);
  //     expect(res.json).toHaveBeenCalledWith({
  //       message: "Logged out successfully",
  //     });
  //   });

  //   it("blacklists tokens and clears cookie on valid token", async () => {
  //     req.cookies = { refreshToken: "validtoken" };
  //     mockedJwt.verify.mockReturnValue({
  //       exp: Math.floor(Date.now() / 1000) + 1000,
  //       jti: "jti1",
  //       id: "user1",
  //     });
  //     (authService.blacklistToken as jest.Mock).mockResolvedValue(undefined);

  //     req.tokenId = "accessJti";
  //     req.user = { id: "user1" };

  //     await logout(req, res);

  //     expect(authService.blacklistToken).toHaveBeenCalledWith(
  //       "jti1",
  //       "user1",
  //       "refresh",
  //       expect.any(Number)
  //     );
  //     expect(authService.blacklistToken).toHaveBeenCalledWith(
  //       "accessJti",
  //       "user1",
  //       "access",
  //       15 * 60
  //     );
  //     expect(res.clearCookie).toHaveBeenCalledWith("refreshToken");
  //     expect(res.status).toHaveBeenCalledWith(200);
  //     expect(res.json).toHaveBeenCalledWith({
  //       message: "Logged out successfully",
  //     });
  //   });

  //   it("handles unexpected error gracefully", async () => {
  //     req.cookies = { refreshToken: "validtoken" };
  //     mockedJwt.verify.mockImplementation(() => {
  //       throw new Error("some error");
  //     });
  //     (authService.blacklistToken as jest.Mock).mockRejectedValue(
  //       new Error("fail")
  //     );

  //     await logout(req, res);

  //     // According to your code returns success message on token errors
  //     expect(res.clearCookie).toHaveBeenCalledWith("refreshToken");
  //     expect(res.status).toHaveBeenCalledWith(200);
  //     expect(res.json).toHaveBeenCalledWith({
  //       message: "Logged out successfully",
  //     });
  //   });
  // });

  describe("refreshTokenHandler", () => {
    it("returns 401 if refresh token missing", async () => {
      req.cookies = {};

      await refreshTokenHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Refresh token missing",
      });
    });

    it("refreshes tokens and sets new refresh token cookie", async () => {
      req.cookies = { refreshToken: "refresh_token" };
      (authService.refreshTokens as jest.Mock).mockResolvedValue({
        newAccessToken: "newAccess",
        newRefreshToken: "newRefresh",
      });

      await refreshTokenHandler(req, res);

      expect(authService.refreshTokens).toHaveBeenCalledWith("refresh_token");
      expect(res.cookie).toHaveBeenCalledWith(
        "refreshToken",
        "newRefresh",
        expect.objectContaining({
          httpOnly: true,
          secure: expect.any(Boolean),
          sameSite: "strict",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        })
      );
      expect(res.json).toHaveBeenCalledWith({ accessToken: "newAccess" });
    });

    it("returns 401 on invalid token", async () => {
      req.cookies = { refreshToken: "bad_refresh" };
      (authService.refreshTokens as jest.Mock).mockRejectedValue(
        new Error("Invalid token")
      );

      await refreshTokenHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid token" });
    });
  });

  describe("getProfile", () => {
    it("returns 401 if no user id", async () => {
      req.user = null;

      await getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    });

    it("returns 404 if user not found", async () => {
      req.user = { id: "user1" };
      (authService.getUserProfile as jest.Mock).mockResolvedValue(null);

      await getProfile(req, res);

      expect(authService.getUserProfile).toHaveBeenCalledWith("user1");
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
    });

    it("returns user profile data", async () => {
      req.user = { id: "user1" };
      const fakeProfile = { id: "user1", name: "John" };
      (authService.getUserProfile as jest.Mock).mockResolvedValue(fakeProfile);

      await getProfile(req, res);

      expect(authService.getUserProfile).toHaveBeenCalledWith("user1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: fakeProfile,
      });
    });

    it("returns 500 on error", async () => {
      req.user = { id: "user1" };
      (authService.getUserProfile as jest.Mock).mockRejectedValue(
        new Error("fail")
      );

      await getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Internal server error",
      });
    });
  });
});
