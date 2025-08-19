import { signup, login } from "../../src/controllers/auth.controller";
import * as authService from "../../src/services/auth.service";
import { Request, Response, NextFunction } from "express";

jest.mock("../../src/services/auth.service"); // mock the whole service

describe("Auth Controller", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe("signup", () => {
    it("should call registerUser and return 201 on success", async () => {
      mockReq.body = {
        name: "John",
        email: "test@test.com",
        password: "Secret123!",
        role: "user",
      };
      (authService.registerUser as jest.Mock).mockResolvedValue({
        message: "User registered successfully",
      });

      await signup(mockReq as Request, mockRes as Response, mockNext);

      expect(authService.registerUser).toHaveBeenCalledWith({
        name: "John",
        email: "test@test.com",
        password: "Secret123!",
        role: "user",
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "User registered successfully",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should call next with error if registerUser throws", async () => {
      const error = new Error("Email exists");
      (authService.registerUser as jest.Mock).mockRejectedValue(error);
      mockReq.body = {
        name: "John",
        email: "test@test.com",
        password: "Secret123!",
        role: "user",
      };

      await signup(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe("login", () => {
    it("should call loginUser and return 200 with result on success", async () => {
      mockReq.body = { email: "test@test.com", password: "Secret123!" };
      const fakeResult = {
        success: true,
        token: "jwt",
        user: { id: "u1", email: "test@test.com" },
      };
      (authService.loginUser as jest.Mock).mockResolvedValue(fakeResult);

      await login(mockReq as Request, mockRes as Response, mockNext);

      expect(authService.loginUser).toHaveBeenCalledWith(
        "test@test.com",
        "Secret123!"
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(fakeResult);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should call next with error if loginUser throws", async () => {
      const error = new Error("Invalid credentials");
      (authService.loginUser as jest.Mock).mockRejectedValue(error);
      mockReq.body = { email: "test@test.com", password: "wrongpass" };

      await login(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
