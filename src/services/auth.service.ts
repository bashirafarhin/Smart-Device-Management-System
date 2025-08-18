import User from "../models/user.model";
import { AppError } from "../utils/errorHandler";
import { generateToken } from "../utils/jwt";

export const registerUser = async (data: {
  name: string;
  email: string;
  password: string;
  role: string;
}) => {
  const existingUser = await User.findOne({ email: data.email });
  if (existingUser) throw new AppError("Email already exists", 400);
  const user = await User.create(data);
  return { message: "User registered successfully", user };
};

export const loginUser = async (email: string, password: string) => {
  const user = await User.findOne({ email });
  if (!user) throw new AppError("Invalid email or password", 401);

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new AppError("Invalid email or password", 401);

  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    success: true,
    token,
    user: {
      id: "u" + user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};
