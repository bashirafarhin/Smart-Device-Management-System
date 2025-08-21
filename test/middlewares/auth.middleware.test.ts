import {
  authMiddleware,
  AuthRequest,
} from "../../src/middlewares/auth.middleware";
import jwt from "jsonwebtoken";
import BlacklistToken from "../../src/models/blacklistToken.model";

jest.mock("jsonwebtoken");
jest.mock("../../src/models/blacklistToken.model");

const mockedJwt = jwt as jest.Mocked<typeof jwt>;
const mockedBlacklistToken = BlacklistToken as jest.Mocked<
  typeof BlacklistToken
>;

interface MockRequest extends Partial<AuthRequest> {
  headers: Record<string, any>; // Explicitly required for TS correctness
}

describe("authMiddleware", () => {
  let req: MockRequest;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    req = {
      headers: {}, // Must be present to avoid TS errors
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it("returns 401 if no Authorization header", async () => {
    await authMiddleware(req as AuthRequest, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Unauthorized: No token provided",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 if Authorization header format invalid", async () => {
    req.headers.authorization = "InvalidFormat";
    await authMiddleware(req as AuthRequest, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Unauthorized: No token provided",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 if token missing identifier", async () => {
    req.headers.authorization = "Bearer validtoken";
    mockedJwt.verify.mockReturnValue({} as any);
    await authMiddleware(req as AuthRequest, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Unauthorized: Token missing identifier",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 if token is blacklisted", async () => {
    req.headers.authorization = "Bearer validtoken";
    const decoded = { jti: "tokenid", id: "user1" };
    mockedJwt.verify.mockReturnValue(decoded as any);
    mockedBlacklistToken.findOne.mockResolvedValue({
      token: "tokenid",
      type: "access",
    } as any);
    await authMiddleware(req as AuthRequest, res, next);
    expect(mockedBlacklistToken.findOne).toHaveBeenCalledWith({
      token: "tokenid",
      type: "access",
    });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Unauthorized: Token revoked",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("allows valid token and calls next", async () => {
    req.headers.authorization = "Bearer validtoken";
    const decoded = { jti: "tokenid", id: "user1" };
    mockedJwt.verify.mockReturnValue(decoded as any);
    mockedBlacklistToken.findOne.mockResolvedValue(null);
    await authMiddleware(req as AuthRequest, res, next);
    expect(req.user).toEqual(decoded);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 401 if token expired", async () => {
    req.headers.authorization = "Bearer expiredtoken";
    const error: any = new Error("jwt expired");
    error.name = "TokenExpiredError";
    mockedJwt.verify.mockImplementation(() => {
      throw error;
    });
    await authMiddleware(req as AuthRequest, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Unauthorized: Token expired",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 if token invalid", async () => {
    req.headers.authorization = "Bearer invalidtoken";
    const error: any = new Error("invalid token");
    error.name = "JsonWebTokenError";
    mockedJwt.verify.mockImplementation(() => {
      throw error;
    });
    await authMiddleware(req as AuthRequest, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Unauthorized: Invalid token",
    });
    expect(next).not.toHaveBeenCalled();
  });
});
