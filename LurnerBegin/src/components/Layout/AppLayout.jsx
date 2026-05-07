import { NavLink, Link } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import FriendsSidebar from "../Social/FriendsSidebar";
import { DatabaseZap, BarChart3, Trophy, LogOut } from 'lucide-react';

/* ── Brand Mark ── */
const LurnerMark = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <div style={{
      width: 30, height: 30, borderRadius: 8,
      background: 'var(--accent)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    </div>
    <span style={{
      fontWeight: 700, fontSize: '1.05rem', color: 'white',
      letterSpacing: '-0.01em', fontFamily: 'var(--font-sans)',
    }}>
      Lurner
    </span>
  </div>
);

/* ── Nav Link styles ── */
const navLinkStyle = ({ isActive }) => ({
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '9px 12px', borderRadius: 8, textDecoration: 'none',
  fontSize: '0.855rem', fontWeight: 500, marginBottom: 2,
  color: isActive ? 'white' : 'var(--text-sidebar)',
  background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
  transition: 'all 0.15s',
  opacity: 1,
});

export default function AppLayout({ children }) {
  const { user, logout, isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const SIDEBAR_W = 220;
  const FRIENDS_W = 288;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-app)' }}>

      {/* ── Left Sidebar ── */}
      <aside style={{
        width: SIDEBAR_W,
        background: 'var(--bg-sidebar)',
        height: '100vh', position: 'fixed', top: 0, left: 0,
        display: 'flex', flexDirection: 'column', zIndex: 50,
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }}>
        {/* Brand */}
        <div style={{
          height: 60, padding: '0 18px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center',
        }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <LurnerMark />
          </Link>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '20px 10px', overflowY: 'auto' }}>
          <div style={{
            padding: '0 12px 10px',
            fontSize: '0.6rem', fontWeight: 700,
            color: 'rgba(201,209,224,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em',
          }}>
            Navigation
          </div>

          <NavLink to="/" end style={navLinkStyle}>
            <DatabaseZap size={16} strokeWidth={1.8} />
            Questions
          </NavLink>

          <NavLink to="/insights" style={navLinkStyle}>
            <BarChart3 size={16} strokeWidth={1.8} />
            Insights
          </NavLink>

          {/* Disabled link */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 8,
            fontSize: '0.855rem', fontWeight: 500, marginBottom: 2,
            color: 'rgba(201,209,224,0.3)',
            cursor: 'default', userSelect: 'none',
          }}>
            <Trophy size={16} strokeWidth={1.8} />
            Contests
            <span style={{
              marginLeft: 'auto', fontSize: '0.58rem', fontWeight: 600,
              background: 'rgba(255,255,255,0.08)',
              color: 'rgba(201,209,224,0.4)',
              padding: '2px 7px', borderRadius: 4,
            }}>
              Soon
            </span>
          </div>
        </nav>

        {/* User Footer */}
        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Avatar */}
              <div style={{
                width: 34, height: 34, borderRadius: 8,
                background: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.85rem', fontWeight: 700, color: 'white', flexShrink: 0,
              }}>
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.83rem', fontWeight: 600, color: 'white',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {user?.name}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'rgba(201,209,224,0.45)', marginTop: 1 }}>
                  Member
                </div>
              </div>
              <button
                onClick={logout}
                title="Sign out"
                style={{
                  background: 'none', border: 'none',
                  color: 'rgba(201,209,224,0.4)', cursor: 'pointer',
                  padding: 4, borderRadius: 6, display: 'flex',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(201,209,224,0.8)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(201,209,224,0.4)'}
              >
                <LogOut size={16} strokeWidth={1.8} />
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.83rem' }}>
              Sign In
            </Link>
          )}
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div style={{
        flex: 1,
        marginLeft: SIDEBAR_W,
        marginRight: isAuthenticated ? (sidebarOpen ? FRIENDS_W : 48) : 0,
        display: 'flex', flexDirection: 'column', minHeight: '100vh',
        transition: 'margin-right 0.25s ease',
      }}>
        <main style={{ flex: 1 }}>
          {children}
        </main>
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
