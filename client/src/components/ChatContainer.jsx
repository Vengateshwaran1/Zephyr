import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { Check, CheckCheck, Eye } from "lucide-react";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    getGroupMessages,
    isMessagesLoading,
    selectedUser,
    selectedGroup,
    typingUsers,
    users,
    groupSeenMap,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);

  useEffect(() => {
    if (selectedUser) getMessages(selectedUser._id);
    else if (selectedGroup) getGroupMessages(selectedGroup._id);
  }, [selectedUser, selectedGroup, getMessages, getGroupMessages]);

  useEffect(() => {
    if (messageEndRef.current && messages)
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const typingData = selectedGroup
    ? typingUsers[selectedGroup._id]
    : selectedUser ? typingUsers[selectedUser._id] : null;

  const isDMChat = !selectedGroup;
  const isTyping = isDMChat
    ? !!typingData
    : Array.isArray(typingData) && typingData.length > 0;
  const typingName =
    !isDMChat && isTyping && typingData.length === 1
      ? users.find((u) => u._id === typingData[0])?.fullName.split(" ")[0] || "Someone"
      : "";

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto bg-transparent">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((message, idx) => {
          const isMe =
            message.senderId === authUser._id ||
            message.senderId?._id === authUser._id;
          const sender = isMe ? authUser : message.senderId;
          const isLast = idx === messages.length - 1;

          return (
            <div
              key={message._id}
              ref={isLast ? messageEndRef : null}
              className={`flex ${isMe ? "justify-end" : "justify-start"} group`}
            >
              {/* Avatar — received messages */}
              {!isMe && (
                <div className="flex-shrink-0 mr-2 self-end">
                  <img
                    src={selectedUser?.profilePic || sender?.profilePic || "/avatar.png"}
                    alt=""
                    className="w-7 h-7 rounded-full border border-base-content/10 object-cover"
                  />
                </div>
              )}

              {/* Message column */}
              <div className={`flex flex-col max-w-[70%] ${isMe ? "items-end" : "items-start"}`}>
                {/* Sender name in group */}
                {!isMe && selectedGroup && (
                  <span className="text-xs font-bold text-base-content/60 mb-0.5 ml-1">
                    {sender?.fullName}
                  </span>
                )}

                {/* Bubble */}
                <div
                  className={`rounded-[1.25rem] px-4 py-2.5 transition-all duration-200 ${
                    isMe
                      ? "bg-gradient-to-br from-primary to-primary/80 text-primary-content shadow-lg shadow-primary/25 rounded-br-md"
                      : "bg-base-200/80 backdrop-blur-md text-base-content shadow-md border border-white/5 rounded-bl-md"
                  }`}
                >
                  {message.image && (
                    <img
                      src={message.image}
                      alt="Attachment"
                      className="max-w-[200px] rounded-xl mb-2 object-cover"
                    />
                  )}
                  {message.text && (
                    <p className="text-sm leading-relaxed">{message.text}</p>
                  )}
                </div>

                {/* Timestamp + status */}
                <div className={`flex items-center gap-1.5 mt-1 px-1 ${isMe ? "flex-row-reverse" : ""}`}>
                  <time className="text-[10px] text-base-content/40">
                    {formatMessageTime(message.createdAt)}
                  </time>

                  {/* DM read receipt */}
                  {isMe && !selectedGroup && (
                    message.isRead
                      ? <CheckCheck className="size-3 text-blue-400" />
                      : <Check className="size-3 text-base-content/40" />
                  )}

                  {/* Group seen-by */}
                  {isMe && selectedGroup && (() => {
                    const seenBy = groupSeenMap[message._id] || [];
                    const seenCount = seenBy.filter((id) => id !== authUser._id).length;
                    const total = (selectedGroup?.members?.length || 1) - 1;
                    return seenCount > 0 ? (
                      <span className="flex items-center gap-0.5 text-[10px] text-emerald-400 font-semibold">
                        <Eye className="size-3" /> {seenCount}/{total}
                      </span>
                    ) : null;
                  })()}
                </div>
              </div>

              {/* My avatar */}
              {isMe && (
                <div className="flex-shrink-0 ml-2 self-end">
                  <img
                    src={authUser.profilePic || "/avatar.png"}
                    alt=""
                    className="w-7 h-7 rounded-full border border-base-content/10 object-cover"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Typing indicator */}
      <div className="px-6 h-6">
        {isTyping && (
          <div className="flex items-center gap-2 text-xs text-base-content/50 italic">
            <div className="flex gap-1">
              {[0, 0.15, 0.3].map((d, i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"
                  style={{ animationDelay: `${d}s` }}
                />
              ))}
            </div>
            {selectedGroup
              ? typingData.length === 1
                ? `${typingName} is typing…`
                : `${typingData.length} people are typing…`
              : `${selectedUser?.fullName} is typing…`}
          </div>
        )}
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;
