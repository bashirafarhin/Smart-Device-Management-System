import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcryptjs";
import mongooseSequence from "mongoose-sequence";

const AutoIncrement = mongooseSequence(mongoose);

export interface IUser extends Document {
  id: number;
  name: string;
  email: string;
  password: string;
  role: "user";
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema: Schema<IUser> = new Schema<IUser>(
  {
    id: {
      type: Number,
      unique: true,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["user"],
      default: "user",
    },
  },
  {
    timestamps: true,
  }
);

// plugin for auto-increment userId
UserSchema.plugin(AutoIncrement, { inc_field: "id", id: "user_id_counter" });

// hash password before save
UserSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// compare passwords
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User: Model<IUser> = mongoose.model<IUser>("User", UserSchema);
export default User;
