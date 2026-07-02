import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { fetchFriends, fetchPendingInvites, acceptInvite, declineInvite, sendInvite } from '../../api/api';

/* ── Icons ── */
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

  const [friends, setFriends]               = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [loading, setLoading]               = useState(true);
  const [sendingInvite, setSendingInvite]   = useState(false);
  const [showInviteInput, setShowInviteInput] = useState(false);
  const [copyLabel, setCopyLabel]           = useState('Copy');

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
      if (!res.error) { setInviteCodeInput(''); setShowInviteInput(false); }
    } catch {} finally { setSendingInvite(false); }
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
    <aside
      style={{ width: open ? width : 48, transition: 'width 0.25s ease', boxShadow: open ? '0 4px 12px rgba(17,24,39,0.08)' : 'none' }}
      className="bg-[var(--color-bg-content)] border-l border-[var(--color-border)] h-screen fixed right-0 top-0 flex flex-col overflow-hidden z-[100]"
    >

      {/* Toggle button */}
      <button
        onClick={onToggle}
        title={open ? 'Collapse panel' : 'Expand friends panel'}
        className={[
          'flex items-center w-full border-none border-b border-[var(--color-border)] cursor-pointer text-[var(--color-text-muted)] transition-all duration-150 shrink-0 gap-2 bg-transparent hover:bg-[var(--color-bg-subtle)]',
          open ? 'justify-between px-4 py-[14px]' : 'justify-center p-[14px]',
        ].join(' ')}
      >
        {open ? (
          <>
            <span className="text-[0.72rem] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
              Friends
            </span>
            <ChevronRight />
          </>
        ) : (
          <UsersIcon />
        )}
      </button>

      {/* Collapsed avatars */}
      {!open && (
        <div className="py-4 flex flex-col items-center gap-3">
          {loading ? (
            <div className="text-[var(--color-text-muted)] text-[0.6rem]">...</div>
          ) : (
            <>
              {online.map(f  => <FriendListItem key={f.id} friend={f} online={true}  isOpen={open} />)}
              {offline.map(f => <FriendListItem key={f.id} friend={f} online={false} isOpen={open} />)}
            </>
          )}
        </div>
      )}

      {/* Expanded content */}
      {open && (
        <div className="flex-1 overflow-y-auto px-4 py-[18px]">

          {/* Pending invites */}
          {pendingInvites.length > 0 && (
            <div className="mb-[22px]">
              <div className="text-[0.62rem] font-bold text-[var(--color-accent)] uppercase tracking-[0.08em] mb-2.5">
                Pending · {pendingInvites.length}
              </div>
              <div className="flex flex-col gap-2">
                {pendingInvites.map(invite => (
                  <div
                    key={invite.id}
                    className="bg-[var(--color-accent-light)] border border-[var(--color-accent-border)] px-3 py-2.5 rounded-[var(--radius-sm)]"
                  >
                    <div className="text-[0.82rem] font-semibold text-[var(--color-text-primary)] mb-2">
                      {invite.sender.name} sent an invite
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleAccept(invite.id)}
                        className="flex-1 py-[5px] bg-[var(--color-accent)] text-white border-none rounded-[5px] text-[0.72rem] font-semibold cursor-pointer"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleDecline(invite.id)}
                        className="flex-1 py-[5px] bg-transparent border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-[5px] text-[0.72rem] font-medium cursor-pointer"
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
            <div className="text-[0.62rem] font-bold text-[var(--color-text-muted)] uppercase tracking-[0.08em] mb-2.5">
              Friends {friends.length > 0 && `· ${friends.length}`}
            </div>
            {loading ? (
              <div className="text-[var(--color-text-muted)] text-[0.82rem]">Loading…</div>
            ) : friends.length === 0 ? (
              <div className="text-[var(--color-text-muted)] text-[0.82rem]">
                No friends yet. Share your code to connect!
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {online.map(f  => <FriendListItem key={f.id} friend={f} online={true}  isOpen={open} />)}
                {offline.map(f => <FriendListItem key={f.id} friend={f} online={false} isOpen={open} />)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Friend code card */}
      {open && (
        <div className="bg-[var(--color-bg-subtle)] px-[13px] py-[11px] rounded-[var(--radius-sm)] border border-[var(--color-border)] w-[99%] mx-auto mb-[2px]">
          <div className="text-[0.62rem] font-bold text-[var(--color-text-muted)] uppercase tracking-[0.08em] mb-1.5">
            Your Friend Code
          </div>
          <div className="flex items-center justify-between gap-2">
            <code className="text-[0.88rem] text-[var(--color-accent)] font-bold font-mono">
              {user.friendCode || 'LURN-????'}
            </code>
            <button
              onClick={handleCopy}
              className="bg-none border border-[var(--color-border)] text-[var(--color-text-secondary)] cursor-pointer text-[0.68rem] font-semibold px-[9px] py-[3px] rounded-[4px] transition-all duration-150 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              {copyLabel}
            </button>
          </div>
        </div>
      )}

      {/* Add friend footer */}
      {open && (
        <div className="px-4 py-3.5 border-t border-[var(--color-border)] shrink-0">
          {showInviteInput ? (
            <form onSubmit={handleSendInvite}>
              <input
                type="text"
                placeholder="Enter friend code…"
                value={inviteCodeInput}
                onChange={e => setInviteCodeInput(e.target.value.toUpperCase())}
                autoFocus
                className="w-full px-3 py-[9px] rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[var(--color-text-primary)] mb-2 text-[0.82rem] font-mono outline-none transition-[border-color] duration-150 focus:border-[var(--color-accent)]"
              />
              <div className="flex gap-1.5">
                <button
                  type="submit"
                  disabled={sendingInvite}
                  className="flex-[2] py-2 bg-[var(--color-accent)] text-white border-none rounded-[var(--radius-sm)] font-semibold text-[0.8rem] cursor-pointer disabled:opacity-45"
                >
                  {sendingInvite ? 'Sending…' : 'Send Invite'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowInviteInput(false)}
                  className="flex-1 py-2 bg-transparent border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-[var(--radius-sm)] text-[0.8rem] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowInviteInput(true)}
              className="w-full py-[9px] rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-transparent text-[var(--color-text-secondary)] font-semibold text-[0.8rem] cursor-pointer transition-all duration-150 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
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
    <div className={`flex items-center ${isOpen ? 'gap-2.5' : 'gap-0'}`}>
      <div className="relative shrink-0">
        <div
          className={`w-[34px] h-[34px] rounded-lg border border-[var(--color-border)] flex items-center justify-center font-bold text-[0.85rem] ${
            online
              ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)]'
              : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]'
          }`}
        >
          {friend.name[0].toUpperCase()}
        </div>
        {online && isOpen && (
          <div className="absolute bottom-[1px] right-[1px] w-[9px] h-[9px] rounded-full bg-[var(--color-success)] border-2 border-[var(--color-bg-content)]" />
        )}
      </div>
      {isOpen && (
        <div className="min-w-0">
          <div className="text-[0.84rem] font-semibold text-[var(--color-text-primary)] overflow-hidden text-ellipsis whitespace-nowrap">
            {friend.name}
          </div>
          <div className={`text-[0.68rem] ${online ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'}`}>
            {online ? 'Online' : 'Offline'}
          </div>
        </div>
      )}
    </div>
  );
}
