import mongoose from "mongoose";
import { AppError } from "../utils/errorHandler";

const connectDB = async (): Promise<void> => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new AppError(
        "MONGODB_URI is not defined in environment variables",
        500
      );
    }
    mongoose.set("strictQuery", true);
    await mongoose.connect(uri, {
      maxPoolSize: 10, // limit connections on free tier
      minPoolSize: 2,
    });
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    throw new AppError("Failed to connect to MongoDB", 500);
  }
};

export default connectDB;
