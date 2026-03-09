import { redisClient, REDIS_KEYS } from "./redis.js";

// ══════════════════════════════════════════════════════════
//  PRESENCE MANAGER — REDIS / MEMORY FALLBACK
//  Tracks online users, socket mappings, and last-seen
//  timestamps using Redis, with a fallback to memory.
// ══════════════════════════════════════════════════════════

// In-memory fallbacks if Redis is not running
const memoryUserSocketMap = {};
const memorySocketUserMap = {};
const memoryLastSeen = {};

const isRedisReady = () => redisClient && redisClient.status === "ready";

/**
 * Register a user as online with their socket ID.
 */
export const setUserOnline = async (userId, socketId) => {
  if (isRedisReady()) {
    try {
      await redisClient.hset(REDIS_KEYS.ONLINE_USERS, userId, socketId);
      await redisClient.set(REDIS_KEYS.USER_SOCKET(socketId), userId);
      await redisClient.zadd(REDIS_KEYS.LAST_SEEN, Date.now(), userId);
    } catch (error) {
      console.error("Error setting user online:", error.message);
    }
  } else {
    memoryUserSocketMap[userId] = socketId;
    memorySocketUserMap[socketId] = userId;
    memoryLastSeen[userId] = Date.now();
  }
  console.log(`🟢 User ${userId} online (socket: ${socketId})`);
};

/**
 * Remove a user from online status.
 */
export const setUserOffline = async (userId, socketId) => {
  if (isRedisReady()) {
    try {
      await redisClient.hdel(REDIS_KEYS.ONLINE_USERS, userId);
      await redisClient.del(REDIS_KEYS.USER_SOCKET(socketId));
      await redisClient.zadd(REDIS_KEYS.LAST_SEEN, Date.now(), userId);
    } catch (error) {
      console.error("Error setting user offline:", error.message);
    }
  } else {
    delete memoryUserSocketMap[userId];
    delete memorySocketUserMap[socketId];
    memoryLastSeen[userId] = Date.now();
  }
  console.log(`🔴 User ${userId} offline`);
};

/**
 * Get the socket ID for a specific user.
 * Returns null if user is offline.
 */
export const getReceiverSocketId = async (userId) => {
  if (isRedisReady()) {
    try {
      return await redisClient.hget(REDIS_KEYS.ONLINE_USERS, userId);
    } catch (error) {
      console.error("Error getting receiver socket ID:", error.message);
      return memoryUserSocketMap[userId] || null;
    }
  }
  return memoryUserSocketMap[userId] || null;
};

/**
 * Get user ID from a socket ID (reverse lookup for disconnects).
 */
export const getUserIdFromSocket = async (socketId) => {
  if (isRedisReady()) {
    try {
      return await redisClient.get(REDIS_KEYS.USER_SOCKET(socketId));
    } catch (error) {
      console.error("Error getting user ID from socket:", error.message);
      return memorySocketUserMap[socketId] || null;
    }
  }
  return memorySocketUserMap[socketId] || null;
};

/**
 * Get all online user IDs.
 * Returns an array of user ID strings.
 */
export const getOnlineUsers = async () => {
  if (isRedisReady()) {
    try {
      const users = await redisClient.hkeys(REDIS_KEYS.ONLINE_USERS);
      return users;
    } catch (error) {
      console.error("Error getting online users:", error.message);
      return Object.keys(memoryUserSocketMap);
    }
  }
  return Object.keys(memoryUserSocketMap);
};

/**
 * Get the count of online users.
 */
export const getOnlineUserCount = async () => {
  if (isRedisReady()) {
    try {
      return await redisClient.hlen(REDIS_KEYS.ONLINE_USERS);
    } catch (error) {
      console.error("Error getting online user count:", error.message);
      return Object.keys(memoryUserSocketMap).length;
    }
  }
  return Object.keys(memoryUserSocketMap).length;
};

/**
 * Get last seen timestamp for a user.
 * Returns epoch milliseconds or null.
 */
export const getLastSeen = async (userId) => {
  if (isRedisReady()) {
    try {
      const score = await redisClient.zscore(REDIS_KEYS.LAST_SEEN, userId);
      return score ? parseInt(score) : null;
    } catch (error) {
      console.error("Error getting last seen:", error.message);
      return memoryLastSeen[userId] || null;
    }
  }
  return memoryLastSeen[userId] || null;
};

/**
 * Get last seen timestamps for multiple users.
 * Returns { userId: timestamp } object.
 */
export const getMultipleLastSeen = async (userIds) => {
  if (isRedisReady()) {
    try {
      const pipeline = redisClient.pipeline();
      userIds.forEach((id) => {
        pipeline.zscore(REDIS_KEYS.LAST_SEEN, id);
      });
      const results = await pipeline.exec();

      const lastSeenMap = {};
      userIds.forEach((id, index) => {
        const [err, score] = results[index];
        lastSeenMap[id] = err ? null : score ? parseInt(score) : null;
      });
      return lastSeenMap;
    } catch (error) {
      console.error("Error getting multiple last seen:", error.message);
      return userIds.reduce((acc, id) => {
        acc[id] = memoryLastSeen[id] || null;
        return acc;
      }, {});
    }
  }

  return userIds.reduce((acc, id) => {
    acc[id] = memoryLastSeen[id] || null;
    return acc;
  }, {});
};

/**
 * Check if a specific user is online.
 */
export const isUserOnline = async (userId) => {
  if (isRedisReady()) {
    try {
      const exists = await redisClient.hexists(REDIS_KEYS.ONLINE_USERS, userId);
      return exists === 1;
    } catch (error) {
      return !!memoryUserSocketMap[userId];
    }
  }
  return !!memoryUserSocketMap[userId];
};

/**
 * Clean up stale presence data (utility for maintenance).
 */
export const cleanupPresence = async () => {
  if (isRedisReady()) {
    try {
      const allOnline = await redisClient.hgetall(REDIS_KEYS.ONLINE_USERS);
      let cleaned = 0;

      for (const [userId, socketId] of Object.entries(allOnline)) {
        const exists = await redisClient.exists(
          REDIS_KEYS.USER_SOCKET(socketId),
        );
        if (!exists) {
          await redisClient.hdel(REDIS_KEYS.ONLINE_USERS, userId);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.log(`🧹 Cleaned ${cleaned} stale presence entries`);
      }
      return cleaned;
    } catch (error) {
      console.error("Error cleaning up presence:", error.message);
      return 0;
    }
  }
  return 0;
};
