'use client';

import React, { useState, useRef, useEffect } from 'react';

interface CollabUser {
  id: string;
  name: string;
  avatar?: string;
  color: string;
}

interface ChatMessage {
  text: string;
  user: CollabUser;
}

interface CollabPanelProps {
  isOpen: boolean;
  onClose: () => void;
  connected: boolean;
  users: CollabUser[];
  messages: ChatMessage[];
  inviteCode: string | null;
  onSendMessage: (text: string) => void;
  onStartSession: () => void;
  onJoinSession: (code: string) => void;
}

export default function CollabPanel({
  isOpen,
  onClose,
  connected,
  users,
  messages,
  inviteCode,
  onSendMessage,
  onStartSession,
  onJoinSession,
}: CollabPanelProps) {
  const [chatInput, setChatInput] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!chatInput.trim()) return;
    onSendMessage(chatInput.trim());
    setChatInput('');
  };

  const handleCopyInvite = () => {
    if (!inviteCode) return;
    const url = `${window.location.origin}/daw?invite=${inviteCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <h3 style={styles.title}>👥 Collaboration</h3>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>
      </div>

      {!connected ? (
        <div style={styles.notConnected}>
          <p style={styles.infoText}>Start a session to collaborate in real-time</p>
          <button onClick={onStartSession} style={styles.primaryBtn}>
            🚀 Start Session
          </button>
          <div style={styles.divider}>
            <span>or join</span>
          </div>
          <div style={styles.joinRow}>
            <input
              type="text"
              placeholder="Enter invite code..."
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              style={styles.input}
              onKeyDown={(e) => e.key === 'Enter' && joinCode && onJoinSession(joinCode)}
            />
            <button
              onClick={() => joinCode && onJoinSession(joinCode)}
              style={styles.joinBtn}
              disabled={!joinCode}
            >
              Join
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Connection Status */}
          <div style={styles.statusBar}>
            <span style={styles.statusDot}>●</span>
            <span style={styles.statusText}>Connected • {users.length} online</span>
          </div>

          {/* Invite Link */}
          {inviteCode && (
            <div style={styles.inviteSection}>
              <button onClick={handleCopyInvite} style={styles.inviteBtn}>
                {copied ? '✓ Copied!' : '🔗 Copy Invite Link'}
              </button>
            </div>
          )}

          {/* Users */}
          <div style={styles.usersSection}>
            {users.map((user) => (
              <div key={user.id} style={styles.userRow}>
                <div
                  style={{
                    ...styles.avatar,
                    backgroundColor: user.color,
                  }}
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt="" style={styles.avatarImg} />
                  ) : (
                    user.name[0]?.toUpperCase()
                  )}
                </div>
                <span style={styles.userName}>{user.name}</span>
              </div>
            ))}
          </div>

          {/* Chat */}
          <div style={styles.chatSection}>
            <div style={styles.chatMessages}>
              {messages.length === 0 && (
                <p style={styles.chatEmpty}>No messages yet</p>
              )}
              {messages.map((msg, i) => (
                <div key={i} style={styles.chatMsg}>
                  <span style={{ color: msg.user.color, fontWeight: 600, fontSize: 12 }}>
                    {msg.user.name}:
                  </span>{' '}
                  <span style={styles.chatText}>{msg.text}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div style={styles.chatInputRow}>
              <input
                type="text"
                placeholder="Type a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                style={styles.chatInputField}
              />
              <button onClick={handleSend} style={styles.sendBtn}>
                Send
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'fixed', right: 0, top: 0, bottom: 0, width: 320,
    background: '#1a1a2e', borderLeft: '1px solid #333', zIndex: 9998,
    display: 'flex', flexDirection: 'column',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px', borderBottom: '1px solid #333',
  },
  title: { margin: 0, fontSize: 16, color: '#fff' },
  closeBtn: {
    background: 'none', border: 'none', color: '#888', fontSize: 18, cursor: 'pointer',
  },
  notConnected: { padding: 20, textAlign: 'center' as const },
  infoText: { color: '#888', fontSize: 14, marginBottom: 16 },
  primaryBtn: {
    width: '100%', padding: '12px', background: '#4a3f8a', border: 'none',
    borderRadius: 8, color: '#fff', fontSize: 15, cursor: 'pointer', fontWeight: 600,
  },
  divider: {
    display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0',
    color: '#666', fontSize: 13,
  },
  joinRow: { display: 'flex', gap: 8 },
  input: {
    flex: 1, padding: '10px 12px', background: '#252540', border: '1px solid #444',
    borderRadius: 6, color: '#fff', fontSize: 14, outline: 'none',
  },
  joinBtn: {
    padding: '10px 16px', background: '#333', border: '1px solid #555',
    borderRadius: 6, color: '#ccc', cursor: 'pointer',
  },
  statusBar: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
    borderBottom: '1px solid #222',
  },
  statusDot: { color: '#4ecdc4', fontSize: 10 },
  statusText: { color: '#888', fontSize: 12 },
  inviteSection: { padding: '8px 16px' },
  inviteBtn: {
    width: '100%', padding: '8px', background: '#252540', border: '1px solid #444',
    borderRadius: 6, color: '#7c6ff0', cursor: 'pointer', fontSize: 13,
  },
  usersSection: { padding: '8px 16px', borderBottom: '1px solid #222' },
  userRow: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0',
  },
  avatar: {
    width: 28, height: 28, borderRadius: '50%', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontSize: 13, fontWeight: 600, overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' as const },
  userName: { color: '#ddd', fontSize: 14 },
  chatSection: { flex: 1, display: 'flex', flexDirection: 'column' as const, minHeight: 0 },
  chatMessages: {
    flex: 1, overflow: 'auto', padding: '8px 16px',
  },
  chatEmpty: { color: '#555', fontSize: 13, textAlign: 'center' as const },
  chatMsg: { marginBottom: 4, fontSize: 13 },
  chatText: { color: '#ccc' },
  chatInputRow: {
    display: 'flex', gap: 8, padding: '8px 16px', borderTop: '1px solid #222',
  },
  chatInputField: {
    flex: 1, padding: '8px 10px', background: '#252540', border: '1px solid #444',
    borderRadius: 6, color: '#fff', fontSize: 13, outline: 'none',
  },
  sendBtn: {
    padding: '8px 14px', background: '#4a3f8a', border: 'none',
    borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 13,
  },
};
