import { redisClient, REDIS_KEYS } from "./redis.js";

// ══════════════════════════════════════════════════════════
//  REDIS ANALYTICS TRACKER
//  Tracks messages, active users, conversations, API hits
//  using Redis data structures: HyperLogLog, Sorted Sets,
//  INCR counters, and Sets.
// ══════════════════════════════════════════════════════════

const isRedisReady = () => redisClient && redisClient.status === "ready";

/**
 * Get current date string in YYYY-MM-DD format.
 */
const getDateKey = () => {
  return new Date().toISOString().split("T")[0];
};

/**
 * Get current hour key in YYYY-MM-DD-HH format.
 */
const getHourKey = () => {
  const now = new Date();
  return `${now.toISOString().split("T")[0]}-${String(now.getUTCHours()).padStart(2, "0")}`;
};

// ─── Message Analytics ───────────────────────────────────

/**
 * Track a sent message.
 * Increments total counter, hourly counter, and logs sender as active.
 */
export const trackMessage = async (senderId, receiverId) => {
  if (!isRedisReady()) return;
  try {
    const pipeline = redisClient.pipeline();

    // Increment total message counter
    pipeline.incr(REDIS_KEYS.ANALYTICS_MESSAGES_TOTAL);

    // Increment hourly message counter (expire after 48h)
    const hourKey = REDIS_KEYS.ANALYTICS_MESSAGES_HOURLY(getHourKey());
    pipeline.incr(hourKey);
    pipeline.expire(hourKey, 172800); // 48 hours

    // Track active conversation score (sorted set)
    const conversationKey = [senderId, receiverId].sort().join(":");
    pipeline.zincrby(
      REDIS_KEYS.ANALYTICS_ACTIVE_CONVERSATIONS,
      1,
      conversationKey,
    );

    // Track daily active user using a Set
    const dauKey = REDIS_KEYS.ANALYTICS_DAU(getDateKey());
    pipeline.sadd(dauKey, senderId);
    pipeline.expire(dauKey, 172800); // 48 hours

    await pipeline.exec();
  } catch (error) {
    console.error("Error tracking message:", error.message);
  }
};

/**
 * Track a user login / auth check as daily active user.
 */
export const trackDailyActiveUser = async (userId) => {
  if (!isRedisReady()) return;
  try {
    const dauKey = REDIS_KEYS.ANALYTICS_DAU(getDateKey());
    await redisClient.sadd(dauKey, userId);
    await redisClient.expire(dauKey, 172800);
  } catch (error) {
    console.error("Error tracking DAU:", error.message);
  }
};

/**
 * Track an API endpoint hit.
 */
export const trackEndpointHit = async (endpoint) => {
  if (!isRedisReady()) return;
  try {
    const key = REDIS_KEYS.ANALYTICS_ENDPOINT_HITS(endpoint);
    await redisClient.incr(key);
    await redisClient.expire(key, 86400); // 24 hours
  } catch (error) {
    console.error("Error tracking endpoint hit:", error.message);
  }
};

// ─── Analytics Retrieval ─────────────────────────────────

/**
 * Get the total message count.
 */
export const getTotalMessages = async () => {
  if (!isRedisReady()) return 0;
  try {
    const count = await redisClient.get(REDIS_KEYS.ANALYTICS_MESSAGES_TOTAL);
    return parseInt(count || "0");
  } catch (error) {
    return 0;
  }
};

/**
 * Get hourly message counts for the last N hours.
 */
export const getHourlyMessageCounts = async (hours = 24) => {
  if (!isRedisReady()) return [];
  try {
    const pipeline = redisClient.pipeline();
    const labels = [];

    for (let i = hours - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 3600000);
      const hourKey = `${date.toISOString().split("T")[0]}-${String(date.getUTCHours()).padStart(2, "0")}`;
      labels.push(hourKey);
      pipeline.get(REDIS_KEYS.ANALYTICS_MESSAGES_HOURLY(hourKey));
    }

    const results = await pipeline.exec();
    return labels.map((label, i) => ({
      hour: label,
      count: parseInt(results[i][1] || "0"),
    }));
  } catch (error) {
    console.error("Error getting hourly counts:", error.message);
    return [];
  }
};

/**
 * Get daily active user count for today.
 */
export const getDailyActiveUsers = async () => {
  if (!isRedisReady()) return 0;
  try {
    const dauKey = REDIS_KEYS.ANALYTICS_DAU(getDateKey());
    return await redisClient.scard(dauKey);
  } catch (error) {
    return 0;
  }
};

/**
 * Get top N most active conversations.
 */
export const getTopConversations = async (limit = 10) => {
  if (!isRedisReady()) return [];
  try {
    const results = await redisClient.zrevrange(
      REDIS_KEYS.ANALYTICS_ACTIVE_CONVERSATIONS,
      0,
      limit - 1,
      "WITHSCORES",
    );

    const conversations = [];
    for (let i = 0; i < results.length; i += 2) {
      conversations.push({
        participants: results[i],
        messageCount: parseInt(results[i + 1]),
      });
    }
    return conversations;
  } catch (error) {
    console.error("Error getting top conversations:", error.message);
    return [];
  }
};

/**
 * Get API endpoint hit counts.
 */
export const getEndpointHits = async (endpoints) => {
  if (!isRedisReady()) return {};
  try {
    const pipeline = redisClient.pipeline();
    endpoints.forEach((ep) => {
      pipeline.get(REDIS_KEYS.ANALYTICS_ENDPOINT_HITS(ep));
    });
    const results = await pipeline.exec();

    const hits = {};
    endpoints.forEach((ep, i) => {
      hits[ep] = parseInt(results[i][1] || "0");
    });
    return hits;
  } catch (error) {
    return {};
  }
};

/**
 * Get full analytics dashboard data.
 */
export const getAnalyticsDashboard = async () => {
  if (!isRedisReady()) return null;
  try {
    const [totalMessages, dailyActiveUsers, hourlyMessages, topConversations] =
      await Promise.all([
        getTotalMessages(),
        getDailyActiveUsers(),
        getHourlyMessageCounts(24),
        getTopConversations(10),
      ]);

    return {
      totalMessages,
      dailyActiveUsers,
      hourlyMessages,
      topConversations,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error getting analytics dashboard:", error.message);
    return null;
  }
};
