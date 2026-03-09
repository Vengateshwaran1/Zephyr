import { redisClient, redisPublisher, REDIS_KEYS } from "./redis.js";

// ══════════════════════════════════════════════════════════
//  REDIS TYPING INDICATORS
//  Uses Redis keys with auto-expiry + Pub/Sub for real-time
//  broadcasting of typing state across server instances.
// ══════════════════════════════════════════════════════════

const TYPING_TTL = 3; // Auto-expire after 3 seconds of no update
const isRedisReady = () => redisClient && redisClient.status === "ready";

/**
 * Generate a consistent chat room ID for two users.
 */
const getChatRoomId = (userId1, userId2) => {
  const sorted = [userId1, userId2].sort();
  return `${sorted[0]}:${sorted[1]}`;
};

/**
 * Set a user as typing in a chat room.
 * The key auto-expires after TYPING_TTL seconds.
 */
export const setTyping = async (userId, targetUserId) => {
  if (!isRedisReady()) return;
  try {
    const chatRoomId = getChatRoomId(userId, targetUserId);
    const key = REDIS_KEYS.TYPING(chatRoomId);

    // Store typing user with TTL
    await redisClient.setex(`${key}:${userId}`, TYPING_TTL, "1");

    // Publish typing event for other server instances
    await redisPublisher.publish(
      "typing:update",
      JSON.stringify({
        chatRoomId,
        userId,
        targetUserId,
        isTyping: true,
      }),
    );
  } catch (error) {
    console.error("Error setting typing indicator:", error.message);
  }
};

/**
 * Clear a user's typing state.
 */
export const clearTyping = async (userId, targetUserId) => {
  if (!isRedisReady()) return;
  try {
    const chatRoomId = getChatRoomId(userId, targetUserId);
    const key = REDIS_KEYS.TYPING(chatRoomId);

    await redisClient.del(`${key}:${userId}`);

    // Publish stop typing event
    await redisPublisher.publish(
      "typing:update",
      JSON.stringify({
        chatRoomId,
        userId,
        targetUserId,
        isTyping: false,
      }),
    );
  } catch (error) {
    console.error("Error clearing typing indicator:", error.message);
  }
};

/**
 * Check if a user is currently typing.
 */
export const isTyping = async (userId, targetUserId) => {
  if (!isRedisReady()) return false;
  try {
    const chatRoomId = getChatRoomId(userId, targetUserId);
    const key = REDIS_KEYS.TYPING(chatRoomId);
    const exists = await redisClient.exists(`${key}:${userId}`);
    return exists === 1;
  } catch (error) {
    console.error("Error checking typing status:", error.message);
    return false;
  }
};
