import { NavLink, Link } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import FriendsSidebar from "../Social/FriendsSidebar";
import { DatabaseZap, BarChart3, Trophy, LogOut } from 'lucide-react';

/* ── Brand Mark ── */
const LurnerMark = () => (
  <div className="flex items-center gap-2.5">
    <div className="w-[35px] h-[35px] rounded-lg flex items-center justify-center shrink-0 border border-dashed border-[var(--color-accent)]">
      <img src="src/assets/logo2.png" alt="logo" className="w-full h-full object-contain" />
    </div>
    <span className="font-bold text-[1.05rem] text-white tracking-tight">
      Lurner
    </span>
  </div>
);

/* ── Nav Link ── */
const navLinkClass = ({ isActive }) =>
  [
    'flex items-center gap-2.5 px-3 py-2 rounded-lg no-underline text-[0.855rem] font-medium mb-0.5 transition-all duration-150',
    isActive
      ? 'text-white bg-white/10'
      : 'text-[var(--color-text-sidebar)] hover:text-white hover:bg-white/5',
  ].join(' ');

const SIDEBAR_W = 220;
const FRIENDS_W = 288;

export default function AppLayout({ children }) {
  const { user, logout, isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--color-bg-app)]">

      {/* ── Left Sidebar ── */}
      <aside
        style={{ width: SIDEBAR_W }}
        className="bg-[var(--color-bg-sidebar)] h-screen fixed top-0 left-0 flex flex-col z-50 border-r border-white/5"
      >
        {/* Brand */}
        <div className="h-[60px] px-[18px] border-b border-white/[0.06] flex items-center">
          <Link to="/" className="no-underline">
            <LurnerMark />
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-5 overflow-y-auto">
          <div className="px-3 pb-2.5 text-[0.6rem] font-bold text-[rgba(201,209,224,0.35)] uppercase tracking-widest">
            Navigation
          </div>

          <NavLink to="/" end className={navLinkClass}>
            <DatabaseZap size={16} strokeWidth={1.8} />
            Questions
          </NavLink>

          <NavLink to="/insights" className={navLinkClass}>
            <BarChart3 size={16} strokeWidth={1.8} />
            Insights
          </NavLink>

          <NavLink to="/contests" className={navLinkClass}>
            <Trophy size={16} strokeWidth={1.8} />
            Contests
          </NavLink>
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-white/[0.06]">
          {isAuthenticated ? (
            <div className="flex items-center gap-2.5">
              {/* Avatar */}
              <div className="w-[34px] h-[34px] rounded-lg bg-[var(--color-accent)] flex items-center justify-center text-[0.85rem] font-bold text-white shrink-0">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[0.83rem] font-semibold text-white truncate">
                  {user?.name}
                </div>
                <div className="text-[0.68rem] text-[rgba(201,209,224,0.45)] mt-px">
                  Member
                </div>
              </div>
              <button
                onClick={logout}
                title="Sign out"
                className="bg-transparent border-none text-[rgba(201,209,224,0.4)] cursor-pointer p-1 rounded-md flex transition-colors duration-150 hover:text-[rgba(201,209,224,0.8)]"
              >
                <LogOut size={16} strokeWidth={1.8} />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="w-full flex items-center justify-center px-5 py-2.5 bg-[var(--color-accent)] text-white text-[0.83rem] font-semibold rounded-[var(--radius-sm)] no-underline transition-all duration-150 hover:bg-[var(--color-accent-hover)]"
            >
              Sign In
            </Link>
          )}
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div
        style={{
          marginLeft: SIDEBAR_W,
          marginRight: isAuthenticated ? (sidebarOpen ? FRIENDS_W : 48) : 0,
          transition: 'margin-right 0.25s ease',
        }}
        className="flex-1 flex flex-col min-h-screen"
      >
        <main className="flex-1">{children}</main>
      </div>

      {/* ── Friends Sidebar ── */}
      {isAuthenticated && (
        <FriendsSidebar
          open={sidebarOpen}
          onToggle={() => setSidebarOpen(o => !o)}
          width={FRIENDS_W}
        />
      )}
    </div>
  );
}
