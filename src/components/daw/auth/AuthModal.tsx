'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Signup failed');
          setLoading(false);
          return;
        }
        // Auto-login after signup
      }

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid credentials');
        setLoading(false);
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>
            {mode === 'login' ? '🔑 Sign In' : '✨ Create Account'}
          </h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {/* Tab Switcher */}
        <div style={styles.tabs}>
          <button
            onClick={() => { setMode('login'); setError(''); }}
            style={{
              ...styles.tab,
              ...(mode === 'login' ? styles.tabActive : {}),
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('signup'); setError(''); }}
            style={{
              ...styles.tab,
              ...(mode === 'signup' ? styles.tabActive : {}),
            }}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {mode === 'signup' && (
            <div style={styles.field}>
              <label style={styles.label}>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                style={styles.input}
              />
            </div>
          )}
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'Min 8 characters' : 'Your password'}
              required
              minLength={mode === 'signup' ? 8 : undefined}
              style={styles.input}
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading
              ? 'Please wait...'
              : mode === 'login'
              ? 'Sign In'
              : 'Create Account'}
          </button>
        </form>

        <p style={styles.footer}>
          {mode === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <button onClick={() => setMode('signup')} style={styles.link}>
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button onClick={() => setMode('login')} style={styles.link}>
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
  },
  modal: {
    background: '#1a1a2e', borderRadius: 12, width: 400,
    border: '1px solid #333', overflow: 'hidden',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 20px', borderBottom: '1px solid #333',
  },
  title: { margin: 0, fontSize: 18, color: '#fff' },
  closeBtn: {
    background: 'none', border: 'none', color: '#888', fontSize: 20, cursor: 'pointer',
  },
  tabs: {
    display: 'flex', borderBottom: '1px solid #333',
  },
  tab: {
    flex: 1, padding: '12px', background: 'none', border: 'none',
    color: '#888', fontSize: 14, cursor: 'pointer',
  },
  tabActive: {
    color: '#fff', borderBottom: '2px solid #7c6ff0',
  },
  form: { padding: 20 },
  field: { marginBottom: 16 },
  label: { display: 'block', color: '#aaa', fontSize: 13, marginBottom: 6 },
  input: {
    width: '100%', padding: '10px 12px', background: '#252540',
    border: '1px solid #444', borderRadius: 6, color: '#fff',
    fontSize: 14, outline: 'none', boxSizing: 'border-box' as const,
  },
  error: {
    background: '#3d1414', border: '1px solid #ff4444', borderRadius: 6,
    padding: '8px 12px', color: '#ff6b6b', fontSize: 13, marginBottom: 16,
  },
  submitBtn: {
    width: '100%', padding: '12px', background: '#4a3f8a', border: 'none',
    borderRadius: 8, color: '#fff', fontSize: 15, cursor: 'pointer',
    fontWeight: 600,
  },
  footer: {
    textAlign: 'center' as const, padding: '0 20px 20px',
    color: '#666', fontSize: 13,
  },
  link: {
    background: 'none', border: 'none', color: '#7c6ff0',
    cursor: 'pointer', fontSize: 13, textDecoration: 'underline',
  },
};
