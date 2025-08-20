import app from "./app";
import connectDB from "./db/connection";
import { connectRedis } from "./config/redis";
const PORT = process.env.PORT;

async function startServer() {
  try {
    await connectDB();
    await connectRedis();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server", err);
    process.exit(1);
  }
}
startServer();
