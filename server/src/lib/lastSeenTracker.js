import { redisClient, REDIS_KEYS } from "./redis.js";

// ══════════════════════════════════════════════════════════
//  LAST SEEN TRACKER — REDIS SORTED SET
//
//  Key: presence:lastseen  (single global Sorted Set)
//  Structure: ZADD presence:lastseen {timestamp} {userId}
//
//  Why Sorted Set?
//  - Score = Unix timestamp in milliseconds
//  - ZADD overwrites score on every update (O log N)
//  - ZSCORE to get exact last-seen time for one user (O(1))
//  - ZRANGE with scores to get all users sorted by activity
//  - Perfect "leaderboard" structure — naturally sorted by time
// ══════════════════════════════════════════════════════════

const isRedisReady = () => redisClient && redisClient.status === "ready";

/**
 * Update last-seen timestamp for a user.
 * Called on socket connect, disconnect, and message send.
 */
export const updateLastSeen = async (userId) => {
  if (!isRedisReady() || !userId) return;
  try {
    await redisClient.zadd(REDIS_KEYS.LAST_SEEN, Date.now(), userId.toString());
  } catch (err) {
    console.error("updateLastSeen error:", err.message);
  }
};

/**
 * Get last-seen timestamp for a specific user.
 * @returns {number|null} Unix timestamp in ms, or null if never seen
 */
export const getLastSeen = async (userId) => {
  if (!isRedisReady()) return null;
  try {
    const score = await redisClient.zscore(REDIS_KEYS.LAST_SEEN, userId.toString());
    return score ? parseInt(score) : null;
  } catch (err) {
    return null;
  }
};

/**
 * Get last-seen timestamps for multiple users in one pipeline.
 * @param {string[]} userIds
 * @returns {{ [userId]: number|null }}
 */
export const getBulkLastSeen = async (userIds) => {
  if (!isRedisReady() || !userIds?.length) return {};
  try {
    const pipeline = redisClient.pipeline();
    for (const uid of userIds) {
      pipeline.zscore(REDIS_KEYS.LAST_SEEN, uid.toString());
    }
    const results = await pipeline.exec();
    const map = {};
    userIds.forEach((uid, i) => {
      const score = results[i][1];
      map[uid] = score ? parseInt(score) : null;
    });
    return map;
  } catch (err) {
    return {};
  }
};

/**
 * Format a last-seen timestamp into a human-readable string.
 * e.g. "Just now", "2 minutes ago", "Yesterday"
 */
export const formatLastSeen = (timestamp) => {
  if (!timestamp) return "Long time ago";
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 30) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
};
