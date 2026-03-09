import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import {
  notifyNewMessage,
  clearUnreadBadge,
  requestNotificationPermission,
} from "../lib/notifications";
import { showNewMessageToast } from "../lib/toastComponent.jsx";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  typingUsers: {}, // { userId: isTyping }
  unreadCounts: {}, // { userId: count } — unread per contact

  // ─── Users ──────────────────────────────────────────────

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load contacts");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  // ─── Messages ───────────────────────────────────────────

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });

      // Clear unread count for this user when we open their chat
      set((state) => ({
        unreadCounts: { ...state.unreadCounts, [userId]: 0 },
      }));
      clearUnreadBadge();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        messageData,
      );
      set({ messages: [...messages, res.data] });

      // Stop typing indicator when message is sent
      const socket = useAuthStore.getState().socket;
      if (socket) {
        socket.emit("stopTyping", { targetUserId: selectedUser._id });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  // ─── Typing Indicators ──────────────────────────────────

  setTypingStatus: (userId, isTyping) => {
    set((state) => ({
      typingUsers: { ...state.typingUsers, [userId]: isTyping },
    }));
  },

  emitTyping: (targetUserId) => {
    const socket = useAuthStore.getState().socket;
    if (socket) socket.emit("typing", { targetUserId });
  },

  emitStopTyping: (targetUserId) => {
    const socket = useAuthStore.getState().socket;
    if (socket) socket.emit("stopTyping", { targetUserId });
  },

  // ─── Read Receipts ───────────────────────────────────────

  markMessageAsRead: (messageId, senderId) => {
    const socket = useAuthStore.getState().socket;
    if (socket) socket.emit("messageRead", { messageId, senderId });
  },

  // ─── Unread Count Helpers ────────────────────────────────

  incrementUnread: (userId) => {
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [userId]: (state.unreadCounts[userId] || 0) + 1,
      },
    }));
  },

  clearUnread: (userId) => {
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [userId]: 0 },
    }));
    clearUnreadBadge();
  },

  // ─── Real-Time Subscriptions ─────────────────────────────

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    // Prevent double subscriptions if already bounded
    if (socket.hasListeners("newMessage")) return;

    // ── New incoming message ────────────────
    socket.on("newMessage", (newMessage) => {
      const { selectedUser, messages, users } = get();
      const isFromSelectedUser =
        selectedUser && newMessage.senderId === selectedUser._id;

      if (isFromSelectedUser) {
        // Add to the current chat view
        set({ messages: [...messages, newMessage] });

        // Auto-mark as read since the chat is open
        get().markMessageAsRead(newMessage._id, newMessage.senderId);
      } else {
        // Message from a different contact — increment unread badge
        get().incrementUnread(newMessage.senderId);

        // Find sender's name for the notification
        const sender = users.find((u) => u._id === newMessage.senderId);
        const senderName = sender?.fullName || "Someone";
        const senderPic = sender?.profilePic;

        // Show full notification (browser push + sound + tab badge)
        notifyNewMessage({
          senderName,
          message: newMessage.text,
          senderPic,
          soundType: "ding",
          onClick: () => {
            if (sender) get().setSelectedUser(sender);
          },
        });

        // Show premium in-app toast notification
        showNewMessageToast(senderPic, senderName, newMessage.text, () => {
          if (sender) get().setSelectedUser(sender);
        });
      }
    });

    // ── Typing indicator ────────────────────
    socket.on("userTyping", (data) => {
      const { selectedUser } = get();
      if (selectedUser && data.userId === selectedUser._id) {
        get().setTypingStatus(data.userId, data.isTyping);

        // Safety auto-clear after 4s
        if (data.isTyping) {
          setTimeout(() => get().setTypingStatus(data.userId, false), 4000);
        }
      }
    });

    // ── Read receipts ───────────────────────
    socket.on("messageReadReceipt", ({ messageId, readBy, readAt }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId
            ? { ...msg, readBy, readAt, isRead: true }
            : msg,
        ),
      }));
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.off("newMessage");
    socket.off("userTyping");
    socket.off("messageReadReceipt");
  },

  setSelectedUser: (selectedUser) => {
    set({ selectedUser });

    // Clear unread when opening a chat
    if (selectedUser) {
      get().clearUnread(selectedUser._id);
    }
  },
}));

// Request notification permission when the store is first loaded
requestNotificationPermission().catch(() => {});
