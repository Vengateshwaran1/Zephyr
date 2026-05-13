import { Server } from "socket.io";
import http from "http";
import express from "express";
import {
  setUserOnline,
  setUserOffline,
  getOnlineUsers,
  getReceiverSocketId as getReceiverSocketIdFromPresence,
} from "./presenceManager.js";
import { redisClient, REDIS_KEYS } from "./redis.js";
import { updateLastSeen } from "./lastSeenTracker.js";

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
    origin: process.env.NODE_ENV === "production"
      ? (process.env.CLIENT_URL || "*")
      : ["http://localhost:5173"],
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
    await updateLastSeen(userId); // Update last-seen timestamp on connect

    // Broadcast updated online user list to all connected clients
    const onlineUsers = await getOnlineUsers();
    io.emit("getOnlineUsers", onlineUsers);
  }

  // ─── Group Chat ─────────────────────────────────────

  socket.on("joinGroup", (groupId) => {
    socket.join(groupId);
    console.log(`👥 User ${userId} joined group: ${groupId}`);
  });

  socket.on("leaveGroup", (groupId) => {
    socket.leave(groupId);
    console.log(`👥 User ${userId} left group: ${groupId}`);
  });

  // ─── Group "Seen By" ─────────────────────────────────
  // When a user opens a group chat, mark recent messages as seen
  socket.on("viewingGroupChat", async ({ groupId, messageIds }) => {
    if (!userId || !groupId || !messageIds?.length) return;
    try {
      const { markMessagesBulkSeen, getBulkSeenCounts } = await import("./groupSeenTracker.js");
      // Mark all provided messages as seen by this user (Redis Pipeline)
      await markMessagesBulkSeen(messageIds, userId);
      // Fetch updated seen counts for all messages
      const seenMap = await getBulkSeenCounts(messageIds);
      // Broadcast updated seen counts to the whole group room
      io.to(groupId).emit("groupSeenUpdate", { groupId, seenMap });
    } catch (err) {
      console.error("viewingGroupChat error:", err.message);
    }
  });

  // ─── Typing Indicators ──────────────────────────────

  socket.on("typing", async ({ targetUserId, groupId }) => {
    if (!userId) return;

    if (groupId) {
      // Group Typing (Enterprise: Store in Redis with TTL)
      const typingKey = REDIS_KEYS.TYPING(groupId);
      await redisClient.sadd(typingKey, userId);
      await redisClient.expire(typingKey, 5); // Auto-expire after 5s of inactivity

      // Broadcast to group members EXCLUDING the sender
      socket.to(groupId).emit("userTyping", { userId, groupId, isTyping: true });
    } else if (targetUserId) {
      // DM Typing
      const targetSocketId =
        await getReceiverSocketIdFromPresence(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("userTyping", { userId, isTyping: true });
      }
    }
  });

  socket.on("stopTyping", async ({ targetUserId, groupId }) => {
    if (!userId) return;

    if (groupId) {
      const typingKey = REDIS_KEYS.TYPING(groupId);
      await redisClient.srem(typingKey, userId);

      socket.to(groupId).emit("userTyping", { userId, groupId, isTyping: false });
    } else if (targetUserId) {
      const targetSocketId =
        await getReceiverSocketIdFromPresence(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("userTyping", { userId, isTyping: false });
      }
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
      await updateLastSeen(userId); // Record last-seen on disconnect

      const onlineUsers = await getOnlineUsers();
      io.emit("getOnlineUsers", onlineUsers);
    }
  });
});

export { io, app, server };
