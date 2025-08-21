import { Router } from "express";
import {
  login,
  signup,
  logout,
  refreshTokenHandler,
  getProfile,
} from "../controllers/auth.controller";

import { check } from "express-validator";
import {
  validateSignup,
  validatePassword,
  validateRole,
} from "../middlewares/validations/auth.validation";
import { validateRequest } from "../utils/validateRequest";
import { authMiddleware } from "../middlewares/auth.middleware";
import { rateLimiter } from "../middlewares/rateLimiter.middleware";

const router = Router();

const authRateLimiter = rateLimiter({
  endpoint: "auth",
  rate_limit: { time: 1 * 60, limit: 10 }, // 10 requests per 1 minutes
});

router.post(
  "/signup",
  authRateLimiter,
  validateSignup,
  validatePassword,
  validateRole,
  signup
);

router.post(
  "/login",
  authRateLimiter,
  [
    check("email", "Valid email is required").isEmail(),
    check("password", "Password is required").notEmpty(),
    validateRequest,
  ],
  login
);

router.post("/logout", authMiddleware, authRateLimiter, logout);

router.post("/refresh-token", authRateLimiter, refreshTokenHandler);

router.get("/profile", authMiddleware, authRateLimiter, getProfile);

export default router;
