import mongoose, { Schema, Document, Model } from "mongoose";
import mongooseSequence from "mongoose-sequence";

const AutoIncrement = mongooseSequence(mongoose);

export interface IDevice extends Document {
  id: number;
  name: string;
  type: "light" | "thermostat" | "meter" | "camera" | "lock";
  status: "active" | "inactive";
  owner_id: number;
  last_active_at?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceSchema: Schema<IDevice> = new Schema<IDevice>(
  {
    id: { type: Number, unique: true },
    name: {
      type: String,
      required: [true, "Device name is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["light", "thermostat", "meter", "camera", "lock"],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "inactive",
    },
    owner_id: {
      type: Number,
      required: true,
      ref: "User",
    },
    last_active_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Auto-increment for "id"
DeviceSchema.plugin(AutoIncrement, {
  inc_field: "id",
  id: "device_id_counter",
});

const Device: Model<IDevice> =
  mongoose.models.Device || mongoose.model<IDevice>("Device", DeviceSchema);
export default Device;
