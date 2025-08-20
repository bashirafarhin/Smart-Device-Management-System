import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { errorHandler } from "./utils/errorHandler";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.route";
import deviceRoutes from "./routes/device.route";
import { serve } from "inngest/express";
import { inngest, functions } from "./jobs/inngest/index";
import { rateLimiter } from "./middlewares/rateLimiter";
import { requestLogger } from "./middlewares/requestLogger";
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
app.use(requestLogger);
app.use("/auth", authRoutes);
app.use("/devices", deviceRoutes);

// background job route handler
app.use("/api/inngest", serve({ client: inngest, functions }));

app.use(errorHandler);

app.get("/", (_req, res) => {
  res.send("Server is running");
});

export default app;
