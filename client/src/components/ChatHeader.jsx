/* eslint-disable react/prop-types */
import { useState, useRef, useEffect } from "react";
import {
  X,
  ChevronLeft,
  Search,
  Settings,
  UserPlus,
  UserMinus,
  Trash2,
  LogOut,
  Shield,
  ArrowRight,
  Check,
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";

// ─── WhatsApp-style Add Member Modal ─────────────────────────────────────────
const AddMemberModal = ({ groupId, members, onClose }) => {
  const { users, addMember } = useChatStore();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]); // array of user objects
  const [loading, setLoading] = useState(false);

  const memberIds = new Set(members.map((m) => m._id || m));
  const eligible = users.filter(
    (u) =>
      !memberIds.has(u._id) &&
      (!search ||
        u.fullName.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())),
  );

  const toggleSelect = (user) => {
    setSelected((prev) =>
      prev.find((u) => u._id === user._id)
        ? prev.filter((u) => u._id !== user._id)
        : [...prev, user],
    );
  };

  const isSelected = (userId) => selected.some((u) => u._id === userId);

  const handleConfirm = async () => {
    if (selected.length === 0) return;
    setLoading(true);
    for (const user of selected) {
      await addMember(groupId, user._id);
    }
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-base-100 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 bg-primary text-primary-content flex-shrink-0">
          <button
            onClick={onClose}
            className="btn btn-circle btn-sm bg-primary-content/10 border-0 hover:bg-primary-content/20 text-primary-content"
          >
            <X className="w-4 h-4" />
          </button>
          <div>
            <p className="font-bold text-sm">Add to group</p>
            <p className="text-xs text-primary-content/70">
              {selected.length > 0
                ? `${selected.length} selected`
                : "Select people"}
            </p>
          </div>
        </div>

        {/* Selected bubbles */}
        {selected.length > 0 && (
          <div className="flex gap-3 px-4 py-3 overflow-x-auto flex-shrink-0 border-b border-base-200 bg-base-100">
            {selected.map((user) => (
              <div
                key={user._id}
                className="flex flex-col items-center gap-1 flex-shrink-0"
              >
                <div className="relative">
                  <img
                    src={user.profilePic || "/avatar.png"}
                    alt={user.fullName}
                    className="w-12 h-12 rounded-full object-cover border-2 border-primary/30"
                  />
                  <button
                    onClick={() => toggleSelect(user)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-base-content text-base-100 rounded-full flex items-center justify-center shadow"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-[10px] text-base-content/60 max-w-[48px] truncate text-center">
                  {user.fullName.split(" ")[0]}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="px-4 py-3 flex-shrink-0 border-b border-base-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="input input-bordered input-sm w-full pl-9 rounded-full bg-base-200 border-0 focus:outline-none"
            />
          </div>
        </div>

        {/* Contact List */}
        <div className="overflow-y-auto flex-1">
          {eligible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-base-content/40">
              <UserPlus className="w-8 h-8 mb-2" />
              <p className="text-sm">
                {search ? "No results found" : "Everyone is already a member"}
              </p>
            </div>
          ) : (
            eligible.map((user) => {
              const sel = isSelected(user._id);
              return (
                <div
                  key={user._id}
                  onClick={() => toggleSelect(user)}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-base-200/60 cursor-pointer transition-colors"
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={user.profilePic || "/avatar.png"}
                      alt={user.fullName}
                      className="w-11 h-11 rounded-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-base-content truncate">
                      {user.fullName}
                    </p>
                    <p className="text-xs text-base-content/40 truncate">
                      {user.email}
                    </p>
                  </div>
                  {/* Checkbox */}
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      sel
                        ? "bg-primary border-primary"
                        : "border-base-300 bg-transparent"
                    }`}
                  >
                    {sel && (
                      <Check className="w-3.5 h-3.5 text-primary-content" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Floating confirm button */}
        {selected.length > 0 && (
          <div className="p-4 flex justify-end flex-shrink-0">
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="btn btn-circle btn-lg bg-primary border-0 shadow-xl shadow-primary/30 hover:scale-105 transition-transform text-primary-content"
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <ArrowRight className="w-6 h-6" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Remove Member Modal ─────────────────────────────────────────────────────
const RemoveMemberModal = ({ group, onClose }) => {
  const { removeMember } = useChatStore();
  const { authUser } = useAuthStore();
  const [confirmId, setConfirmId] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  const members = group.members || [];
  const admins = new Set((group.admins || []).map((a) => a._id || a));

  const handleRemove = async (userId) => {
    setLoadingId(userId);
    await removeMember(group._id, userId);
    setLoadingId(null);
    setConfirmId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-base-100 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-base-200 flex-shrink-0">
          <button onClick={onClose} className="btn btn-circle btn-sm btn-ghost">
            <X className="w-4 h-4" />
          </button>
          <div>
            <p className="font-bold text-sm">Remove member</p>
            <p className="text-xs text-base-content/50">
              {members.length} participants
            </p>
          </div>
        </div>

        {/* Members List */}
        <div className="overflow-y-auto flex-1">
          {members.map((member) => {
            const memberId = member._id || member;
            const isSelf = memberId === authUser._id;
            const isAdm = admins.has(memberId);
            const isPending = confirmId === memberId;

            return (
              <div
                key={memberId}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-base-200/40 transition-colors"
              >
                <img
                  src={member.profilePic || "/avatar.png"}
                  alt={member.fullName || "member"}
                  className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-base-content truncate">
                    {member.fullName || memberId}
                    {isSelf && (
                      <span className="ml-1.5 text-xs text-base-content/40 font-normal">
                        (you)
                      </span>
                    )}
                  </p>
                  {isAdm && (
                    <p className="text-[10px] text-secondary flex items-center gap-0.5 font-medium">
                      <Shield className="w-3 h-3" /> Group Admin
                    </p>
                  )}
                </div>

                {!isSelf &&
                  (isPending ? (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs text-base-content/50">
                        Remove?
                      </span>
                      <button
                        onClick={() => handleRemove(memberId)}
                        disabled={loadingId === memberId}
                        className="btn btn-xs bg-error text-white hover:bg-error/80 border-0"
                      >
                        {loadingId === memberId ? (
                          <span className="loading loading-spinner loading-xs" />
                        ) : (
                          "Yes"
                        )}
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="btn btn-xs btn-ghost"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(memberId)}
                      className="btn btn-circle btn-sm bg-error/10 hover:bg-error hover:text-white text-error border-0 transition-all flex-shrink-0"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  ))}
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-base-200 flex-shrink-0">
          <button onClick={onClose} className="btn btn-sm btn-block btn-ghost">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Settings Dropdown ───────────────────────────────────────────────────────
const GroupSettingsDropdown = ({
  isAdmin,
  onAddMember,
  onRemoveMember,
  onDeleteGroup,
  onLeaveGroup,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const Item = ({ icon: Icon, label, onClick, danger }) => (
    <button
      onClick={() => {
        setOpen(false);
        onClick();
      }}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-base-200 transition-colors text-left ${
        danger ? "text-error" : "text-base-content"
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {label}
    </button>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`btn btn-circle btn-sm btn-ghost hover:bg-base-200 transition-colors ${
          open ? "bg-base-200" : ""
        }`}
        title="Group settings"
      >
        <Settings className="w-4 h-4 text-base-content/60" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-base-100 rounded-2xl shadow-2xl border border-base-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          {isAdmin && (
            <>
              <Item icon={UserPlus} label="Add members" onClick={onAddMember} />
              <Item
                icon={UserMinus}
                label="Remove member"
                onClick={onRemoveMember}
              />
              <div className="border-t border-base-200 my-1" />
              <Item
                icon={Trash2}
                label="Delete group"
                onClick={onDeleteGroup}
                danger
              />
            </>
          )}
          {!isAdmin && (
            <Item
              icon={LogOut}
              label="Leave group"
              onClick={onLeaveGroup}
              danger
            />
          )}
        </div>
      )}
    </div>
  );
};

// ─── Chat Header ─────────────────────────────────────────────────────────────
const ChatHeader = () => {
  const {
    selectedUser,
    setSelectedUser,
    selectedGroup,
    setSelectedGroup,
    typingUsers,
    deleteGroup,
    removeMember,
    users,
    lastSeenMap,
    fetchLastSeen,
  } = useChatStore();
  const { authUser, onlineUsers } = useAuthStore();

  useEffect(() => {
    if (selectedUser && !onlineUsers.includes(selectedUser._id)) {
      fetchLastSeen(selectedUser._id);
    }
  }, [selectedUser?._id]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);

  const handleClose = () => {
    setSelectedUser(null);
    setSelectedGroup(null);
  };

  const isDMChat = !!selectedUser;
  const currentChat = selectedUser || selectedGroup;
  if (!currentChat) return null;

  const isOnline = isDMChat ? onlineUsers.includes(selectedUser._id) : false;
  const typingData = typingUsers[currentChat._id];
  const isTyping = isDMChat ? !!typingData : (Array.isArray(typingData) && typingData.length > 0);
  const typingName = !isDMChat && isTyping && typingData.length === 1 
    ? (users.find(u => u._id === typingData[0])?.fullName.split(' ')[0] || "Someone") 
    : "";
  const isAdmin = selectedGroup?.admins?.some(
    (admin) => (admin._id || admin) === authUser?._id,
  );

  const handleDeleteGroup = () => {
    if (window.confirm("Delete this group? This cannot be undone.")) {
      deleteGroup(selectedGroup._id);
    }
  };

  const handleLeaveGroup = () => {
    if (window.confirm("Leave this group?")) {
      removeMember(selectedGroup._id, authUser._id);
    }
  };

  return (
    <>
      <div className="mx-3 mt-3 sm:mx-6 sm:mt-6 p-4 glass-island rounded-[2rem] flex-shrink-0 z-20 sticky top-0">
        <div className="flex items-center justify-between">
          {/* Left — avatar + name */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={handleClose}
              className="lg:hidden btn btn-circle btn-sm btn-ghost hover:bg-base-200 -ml-2 flex-shrink-0"
            >
              <ChevronLeft className="w-6 h-6 text-base-content/80" />
            </button>

            <div className="avatar flex-shrink-0">
              <div className="size-10 rounded-full border border-base-300 shadow-sm">
                <img
                  src={
                    isDMChat
                      ? selectedUser.profilePic || "/avatar.png"
                      : selectedGroup.groupPic || "/avatar.png"
                  }
                  alt={currentChat.name || currentChat.fullName}
                />
              </div>
            </div>

            <div className="min-w-0">
              <h3 className="font-semibold text-base-content tracking-tight truncate">
                {isDMChat ? selectedUser.fullName : selectedGroup.name}
              </h3>
              <p className="text-xs text-base-content/60 font-medium">
                {isTyping ? (
                  <span className="text-primary flex items-center gap-1">
                    {!isDMChat && typingData.length === 1 ? `${typingName} typing` : !isDMChat ? `${typingData.length} typing` : 'typing'}
                    <span className="flex gap-0.5 mt-1">
                      {[0, 150, 300].map((d) => (
                        <span
                          key={d}
                          className="w-1 h-1 bg-primary rounded-full animate-bounce"
                          style={{ animationDelay: `${d}ms` }}
                        />
                      ))}
                    </span>
                  </span>
                ) : isDMChat ? (
                  isOnline ? (
                    <span className="text-green-500">Online</span>
                  ) : (
                    <span className="text-base-content/40">
                      {lastSeenMap[selectedUser._id]?.formatted
                        ? `Last seen ${lastSeenMap[selectedUser._id].formatted}`
                        : "Offline"}
                    </span>
                  )
                ) : (
                  <span>{selectedGroup.members?.length || 0} members</span>
                )}
              </p>
            </div>
          </div>

          {/* Right — actions */}
          <div className="flex items-center gap-1 flex-shrink-0 relative">
            {selectedGroup && (
              <GroupSettingsDropdown
                isAdmin={isAdmin}
                onAddMember={() => setShowAddModal(true)}
                onRemoveMember={() => setShowRemoveModal(true)}
                onDeleteGroup={handleDeleteGroup}
                onLeaveGroup={handleLeaveGroup}
              />
            )}

            <button
              onClick={handleClose}
              className="hidden lg:flex btn btn-circle btn-sm btn-ghost hover:bg-base-200"
            >
              <X className="w-5 h-5 text-base-content/60" />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddModal && selectedGroup && (
        <AddMemberModal
          groupId={selectedGroup._id}
          members={selectedGroup.members || []}
          onClose={() => setShowAddModal(false)}
        />
      )}
      {showRemoveModal && selectedGroup && (
        <RemoveMemberModal
          group={selectedGroup}
          onClose={() => setShowRemoveModal(false)}
        />
      )}
    </>
  );
};

export default ChatHeader;
