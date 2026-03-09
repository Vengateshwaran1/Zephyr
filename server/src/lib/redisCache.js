import { redisClient, REDIS_KEYS } from "./redis.js";

// ══════════════════════════════════════════════════════════
//  REDIS CACHING LAYER
//  Provides get/set/invalidate for Users, Messages, Sidebar
// ══════════════════════════════════════════════════════════

const TTL = {
  USER_PROFILE: 300, // 5 minutes
  SIDEBAR_USERS: 120, // 2 minutes
  MESSAGE_HISTORY: 180, // 3 minutes
  AUTH_CHECK: 60, // 1 minute
};

const isRedisReady = () => redisClient && redisClient.status === "ready";

// ─── Generic Cache Helpers ───────────────────────────────

/**
 * Get cached JSON data by key.
 * Returns parsed object or null if miss.
 */
export const cacheGet = async (key) => {
  if (!isRedisReady()) return null;
  try {
    const data = await redisClient.get(key);
    if (data) {
      console.log(`🟢 Cache HIT: ${key}`);
      return JSON.parse(data);
    }
    console.log(`🔴 Cache MISS: ${key}`);
    return null;
  } catch (error) {
    console.error("Cache get error:", error.message);
    return null;
  }
};

/**
 * Set JSON data in cache with TTL (seconds).
 */
export const cacheSet = async (key, data, ttl) => {
  if (!isRedisReady()) return;
  try {
    await redisClient.setex(key, ttl, JSON.stringify(data));
    console.log(`💾 Cache SET: ${key} (TTL: ${ttl}s)`);
  } catch (error) {
    console.error("Cache set error:", error.message);
  }
};

/**
 * Delete a cache key (invalidation).
 */
export const cacheDelete = async (key) => {
  if (!isRedisReady()) return;
  try {
    await redisClient.del(key);
    console.log(`🗑️ Cache DEL: ${key}`);
  } catch (error) {
    console.error("Cache delete error:", error.message);
  }
};

/**
 * Delete all keys matching a pattern (e.g. "cache:sidebar:*").
 */
export const cacheDeletePattern = async (pattern) => {
  if (!isRedisReady()) return;
  try {
    let cursor = "0";
    do {
      const [newCursor, keys] = await redisClient.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100,
      );
      cursor = newCursor;
      if (keys.length > 0) {
        await redisClient.del(...keys);
        console.log(`🗑️ Cache DEL pattern "${pattern}": ${keys.length} keys`);
      }
    } while (cursor !== "0");
  } catch (error) {
    console.error("Cache delete pattern error:", error.message);
  }
};

// ─── User Cache ──────────────────────────────────────────

export const getCachedUser = async (userId) => {
  return cacheGet(REDIS_KEYS.USER_CACHE(userId));
};

export const setCachedUser = async (userId, userData) => {
  return cacheSet(REDIS_KEYS.USER_CACHE(userId), userData, TTL.USER_PROFILE);
};

export const invalidateUserCache = async (userId) => {
  await cacheDelete(REDIS_KEYS.USER_CACHE(userId));
  // Also invalidate all sidebar caches since user data changed
  await cacheDeletePattern("cache:sidebar:*");
};

// ─── Sidebar Users Cache ─────────────────────────────────

export const getCachedSidebarUsers = async (userId) => {
  return cacheGet(REDIS_KEYS.USERS_SIDEBAR(userId));
};

export const setCachedSidebarUsers = async (userId, users) => {
  return cacheSet(REDIS_KEYS.USERS_SIDEBAR(userId), users, TTL.SIDEBAR_USERS);
};

// ─── Message History Cache ───────────────────────────────

export const getCachedMessages = async (userId1, userId2) => {
  return cacheGet(REDIS_KEYS.MESSAGES_CACHE(userId1, userId2));
};

export const setCachedMessages = async (userId1, userId2, messages) => {
  return cacheSet(
    REDIS_KEYS.MESSAGES_CACHE(userId1, userId2),
    messages,
    TTL.MESSAGE_HISTORY,
  );
};

export const invalidateMessageCache = async (userId1, userId2) => {
  return cacheDelete(REDIS_KEYS.MESSAGES_CACHE(userId1, userId2));
};

// ─── Cache Stats ─────────────────────────────────────────

export const getCacheStats = async () => {
  try {
    const info = await redisClient.info("stats");
    const keyspace = await redisClient.info("keyspace");
    const dbSize = await redisClient.dbsize();

    // Parse hit/miss from info
    const hitsMatch = info.match(/keyspace_hits:(\d+)/);
    const missesMatch = info.match(/keyspace_misses:(\d+)/);
    const hits = hitsMatch ? parseInt(hitsMatch[1]) : 0;
    const misses = missesMatch ? parseInt(missesMatch[1]) : 0;
    const hitRate =
      hits + misses > 0 ? ((hits / (hits + misses)) * 100).toFixed(2) : 0;

    return {
      totalKeys: dbSize,
      hits,
      misses,
      hitRate: `${hitRate}%`,
      keyspace,
    };
  } catch (error) {
    console.error("Cache stats error:", error.message);
    return null;
  }
};

export { TTL };
