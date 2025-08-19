import { registerUser, loginUser } from "../../src/services/auth.service";
import User from "../../src/models/user.model";
import { AppError } from "../../src/utils/errorHandler";
import { generateToken } from "../../src/utils/jwt";

// mock dependencies
jest.mock("../../src/models/user.model");
jest.mock("../../src/utils/jwt");

describe("Auth service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("registerUser", () => {
    it("should throw AppError if email already exists", async () => {
      (User.findOne as jest.Mock).mockResolvedValue({
        id: "123",
        email: "test@test.com",
      });

      await expect(
        registerUser({
          name: "John",
          email: "test@test.com",
          password: "pass",
          role: "user",
        })
      ).rejects.toThrow(AppError);

      expect(User.findOne).toHaveBeenCalledWith({ email: "test@test.com" });
    });

    it("should create a user if email not taken", async () => {
      const fakeUser = {
        id: "123",
        name: "John",
        email: "john@test.com",
        role: "user",
      };
      (User.findOne as jest.Mock).mockResolvedValue(null);
      (User.create as jest.Mock).mockResolvedValue(fakeUser);

      const result = await registerUser({
        name: "John",
        email: "john@test.com",
        password: "secret",
        role: "user",
      });

      expect(User.create).toHaveBeenCalledWith({
        name: "John",
        email: "john@test.com",
        password: "secret",
        role: "user",
      });
      expect(result).toEqual({
        message: "User registered successfully",
        user: fakeUser,
      });
    });
  });

  describe("loginUser", () => {
    it("should throw AppError if user not found", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      await expect(loginUser("nope@test.com", "pass")).rejects.toThrow(
        AppError
      );
    });

    it("should throw AppError if password does not match", async () => {
      const fakeUser = { comparePassword: jest.fn().mockResolvedValue(false) };
      (User.findOne as jest.Mock).mockResolvedValue(fakeUser);

      await expect(loginUser("test@test.com", "wrong")).rejects.toThrow(
        AppError
      );
    });

    it("should return token and user data if credentials are valid", async () => {
      const fakeUser = {
        id: "123",
        name: "John",
        email: "john@test.com",
        role: "user",
        comparePassword: jest.fn().mockResolvedValue(true),
      };
      (User.findOne as jest.Mock).mockResolvedValue(fakeUser);
      (generateToken as jest.Mock).mockReturnValue("fake-jwt");

      const result = await loginUser("john@test.com", "secret");

      expect(User.findOne).toHaveBeenCalledWith({ email: "john@test.com" });
      expect(fakeUser.comparePassword).toHaveBeenCalledWith("secret");
      expect(generateToken).toHaveBeenCalledWith({
        id: "123",
        email: "john@test.com",
        role: "user",
      });
      expect(result).toEqual({
        success: true,
        token: "fake-jwt",
        user: {
          id: "u123",
          name: "John",
          email: "john@test.com",
          role: "user",
        },
      });
    });
  });
});
