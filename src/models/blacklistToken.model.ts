import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IBlacklistToken extends Document {
  token: string;
  type: "access" | "refresh";
  userId: number;
  expiresAt: Date;
  createdAt: Date;
}

const BlacklistTokenSchema: Schema<IBlacklistToken> = new Schema(
  {
    token: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ["access", "refresh"], required: true },
    userId: {
      type: Number,
      ref: "User",
      required: true,
      index: true,
    },
    expiresAt: { type: Date, required: true },
  },
  {
    timestamps: true,
  }
);

BlacklistTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const BlacklistToken: Model<IBlacklistToken> =
  mongoose.models.BlacklistToken ||
  mongoose.model<IBlacklistToken>("BlacklistToken", BlacklistTokenSchema);

export default BlacklistToken;
