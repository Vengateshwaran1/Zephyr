import { redisClient } from "./redis.js";

// ══════════════════════════════════════════════════════════
//  GROUP "SEEN BY" TRACKING
//  Uses Redis Sets to track which members have read each
//  group message, with automatic 7-day expiry.
//
//  Key pattern: grp:seen:{messageId}  →  Redis Set of userIds
//
//  Why Redis Sets?
//  - SADD guarantees uniqueness (user can't double-count)
//  - SMEMBERS returns all readers in O(N)
//  - SCARD returns reader count in O(1)
//  - TTL auto-cleans old message receipts from RAM
// ══════════════════════════════════════════════════════════

const SEEN_TTL = 7 * 24 * 60 * 60; // 7 days
const SEEN_PREFIX = "grp:seen:";

const isRedisReady = () => redisClient && redisClient.status === "ready";

/**
 * Mark a user as having seen a specific message.
 * @param {string} messageId - MongoDB message _id
 * @param {string} userId - The viewer's userId
 */
export const markMessageSeen = async (messageId, userId) => {
  if (!isRedisReady()) return;
  try {
    const key = `${SEEN_PREFIX}${messageId}`;
    await redisClient.sadd(key, userId);
    await redisClient.expire(key, SEEN_TTL);
  } catch (err) {
    console.error("markMessageSeen error:", err.message);
  }
};

/**
 * Mark multiple messages as seen by a user in one pipeline.
 * Used when a user opens the group chat — bulk-mark all visible messages.
 * @param {string[]} messageIds
 * @param {string} userId
 */
export const markMessagesBulkSeen = async (messageIds, userId) => {
  if (!isRedisReady() || !messageIds?.length) return;
  try {
    const pipeline = redisClient.pipeline();
    for (const msgId of messageIds) {
      const key = `${SEEN_PREFIX}${msgId}`;
      pipeline.sadd(key, userId);
      pipeline.expire(key, SEEN_TTL);
    }
    await pipeline.exec();
  } catch (err) {
    console.error("markMessagesBulkSeen error:", err.message);
  }
};

/**
 * Get all userIds who have seen a message.
 * @param {string} messageId
 * @returns {string[]} array of userIds
 */
export const getMessageSeenBy = async (messageId) => {
  if (!isRedisReady()) return [];
  try {
    return await redisClient.smembers(`${SEEN_PREFIX}${messageId}`);
  } catch (err) {
    return [];
  }
};

/**
 * Get seen counts for multiple messages in one pipeline.
 * @param {string[]} messageIds
 * @returns {Object} { messageId: count }
 */
export const getBulkSeenCounts = async (messageIds) => {
  if (!isRedisReady() || !messageIds?.length) return {};
  try {
    const pipeline = redisClient.pipeline();
    for (const msgId of messageIds) {
      pipeline.smembers(`${SEEN_PREFIX}${msgId}`);
    }
    const results = await pipeline.exec();
    const counts = {};
    messageIds.forEach((msgId, i) => {
      counts[msgId] = results[i][1] || [];
    });
    return counts;
  } catch (err) {
    return {};
  }
};
