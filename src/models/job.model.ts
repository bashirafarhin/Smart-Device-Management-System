import mongoose, { Schema, Document, Model } from "mongoose";

export interface IJob extends Document {
  jobId: string;
  userId: string;
  deviceId: string;
  startDate: string;
  endDate: string;
  format: string;
  status: "accepted" | "queued" | "processing" | "completed" | "failed";
  fileUrl?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema: Schema = new Schema<IJob>(
  {
    jobId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    deviceId: { type: String, required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    format: { type: String, required: true, enum: ["json", "csv"] },
    status: {
      type: String,
      required: true,
      enum: ["accepted", "queued", "processing", "completed", "failed"],
      default: "accepted",
    },
    fileUrl: { type: String },
    error: { type: String },
  },
  { timestamps: true }
);

const Job: Model<IJob> =
  mongoose.models.Job || mongoose.model<IJob>("Job", JobSchema);

export default Job;
