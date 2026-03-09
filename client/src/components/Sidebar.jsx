import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton.jsx";
import { Users } from "lucide-react";

const Sidebar = () => {
  const {
    getUsers,
    users,
    selectedUser,
    setSelectedUser,
    isUsersLoading,
    unreadCounts,
  } = useChatStore();

  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  // Total unread across all contacts (for header badge)
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-full flex flex-col transition-all duration-200 border-r border-base-300">
      {/* ─── Header ───────────────────────────────────────── */}
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Users className="size-6 text-primary" />
            {totalUnread > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 animate-pulse">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </div>
          <span className="font-medium">Contacts</span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            <span className="text-sm">Show online only</span>
          </label>
          <span className="text-xs text-base-content/60">
            ({Math.max(0, onlineUsers.length - 1)} online)
          </span>
        </div>
      </div>

      {/* ─── Contact List ──────────────────────────────────── */}
      <div className="overflow-y-auto w-full py-3">
        {filteredUsers.map((user) => {
          const unread = unreadCounts[user._id] || 0;
          const isOnline = onlineUsers.includes(user._id);
          const isSelected = selectedUser?._id === user._id;

          return (
            <button
              key={user._id}
              onClick={() => setSelectedUser(user)}
              className={`
                w-full p-3 flex items-center gap-3 hover:bg-base-300/50 
                transition-all duration-200 relative
                ${isSelected ? "bg-base-300 ring-1 ring-base-300/50" : ""}
                ${unread > 0 && !isSelected ? "bg-primary/5" : ""}
              `}
            >
              {/* Avatar + Online Dot */}
              <div className="relative mx-auto lg:mx-0 flex-shrink-0">
                <img
                  src={user.profilePic || "/avatar.png"}
                  alt={user.fullName}
                  className="size-12 object-cover rounded-full"
                />
                {isOnline && (
                  <span className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-base-100" />
                )}
              </div>

              {/* Name + Status / Unread badge */}
              <div className="flex flex-1 text-left min-w-0 items-center justify-between">
                <div className="min-w-0">
                  <div
                    className={`font-medium truncate ${
                      unread > 0 ? "font-semibold" : ""
                    }`}
                  >
                    {user.fullName}
                  </div>
                  <div
                    className={`text-xs truncate ${
                      isOnline ? "text-green-500" : "text-base-content/60"
                    }`}
                  >
                    {isOnline ? "● Online" : "○ Offline"}
                  </div>
                </div>

                {/* Unread badge */}
                {unread > 0 && !isSelected && (
                  <span className="ml-2 flex-shrink-0 bg-primary text-primary-content text-[11px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shadow-sm">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </div>
            </button>
          );
        })}

        {filteredUsers.length === 0 && (
          <div className="text-center text-base-content/60 py-8 px-4">
            {showOnlineOnly ? "No one is online right now" : "No contacts yet"}
          </div>
        )}
      </div>
    </aside>
  );
};
export default Sidebar;
