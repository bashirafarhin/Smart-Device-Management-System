import { validateRequest } from "../../src/utils/validateRequest";
import { validationResult } from "express-validator";
import { AppError } from "../../src/utils/errorHandler";
import type { Request, Response } from "express";

// mock validationResult from express-validator
jest.mock("express-validator", () => ({
  validationResult: jest.fn(),
}));

// create a strongly typed mock for validationResult
const mockedValidationResult = validationResult as unknown as jest.Mock;

describe("validateRequest middleware", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {};
    mockRes = {};
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  it("should call next() without error if no validation errors", () => {
    // simulate no errors
    mockedValidationResult.mockReturnValue({
      isEmpty: () => true,
    });

    validateRequest(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith(); // no error passed
  });

  it("should call next() with AppError if there are validation errors", () => {
    const fakeError = { msg: "Invalid input" };

    // simulate validation errors
    mockedValidationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [fakeError],
    });

    validateRequest(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);

    const errorPassed = mockNext.mock.calls[0][0]; // first argument to next()
    expect(errorPassed).toBeInstanceOf(AppError);
    expect(errorPassed.message).toBe("Invalid input");
    expect(errorPassed.statusCode).toBe(400);
  });
});
