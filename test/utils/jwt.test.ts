import { generateToken } from "../../src/utils/jwt";
import { describe, expect, beforeAll, it } from "@jest/globals";

describe("generateToken", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = "testsecret";
  });

  it("should generate a valid JWT token", () => {
    const payload = { userId: "123" };
    const token = generateToken(payload);
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3); // JWTs have 3 parts
  });

  it("should throw if JWT_SECRET is missing", () => {
    delete process.env.JWT_SECRET;
    expect(() => generateToken({ userId: "123" })).toThrow();
    process.env.JWT_SECRET = "testsecret"; // restore
  });
});
