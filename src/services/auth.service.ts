import User from "../models/user.model";
import { AppError } from "../utils/errorHandler";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt";
import BlacklistToken from "../models/blacklistToken.model";
import jwt from "jsonwebtoken";
import { TokenPayload } from "../types/tokens";

export const registerUser = async (data: {
  name: string;
  email: string;
  password: string;
  role: string;
}) => {
  const existingUser = await User.findOne({ email: data.email });
  if (existingUser) throw new AppError("Email already exists", 400);
  const user = await User.create(data);
  return { message: "User registered successfully", user };
};

export const loginUser = async (email: string, password: string) => {
  const user = await User.findOne({ email });
  if (!user) throw new AppError("Invalid email or password", 401);

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new AppError("Invalid email or password", 401);

  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return {
    accessToken,
    refreshToken,
    user: {
      id: "u" + user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

export const blacklistToken = async (
  tokenId: string,
  userId: string,
  type: "access" | "refresh",
  expiresInSeconds: number
) => {
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
  return BlacklistToken.create({
    token: tokenId,
    userId,
    type,
    expiresAt,
  });
};

export async function refreshTokens(oldRefreshToken: string) {
  if (!oldRefreshToken) throw new AppError("Refresh token missing", 401);

  let decoded: TokenPayload;
  try {
    decoded = jwt.verify(
      oldRefreshToken,
      process.env.REFRESH_TOKEN_SECRET as string
    ) as TokenPayload;
  } catch (error) {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  // Check if token is blacklisted
  const blacklisted = await BlacklistToken.findOne({
    token: decoded.jti,
    type: "refresh",
  });
  if (blacklisted) {
    throw new AppError("Refresh token revoked", 401);
  }
  await BlacklistToken.create({
    token: decoded.jti,
    userId: decoded.id,
    type: "refresh",
    expiresAt: new Date(decoded.exp * 1000),
  });

  // Load user
  const user = await User.findOne({ id: decoded.id });
  if (!user) throw new AppError("User not found", 401);

  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  // Generate new tokens
  const newRefreshToken = generateRefreshToken(payload);
  const newAccessToken = generateAccessToken(payload);

  // Return new tokens
  return {
    newRefreshToken,
    newAccessToken,
  };
}
