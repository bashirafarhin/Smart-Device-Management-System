import { errorHandler, AppError } from "../../src/utils/errorHandler";
import type { Request, Response, NextFunction } from "express";

describe("errorHandler middleware", () => {
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
  });

  it("should return proper JSON for AppError", () => {
    const err = new AppError("Custom error", 400);

    errorHandler(err, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: "Custom error",
    });
  });

  it("should default to 500 if no statusCode", () => {
    const err = new Error("Something went wrong");

    errorHandler(err, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: "Something went wrong",
    });
  });

  it("should default message to 'Internal Server Error' if none provided", () => {
    const err = new Error("");

    errorHandler(err, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: "Internal Server Error",
    });
  });
});
