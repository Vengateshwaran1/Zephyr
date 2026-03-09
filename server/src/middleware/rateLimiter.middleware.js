import { redisClient, REDIS_KEYS } from "../lib/redis.js";

// ══════════════════════════════════════════════════════════
//  REDIS RATE LIMITER MIDDLEWARE
//  Sliding window rate limiting using Redis Sorted Sets
//  Supports per-endpoint and per-IP limits
// ══════════════════════════════════════════════════════════

const isRedisReady = () => redisClient && redisClient.status === "ready";

/**
 * Create a sliding window rate limiter middleware.
 *
 * @param {Object} options
 * @param {number} options.maxRequests - Max requests allowed in the window
 * @param {number} options.windowMs   - Window size in milliseconds
 * @param {string} options.name       - Endpoint name for the key prefix
 */
export const createRateLimiter = ({ maxRequests, windowMs, name }) => {
  return async (req, res, next) => {
    if (!isRedisReady()) return next();

    try {
      // Use user ID if authenticated, otherwise IP address
      const identifier =
        req.user?._id?.toString() || req.ip || req.connection.remoteAddress;
      const key = REDIS_KEYS.RATE_LIMIT(identifier, name);
      const now = Date.now();
      const windowStart = now - windowMs;

      // Use Redis pipeline for atomic operations
      const pipeline = redisClient.pipeline();

      // Remove entries outside the current window
      pipeline.zremrangebyscore(key, 0, windowStart);

      // Count current entries in the window
      pipeline.zcard(key);

      // Add the current request timestamp
      pipeline.zadd(key, now, `${now}:${Math.random()}`);

      // Set expiry on the key to auto-cleanup
      pipeline.expire(key, Math.ceil(windowMs / 1000));

      const results = await pipeline.exec();
      const requestCount = results[1][1]; // zcard result

      // Set rate limit headers
      res.set({
        "X-RateLimit-Limit": maxRequests,
        "X-RateLimit-Remaining": Math.max(0, maxRequests - requestCount - 1),
        "X-RateLimit-Reset": new Date(now + windowMs).toISOString(),
      });

      if (requestCount >= maxRequests) {
        const retryAfter = Math.ceil(windowMs / 1000);
        res.set("Retry-After", retryAfter);

        console.log(`🚫 Rate limit exceeded for ${identifier} on ${name}`);

        return res.status(429).json({
          message: "Too many requests. Please slow down.",
          retryAfter,
          limit: maxRequests,
          windowMs,
        });
      }

      next();
    } catch (error) {
      // If Redis is down, allow the request to proceed (fail-open)
      console.error("Rate limiter error (failing open):", error.message);
      next();
    }
  };
};

// ─── Pre-configured Rate Limiters ────────────────────────

// Auth routes — 5 requests per minute (login, signup)
export const authRateLimiter = createRateLimiter({
  maxRequests: 5,
  windowMs: 60 * 1000,
  name: "auth",
});

// Message sending — 30 messages per minute
export const messageRateLimiter = createRateLimiter({
  maxRequests: 30,
  windowMs: 60 * 1000,
  name: "message",
});

// General API — 100 requests per minute
export const generalRateLimiter = createRateLimiter({
  maxRequests: 100,
  windowMs: 60 * 1000,
  name: "general",
});

// Profile update — 5 per minute
export const profileRateLimiter = createRateLimiter({
  maxRequests: 5,
  windowMs: 60 * 1000,
  name: "profile",
});
