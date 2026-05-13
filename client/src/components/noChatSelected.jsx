import { Fan, MessageSquare, Users, Zap } from "lucide-react";
const NoChatSelected = () => {
  return (
    <div className="w-full flex flex-1 flex-col items-center justify-center p-8 bg-transparent">
      <div className="max-w-sm text-center space-y-8">
        {/* Animated Logo */}
        <div className="flex justify-center">
          <div className="relative group">
            <div className="absolute -inset-6 bg-gradient-to-r from-primary/30 via-secondary/20 to-accent/30 blur-3xl rounded-full opacity-60 group-hover:opacity-100 transition-all duration-1000 animate-blob" />
            <div className="relative w-28 h-28 rounded-[2.5rem] glass-island flex items-center justify-center shadow-2xl hover:scale-105 transition-transform duration-500">
              <Fan className="w-14 h-14 text-primary animate-[spin_8s_linear_infinite]" />
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="space-y-3">
          <h2 className="text-4xl font-black tracking-tight bg-gradient-to-r from-base-content via-base-content to-base-content/40 bg-clip-text text-transparent">
            Zephyr
          </h2>
          <p className="text-base-content/50 font-medium text-lg leading-relaxed">
            Select a conversation to start chatting in real time
          </p>
        </div>

        {/* Feature Pills */}
        <div className="flex flex-wrap gap-3 justify-center">
          {[
            { icon: MessageSquare, label: "Direct Messages" },
            { icon: Users, label: "Group Chats" },
            { icon: Zap, label: "Real-time" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 px-4 py-2 rounded-full glass-island text-xs font-semibold text-base-content/60 hover:text-primary transition-colors duration-200">
              <Icon className="w-3.5 h-3.5" />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NoChatSelected;
