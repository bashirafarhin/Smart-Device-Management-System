import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { errorHandler } from "./utils/errorHandler";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.route";
dotenv.config();

const app = express();

app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/auth", authRoutes);
app.use(errorHandler);

app.get("/", (_req, res) => {
  res.send("Server is running");
});

export default app;
