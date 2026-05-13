import { useEffect, useState, useRef } from "react";
import { axiosInstance } from "../lib/axios";
import {
  Activity, Users, Database, Server, Cpu, RefreshCcw,
  ShieldCheck, CheckCircle2, XCircle, Zap, BarChart3,
  Clock, MessageSquare, TrendingUp, Hash, List, GitBranch,
} from "lucide-react";

// ─── Sparkline bar chart (no external dep) ───────────────
const BarSparkline = ({ data = [], color = "bg-primary" }) => {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-0.5 h-14 w-full">
      {data.slice(-24).map((d, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm transition-all duration-500"
          style={{
            height: `${Math.max((d.count / max) * 100, 4)}%`,
            backgroundColor: d.count > 0 ? undefined : "rgba(150,150,150,0.15)",
          }}
          title={`${d.hour}: ${d.count} msgs`}
        >
          <div
            className={`w-full h-full rounded-t-sm ${d.count > 0 ? color : ""}`}
          />
        </div>
      ))}
    </div>
  );
};

// ─── Redis structure badge ────────────────────────────────
const RedisBadge = ({ type, label }) => {
  const colors = {
    STRING: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    HASH: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    SET: "bg-green-500/20 text-green-400 border-green-500/30",
    ZSET: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    HYPERLOGLOG: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    STREAM: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    PUBSUB: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  };
  return (
    <span className={`text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full border ${colors[type] || "bg-base-200 text-base-content/50"}`}>
      {label || type}
    </span>
  );
};

// ─── Stat card ────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, color, bg, border, badge, badgeType, sub }) => (
  <div className={`relative overflow-hidden p-6 rounded-3xl border ${border} ${bg} backdrop-blur-xl group hover:scale-[1.02] transition-all duration-300`}>
    <div className="flex items-start justify-between">
      <div className="space-y-1">
        <p className="text-xs font-bold text-base-content/50 uppercase tracking-widest">{label}</p>
        <h3 className={`text-4xl font-black ${color}`}>{String(value).toLocaleString()}</h3>
        {sub && <p className="text-xs text-base-content/40">{sub}</p>}
      </div>
      <div className={`p-3 rounded-2xl bg-base-100/50 shadow-sm transition-transform duration-300 group-hover:rotate-12`}>
        <Icon className={`size-6 ${color}`} />
      </div>
    </div>
    {badge && (
      <div className="mt-3">
        <RedisBadge type={badgeType} label={badge} />
      </div>
    )}
  </div>
);

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef(null);

  const fetchAnalytics = async () => {
    try {
      setRefreshing(true);
      const res = await axiosInstance.get("/analytics/dashboard");
      setData(res.data);
      setError(null);
    } catch (err) {
      setError("Failed to fetch analytics. Are you an admin?");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchAnalytics, 3000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh]);

  if (loading) {
    return (
      <div className="h-screen pt-16 flex items-center justify-center">
        <div className="glass-panel rounded-3xl p-12 flex flex-col items-center gap-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl glass-island flex items-center justify-center animate-pulse">
              <Activity className="size-8 text-primary animate-spin" />
            </div>
          </div>
          <p className="text-base-content/60 font-semibold animate-pulse">Loading Redis Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen pt-16 flex items-center justify-center">
        <div className="glass-panel rounded-3xl p-10 text-center max-w-md">
          <XCircle className="size-14 mx-auto mb-4 text-error" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-base-content/60">{error}</p>
        </div>
      </div>
    );
  }

  const { redis, analytics, cache, queues, onlineUsers } = data || {};
  const hourlyData = analytics?.hourlyMessages || [];
  const topConversations = analytics?.topConversations || [];

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ─── Header ─── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                <Database className="size-6" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Redis Big Data Dashboard
              </h1>
            </div>
            <p className="text-base-content/50 font-medium">
              Live view of all 6 Redis data structures powering Zephyr in real-time
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer glass-island rounded-2xl px-4 py-2.5">
              <span className="text-sm font-semibold text-base-content/70">Auto-refresh</span>
              <div
                onClick={() => setAutoRefresh((v) => !v)}
                className={`relative w-10 h-5 rounded-full transition-colors duration-300 cursor-pointer ${autoRefresh ? "bg-primary" : "bg-base-300"}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${autoRefresh ? "translate-x-5" : ""}`} />
              </div>
              {autoRefresh && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
            </label>
            <button
              onClick={fetchAnalytics}
              disabled={refreshing}
              className="btn btn-primary rounded-2xl gap-2"
            >
              <RefreshCcw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* ─── System Status Bar ─── */}
        <div className="glass-panel rounded-[2rem] p-5 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2.5">
            <Server className="size-4 text-base-content/40" />
            <span className="text-sm font-semibold text-base-content/60">Node.js Server</span>
            <span className="badge badge-success badge-sm gap-1"><CheckCircle2 className="size-3" /> Online</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Database className="size-4 text-base-content/40" />
            <span className="text-sm font-semibold text-base-content/60">Redis Cluster</span>
            {redis?.status === "connected" ? (
              <span className="badge badge-success badge-sm gap-1"><CheckCircle2 className="size-3" /> Connected</span>
            ) : (
              <span className="badge badge-error badge-sm gap-1"><XCircle className="size-3" /> Offline</span>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <Zap className="size-4 text-base-content/40" />
            <span className="text-sm font-semibold text-base-content/60">Cache Hit Rate</span>
            <span className="text-emerald-500 font-black text-sm">
              {cache?.hitRate ? `${parseFloat(cache.hitRate).toFixed(1)}%` : "N/A"}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Cpu className="size-4 text-base-content/40" />
            <span className="text-sm font-semibold text-base-content/60">Total Keys</span>
            <span className="text-purple-400 font-black text-sm">{cache?.totalKeys || 0}</span>
          </div>
          {analytics?.generatedAt && (
            <div className="ml-auto flex items-center gap-2 text-xs text-base-content/30">
              <Clock className="size-3" />
              Updated {new Date(analytics.generatedAt).toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* ─── KPI Cards ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            label="Total Messages" value={analytics?.totalMessages || 0}
            icon={MessageSquare} color="text-blue-400"
            bg="bg-blue-500/5" border="border-blue-500/20"
            badge="Redis INCR Counter" badgeType="STRING"
            sub="Incremented on every send"
          />
          <StatCard
            label="Active Users Today" value={analytics?.activeUsers || 0}
            icon={Users} color="text-rose-400"
            bg="bg-rose-500/5" border="border-rose-500/20"
            badge="HyperLogLog" badgeType="HYPERLOGLOG"
            sub="~1% error, uses only 12KB RAM"
          />
          <StatCard
            label="Online Right Now" value={onlineUsers || 0}
            icon={Activity} color="text-emerald-400"
            bg="bg-emerald-500/5" border="border-emerald-500/20"
            badge="Redis SET" badgeType="SET"
            sub="Socket IDs stored in RAM"
          />
          <StatCard
            label="Total Cache Keys" value={cache?.totalKeys || 0}
            icon={Database} color="text-purple-400"
            bg="bg-purple-500/5" border="border-purple-500/20"
            badge="Redis STRING" badgeType="STRING"
            sub="Messages, users, sidebar cached"
          />
        </div>

        {/* ─── Middle Row ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Hourly Message Activity — Sorted Set / INCR */}
          <div className="col-span-1 lg:col-span-2 glass-panel rounded-[2rem] p-7">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="size-5 text-primary" />
                  <h3 className="text-lg font-black">Hourly Message Activity</h3>
                  <RedisBadge type="STRING" label="Redis INCR" />
                </div>
                <p className="text-xs text-base-content/40">Each bar = messages sent in that hour. Stored as `analytics:messages:hourly:YYYY-MM-DD-HH`</p>
              </div>
              <span className="text-3xl font-black text-primary">
                {hourlyData.reduce((a, b) => a + b.count, 0)}
              </span>
            </div>
            <BarSparkline data={hourlyData} color="bg-primary" />
            <div className="flex justify-between text-[10px] text-base-content/30 mt-2">
              <span>24 hours ago</span>
              <span>Now</span>
            </div>
          </div>

          {/* Cache Health */}
          <div className="col-span-1 glass-panel rounded-[2rem] p-7 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="size-5 text-amber-400" />
              <h3 className="text-lg font-black">Cache Performance</h3>
            </div>

            {[
              { label: "Cache Hits", value: cache?.hits || 0, color: "text-emerald-400", bar: "bg-emerald-500" },
              { label: "Cache Misses", value: cache?.misses || 0, color: "text-red-400", bar: "bg-red-500" },
            ].map(({ label, value, color, bar }) => {
              const total = (cache?.hits || 0) + (cache?.misses || 0);
              const pct = total > 0 ? Math.round((value / total) * 100) : 0;
              return (
                <div key={label} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-base-content/60 font-medium">{label}</span>
                    <span className={`font-black ${color}`}>{value.toLocaleString()} ({pct}%)</span>
                  </div>
                  <div className="h-2.5 bg-base-300 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${bar} transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}

            <div className="pt-2 border-t border-white/5">
              <p className="text-xs text-base-content/40 mb-1">TTL Strategy</p>
              {[
                { label: "Sidebar", ttl: "2 min" },
                { label: "Messages", ttl: "3 min" },
                { label: "User Profile", ttl: "5 min" },
              ].map(({ label, ttl }) => (
                <div key={label} className="flex justify-between text-xs py-1">
                  <span className="text-base-content/50">{label}</span>
                  <span className="font-semibold text-amber-400">expires in {ttl}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Bottom Row ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Top Conversations — Sorted Set */}
          <div className="col-span-1 lg:col-span-1 glass-panel rounded-[2rem] p-7">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="size-5 text-amber-400" />
              <h3 className="text-lg font-black">Hot Conversations</h3>
              <RedisBadge type="ZSET" label="Sorted Set" />
            </div>
            <p className="text-xs text-base-content/40 mb-5">ZINCRBY on every message. ZREVRANGE to read top-N.</p>
            <div className="space-y-3">
              {topConversations.length > 0 ? topConversations.slice(0, 6).map((c, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-base-100/30 hover:bg-base-100/50 transition-colors">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${i === 0 ? "bg-amber-500/20 text-amber-400" : i === 1 ? "bg-zinc-500/20 text-zinc-400" : "bg-bronze-500/20 text-base-content/40 bg-base-200"}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-base-content/50 truncate">
                      {c.participants.split(":").map(id => id.slice(-6)).join(" ↔ ")}
                    </p>
                  </div>
                  <span className="text-sm font-black text-amber-400 flex-shrink-0">
                    {c.messageCount} msgs
                  </span>
                </div>
              )) : (
                <div className="text-center py-8 text-base-content/30 text-sm">
                  No data yet. Send some messages!
                </div>
              )}
            </div>
          </div>

          {/* BullMQ Worker Queues — Redis Streams */}
          <div className="col-span-1 lg:col-span-2 glass-panel rounded-[2rem] p-7">
            <div className="flex items-center gap-2 mb-1">
              <GitBranch className="size-5 text-cyan-400" />
              <h3 className="text-lg font-black">Background Worker Queues</h3>
              <RedisBadge type="STREAM" label="BullMQ / Redis" />
            </div>
            <p className="text-xs text-base-content/40 mb-5">Large images are queued here. Workers pick up jobs in background without blocking user.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(queues || {}).map(([queueName, stats]) => {
                const total = (stats?.waiting || 0) + (stats?.active || 0) + (stats?.completed || 0) + (stats?.failed || 0);
                const queueLabels = {
                  imageQueue: "📸 Image Processing",
                  notificationQueue: "🔔 Notifications",
                };
                return (
                  <div key={queueName} className="p-5 rounded-2xl bg-base-100/30 border border-white/5 hover:border-primary/20 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-black">{queueLabels[queueName] || queueName}</h4>
                      <span className="text-xs text-base-content/40">{total} total jobs</span>
                    </div>
                    <div className="space-y-2.5">
                      {[
                        { label: "Waiting", val: stats?.waiting || 0, color: "bg-amber-500", text: "text-amber-400" },
                        { label: "Active", val: stats?.active || 0, color: "bg-blue-500", text: "text-blue-400" },
                        { label: "Completed", val: stats?.completed || 0, color: "bg-emerald-500", text: "text-emerald-400" },
                        { label: "Failed", val: stats?.failed || 0, color: "bg-red-500", text: "text-red-400" },
                      ].map(({ label, val, color, text }) => (
                        <div key={label} className="flex items-center gap-3">
                          <span className="text-xs text-base-content/50 w-20 flex-shrink-0">{label}</span>
                          <div className="flex-1 h-2 bg-base-300 rounded-full overflow-hidden">
                            <div className={`h-full ${color} rounded-full transition-all duration-700`}
                              style={{ width: total > 0 ? `${(val / total) * 100}%` : "0%" }} />
                          </div>
                          <span className={`text-xs font-black w-6 text-right ${text}`}>{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {(!queues || Object.keys(queues).length === 0) && (
                <div className="col-span-full text-center py-10 text-base-content/30 text-sm">
                  Queues not initialized. Is Redis running?
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Redis Data Structures Legend ─── */}
        <div className="glass-panel rounded-[2rem] p-7">
          <div className="flex items-center gap-2 mb-5">
            <Hash className="size-5 text-primary" />
            <h3 className="text-lg font-black">Redis Data Structures Used in Zephyr</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { type: "STRING", icon: List, label: "String / INCR", desc: "Message counters, cache storage (JSON), rate limits, token blacklist", key: "analytics:messages:total", color: "text-blue-400", bg: "bg-blue-500/10" },
              { type: "HASH", icon: Database, label: "Hash (HSET)", desc: "Each chat message stored as a Redis Hash for RediSearch full-text indexing", key: "msg:<mongoId>", color: "text-purple-400", bg: "bg-purple-500/10" },
              { type: "SET", icon: Users, label: "Set (SADD)", desc: "Online presence tracking — socket IDs added/removed on connect/disconnect", key: "presence:online", color: "text-green-400", bg: "bg-green-500/10" },
              { type: "ZSET", icon: TrendingUp, label: "Sorted Set (ZINCRBY)", desc: "Active conversation leaderboard — automatically ranked by message count", key: "analytics:active_conversations", color: "text-amber-400", bg: "bg-amber-500/10" },
              { type: "HYPERLOGLOG", icon: Cpu, label: "HyperLogLog (PFADD)", desc: "Counts unique Daily Active Users using only 12KB of RAM — even at millions of users", key: "analytics:dau:<date>", color: "text-rose-400", bg: "bg-rose-500/10" },
              { type: "PUBSUB", icon: Zap, label: "Pub/Sub (PUBLISH)", desc: "Real-time typing indicators broadcast across all server nodes via channel subscription", key: "typing:update channel", color: "text-orange-400", bg: "bg-orange-500/10" },
            ].map(({ type, icon: Icon, label, desc, key, color, bg }) => (
              <div key={type} className={`p-5 rounded-2xl border border-white/5 ${bg} hover:scale-[1.02] transition-transform duration-200`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`size-4 ${color}`} />
                  <span className="font-black text-sm">{label}</span>
                  <RedisBadge type={type} />
                </div>
                <p className="text-xs text-base-content/50 mb-3 leading-relaxed">{desc}</p>
                <code className="text-[10px] text-base-content/30 font-mono bg-base-100/40 px-2 py-1 rounded-lg block truncate">
                  {key}
                </code>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
