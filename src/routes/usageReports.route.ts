import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";

import { getUserUsageReport } from "../controllers/usageReports.controller";
const router = Router();

router.get("/", authMiddleware, getUserUsageReport);

export default router;
