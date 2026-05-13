// ══════════════════════════════════════════════════════════
//  BULLMQ MESSAGE QUEUES
//  Background job processing for:
//    1. Image upload to Cloudinary
//    2. Notification dispatch (future)
//  NOTE: These only activate when Redis is running.
//        The app works fully without Redis — just without queues.
// ══════════════════════════════════════════════════════════

import cloudinary from "./cloudinary.js";
import Message from "../models/message.model.js";
import { invalidateMessageCache } from "./redisCache.js";
import { io, getReceiverSocketId } from "./socket.js";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let connection = { maxRetriesPerRequest: null };

try {
  const parsedUrl = new URL(REDIS_URL);
  connection = {
    host: parsedUrl.hostname,
    port: parseInt(parsedUrl.port || "6379"),
    password: parsedUrl.password || undefined,
    username: parsedUrl.username || undefined,
    tls: parsedUrl.protocol === "rediss:" ? {} : undefined,
    maxRetriesPerRequest: null,
  };
} catch (err) {
  console.error("Error parsing REDIS_URL for BullMQ", err);
}

let imageQueue = null;
let notificationQueue = null;
let imageWorker = null;
let notificationWorker = null;

// Lazy-initialize queues only if Redis is reachable
const initQueues = async () => {
  try {
    const { Queue, Worker } = await import("bullmq");

    imageQueue = new Queue("image-processing", { connection });
    notificationQueue = new Queue("notifications", { connection });

    // Test connection
    await imageQueue.getWorkers();

    imageWorker = new Worker(
      "image-processing",
      async (job) => {
        const { messageId, imageData, senderId, receiverId, groupId } = job.data;
        console.log(`🖼️  Processing image for message ${messageId}...`);

        const uploadResponse = await cloudinary.uploader.upload(imageData, {
          folder: "zephyr_messages",
          resource_type: "auto",
          quality: "auto:good",
          fetch_format: "auto",
        });

        await Message.findByIdAndUpdate(messageId, {
          image: uploadResponse.secure_url,
        });

        if (groupId) {
          // Emit socket event to the entire group room so UI updates asynchronously
          io.to(groupId).emit("messageUpdated", { messageId, image: uploadResponse.secure_url });
        } else if (receiverId) {
          await invalidateMessageCache(senderId, receiverId);
          
          // Emit socket event to both sender and receiver
          const recvSocketId = await getReceiverSocketId(receiverId);
          const sendSocketId = await getReceiverSocketId(senderId);
          
          if (recvSocketId) io.to(recvSocketId).emit("messageUpdated", { messageId, image: uploadResponse.secure_url });
          if (sendSocketId) io.to(sendSocketId).emit("messageUpdated", { messageId, image: uploadResponse.secure_url });
        }

        console.log(`✅ Image processed for message ${messageId}`);
        return { messageId, imageUrl: uploadResponse.secure_url };
      },
      { connection, concurrency: 3 },
    );

    notificationWorker = new Worker(
      "notifications",
      async (job) => {
        const { type, recipientId } = job.data;
        console.log(`🔔 Notification: ${type} → ${recipientId}`);
        return { success: true };
      },
      { connection, concurrency: 5 },
    );

    imageWorker.on("completed", (job) =>
      console.log(`✅ Image job ${job.id} done`),
    );
    imageWorker.on("failed", (job, err) =>
      console.error(`❌ Image job ${job?.id} failed: ${err.message}`),
    );

    console.log("✅ BullMQ queues initialized");
  } catch (err) {
    console.log(
      "ℹ️  BullMQ queues not available (Redis offline):",
      err.message,
    );
    imageQueue = null;
    notificationQueue = null;
  }
};

// Initialize in background — never block server startup
initQueues();

// ─── Helper Functions ────────────────────────────────────

/**
 * Queue an image for background Cloudinary upload.
 */
export const queueImageUpload = async (
  messageId,
  imageData,
  senderId,
  receiverId = null,
  groupId = null,
) => {
  if (!imageQueue) return null;
  try {
    const job = await imageQueue.add(
      "upload-image",
      { messageId, imageData, senderId, receiverId, groupId },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    );
    console.log(`📤 Image queued: job ${job.id}`);
    return job;
  } catch (err) {
    console.error("queueImageUpload error:", err.message);
    return null;
  }
};

/**
 * Queue a notification.
 */
export const queueNotification = async (type, recipientId, data = {}) => {
  if (!notificationQueue) return null;
  try {
    return await notificationQueue.add(
      type,
      { type, recipientId, data },
      { attempts: 2, removeOnComplete: 100, removeOnFail: 50 },
    );
  } catch (err) {
    console.error("queueNotification error:", err.message);
    return null;
  }
};

/**
 * Get queue statistics for the analytics dashboard.
 */
export const getQueueStats = async () => {
  if (!imageQueue) return { imageQueue: {}, notificationQueue: {} };
  try {
    const [iw, ia, ic, ifail] = await Promise.all([
      imageQueue.getWaitingCount(),
      imageQueue.getActiveCount(),
      imageQueue.getCompletedCount(),
      imageQueue.getFailedCount(),
    ]);
    const [nw, na, nc, nfail] = await Promise.all([
      notificationQueue.getWaitingCount(),
      notificationQueue.getActiveCount(),
      notificationQueue.getCompletedCount(),
      notificationQueue.getFailedCount(),
    ]);
    return {
      imageQueue: { waiting: iw, active: ia, completed: ic, failed: ifail },
      notificationQueue: {
        waiting: nw,
        active: na,
        completed: nc,
        failed: nfail,
      },
    };
  } catch (err) {
    return { imageQueue: {}, notificationQueue: {} };
  }
};

/**
 * Graceful shutdown — close workers then queues.
 */
export const closeQueues = async () => {
  console.log("🔌 Closing BullMQ workers...");
  try {
    if (imageWorker) await imageWorker.close();
  } catch {}
  try {
    if (notificationWorker) await notificationWorker.close();
  } catch {}
  try {
    if (imageQueue) await imageQueue.close();
  } catch {}
  try {
    if (notificationQueue) await notificationQueue.close();
  } catch {}
  console.log("✅ BullMQ queues closed");
};
