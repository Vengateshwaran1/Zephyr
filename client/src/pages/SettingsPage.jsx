import { THEMES } from "../constants";
import { useThemeStore } from "../store/useThemeStore";
import { Send, CheckCheck, Check, BellRing, X } from "lucide-react";
import { useState, useEffect } from "react";
import {
  getNotificationPermission,
  requestNotificationPermission,
} from "../lib/notifications";
import toast from "react-hot-toast";

const PREVIEW_MESSAGES = [
  { id: 1, content: "Hey! How are you doing?", isSent: false },
  {
    id: 2,
    content: "I'm doing great! Just working on some new Zephyr features. 🚀",
    isSent: true,
    isRead: true,
  },
];

const SettingsPage = () => {
  const { theme, setTheme } = useThemeStore();
  const [permission, setPermission] = useState("default");

  useEffect(() => {
    setPermission(getNotificationPermission());
  }, []);

  const handleRequestPermission = async () => {
    const perm = await requestNotificationPermission();
    setPermission(perm);
    if (perm === "granted") {
      toast.success("Browser notifications enabled!");
    } else if (perm === "denied") {
      toast.error("Notifications blocked. Allow in site settings.");
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* ─── Header ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight">
            Settings
          </h2>
          <p className="text-base-content/50 font-medium">
            Personalize your Zephyr experience with {THEMES.length} carefully curated aesthetics.
          </p>
        </div>

        {/* ─── Notifications Section ───────────────────────────────────── */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold tracking-tight text-base-content flex items-center gap-2">
            <BellRing className="w-5 h-5 text-primary" /> Notifications
          </h3>
          <div className="glass-panel rounded-[1.75rem] p-6 max-w-2xl">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h4 className="font-semibold text-lg">
                  Browser Push Notifications
                </h4>
                <p className="text-sm text-base-content/60">
                  Receive desktop notifications when Zephyr is in the
                  background.
                </p>
              </div>

              {permission === "granted" ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-500 rounded-full font-medium text-sm">
                  <Check className="w-4 h-4" /> Enabled
                </div>
              ) : permission === "denied" ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-full font-medium text-sm">
                  <X className="w-4 h-4" /> Blocked
                </div>
              ) : (
                <button
                  onClick={handleRequestPermission}
                  className="btn btn-primary rounded-full"
                >
                  Enable Notifications
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ─── Preview Section ───────────────────────────────────── */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold tracking-tight text-base-content flex items-center gap-2">
            Live Preview{" "}
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          </h3>
          <div className="glass-panel rounded-[2rem] overflow-hidden">
            <div className="p-4 sm:p-8 bg-base-200/50">
              <div className="max-w-2xl mx-auto">
                {/* ── Fake Chat UI ── */}
                <div className="bg-base-100 rounded-[1.5rem] shadow-xl overflow-hidden border border-base-300">
                  {/* Fake Header */}
                  <div className="px-5 py-4 border-b border-base-200/50 bg-base-100/50 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                      <div className="avatar">
                        <div className="w-11 h-11 rounded-full border border-base-300 shadow-sm relative">
                          <img src="/avatar.png" alt="Avatar" />
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full ring-2 ring-base-100"></span>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-base-content tracking-tight">
                          Vengateshwaran
                        </h3>
                        <p className="text-xs text-green-500 font-medium tracking-wide">
                          Online
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Fake Messages */}
                  <div className="p-5 space-y-6 min-h-[220px] max-h-[220px] overflow-y-auto bg-base-100/30">
                    {PREVIEW_MESSAGES.map((message) => (
                      <div
                        key={message.id}
                        className={`chat ${message.isSent ? "chat-end" : "chat-start"}`}
                      >
                        <div className="chat-image avatar">
                          <div className="size-8 rounded-full border border-base-300">
                            <img src="/avatar.png" alt="" />
                          </div>
                        </div>
                        <div className="chat-header mb-1 text-xs opacity-50 ml-1">
                          12:00 PM
                        </div>
                        <div
                          className={`chat-bubble flex flex-col shadow-sm ${
                            message.isSent
                              ? "bg-primary text-primary-content"
                              : "bg-base-200 text-base-content"
                          }`}
                        >
                          <p className="text-[15px]">{message.content}</p>
                        </div>
                        {message.isSent && (
                          <div className="chat-footer opacity-60 text-xs flex items-center gap-1 mt-1">
                            {message.isRead ? (
                              <CheckCheck className="size-4 text-blue-400" />
                            ) : (
                              <Check className="size-4" />
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Fake Input */}
                  <div className="p-4 border-t border-base-200/50 bg-base-100/50 backdrop-blur-md">
                    <div className="flex gap-3 items-center bg-base-200/50 rounded-[2rem] border border-base-300/50 pl-4 pr-1 py-1">
                      <input
                        type="text"
                        className="flex-1 bg-transparent outline-none h-10 text-sm placeholder-base-content/40"
                        placeholder="Type a message..."
                        readOnly
                      />
                      <button className="btn btn-circle btn-sm btn-primary shadow-lg shadow-primary/20 pointer-events-none">
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Themes Grid ───────────────────────────────────────── */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold tracking-tight text-base-content">
            Color Palettes
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {THEMES.map((t) => (
              <button
                key={t}
                className={`
                  group flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-300
                  ${
                    theme === t
                      ? "bg-base-200 shadow-md ring-2 ring-primary ring-offset-2 ring-offset-base-100"
                      : "hover:bg-base-200/50 ring-1 ring-base-content/5"
                  }
                `}
                onClick={() => setTheme(t)}
              >
                {/* Theme Palette Swatch */}
                <div
                  className="relative h-12 w-full rounded-xl overflow-hidden shadow-sm border border-base-content/10"
                  data-theme={t}
                >
                  <div className="absolute inset-0 grid grid-cols-4 gap-0">
                    <div className="bg-primary"></div>
                    <div className="bg-secondary"></div>
                    <div className="bg-accent"></div>
                    <div className="bg-neutral"></div>
                  </div>
                </div>
                {/* Label */}
                <span
                  className={`text-[12px] font-bold truncate w-full text-center ${
                    theme === t
                      ? "text-primary tracking-wide"
                      : "text-base-content/70 group-hover:text-base-content"
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default SettingsPage;
