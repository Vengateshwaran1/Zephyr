import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Camera, Mail, User, Check, Shield, Calendar } from "lucide-react";

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  const [selectedImg, setSelectedImg] = useState(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64Image = reader.result;
      setSelectedImg(base64Image);
      await updateProfile({ profilePic: base64Image });
    };
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black tracking-tight">My Profile</h1>
          <p className="text-base-content/50 mt-1">Manage your identity and account details</p>
        </div>

        {/* Avatar Card */}
        <div className="glass-panel rounded-[2rem] p-8 flex flex-col items-center gap-5">
          <div className="relative group">
            {/* Glow Ring */}
            <div className="absolute -inset-1 bg-gradient-to-br from-primary via-secondary to-accent rounded-full opacity-60 blur-sm group-hover:opacity-90 transition-opacity duration-500" />
            <img
              src={selectedImg || authUser.profilePic || "/avatar.png"}
              alt="Profile"
              className="relative size-32 rounded-full object-cover border-4 border-base-100 shadow-2xl"
            />
            {/* Upload Button */}
            <label
              htmlFor="avatar-upload"
              className={`absolute bottom-1 right-1 w-9 h-9 rounded-full bg-primary flex items-center justify-center cursor-pointer shadow-lg shadow-primary/40 hover:scale-110 transition-all duration-200 ${isUpdatingProfile ? "animate-pulse pointer-events-none" : ""}`}
            >
              <Camera className="w-4 h-4 text-primary-content" />
              <input type="file" id="avatar-upload" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUpdatingProfile} />
            </label>
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-black">{authUser?.fullName}</h2>
            <p className="text-base-content/50 text-sm mt-0.5">
              {isUpdatingProfile ? (
                <span className="text-primary animate-pulse">Updating photo...</span>
              ) : (
                "Click the camera icon to change photo"
              )}
            </p>
          </div>

          {/* Role Badge */}
          {authUser?.role && (
            <span className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest border border-primary/20">
              {authUser.role}
            </span>
          )}
        </div>

        {/* Info Card */}
        <div className="glass-panel rounded-[2rem] p-8 space-y-5">
          <h3 className="text-base font-bold text-base-content/60 uppercase tracking-widest text-xs">Account Details</h3>

          {[
            { icon: User, label: "Full Name", value: authUser?.fullName },
            { icon: Mail, label: "Email Address", value: authUser?.email },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-4 p-4 rounded-2xl bg-base-100/30 border border-white/5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">{label}</p>
                <p className="font-semibold mt-0.5">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Account Status Card */}
        <div className="glass-panel rounded-[2rem] p-8 space-y-4">
          <h3 className="text-base font-bold text-base-content/60 uppercase tracking-widest text-xs">Account Information</h3>

          <div className="flex items-center gap-4 p-4 rounded-2xl bg-base-100/30 border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-green-500" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">Account Status</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-semibold text-green-500">Active</span>
                <Check className="w-4 h-4 text-green-500" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-2xl bg-base-100/30 border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">Member Since</p>
              <p className="font-semibold mt-0.5">{authUser.createdAt?.split("T")[0]}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ProfilePage;
