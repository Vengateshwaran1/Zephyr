import { redisClient } from "./redis.js";

// ══════════════════════════════════════════════════════════
//  MESSAGE REACTIONS — REDIS HASH per message
//  Falls back to in-memory Map when Redis is unavailable.
//
//  Key pattern: reactions:{messageId}
//  Redis HASH: field = emoji, value = JSON array of userIds
// ══════════════════════════════════════════════════════════

const REACTIONS_TTL = 30 * 24 * 60 * 60; // 30 days
const REACTIONS_PREFIX = "reactions:";

// In-memory fallback so reactions work even without Redis
const memoryStore = new Map(); // Map<messageId, Map<emoji, Set<userId>>>

const isRedisReady = () => redisClient && redisClient.status === "ready";

// ─── Memory helpers ───────────────────────────────────────
const memGet = (messageId, emoji) => {
  const msg = memoryStore.get(messageId);
  if (!msg) return [];
  return Array.from(msg.get(emoji) || []);
};

const memSet = (messageId, emoji, userIds) => {
  if (!memoryStore.has(messageId)) memoryStore.set(messageId, new Map());
  if (userIds.length === 0) {
    memoryStore.get(messageId).delete(emoji);
  } else {
    memoryStore.get(messageId).set(emoji, new Set(userIds));
  }
};

const memGetAll = (messageId) => {
  const msg = memoryStore.get(messageId);
  if (!msg) return {};
  const result = {};
  for (const [emoji, set] of msg.entries()) {
    if (set.size > 0) result[emoji] = Array.from(set);
  }
  return result;
};

/**
 * Toggle a reaction on a message.
 * Always returns { emoji, userIds, added } — never returns null.
 */
export const toggleReaction = async (messageId, userId, emoji) => {
  // ── Redis path ──────────────────────────────────────────
  if (isRedisReady()) {
    const key = `${REACTIONS_PREFIX}${messageId}`;
    try {
      const raw = await redisClient.hget(key, emoji);
      let userIds = raw ? JSON.parse(raw) : [];

      const alreadyReacted = userIds.includes(userId);
      if (alreadyReacted) {
        userIds = userIds.filter((id) => id !== userId);
      } else {
        userIds = [...userIds, userId];
      }

      if (userIds.length === 0) {
        await redisClient.hdel(key, emoji);
      } else {
        await redisClient.hset(key, emoji, JSON.stringify(userIds));
        await redisClient.expire(key, REACTIONS_TTL);
      }

      // Mirror to memory for fast local reads
      memSet(messageId, emoji, userIds);

      console.log(`⚡ Reaction [${emoji}] on msg ${messageId.slice(-6)} by ${userId.slice(-6)} → ${userIds.length} reactors`);
      return { emoji, userIds, added: !alreadyReacted };
    } catch (err) {
      console.error("toggleReaction Redis error, using memory fallback:", err.message);
      // fall through to memory path
    }
  }

  // ── Memory fallback ─────────────────────────────────────
  let userIds = memGet(messageId, emoji);
  const alreadyReacted = userIds.includes(userId);
  if (alreadyReacted) {
    userIds = userIds.filter((id) => id !== userId);
  } else {
    userIds = [...userIds, userId];
  }
  memSet(messageId, emoji, userIds);
  console.log(`⚡ Reaction [${emoji}] (memory) on msg ${messageId.slice(-6)} → ${userIds.length} reactors`);
  return { emoji, userIds, added: !alreadyReacted };
};

/**
 * Get all reactions for a message.
 */
export const getReactions = async (messageId) => {
  if (isRedisReady()) {
    try {
      const raw = await redisClient.hgetall(`${REACTIONS_PREFIX}${messageId}`);
      if (!raw) return {};
      const parsed = {};
      for (const [emoji, users] of Object.entries(raw)) {
        parsed[emoji] = JSON.parse(users);
      }
      return parsed;
    } catch (_) {}
  }
  return memGetAll(messageId);
};

/**
 * Get reactions for multiple messages via pipeline.
 */
export const getBulkReactions = async (messageIds) => {
  if (isRedisReady() && messageIds?.length) {
    try {
      const pipeline = redisClient.pipeline();
      for (const msgId of messageIds) {
        pipeline.hgetall(`${REACTIONS_PREFIX}${msgId}`);
      }
      const results = await pipeline.exec();
      const map = {};
      messageIds.forEach((msgId, i) => {
        const raw = results[i][1];
        if (raw) {
          map[msgId] = {};
          for (const [emoji, users] of Object.entries(raw)) {
            map[msgId][emoji] = JSON.parse(users);
          }
        } else {
          map[msgId] = memGetAll(msgId);
        }
      });
      return map;
    } catch (_) {}
  }
  const map = {};
  for (const msgId of (messageIds || [])) {
    map[msgId] = memGetAll(msgId);
  }
  return map;
};
