import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Shared connection options — non-blocking on failure
const redisOptions = {
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false, // Don't block on ready check
  lazyConnect: false, // Allow auto-connect (needed for BullMQ)
  retryStrategy(times) {
    if (times > 20) {
      // Stop retrying after 20 attempts, avoid spam
      return null;
    }
    return Math.min(times * 300, 3000);
  },
};

// Main Redis client — for general commands (GET, SET, HSET, etc.)
const redisClient = new Redis(REDIS_URL, redisOptions);

// Subscriber client — dedicated for Pub/Sub
const redisSubscriber = new Redis(REDIS_URL, redisOptions);

// Publisher client — dedicated for Pub/Sub publishing
const redisPublisher = new Redis(REDIS_URL, redisOptions);

// Connection event handlers — only log meaningful events
redisClient.on("connect", () => console.log("✅ Redis main client connected"));
redisClient.on("ready", () => console.log("✅ Redis main client ready"));
redisClient.on("error", (err) => {
  if (!err.message.includes("ECONNREFUSED")) {
    console.error("❌ Redis main client error:", err.message);
  }
});
redisClient.on("close", () => console.log("🔴 Redis main client disconnected"));

redisSubscriber.on("connect", () =>
  console.log("✅ Redis subscriber connected"),
);
redisSubscriber.on("error", (err) => {
  if (!err.message.includes("ECONNREFUSED")) {
    console.error("❌ Redis subscriber error:", err.message);
  }
});

redisPublisher.on("connect", () => console.log("✅ Redis publisher connected"));
redisPublisher.on("error", (err) => {
  if (!err.message.includes("ECONNREFUSED")) {
    console.error("❌ Redis publisher error:", err.message);
  }
});

// Redis key namespace — organized and consistent
export const REDIS_KEYS = {
  // Cache
  USER_CACHE: (userId) => `cache:user:${userId}`,
  USERS_SIDEBAR: (userId) => `cache:sidebar:${userId}`,
  MESSAGES_CACHE: (id1, id2) => {
    const [a, b] = [id1, id2].sort();
    return `cache:messages:${a}:${b}`;
  },

  // Presence
  ONLINE_USERS: "presence:online",
  USER_SOCKET: (socketId) => `presence:socket:${socketId}`,
  LAST_SEEN: "presence:lastseen",

  // Typing
  TYPING: (chatRoomId) => `typing:${chatRoomId}`,

  // Rate limiting
  RATE_LIMIT: (identifier, endpoint) => `ratelimit:${endpoint}:${identifier}`,

  // Read receipts
  READ_RECEIPT: (messageId) => `read:${messageId}`,

  // Analytics
  ANALYTICS_MESSAGES_HOURLY: (hour) => `analytics:messages:hourly:${hour}`,
  ANALYTICS_DAU: (date) => `analytics:dau:${date}`,
  ANALYTICS_ACTIVE_CONVERSATIONS: "analytics:active_conversations",
  ANALYTICS_ENDPOINT_HITS: (endpoint) => `analytics:hits:${endpoint}`,
  ANALYTICS_MESSAGES_TOTAL: "analytics:messages:total",
};

// Health check — returns true if Redis responds to PING
export const checkRedisHealth = async () => {
  try {
    if (redisClient.status !== "ready") return false;
    const pong = await redisClient.ping();
    return pong === "PONG";
  } catch {
    return false;
  }
};

// Graceful shutdown — quit all three clients
export const closeRedisConnections = async () => {
  console.log("🔌 Closing Redis connections...");
  try {
    await redisClient.quit();
  } catch {}
  try {
    await redisSubscriber.quit();
  } catch {}
  try {
    await redisPublisher.quit();
  } catch {}
  console.log("✅ All Redis connections closed");
};

export { redisClient, redisSubscriber, redisPublisher };
