import { useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { X, Users, Upload, Search } from "lucide-react";
import toast from "react-hot-toast";
import PropTypes from "prop-types";

const CreateGroupModal = ({ onClose }) => {
  const { users, createGroup } = useChatStore();
  const { authUser } = useAuthStore();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [groupPic, setGroupPic] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setGroupPic(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const toggleMember = (userId) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Group name is required");
    if (selectedMembers.length === 0)
      return toast.error("Select at least one member");

    setLoading(true);
    try {
      await createGroup({
        name: name.trim(),
        description: description.trim(),
        members: selectedMembers,
        groupPic,
      });
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u._id !== authUser._id &&
      (u.fullName.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-base-100 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-6 border-b border-base-200 flex items-center justify-between bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Create Group</h2>
              <p className="text-xs text-base-content/60">
                Start a new conversation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-circle btn-sm btn-ghost hover:bg-base-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-6 max-h-[70vh] overflow-y-auto"
        >
          {/* Group Picture */}
          <div className="flex flex-col items-center">
            <div className="relative group">
              <div className="w-24 h-24 rounded-3xl bg-base-200 flex items-center justify-center overflow-hidden border-2 border-dashed border-base-300 group-hover:border-primary/50 transition-colors">
                {groupPic ? (
                  <img
                    src={groupPic}
                    alt="Group"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Users className="w-10 h-10 text-base-content/20" />
                )}
              </div>
              <label className="absolute -bottom-2 -right-2 p-2 bg-primary text-primary-content rounded-xl cursor-pointer shadow-lg hover:scale-110 transition-transform">
                <Upload className="w-4 h-4" />
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </label>
            </div>
            <p className="mt-2 text-xs text-base-content/40 uppercase font-bold tracking-widest text-center">
              Group Icon
            </p>
          </div>

          {/* Name & Description */}
          <div className="space-y-4">
            <div className="form-control w-full">
              <label className="label py-1">
                <span className="label-text font-bold text-xs uppercase opacity-60">
                  Group Name
                </span>
              </label>
              <input
                type="text"
                placeholder="Enter group name..."
                className="input input-bordered w-full rounded-2xl focus:input-primary transition-all"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-control w-full">
              <label className="label py-1">
                <span className="label-text font-bold text-xs uppercase opacity-60">
                  Description (Optional)
                </span>
              </label>
              <textarea
                placeholder="Tell everyone what this group is about..."
                className="textarea textarea-bordered w-full rounded-2xl focus:textarea-primary transition-all h-20 resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Member Selection */}
          <div className="space-y-3">
            <label className="label py-1">
              <span className="label-text font-bold text-xs uppercase opacity-60">
                Select Members
              </span>
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
              <input
                type="text"
                placeholder="Search friends..."
                className="input input-bordered w-full pl-11 rounded-2xl input-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {filteredUsers.map((user) => (
                <div
                  key={user._id}
                  onClick={() => toggleMember(user._id)}
                  className={`flex items-center gap-3 p-2 rounded-2xl cursor-pointer transition-all border ${
                    selectedMembers.includes(user._id)
                      ? "bg-primary/10 border-primary/20"
                      : "hover:bg-base-200 border-transparent"
                  }`}
                >
                  <img
                    src={user.profilePic || "/avatar.png"}
                    alt=""
                    className="w-10 h-10 rounded-xl object-cover"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{user.fullName}</p>
                    <p className="text-[10px] opacity-60">{user.email}</p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                      selectedMembers.includes(user._id)
                        ? "bg-primary border-primary"
                        : "border-base-300"
                    }`}
                  >
                    {selectedMembers.includes(user._id) && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 pt-4 border-t border-base-200">
            <button
              type="button"
              onClick={onClose}
              className="btn flex-1 rounded-2xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || selectedMembers.length === 0}
              className="btn btn-primary flex-1 rounded-2xl shadow-lg shadow-primary/20"
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                "Create Group"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

CreateGroupModal.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default CreateGroupModal;
