import { AuthRequest } from "../middlewares/auth.middleware";
import * as usageReportService from "../services/usageReports.service";
import { Response, NextFunction } from "express";

export const getUserUsageReport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const ownerId = req.user.id; // assuming user ID from auth middleware
    const { startDate, endDate, groupBy = "day" } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "startDate and endDate query parameters are required.",
      });
    }

    // Validate dates
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res
        .status(400)
        .json({ message: "Invalid date format for startDate or endDate." });
    }

    console.log("Group By:", groupBy);

    if (groupBy !== "day" && groupBy !== "hour") {
      return res
        .status(400)
        .json({ message: "Invalid groupBy value. Allowed: 'day', 'hour'." });
    }

    const report = await usageReportService.generateUsageReportForUser(
      ownerId,
      start,
      end,
      groupBy as "day" | "hour"
    );

    res.json(report);
  } catch (err) {
    next(err);
  }
};
