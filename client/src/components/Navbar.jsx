import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import {
  LogOut,
  Fan,
  Settings,
  User,
  Bell,
  ChevronDown,
  Palette,
  ChevronRight,
} from "lucide-react";

const Navbar = () => {
  const { logout, authUser } = useAuthStore();
  const { unreadCounts } = useChatStore();

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  return (
    <header className="bg-base-100/80 backdrop-blur-xl border-b border-base-300 fixed w-full top-0 z-40 transition-all shadow-sm">
      <div className="container mx-auto px-4 h-16">
        <div className="flex items-center justify-between h-full">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link
              to="/"
              className="flex items-center gap-3 hover:opacity-80 transition-all group"
            >
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Fan className="w-6 h-6 text-primary animate-[spin_5s_linear_infinite]" />
              </div>
              <h1 className="text-xl font-black tracking-tight text-base-content flex items-center gap-2">
                Zephyr
                {/* Global unread badge on logo */}
                {totalUnread > 0 && (
                  <span className="bg-primary text-primary-content text-[11px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1.5 shadow-md">
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </span>
                )}
              </h1>
            </Link>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {!authUser && (
              <Link
                to="/settings"
                className="btn btn-sm btn-ghost gap-2 rounded-full hover:bg-base-200"
              >
                <Settings className="w-5 h-5" />
                <span className="hidden sm:inline font-medium">Settings</span>
              </Link>
            )}

            {authUser && (
              <>
                <button className="btn btn-circle btn-ghost relative overflow-visible">
                  <Bell className="w-5 h-5 text-base-content/80" />
                  {totalUnread > 0 && (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-base-100"></span>
                  )}
                </button>

                <div className="dropdown dropdown-end">
                  <div
                    tabIndex={0}
                    role="button"
                    className="flex items-center gap-3 btn btn-ghost h-auto hover:bg-base-200 rounded-2xl px-2 py-1.5 ml-1"
                  >
                    <div className="relative">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border border-base-300">
                        {authUser.profilePic ? (
                          <img
                            src={authUser.profilePic}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-primary font-bold text-sm sm:text-base">
                            {authUser.fullName?.substring(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-base-100"></span>
                    </div>
                    <div className="hidden lg:flex flex-col items-start min-w-0 max-w-[120px] text-left">
                      <span className="text-sm font-semibold truncate w-full text-base-content">
                        {authUser.fullName}
                      </span>
                      <span className="text-xs text-base-content/60 truncate w-full">
                        {authUser.email}
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 hidden lg:block text-base-content/60" />
                  </div>

                  <ul
                    tabIndex={0}
                    className="dropdown-content menu z-[1] w-64 p-0 shadow-2xl bg-base-200/95 backdrop-blur-xl rounded-[1.5rem] border border-base-300 mt-3 overflow-hidden"
                  >
                    <div className="px-5 py-4 border-b border-base-300/50 bg-base-100/50">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border border-base-300 flex-shrink-0">
                          {authUser.profilePic ? (
                            <img
                              src={authUser.profilePic}
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-lg text-primary font-bold">
                              {authUser.fullName?.substring(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-sm font-bold truncate text-base-content">
                            {authUser.fullName}
                          </span>
                          <span className="text-xs text-base-content/60 truncate">
                            {authUser.email}
                          </span>
                          <div className="mt-1.5">
                            <span className="text-[10px] font-bold bg-primary text-primary-content px-2 py-0.5 rounded-full uppercase tracking-wider">
                              USER
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-2 space-y-0.5 mt-1">
                      <li>
                        <Link
                          to="/profile"
                          className="flex items-center gap-3 px-4 py-2 text-sm font-medium hover:bg-base-300/50 rounded-xl transition-colors text-base-content"
                        >
                          <User className="w-[18px] h-[18px] text-base-content/60" />
                          My Profile
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/settings"
                          className="flex items-center gap-3 px-4 py-2 text-sm font-medium hover:bg-base-300/50 rounded-xl transition-colors text-base-content"
                        >
                          <Settings className="w-[18px] h-[18px] text-base-content/60" />
                          Settings
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/settings"
                          className="flex items-center justify-between px-4 py-2 text-sm font-medium hover:bg-base-300/50 rounded-xl transition-colors group text-base-content"
                        >
                          <div className="flex items-center gap-3">
                            <Palette className="w-[18px] h-[18px] text-base-content/60" />
                            Theme
                          </div>
                          <ChevronRight className="w-4 h-4 text-base-content/40 group-hover:text-base-content/70 transition-colors" />
                        </Link>
                      </li>
                    </div>

                    <div className="border-t border-base-300/50 mx-4 my-1"></div>

                    <div className="p-2 pb-3">
                      <li>
                        <button
                          onClick={logout}
                          className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-error hover:bg-error/10 hover:text-error rounded-xl transition-colors w-full text-left"
                        >
                          <LogOut className="w-[18px] h-[18px]" />
                          Logout
                        </button>
                      </li>
                    </div>
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
