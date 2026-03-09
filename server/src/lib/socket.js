import { Server } from "socket.io";
import http from "http";
import express from "express";
import {
  setUserOnline,
  setUserOffline,
  getOnlineUsers,
  getReceiverSocketId as getReceiverSocketIdFromPresence,
} from "./presenceManager.js";

// ══════════════════════════════════════════════════════════
//  SOCKET.IO SERVER
//  Always works with in-memory presence.
//  Redis presence (via presenceManager) enriches it when
//  Redis is available, enabling multi-instance scaling.
// ══════════════════════════════════════════════════════════

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
    credentials: true,
  },
});

// ─── Try to attach Redis adapter (optional, non-blocking) ──
// Only attempt if Redis is available — does NOT block startup
const attachRedisAdapter = async () => {
  try {
    const { createAdapter } = await import("@socket.io/redis-adapter");
    const Redis = (await import("ioredis")).default;

    const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

    const pub = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      enableReadyCheck: false,
      lazyConnect: true,
    });
    const sub = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      enableReadyCheck: false,
      lazyConnect: true,
    });

    await Promise.all([pub.connect(), sub.connect()]);

    io.adapter(createAdapter(pub, sub));
    console.log("✅ Socket.IO Redis adapter attached (multi-instance mode)");
  } catch (err) {
    console.log(
      "ℹ️  Redis adapter not available, using default in-memory adapter:",
      err.message,
    );
  }
};

// Attach in background - never block socket startup
attachRedisAdapter();

// ─── Export for controllers ──────────────────────────────

export async function getReceiverSocketId(userId) {
  return await getReceiverSocketIdFromPresence(userId);
}

// ─── Socket Connection Handling ──────────────────────────

io.on("connection", async (socket) => {
  const userId = socket.handshake.query.userId;
  console.log(`🔌 Socket connected: ${socket.id} (user: ${userId})`);

  if (userId && userId !== "undefined") {
    await setUserOnline(userId, socket.id);

    // Broadcast updated online user list to all connected clients
    const onlineUsers = await getOnlineUsers();
    io.emit("getOnlineUsers", onlineUsers);
  }

  // ─── Typing Indicators ──────────────────────────────

  socket.on("typing", async ({ targetUserId }) => {
    if (!userId || !targetUserId) return;
    const targetSocketId = await getReceiverSocketIdFromPresence(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("userTyping", { userId, isTyping: true });
    }
  });

  socket.on("stopTyping", async ({ targetUserId }) => {
    if (!userId || !targetUserId) return;
    const targetSocketId = await getReceiverSocketIdFromPresence(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("userTyping", { userId, isTyping: false });
    }
  });

  // ─── Message Read Receipts ─────────────────────────

  socket.on("messageRead", async ({ messageId, senderId }) => {
    if (!userId || !senderId) return;

    try {
      // Persist read receipt to DB
      const { default: Message } = await import("../models/message.model.js");
      await Message.findByIdAndUpdate(messageId, {
        isRead: true,
        readAt: new Date(),
      });

      // Notify the sender in real-time
      const senderSocketId = await getReceiverSocketIdFromPresence(senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit("messageReadReceipt", {
          messageId,
          readBy: userId,
          readAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("messageRead error:", err.message);
    }
  });

  // ─── Disconnect ────────────────────────────────────

  socket.on("disconnect", async () => {
    console.log(`🔌 Socket disconnected: ${socket.id} (user: ${userId})`);

    if (userId && userId !== "undefined") {
      await setUserOffline(userId, socket.id);

      const onlineUsers = await getOnlineUsers();
      io.emit("getOnlineUsers", onlineUsers);
    }
  });
});

export { io, app, server };
