import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import BlacklistToken from "../models/blacklistToken.model";
import { TokenPayload } from "../types/tokens";

export interface AuthRequest extends Request {
  user?: any;
  tokenId?: string;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers?.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }
  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET as string
    ) as TokenPayload;

    if (!decoded.jti) {
      return res
        .status(401)
        .json({ message: "Unauthorized: Token missing identifier" });
    }

    const blacklisted = await BlacklistToken.findOne({
      token: decoded.jti,
      type: "access",
    });
    if (blacklisted) {
      return res.status(401).json({ message: "Unauthorized: Token revoked" });
    }

    req.user = decoded;
    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Unauthorized: Token expired" });
    }
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};
