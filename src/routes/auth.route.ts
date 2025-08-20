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

const router = Router();

router.post("/signup", validateSignup, validatePassword, validateRole, signup);

router.post(
  "/login",
  [
    check("email", "Valid email is required").isEmail(),
    check("password", "Password is required").notEmpty(),
    validateRequest,
  ],
  login
);

router.post("/logout", authMiddleware, logout);

router.post("/refresh-token", refreshTokenHandler);

export default router;
