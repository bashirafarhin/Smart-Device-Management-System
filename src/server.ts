import http from "http";
import app from "./app";
import connectDB from "./db/connection";
import { connectRedis } from "./config/redis.config";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import { TokenPayload } from "./types/tokens";

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectDB();
    await connectRedis();
    const server = http.createServer(app);

    const io = new SocketIOServer(server, {
      cors: { origin: "*" },
    });

    io.use((socket, next) => {
      const token = socket.handshake.headers.auth;
      if (!token) {
        return next(new Error("Authentication error: missing token"));
      }
      try {
        const decoded = jwt.verify(
          token,
          process.env.ACCESS_TOKEN_SECRET as string
        ) as TokenPayload;
        // (socket as any).user = decoded;
        console.log(`Authenticated user: ${decoded.email}`);
        next();
      } catch {
        next(new Error("Authentication error: invalid token"));
      }
    });

    io.on("connection", (socket) => {
      console.log(`User connected: ${(socket as any).user.id}`);

      socket.on("disconnect", (reason) => {
        console.log(
          `User disconnected: ${(socket as any).user.id}, reason: ${reason}`
        );
      });
    });

    server.listen(PORT, () => {
      console.log(`Server and WebSocket running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server", err);
    process.exit(1);
  }
}

startServer();
