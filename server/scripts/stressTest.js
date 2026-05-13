/**
 * Zephyr — Big Data Stress Test Script
 * =====================================
 * Floods the system with 50 rapid messages to visibly show:
 *  - BullMQ queue filling up in Redis
 *  - HyperLogLog DAU tracking
 *  - Redis INCR counters spiking
 *  - Sorted Set active conversation leaderboard
 *
 * Usage:
 *   node scripts/stressTest.js
 *
 * Requirements:
 *   - Server must be running (npm run dev)
 *   - Have a valid JWT token from a logged-in session
 *   - Set TOKEN and RECEIVER_ID below
 */

import fetch from "node-fetch";

const BASE_URL = "http://localhost:5001/api";

// ─── CONFIGURATION ───────────────────────────────────────
// 1. Log into the app in your browser
// 2. Open DevTools → Application → Cookies → copy "jwt" token
// 3. Open DevTools → Network → click any /api/messages/xxx → copy the ID from URL
const TOKEN = "PASTE_YOUR_JWT_COOKIE_VALUE_HERE";
const RECEIVER_ID = "PASTE_RECEIVER_USER_ID_HERE";

const MESSAGE_COUNT = 50;
const DELAY_MS = 100; // 100ms between messages = ~10 messages/second
// ─────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendMessage(index) {
  try {
    const res = await fetch(`${BASE_URL}/messages/send/${RECEIVER_ID}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `jwt=${TOKEN}`,
      },
      body: JSON.stringify({
        text: `🔥 Stress test message #${index + 1} — Big Data Demo [${new Date().toISOString()}]`,
      }),
    });

    if (res.ok) {
      process.stdout.write(`✅ Sent #${index + 1}\r`);
    } else {
      console.log(`❌ Failed #${index + 1}: ${res.status}`);
    }
  } catch (err) {
    console.error(`❌ Error on #${index + 1}:`, err.message);
  }
}

async function runStressTest() {
  console.log("\n═══════════════════════════════════════════════");
  console.log("  🔥 Zephyr Big Data Stress Test");
  console.log("═══════════════════════════════════════════════");
  console.log(`  📨 Sending ${MESSAGE_COUNT} messages...`);
  console.log(`  ⏱️  Rate: ~${1000 / DELAY_MS} messages/second`);
  console.log("  👁️  Watch RedisInsight to see counters rising!\n");

  const start = Date.now();

  for (let i = 0; i < MESSAGE_COUNT; i++) {
    await sendMessage(i);
    await sleep(DELAY_MS);
  }

  const duration = ((Date.now() - start) / 1000).toFixed(2);

  console.log(`\n\n✅ Done! Sent ${MESSAGE_COUNT} messages in ${duration}s`);
  console.log("\n─── What to check now ───────────────────────────");
  console.log("  RedisInsight → analytics:messages:total (should have risen by 50)");
  console.log("  RedisInsight → analytics:active_conversations (sorted set by score)");
  console.log(`  RedisInsight → analytics:dau:${new Date().toISOString().split("T")[0]} (HyperLogLog)`);
  console.log("  Admin Dashboard → Total Messages counter updated");
  console.log("═══════════════════════════════════════════════\n");
}

runStressTest();
