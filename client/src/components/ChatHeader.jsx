import { X, ChevronLeft } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser, typingUsers } = useChatStore();
  const { onlineUsers } = useAuthStore();

  const isOnline = onlineUsers.includes(selectedUser._id);
  const isTyping = typingUsers[selectedUser._id];

  return (
    <div className="p-4 border-b border-base-200/50 bg-base-100/50 backdrop-blur-md rounded-t-[2rem] lg:rounded-tl-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Back Button */}
          <button
            onClick={() => setSelectedUser(null)}
            className="lg:hidden btn btn-circle btn-sm btn-ghost hover:bg-base-200 -ml-2"
          >
            <ChevronLeft className="w-6 h-6 text-base-content/80" />
          </button>

          <div className="avatar">
            <div className="size-10 rounded-full border border-base-300 relative shadow-sm">
              <img
                src={selectedUser.profilePic || "/avatar.png"}
                alt={selectedUser.fullName}
              />
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-base-content tracking-tight">
              {selectedUser.fullName}
            </h3>
            <p className="text-xs text-base-content/60 font-medium">
              {isTyping ? (
                <span className="text-primary flex items-center gap-1">
                  typing
                  <span className="flex gap-0.5 mt-1">
                    <span
                      className="w-1 h-1 bg-primary rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    ></span>
                    <span
                      className="w-1 h-1 bg-primary rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    ></span>
                    <span
                      className="w-1 h-1 bg-primary rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    ></span>
                  </span>
                </span>
              ) : isOnline ? (
                <span className="text-green-500">Online</span>
              ) : (
                "Offline"
              )}
            </p>
          </div>
        </div>

        <button
          onClick={() => setSelectedUser(null)}
          className="hidden lg:flex btn btn-circle btn-sm btn-ghost hover:bg-base-200"
        >
          <X className="w-5 h-5 text-base-content/60" />
        </button>
      </div>
    </div>
  );
};
export default ChatHeader;
