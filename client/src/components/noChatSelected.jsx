import { Fan } from "lucide-react";
const NoChatSelected = () => {
  return (
    
      <div className="w-full flex flex-1 flex-col items-center justify-center p-16 bg-base-100/50">
        <div className="max-w-md text-center space-y-6">
          <div className="flex justify-center gap-4 mb-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center">
                <Fan className="w-20 h-20 text-accent animate-spin" />
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold">Welcome to Zephyr</h2>
          <p className="text-base-content/60">
            Select a chat to start conversation.
          </p>
        </div>
      </div>
  );
};

export default NoChatSelected;
