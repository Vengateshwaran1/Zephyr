import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Eye, EyeOff, Loader2, Lock, Mail, Fan, User } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

const SignUpPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ fullName: "", email: "", password: "" });
  const { signup, isSigningUp } = useAuthStore();

  const validateForm = () => {
    if (!formData.fullName.trim()) return toast.error("Full name is required");
    if (!formData.email.trim()) return toast.error("Email is required");
    if (!/\S+@\S+\.\S+/.test(formData.email)) return toast.error("Invalid email format");
    if (!formData.password) return toast.error("Password is required");
    if (formData.password.length < 6) return toast.error("Password must be at least 6 characters");
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm() === true) signup(formData);
  };

  const inputClass = "w-full py-3 rounded-2xl bg-base-100/50 backdrop-blur-sm border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all duration-300 text-sm placeholder:text-base-content/30";

  return (
    <div className="min-h-screen flex items-center justify-center pt-20 pb-10 px-4">
      <div className="w-full max-w-md">
        <div className="glass-panel rounded-[2rem] p-8 sm:p-10 space-y-8">
          {/* Logo */}
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary/80 flex items-center justify-center shadow-lg shadow-primary/30">
                <Fan className="w-8 h-8 text-primary-content animate-[spin_6s_linear_infinite]" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-base-content to-base-content/70 bg-clip-text">
                Create Account
              </h1>
              <p className="text-base-content/50 mt-1 font-medium">Join Zephyr for free today</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {[
              { label: "Full Name", key: "fullName", type: "text", icon: User, placeholder: "Your full name" },
              { label: "Email", key: "email", type: "email", icon: Mail, placeholder: "you@example.com" },
            ].map(({ label, key, type, icon: Icon, placeholder }) => (
              <div key={key} className="space-y-1.5">
                <label className="text-sm font-semibold text-base-content/70 ml-1">{label}</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Icon className="h-4 w-4 text-base-content/30 group-focus-within:text-primary transition-colors duration-300" />
                  </div>
                  <input
                    type={type}
                    className={`${inputClass} pl-11 pr-4`}
                    placeholder={placeholder}
                    value={formData[key]}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                  />
                </div>
              </div>
            ))}

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-base-content/70 ml-1">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-base-content/30 group-focus-within:text-primary transition-colors duration-300" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  className={`${inputClass} pl-11 pr-12`}
                  placeholder="Min. 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button type="button" className="absolute inset-y-0 right-4 flex items-center text-base-content/40 hover:text-primary transition-colors" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-content font-bold text-sm tracking-wide shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2"
              disabled={isSigningUp}
            >
              {isSigningUp ? (<><Loader2 className="h-4 w-4 animate-spin" />Creating account...</>) : "Create Account"}
            </button>
          </form>

          <div className="text-center text-sm">
            <span className="text-base-content/50">Already have an account?{" "}</span>
            <Link to="/login" className="text-primary font-semibold hover:underline underline-offset-4 transition-all">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
};
export default SignUpPage;
