import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import { requestNotificationPermission } from "../lib/notifications";
import { showNewMessageToast } from "../lib/toastComponent.jsx";

export const useChatStore = create((set, get) => ({
  messages: [],
  searchResults: [],
  isSearching: false,
  users: [],
  groups: [],
  selectedUser: null,
  selectedGroup: null,
  isUsersLoading: false,
  isGroupsLoading: false,
  isMessagesLoading: false,
  typingUsers: {}, // { userId: isTyping, groupId: [userIds] }
  unreadCounts: {}, // { userId: count } — unread per contact
  groupSeenMap: {}, // { messageId: [userId, ...] } — group seen-by receipts
  lastSeenMap: {}, // { userId: { lastSeen: number, formatted: string } }

  // ─── Users & Groups ─────────────────────────────────────

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: Array.isArray(res.data) ? res.data : [] });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load contacts");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getGroups: async () => {
    set({ isGroupsLoading: true });
    try {
      const res = await axiosInstance.get("/groups/all");
      set({ groups: Array.isArray(res.data) ? res.data : [] });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load groups");
    } finally {
      set({ isGroupsLoading: false });
    }
  },

  createGroup: async (groupData) => {
    try {
      const res = await axiosInstance.post("/groups/create", groupData);
      set((state) => ({ groups: [...state.groups, res.data] }));
      toast.success("Group created successfully");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create group");
    }
  },

  addMember: async (groupId, userIdToAdd) => {
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/add-member`, {
        userIdToAdd,
      });
      set((state) => ({
        groups: state.groups.map((g) => (g._id === groupId ? res.data : g)),
      }));
      toast.success("Member added");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add member");
    }
  },

  removeMember: async (groupId, userIdToRemove) => {
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/remove-member`, {
        userIdToRemove,
      });
      set((state) => ({
        groups: state.groups.map((g) => (g._id === groupId ? res.data : g)),
      }));
      toast.success("Member removed");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove member");
    }
  },

  toggleAdminStatus: async (groupId, targetUserId, action) => {
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/toggle-admin`, {
        targetUserId,
        action,
      });
      set((state) => ({
        groups: state.groups.map((g) => (g._id === groupId ? res.data : g)),
      }));
      toast.success(`User ${action === "promote" ? "promoted" : "demoted"}`);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to change admin status",
      );
    }
  },

  deleteGroup: async (groupId) => {
    try {
      await axiosInstance.delete(`/groups/${groupId}`);
      set((state) => ({
        groups: state.groups.filter((g) => g._id !== groupId),
        selectedGroup:
          state.selectedGroup?._id === groupId ? null : state.selectedGroup,
      }));
      toast.success("Group deleted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete group");
    }
  },

  // ─── Messages ───────────────────────────────────────────

  getMessages: async (userId) => {
    set({ isMessagesLoading: true, selectedGroup: null });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
      get().clearUnread(userId);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  getGroupMessages: async (groupId) => {
    set({ isMessagesLoading: true, selectedUser: null });
    try {
      const res = await axiosInstance.get(`/groups/${groupId}/messages`);
      set({ messages: res.data });
      get().clearUnread(groupId);

      // Emit "viewingGroupChat" so Redis marks all messages seen by me
      const socket = useAuthStore.getState().socket;
      if (socket && res.data?.length > 0) {
        const messageIds = res.data.map((m) => m._id);
        socket.emit("viewingGroupChat", { groupId, messageIds });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  searchMessages: async (query) => {
    if (!query) {
      set({ searchResults: [] });
      return;
    }
    set({ isSearching: true });
    try {
      const res = await axiosInstance.get(`/messages/search?q=${encodeURIComponent(query)}`);
      set({ searchResults: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Search failed");
    } finally {
      set({ isSearching: false });
    }
  },

  clearSearchResults: () => set({ searchResults: [] }),

  sendMessage: async (messageData) => {
    const { selectedUser, selectedGroup, messages } = get();
    try {
      let res;
      if (selectedGroup) {
        res = await axiosInstance.post(
          `/groups/${selectedGroup._id}/send`,
          messageData,
        );
      } else {
        res = await axiosInstance.post(
          `/messages/send/${selectedUser._id}`,
          messageData,
        );
      }
      set({ messages: [...messages, res.data] });

      // Stop typing indicator
      const socket = useAuthStore.getState().socket;
      if (socket) {
        socket.emit("stopTyping", {
          targetUserId: selectedUser?._id,
          groupId: selectedGroup?._id,
        });
      }
    } catch (error) {
      const errData = error.response?.data;
      // Handle rate limit (429) with a special countdown toast
      if (error.response?.status === 429 && errData?.retryAfter) {
        toast.error(`⚠️ Rate limited! Try again in ${errData.retryAfter}s`, {
          duration: errData.retryAfter * 1000,
          icon: "⏳",
        });
      } else {
        toast.error(errData?.error || errData?.message || "Failed to send message");
      }
    }
  },

  // ─── Typing Indicators ──────────────────────────────────

  setTypingStatus: (id, isTyping, isGroup = false, typingUserId = null) => {
    set((state) => {
      const newTypingUsers = { ...state.typingUsers };
      if (isGroup && typingUserId) {
        // Track an array of users who are typing in the group
        const currentSet = new Set(newTypingUsers[id] || []);
        if (isTyping) currentSet.add(typingUserId);
        else currentSet.delete(typingUserId);
        newTypingUsers[id] = Array.from(currentSet);
      } else {
        newTypingUsers[id] = isTyping; // Boolean for DMs
      }
      return { typingUsers: newTypingUsers };
    });
  },

  emitTyping: (targetUserId, groupId) => {
    const socket = useAuthStore.getState().socket;
    if (socket) socket.emit("typing", { targetUserId, groupId });
  },

  emitStopTyping: (targetUserId, groupId) => {
    const socket = useAuthStore.getState().socket;
    if (socket) socket.emit("stopTyping", { targetUserId, groupId });
  },

  // ─── Last Seen ───────────────────────────────────────────

  fetchLastSeen: async (userId) => {
    try {
      const res = await axiosInstance.get(`/messages/lastseen/${userId}`);
      set((state) => ({
        lastSeenMap: { ...state.lastSeenMap, [userId]: res.data },
      }));
    } catch (_) {}
  },

  // ─── Real-Time Subscriptions ─────────────────────────────

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    // Only skip if ALL core listeners already registered
    if (socket.hasListeners("newMessage") && socket.hasListeners("reactionUpdate")) return;

    // Remove stale listeners before re-registering to avoid duplicates
    socket.off("newMessage");
    socket.off("reactionUpdate");

    const playNotificationSound = () => {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } catch (err) {}
    };

    socket.on("newMessage", (newMessage) => {
      const isMe = newMessage.senderId === useAuthStore.getState().authUser?._id;
      const { selectedUser, messages, users } = get();
      
      const isChatOpen = selectedUser && selectedUser._id === newMessage.senderId;
      if (!isMe && (!isChatOpen || document.hidden)) playNotificationSound();
      if (selectedUser && newMessage.senderId === selectedUser._id) {
        set({ messages: [...messages, newMessage] });
        // Emit read receipt via socket since the chat is open
        const socket = useAuthStore.getState().socket;
        if (socket) {
          socket.emit("messageRead", {
            messageId: newMessage._id,
            senderId: newMessage.senderId,
          });
        }
      } else {
        get().incrementUnread(newMessage.senderId);
        const sender = users.find((u) => u._id === newMessage.senderId);
        showNewMessageToast(
          sender?.profilePic,
          sender?.fullName || "Someone",
          newMessage.text,
          () => sender && get().setSelectedUser(sender),
        );
      }
    });

    socket.on("newGroupMessage", ({ groupId, message }) => {
      const isMe = message.senderId._id === useAuthStore.getState().authUser?._id;
      const { selectedGroup, messages, groups } = get();

      const isChatOpen = selectedGroup && selectedGroup._id === groupId;
      if (!isMe && (!isChatOpen || document.hidden)) playNotificationSound();
      if (selectedGroup && selectedGroup._id === groupId) {
        set({ messages: [...messages, message] });
      } else {
        get().incrementUnread(groupId);
        const group = groups.find((g) => g._id === groupId);
        showNewMessageToast(
          group?.groupPic,
          `Group: ${group?.name}`,
          `${message.senderId.fullName}: ${message.text}`,
          () => group && get().setSelectedGroup(group),
        );
      }
    });

    socket.on("userTyping", (data) => {
      const { userId, groupId, isTyping } = data;
      const id = groupId || userId;
      get().setTypingStatus(id, isTyping, !!groupId, userId);

      // Auto-clear after timeout
      if (isTyping) {
        setTimeout(() => get().setTypingStatus(id, false, !!groupId, userId), 5000);
      }
    });

    socket.on("newGroupCreated", (newGroup) => {
      set((state) => ({ groups: [...state.groups, newGroup] }));
      socket.emit("joinGroup", newGroup._id);
    });

    socket.on("addedToGroup", (group) => {
      set((state) => ({ groups: [...state.groups, group] }));
      socket.emit("joinGroup", group._id);
      toast.success(`You were added to group: ${group.name}`);
    });

    socket.on("removedFromGroup", (groupId) => {
      set((state) => ({
        groups: state.groups.filter((g) => g._id !== groupId),
        selectedGroup:
          state.selectedGroup?._id === groupId ? null : state.selectedGroup,
      }));
      socket.emit("leaveGroup", groupId);
      toast.error("You were removed from a group");
    });

    socket.on("groupUpdate", () => {
      // Refresh groups list or update specific group members
      get().getGroups();
    });

    socket.on("groupDeleted", (groupId) => {
      set((state) => ({
        groups: state.groups.filter((g) => g._id !== groupId),
        selectedGroup:
          state.selectedGroup?._id === groupId ? null : state.selectedGroup,
      }));
      toast.error("A group you were in has been deleted");
    });

    // ─── Group "Seen By" receipts ──────────────────────────
    // Emitted by server whenever any group member views the chat
    socket.on("groupSeenUpdate", ({ seenMap }) => {
      set((state) => ({
        groupSeenMap: { ...state.groupSeenMap, ...seenMap },
      }));
    });

    socket.on("messageReadReceipt", ({ messageId, readBy, readAt }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId
            ? { ...msg, readBy, readAt, isRead: true }
            : msg,
        ),
      }));
    });

    socket.on("messageUpdated", ({ messageId, image }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, image } : msg
        ),
      }));
    });
  },

  // ─── Unread Count Helpers ────────────────────────────────

  clearUnread: (id) => {
    set((state) => {
      const newCounts = { ...state.unreadCounts };
      delete newCounts[id];
      return { unreadCounts: newCounts };
    });
  },

  incrementUnread: (id) => {
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [id]: (state.unreadCounts[id] || 0) + 1,
      },
    }));
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.off("newMessage");
    socket.off("newGroupMessage");
    socket.off("userTyping");
    socket.off("newGroupCreated");
    socket.off("messageReadReceipt");
    socket.off("messageUpdated");
  },

  setSelectedUser: (selectedUser) => {
    set({ selectedUser, selectedGroup: null, messages: [] });
    if (selectedUser) {
      get().getMessages(selectedUser._id);
    }
  },

  setSelectedGroup: (selectedGroup) => {
    const { socket } = useAuthStore.getState();
    set({ selectedGroup, selectedUser: null, messages: [] });
    if (selectedGroup) {
      if (socket) socket.emit("joinGroup", selectedGroup._id);
      get().getGroupMessages(selectedGroup._id);
    }
  },
}));

// Request notification permission when the store is first loaded
requestNotificationPermission().catch(() => {});
