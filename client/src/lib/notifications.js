// ══════════════════════════════════════════════════════════
//  NOTIFICATION SERVICE
//  • Browser Push Notifications (Web Notification API)
//  • In-app unread badge tracking
//  • Subtle notification sound via Web Audio API
//  • Tab title badge (e.g. "(3) Zephyr")
// ══════════════════════════════════════════════════════════

// ─── Permission Management ────────────────────────────────

/**
 * Request browser notification permission.
 * Returns 'granted' | 'denied' | 'default'
 */
export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  const permission = await Notification.requestPermission();
  return permission;
};

export const getNotificationPermission = () => {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
};

// ─── Browser Push Notification ────────────────────────────

/**
 * Show a native browser notification.
 * Only fires when the tab is NOT focused.
 */
export const showBrowserNotification = ({ title, body, icon, onClick }) => {
  if (!("Notification" in window)) return null;
  if (Notification.permission !== "granted") return null;
  if (document.visibilityState === "visible") return null; // Don't show if tab is active

  try {
    const notification = new Notification(title, {
      body,
      icon: icon || "/avatar.png",
      badge: "/favicon.ico",
      tag: "zephyr-message", // Replace old notification instead of stacking
      renotify: true,
      silent: false,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      if (onClick) onClick();
    };

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);

    return notification;
  } catch (err) {
    console.warn("Browser notification failed:", err.message);
    return null;
  }
};

// ─── Notification Sound via Web Audio API ─────────────────

let audioCtx = null;

const getAudioContext = () => {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioCtx;
};

// Unlock Audio API on first interaction
const unlockAudio = () => {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume();
  }
  // Remove listener once unlocked
  document.removeEventListener("click", unlockAudio);
  document.removeEventListener("touchstart", unlockAudio);
};

document.addEventListener("click", unlockAudio);
document.addEventListener("touchstart", unlockAudio);

/**
 * Play a subtle "pop" notification sound.
 * Uses Web Audio API — no external files needed.
 *
 * @param {'pop'|'ding'|'bubble'} type - Sound style
 */
export const playNotificationSound = (type = "pop") => {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    ctx.resume();
  }

  try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === "pop") {
      // Quick "pop" sound
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(800, now);
      oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.08);
      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      oscillator.start(now);
      oscillator.stop(now + 0.12);
    } else if (type === "ding") {
      // Gentle "ding" chime
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(1047, now);
      oscillator.frequency.setValueAtTime(1319, now + 0.1);
      gainNode.gain.setValueAtTime(0.12, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      oscillator.start(now);
      oscillator.stop(now + 0.5);
    } else if (type === "bubble") {
      // Soft "bubble" blip
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(600, now);
      oscillator.frequency.exponentialRampToValueAtTime(900, now + 0.05);
      oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.15);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      oscillator.start(now);
      oscillator.stop(now + 0.2);
    }
  } catch (err) {
    console.warn("Audio notification failed:", err.message);
  }
};

// ─── Tab Title Badge ──────────────────────────────────────

let originalTitle = document.title;
let titleInterval = null;
let unreadCount = 0;

export const setUnreadBadge = (count) => {
  unreadCount = count;

  if (titleInterval) {
    clearInterval(titleInterval);
    titleInterval = null;
    document.title = originalTitle;
  }

  if (count > 0 && document.visibilityState !== "visible") {
    // Flash the tab title
    let showCount = true;
    titleInterval = setInterval(() => {
      document.title = showCount
        ? `(${count}) New Message${count > 1 ? "s" : ""} • Zephyr`
        : originalTitle;
      showCount = !showCount;
    }, 1500);
  } else {
    document.title = originalTitle;
  }
};

export const clearUnreadBadge = () => {
  unreadCount = 0;
  if (titleInterval) {
    clearInterval(titleInterval);
    titleInterval = null;
  }
  document.title = originalTitle;
};

// Reset badge when tab becomes visible
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    clearUnreadBadge();
  }
});

// ─── Combined: Show Full Notification ────────────────────

/**
 * Show all notification types for a new message.
 *
 * @param {Object} opts
 * @param {string} opts.senderName  - e.g. "Venkateshwaran"
 * @param {string} opts.message     - e.g. "heyy!"
 * @param {string} opts.senderPic   - profile picture URL
 * @param {Function} opts.onClick   - called when user clicks notification
 * @param {boolean} opts.sound      - play notification sound (default: true)
 * @param {string} opts.soundType   - 'pop' | 'ding' | 'bubble'
 */
export const notifyNewMessage = ({
  senderName,
  message,
  senderPic,
  onClick,
  sound = true,
  soundType = "ding",
}) => {
  // 1. Browser notification (only when tab is hidden)
  showBrowserNotification({
    title: `💬 ${senderName}`,
    body: message || "📷 Sent an image",
    icon: senderPic || "/avatar.png",
    onClick,
  });

  // 2. Sound
  if (sound) {
    playNotificationSound(soundType);
  }

  // 3. Tab title badge (increment count)
  setUnreadBadge(unreadCount + 1);
};
