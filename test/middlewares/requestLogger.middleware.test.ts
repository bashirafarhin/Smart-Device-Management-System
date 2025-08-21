import { requestLogger } from "../../src/middlewares/requestLogger.middleware";

describe("requestLogger middleware", () => {
  let req: any;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    req = {
      method: "GET",
      originalUrl: "/test/url",
      ip: "127.0.0.1",
      connection: { remoteAddress: "127.0.0.1" },
    };
    res = {};
    next = jest.fn();
  });

  it("should call next and not throw error", () => {
    requestLogger(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("should not throw error even if connection is undefined", () => {
    req.connection = undefined;
    requestLogger(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
