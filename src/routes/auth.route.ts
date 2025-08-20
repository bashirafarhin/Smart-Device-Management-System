import { Router } from "express";
import {
  login,
  signup,
  logout,
  refreshTokenHandler,
} from "../controllers/auth.controller";

import { check } from "express-validator";
import {
  validateSignup,
  validatePassword,
  validateRole,
} from "../middlewares/validations/auth.validation";
import { validateRequest } from "../utils/validateRequest";
import { authMiddleware } from "../middlewares/auth.middleware";
import { rateLimiter } from "../middlewares/rateLimiter";

const router = Router();

const authRateLimiter = rateLimiter({
  endpoint: "auth",
  rate_limit: { time: 15 * 60, limit: 5 }, // 5 requests per 15 minutes
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

export default router;
