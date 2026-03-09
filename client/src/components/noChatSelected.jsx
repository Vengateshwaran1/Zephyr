import { Fan } from "lucide-react";
const NoChatSelected = () => {
  return (
    <div className="w-full flex flex-1 flex-col items-center justify-center p-16 bg-base-100/30">
      <div className="max-w-md text-center space-y-6 flex flex-col items-center">
        <div className="relative group">
          <div className="absolute -inset-4 bg-primary/20 blur-2xl rounded-full opacity-50 group-hover:opacity-100 transition duration-1000"></div>
          <div className="w-24 h-24 rounded-[2rem] bg-base-100 border border-base-200/50 shadow-2xl flex items-center justify-center relative z-10 transition-transform hover:scale-105 duration-500">
            <Fan className="w-12 h-12 text-primary animate-[spin_8s_linear_infinite]" />
          </div>
        </div>

        <div className="space-y-2 mt-8">
          <h2 className="text-3xl font-black tracking-tight bg-gradient-to-br from-base-content to-base-content/50 bg-clip-text text-transparent">
            Welcome to Zephyr
          </h2>
          <p className="text-base-content/60 font-medium max-w-sm mx-auto">
            Select a conversation from the sidebar to start a real-time chat.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NoChatSelected;
