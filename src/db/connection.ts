import mongoose from "mongoose";
import { AppError } from "../utils/authHandler";

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new AppError(
        "MONGODB_URI is not defined in environment variables",
        500
      );
    }
    await mongoose.connect(uri);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    throw new AppError("Failed to connect to MongoDB", 500);
  }
};

export default connectDB;
