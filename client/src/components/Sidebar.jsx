import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton.jsx";
import { Users, Plus, Search } from "lucide-react";
import CreateGroupModal from "./CreateGroupModal";

const Sidebar = () => {
  const {
    getUsers,
    users,
    getGroups,
    groups,
    selectedUser,
    setSelectedUser,
    selectedGroup,
    setSelectedGroup,
    isUsersLoading,
    isGroupsLoading,
    unreadCounts,
    typingUsers,
    searchMessages,
    searchResults,
    clearSearchResults,
    isSearching,
  } = useChatStore();

  const { authUser, onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [activeTab, setActiveTab] = useState("direct"); // "direct" or "group"
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    getUsers();
    getGroups();
  }, [getUsers, getGroups]);

  useEffect(() => {
    if (!searchQuery) {
      clearSearchResults();
    }
  }, [searchQuery, clearSearchResults]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim()) {
        searchMessages(searchQuery);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, searchMessages]);

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  // Total unread across all contacts (for header badge)
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  if (isUsersLoading || isGroupsLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-full flex flex-col transition-all duration-200 bg-transparent">
      {/* ─── Header ───────────────────────────────────────── */}
      <div className="border-b border-white/5 w-full p-5 backdrop-blur-xl bg-base-100/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Users className="size-6 text-primary" />
              {totalUnread > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 animate-pulse">
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}
            </div>
            <span className="font-medium">Zephyr</span>
          </div>
        </div>

        {/* ─── Discord-style Tabs ─────────────────────────── */}
        <div className="flex bg-base-200 p-1 rounded-lg items-center">
          <button
            onClick={() => setActiveTab("direct")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === "direct"
                ? "bg-base-100 shadow-sm"
                : "text-base-content/60"
            }`}
          >
            Direct
          </button>
          <button
            onClick={() => setActiveTab("group")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === "group"
                ? "bg-base-100 shadow-sm"
                : "text-base-content/60"
            }`}
          >
            Groups
          </button>

          {activeTab === "group" && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="ml-1 p-1.5 bg-primary text-primary-content rounded-md hover:scale-105 transition-transform shadow-lg shadow-primary/20"
              title="Create New Group"
            >
              <Plus className="size-3.5" />
            </button>
          )}
        </div>

        {activeTab === "direct" && (
          <div className="mt-3 flex items-center gap-2">
            <label className="cursor-pointer flex items-center gap-2">
              <input
                type="checkbox"
                checked={showOnlineOnly}
                onChange={(e) => setShowOnlineOnly(e.target.checked)}
                className="checkbox checkbox-sm checkbox-primary"
              />
              <span className="text-sm">Online only</span>
            </label>
            <span className="text-xs text-base-content/60">
              ({Math.max(0, onlineUsers.length - 1)} online)
            </span>
          </div>
        )}

        {/* ─── Global Search Bar ─────────────────────────── */}
        <div className="mt-4 relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search all messages globally..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input input-sm input-bordered rounded-full pl-9 w-full bg-base-100/50 backdrop-blur-sm focus:border-primary/50 focus:shadow-[0_0_15px_-3px_rgba(var(--bg-primary-rgb),0.3)] transition-all duration-300"
          />
        </div>
      </div>

      {/* ─── List Content ──────────────────────────────────── */}
      <div className="overflow-y-auto w-full py-3 px-3">
        {isCreateModalOpen && (
          <CreateGroupModal onClose={() => setIsCreateModalOpen(false)} />
        )}

        {searchQuery.trim() ? (
          <div className="px-3">
            <p className="text-xs font-semibold text-primary mb-2 px-1">Global RedisSearch Results</p>
            {isSearching ? (
              <div className="p-4 flex justify-center"><span className="loading loading-spinner text-primary"></span></div>
            ) : searchResults.length > 0 ? (
              searchResults.map((msg, i) => {
                const senderName = msg.senderId === authUser._id 
                  ? "You" 
                  : (users.find(u => u._id === msg.senderId)?.fullName || "Someone");
                
                return (
                  <div key={i} className="p-3 hover:bg-base-200/50 rounded-xl transition-all border border-transparent hover:border-base-200 mb-2 cursor-pointer"
                       onClick={() => {
                         // On click, navigate to the user chat
                         if (msg.senderId !== authUser._id) {
                           const userToChat = users.find(u => u._id === msg.senderId);
                           if (userToChat) setSelectedUser(userToChat);
                         } else if (msg.receiverId) {
                           const userToChat = users.find(u => u._id === msg.receiverId);
                           if (userToChat) setSelectedUser(userToChat);
                         }
                       }}>
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-xs font-semibold text-base-content">
                        {senderName}
                      </span>
                      <span className="text-[10px] text-base-content/40">
                        {new Date(msg.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-base-content line-clamp-2 break-all">{msg.text}</p>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-xs text-base-content/50 py-4">No matching messages</p>
            )}
          </div>
        ) : activeTab === "direct" ? (
          <>
            {filteredUsers.map((user) => {
              const unread = unreadCounts[user._id] || 0;
              const isOnline = onlineUsers.includes(user._id);
              const isSelected = selectedUser?._id === user._id;
              const isTyping = typingUsers[user._id];

              return (
                <button
                  key={user._id}
                  onClick={() => setSelectedUser(user)}
                  className={`
                    w-full p-3 flex items-center gap-4 transition-all duration-300 relative group
                    rounded-[1.25rem] mb-1.5 overflow-hidden
                    ${isSelected 
                      ? "bg-primary/10 border border-primary/20 shadow-md shadow-primary/5 scale-[1.02]" 
                      : "hover:bg-base-200/50 hover:scale-[1.01] border border-transparent"
                    }
                    ${unread > 0 && !isSelected ? "bg-primary/5 border-primary/10" : ""}
                  `}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={user.profilePic || "/avatar.png"}
                      alt={user.fullName}
                      className="size-11 object-cover rounded-xl"
                    />
                    {isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 size-3.5 bg-green-500 rounded-full ring-2 ring-base-100" />
                    )}
                  </div>

                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between">
                      <div
                        className={`font-semibold truncate ${isSelected ? "text-primary" : ""}`}
                      >
                        {user.fullName}
                      </div>
                      {unread > 0 && !isSelected && (
                        <span className="bg-primary text-primary-content text-[10px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center shadow-lg transform scale-110">
                          {unread}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 h-4">
                      {isTyping ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] italic text-primary font-medium animate-pulse">
                            typing...
                          </span>
                          <div className="flex gap-0.5 mt-0.5">
                            <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1 h-1 bg-primary rounded-full animate-bounce"></span>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`text-[10px] font-medium transition-colors ${isOnline ? "text-green-500/80" : "text-base-content/40"}`}
                        >
                          {isOnline ? "Online" : "Offline"}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            {filteredUsers.length === 0 && (
              <div className="text-center text-base-content/60 py-8 px-4 text-sm">
                {showOnlineOnly ? "No one online" : "No contacts yet"}
              </div>
            )}
          </>
        ) : (
          <>
            {groups.map((group) => {
              const unread = unreadCounts[group._id] || 0;
              const isSelected = selectedGroup?._id === group._id;
              const typingArray = typingUsers[group._id] || [];
              const isTyping = typingArray.length > 0;

              return (
                <button
                  key={group._id}
                  onClick={() => setSelectedGroup(group)}
                  className={`
                    w-full p-3 flex items-center gap-4 transition-all duration-300 relative group
                    rounded-[1.25rem] mb-1.5 overflow-hidden
                    ${isSelected 
                      ? "bg-primary/10 border border-primary/20 shadow-md shadow-primary/5 scale-[1.02]" 
                      : "hover:bg-base-200/50 hover:scale-[1.01] border border-transparent"
                    }
                    ${unread > 0 && !isSelected ? "bg-primary/5 border-primary/10" : ""}
                  `}
                >
                  <div className="relative flex-shrink-0">
                    <div className="size-11 bg-primary/10 rounded-xl flex items-center justify-center font-bold text-primary">
                      {group.groupPic ? (
                        <img
                          src={group.groupPic}
                          className="size-full object-cover rounded-xl"
                        />
                      ) : (
                        group.name.substring(0, 2).toUpperCase()
                      )}
                    </div>
                  </div>

                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between">
                      <div
                        className={`font-semibold truncate ${isSelected ? "text-primary" : ""}`}
                      >
                        {group.name}
                      </div>
                      {unread > 0 && !isSelected && (
                        <span className="bg-primary text-primary-content text-[10px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center shadow-lg">
                          {unread}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 h-4">
                      {isTyping ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] italic text-primary font-medium animate-pulse">
                            {typingArray.length === 1 
                              ? `${users.find(u => u._id === typingArray[0])?.fullName.split(' ')[0] || 'Someone'} typing...`
                              : `${typingArray.length} typing...`}
                          </span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-base-content/40 truncate">
                          {group.members.length} members
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            {groups.length === 0 && (
              <div className="text-center text-base-content/60 py-8 px-4 text-sm">
                No groups joined yet
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};
export default Sidebar;
