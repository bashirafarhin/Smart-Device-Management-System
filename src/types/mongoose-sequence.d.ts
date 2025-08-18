declare module "mongoose-sequence" {
  import { Mongoose, Schema } from "mongoose";

  // The plugin function
  export default function mongooseSequence(
    mongoose: Mongoose
  ): (
    schema: Schema,
    options?: { inc_field?: string; id?: string; start_seq?: number }
  ) => void;
}
