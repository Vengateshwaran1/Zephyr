import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";

import { connectDB } from "./lib/db.js";
import { checkRedisHealth, closeRedisConnections } from "./lib/redis.js";
import { closeQueues } from "./lib/messageQueue.js";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import analyticsRoutes from "./routes/analytics.route.js";
import { app, server } from "./lib/socket.js";

dotenv.config();

const PORT = process.env.PORT;
const __dirname = path.resolve();

app.use(express.json({ limit: "10mb" })); // Increased for base64 images
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

// ─── API Routes ──────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/analytics", analyticsRoutes);

// ─── Production Static Serving ───────────────────────────
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client", "dist", "index.html"));
  });
}

// ─── Server Startup ──────────────────────────────────────
server.listen(PORT, async () => {
  console.log("═══════════════════════════════════════════");
  console.log("  🌀 Zephyr Server Starting...");
  console.log("═══════════════════════════════════════════");
  console.log(`  📡 Server running on PORT: ${PORT}`);

  // Connect to MongoDB
  await connectDB();

  // Check Redis health
  const redisHealthy = await checkRedisHealth();
  if (redisHealthy) {
    console.log("  ✅ Redis connected and healthy");
  } else {
    console.warn("  ⚠️ Redis not available — some features may be degraded");
  }

  console.log("═══════════════════════════════════════════");
  console.log("  Redis Features Active:");
  console.log("    📡 Pub/Sub Message Bus");
  console.log("    ⚡ Response Caching (User, Messages)");
  console.log("    🛡️ Sliding Window Rate Limiting");
  console.log("    🟢 Online Presence (Redis Hash)");
  console.log("    📬 BullMQ Job Queues (Image, Notif)");
  console.log("    ⌨️  Typing Indicators (Auto-Expire)");
  console.log("    ✅ Message Read Receipts");
  console.log("    📊 Analytics (DAU, Hourly, Top Chats)");
  console.log("    🔄 Socket.IO Redis Adapter");
  console.log("═══════════════════════════════════════════");
});

// ─── Graceful Shutdown ───────────────────────────────────
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 ${signal} received. Starting graceful shutdown...`);

  // Close the HTTP server first (stop accepting new connections)
  server.close(async () => {
    console.log("  ✅ HTTP server closed");

    try {
      // Close BullMQ workers and queues
      await closeQueues();
      console.log("  ✅ BullMQ queues closed");
    } catch (e) {
      console.error("  ❌ Error closing queues:", e.message);
    }

    try {
      // Close Redis connections
      await closeRedisConnections();
      console.log("  ✅ Redis connections closed");
    } catch (e) {
      console.error("  ❌ Error closing Redis:", e.message);
    }

    console.log("  👋 Zephyr server shut down gracefully");
    process.exit(0);
  });

  // Force exit after 10 seconds if graceful shutdown stalls
  setTimeout(() => {
    console.error("  ⚠️ Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
