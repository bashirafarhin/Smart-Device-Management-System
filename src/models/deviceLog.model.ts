import mongoose, { Schema, Document, Model } from "mongoose";
import mongooseSequence from "mongoose-sequence";

const AutoIncrement = mongooseSequence(mongoose);

export interface IDeviceLog extends Document {
  id: number;
  device_id: number;
  event: string;
  value: number;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceLogSchema: Schema<IDeviceLog> = new Schema<IDeviceLog>(
  {
    id: { type: Number, unique: true },
    device_id: { type: Number, required: true, ref: "Device" },
    event: { type: String, required: true, trim: true },
    value: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

DeviceLogSchema.plugin(AutoIncrement, { inc_field: "id" });

const DeviceLog: Model<IDeviceLog> = mongoose.model<IDeviceLog>(
  "DeviceLog",
  DeviceLogSchema
);

export default DeviceLog;
