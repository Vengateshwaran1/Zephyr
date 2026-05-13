import { getAnalyticsDashboard } from "../lib/analytics.js";
import { getCacheStats } from "../lib/redisCache.js";
import { getQueueStats } from "../lib/messageQueue.js";
import { getOnlineUserCount } from "../lib/presenceManager.js";
import { checkRedisHealth } from "../lib/redis.js";

// ══════════════════════════════════════════════════════════
//  ANALYTICS CONTROLLER
//  Provides Redis-powered analytics dashboard data
// ══════════════════════════════════════════════════════════

/**
 * GET /api/analytics/dashboard
 * Returns full analytics dashboard with all Redis metrics.
 */
export const getDashboard = async (req, res) => {
  try {
    const [analytics, cacheStats, queueStats, onlineCount, redisHealthy] =
      await Promise.all([
        getAnalyticsDashboard(),
        getCacheStats(),
        getQueueStats(),
        getOnlineUserCount(),
        checkRedisHealth(),
      ]);

    res.status(200).json({
      redis: {
        status: redisHealthy ? "connected" : "disconnected",
      },
      analytics: {
        totalMessages: analytics?.totalMessages || 0,
        activeUsers: analytics?.dailyActiveUsers || 0,
        hourlyMessages: analytics?.hourlyMessages || [],
        topConversations: analytics?.topConversations || [],
        generatedAt: analytics?.generatedAt,
      },
      cache: {
        ...cacheStats,
        memoryUsage: cacheStats
          ? `${(cacheStats.totalKeys * 0.5).toFixed(1)} KB est.`
          : "N/A",
      },
      queues: queueStats,
      onlineUsers: onlineCount,
    });
  } catch (error) {
    console.error("Error in getDashboard:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /api/analytics/health
 * Quick health check for Redis and all subsystems.
 */
export const getHealth = async (req, res) => {
  try {
    const redisHealthy = await checkRedisHealth();
    const onlineCount = await getOnlineUserCount();

    res.status(200).json({
      status: "ok",
      uptime: process.uptime(),
      redis: redisHealthy ? "connected" : "disconnected",
      onlineUsers: onlineCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      message: error.message,
    });
  }
};
