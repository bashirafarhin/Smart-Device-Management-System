import { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.service";
import jwt from "jsonwebtoken";
import { blacklistToken } from "../services/auth.service";

export const signup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, password, role } = req.body;
    const result = await authService.registerUser({
      name,
      email,
      password,
      role,
    });
    return res.status(201).json({ success: true, message: result.message });
  } catch (err) {
    next(err);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password);
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return res.status(200).json({
      success: true,
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken)
      return res.status(400).json({ message: "No refresh token found" });

    let decoded: any;
    try {
      decoded = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET as string
      );
    } catch {
      res.clearCookie("refreshToken");
      return res.status(200).json({ message: "Logged out successfully" });
    }

    const expiresInSeconds = Math.floor(
      (decoded.exp * 1000 - Date.now()) / 1000
    );

    // Blacklist refresh token
    await blacklistToken(decoded.jti, decoded.id, "refresh", expiresInSeconds);

    // Blacklist access token if we have it on request (from middleware)
    if ((req as any).tokenId && (req as any).user?.id === decoded.id) {
      await blacklistToken(
        (req as any).tokenId,
        (req as any).user?.id,
        "access",
        15 * 60
      );
    }

    res.clearCookie("refreshToken");
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const refreshTokenHandler = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken)
      return res.status(401).json({ message: "Refresh token missing" });

    const { newAccessToken, newRefreshToken } = await authService.refreshTokens(
      refreshToken
    );

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ accessToken: newAccessToken });
  } catch (error: any) {
    return res
      .status(401)
      .json({ message: error.message || "Invalid refresh token" });
  }
};
