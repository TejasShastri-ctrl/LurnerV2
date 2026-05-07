import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { fetchFriends, fetchPendingInvites, acceptInvite, declineInvite, sendInvite } from '../../api/api';

/* ── Toggle icon (chevron) ── */
const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const UsersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

export default function FriendsSidebar({ open, onToggle, width = 288 }) {
  const { user, token } = useAuth();
  const { onlineFriends, socket } = useSocket();

  const [friends, setFriends]             = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [loading, setLoading]             = useState(true);
  const [sendingInvite, setSendingInvite]  = useState(false);
  const [showInviteInput, setShowInviteInput] = useState(false);
  const [copyLabel, setCopyLabel]          = useState('Copy');

  const loadData = useCallback(async () => {
    if (!user || !token) return;
    try {
      const [friendsData, pendingData] = await Promise.all([
        fetchFriends(token),
        fetchPendingInvites(token),
      ]);
      setFriends(Array.isArray(friendsData) ? friendsData : []);
      setPendingInvites(Array.isArray(pendingData) ? pendingData : []);
    } catch (e) {
      console.error('Failed to load social data:', e);
    } finally {
      setLoading(false);
    }
  }, [user, token]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (socket) {
      const handleNewInvite = () => loadData();
      socket.on('notification:new_invite', handleNewInvite);
      return () => socket.off('notification:new_invite', handleNewInvite);
    }
  }, [socket, loadData]);

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteCodeInput.trim()) return;
    setSendingInvite(true);
    try {
      const res = await sendInvite(inviteCodeInput.trim(), token);
      if (!res.error) {
        setInviteCodeInput('');
        setShowInviteInput(false);
      }
    } catch {
      // silently ignore — toast system would be ideal here
    } finally {
      setSendingInvite(false);
    }
  };

  const handleAccept  = async (id) => { try { await acceptInvite(id, token);  loadData(); } catch {} };
  const handleDecline = async (id) => { try { await declineInvite(id, token); loadData(); } catch {} };

  const handleCopy = () => {
    navigator.clipboard.writeText(user?.friendCode || '').then(() => {
      setCopyLabel('Copied!');
      setTimeout(() => setCopyLabel('Copy'), 2000);
    });
  };

  if (!user) return null;

  const online  = friends.filter(f => onlineFriends.includes(f.id));
  const offline = friends.filter(f => !onlineFriends.includes(f.id));

  return (
    <aside style={{
      width: open ? width : 48,
      background: 'var(--bg-content)',
      borderLeft: '1px solid var(--border)',
      height: '100vh',
      position: 'fixed', right: 0, top: 0,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      transition: 'width 0.25s ease',
      zIndex: 100,
      boxShadow: open ? 'var(--shadow-md)' : 'none',
    }}>

      {/* Toggle button */}
      <button
        onClick={onToggle}
        title={open ? 'Collapse panel' : 'Expand friends panel'}
        style={{
          display: 'flex', alignItems: 'center',
          justifyContent: open ? 'space-between' : 'center',
          width: '100%', padding: open ? '14px 16px' : '14px',
          background: 'transparent', border: 'none',
          borderBottom: '1px solid var(--border)',
          cursor: 'pointer', color: 'var(--text-muted)',
          transition: 'all 0.15s', flexShrink: 0, gap: 8,
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        {open ? (
          <>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
              Friends
            </span>
            <ChevronRight />
          </>
        ) : (
          <UsersIcon />
        )}
      </button>

      {!open && (
        <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          {loading ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>...</div>
          ) : (
            <>
              {online.map(f => <FriendListItem key={f.id} friend={f} online={true} isOpen={open} />)}
              {offline.map(f => <FriendListItem key={f.id} friend={f} online={false} isOpen={open} />)}
            </>
          )}
        </div>
      )}

      {open && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 16px' }}>

          

          {/* Pending invites */}
          {pendingInvites.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div style={{
                fontSize: '0.62rem', fontWeight: 700,
                color: 'var(--accent)', textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: 10,
              }}>
                Pending · {pendingInvites.length}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pendingInvites.map(invite => (
                  <div
                    key={invite.id}
                    style={{
                      background: 'var(--accent-light)',
                      border: '1px solid var(--accent-border)',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                      {invite.sender.name} sent an invite
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => handleAccept(invite.id)}
                        style={{
                          flex: 1, padding: '5px 0', background: 'var(--accent)',
                          color: 'white', border: 'none', borderRadius: 5,
                          fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleDecline(invite.id)}
                        style={{
                          flex: 1, padding: '5px 0', background: 'transparent',
                          border: '1px solid var(--border)', color: 'var(--text-secondary)',
                          borderRadius: 5, fontSize: '0.72rem', fontWeight: 500, cursor: 'pointer',
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Friends list */}
          <div>
            <div style={{
              fontSize: '0.62rem', fontWeight: 700,
              color: 'var(--text-muted)', textTransform: 'uppercase',
              letterSpacing: '0.08em', marginBottom: 10,
            }}>
              Friends {friends.length > 0 && `· ${friends.length}`}
            </div>

            {loading ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Loading…</div>
            ) : friends.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                No friends yet. Share your code to connect!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {online.map(f => <FriendListItem key={f.id} friend={f} online={true} isOpen={open} />)}
                {offline.map(f => <FriendListItem key={f.id} friend={f} online={false} isOpen={open} />)}
              </div>
            )}
          </div>
        </div>
      )}

      {open && 
          <div style={{
            background: 'var(--bg-subtle)',
            padding: '11px 13px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            width: '99%',
            margin: '0 auto',
            marginBottom: '2px'
          }}>
            <div style={{
              fontSize: '0.62rem', fontWeight: 700,
              color: 'var(--text-muted)', textTransform: 'uppercase',
              letterSpacing: '0.08em', marginBottom: 6,
            }}>
              Your Friend Code
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <code style={{ fontSize: '0.88rem', color: 'var(--accent)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {user.friendCode || 'LURN-????'}
              </code>
              <button
                onClick={handleCopy}
                style={{
                  background: 'none', border: '1px solid var(--border)',
                  color: 'var(--text-secondary)', cursor: 'pointer',
                  fontSize: '0.68rem', fontWeight: 600,
                  padding: '3px 9px', borderRadius: 4,
                  transition: 'all 0.15s',
                }}
              >
                {copyLabel}
              </button>
            </div>
          </div>}

      {/* Add friend footer */}
      {open && (
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          {showInviteInput ? (
            <form onSubmit={handleSendInvite}>
              <input
                type="text"
                placeholder="Enter friend code…"
                value={inviteCodeInput}
                onChange={e => setInviteCodeInput(e.target.value.toUpperCase())}
                autoFocus
                style={{
                  width: '100%', padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-subtle)',
                  color: 'var(--text-primary)',
                  marginBottom: 8, fontSize: '0.82rem',
                  fontFamily: 'var(--font-mono)',
                  outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="submit"
                  disabled={sendingInvite}
                  style={{
                    flex: 2, padding: '8px 0',
                    background: 'var(--accent)', color: 'white',
                    border: 'none', borderRadius: 'var(--radius-sm)',
                    fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
                  }}
                >
                  {sendingInvite ? 'Sending…' : 'Send Invite'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowInviteInput(false)}
                  style={{
                    flex: 1, padding: '8px 0',
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowInviteInput(true)}
              style={{
                width: '100%', padding: '9px 0',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              + Add Friend by Code
            </button>
          )}
        </div>
      )}
    </aside>
  );
}

/* ── Single friend list item ── */
function FriendListItem({ friend, online, isOpen }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: isOpen ? 10 : 0 }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8,
          background: online ? 'var(--accent-light)' : 'var(--bg-subtle)',
          border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: online ? 'var(--accent)' : 'var(--text-muted)',
          fontWeight: 700, fontSize: '0.85rem',
        }}>
          {friend.name[0].toUpperCase()}
        </div>
        {online && isOpen && (
          <div style={{
            position: 'absolute', bottom: 1, right: 1,
            width: 9, height: 9, borderRadius: '50%',
            background: 'var(--success)', border: '2px solid var(--bg-content)',
          }} />
        )}
      </div>
      {isOpen && <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {friend.name}
        </div>
        <div style={{ fontSize: '0.68rem', color: online ? 'var(--success)' : 'var(--text-muted)' }}>
          {online ? 'Online' : 'Offline'}
        </div>
      </div>}
    </div>
  );
}
