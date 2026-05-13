import Navbar from "./components/Navbar.jsx";
import { Routes, Route, Navigate } from "react-router-dom";
import SignupPage from "./pages/SignupPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import AnalyticsPage from "./pages/AnalyticsPage.jsx";
import { useAuthStore } from "./store/useAuthStore.js";
import { useThemeStore } from "./store/useThemeStore.js";
import { useChatStore } from "./store/useChatStore.js";
import { useEffect } from "react";
import { Fan } from "lucide-react";
import { Toaster } from "react-hot-toast";

const App = () => {
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore();
  const { theme } = useThemeStore();
  const { subscribeToMessages, unsubscribeFromMessages } = useChatStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Global background listener for messages and notifications
  useEffect(() => {
    if (authUser) {
      subscribeToMessages();
    } else {
      unsubscribeFromMessages();
    }
  }, [authUser, subscribeToMessages, unsubscribeFromMessages]);

  console.log({ authUser });

  if (isCheckingAuth && !authUser)
    return (
      <div data-theme={theme} className="relative flex items-center justify-center h-screen overflow-hidden">
        <div className="fixed inset-0 ambient-bg -z-10" />
        <div className="fixed top-[-10%] left-[-5%] w-[600px] h-[600px] bg-primary/15 rounded-full blur-3xl opacity-60 animate-blob -z-10" />
        <div className="fixed top-[-5%] right-[-5%] w-[500px] h-[500px] bg-secondary/15 rounded-full blur-3xl opacity-60 animate-blob animation-delay-2000 -z-10" />
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-[1.5rem] glass-island flex items-center justify-center">
            <Fan className="size-10 text-primary animate-[spin_1.5s_linear_infinite]" />
          </div>
          <p className="text-base-content/50 font-semibold text-sm tracking-wider animate-pulse">Loading Zephyr...</p>
        </div>
      </div>
    );

  return (
    <div>
      <div data-theme={theme} className="relative min-h-screen overflow-x-hidden">
        {/* ── Global Ambient Background ── */}
        <div className="fixed inset-0 ambient-bg -z-10" />
        {/* Floating Orbs */}
        <div className="fixed top-[-10%] left-[-5%] w-[600px] h-[600px] bg-primary/15 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob -z-10" />
        <div className="fixed top-[-5%] right-[-5%] w-[500px] h-[500px] bg-secondary/15 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob animation-delay-2000 -z-10" />
        <div className="fixed bottom-[-10%] left-[20%] w-[550px] h-[550px] bg-accent/10 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000 -z-10" />

        <Navbar />

        <Routes>
          <Route
            path="/"
            element={authUser ? <HomePage /> : <Navigate to="/login" />}
          />
          <Route
            path="/signup"
            element={!authUser ? <SignupPage /> : <Navigate to="/" />}
          />
          <Route
            path="/login"
            element={!authUser ? <LoginPage /> : <Navigate to="/" />}
          />
          <Route path="/settings" element={<SettingsPage />} />
          <Route
            path="/profile"
            element={authUser ? <ProfilePage /> : <Navigate to="/login" />}
          />
          <Route
            path="/analytics"
            element={
              authUser && authUser.role === "admin" ? (
                <AnalyticsPage />
              ) : (
                <Navigate to="/" />
              )
            }
          />
        </Routes>

        <Toaster />
      </div>
    </div>
  );
};

export default App;
