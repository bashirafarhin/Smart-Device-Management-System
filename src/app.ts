import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { errorHandler } from "./utils/errorHandler";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.route";
import deviceRoutes from "./routes/device.route";
import { serve } from "inngest/express";
import { inngest, functions } from "./backgroundJobs/inngest/index";
import { requestLogger } from "./middlewares/requestLogger.middleware";
import { responseTimeLogger } from "./middlewares/responseTimeLogger.middleware";
dotenv.config();

const app = express();

app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.FRONTEND_URL
        : "http://localhost:3000",
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// background job route handler
app.use("/api/inngest", serve({ client: inngest, functions }));

app.use(requestLogger);
app.use(responseTimeLogger);

app.use("/auth", authRoutes);
app.use("/devices", deviceRoutes);

app.use(errorHandler);

app.get("/", (_req, res) => {
  res.send("Server is running");
});

export default app;
