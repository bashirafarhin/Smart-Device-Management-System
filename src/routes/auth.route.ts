import { Router } from "express";
import { login, signup } from "../controllers/auth.controller";
import { check } from "express-validator";
import {
  validateSignup,
  validatePassword,
  validateRole,
} from "../middlewares/auth.middleware";
import { validateRequest } from "../utils/validateRequest";

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

export default router;
