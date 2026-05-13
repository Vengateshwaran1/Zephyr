import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, Mail, Fan } from "lucide-react";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const { login, isLoggingIn } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    login(formData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center pt-20 pb-10 px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="glass-panel rounded-[2rem] p-8 sm:p-10 space-y-8">
          {/* Logo & Title */}
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
                <Fan className="w-8 h-8 text-primary-content animate-[spin_6s_linear_infinite]" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-base-content to-base-content/70 bg-clip-text">
                Welcome Back
              </h1>
              <p className="text-base-content/50 mt-1 font-medium">Sign in to continue to Zephyr</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-base-content/70 ml-1">Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-base-content/30 group-focus-within:text-primary transition-colors duration-300" />
                </div>
                <input
                  type="email"
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-base-100/50 backdrop-blur-sm border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all duration-300 text-sm placeholder:text-base-content/30"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-base-content/70 ml-1">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-base-content/30 group-focus-within:text-primary transition-colors duration-300" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full pl-11 pr-12 py-3 rounded-2xl bg-base-100/50 backdrop-blur-sm border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all duration-300 text-sm placeholder:text-base-content/30"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-4 flex items-center text-base-content/40 hover:text-primary transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-content font-bold text-sm tracking-wide shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="text-center text-sm">
            <span className="text-base-content/50">Don&apos;t have an account?{" "}</span>
            <Link to="/signup" className="text-primary font-semibold hover:underline underline-offset-4 transition-all">
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
