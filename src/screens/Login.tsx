'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SparkleIcon, MailIcon, CheckIcon, LockIcon } from '@/components/icons';

type Mode = 'password' | 'magic';

export default function Login() {
  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);
    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'Incorrect email or password.'
        : error.message);
    } else {
      // Hard navigation — ensures Supabase has time to set auth cookies before
      // the next page loads, avoiding middleware redirect loop on local dev
      window.location.href = '/dashboard';
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="login">
      <div className="aurora">
        <i className="b1" /><i className="b2" /><i className="b3" />
      </div>
      <div className="login-grain" />

      <div className="login-card">
        <div className="login-brand">
          <div className="login-mark"><SparkleIcon /></div>
          <div className="login-title">
            Refine<span style={{ background: 'var(--accent-grad)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>IQ</span>
          </div>
          <div className="login-tag">AI-first refinery operations platform</div>
        </div>

        {!sent ? (
          <>
            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: 0, background: 'var(--surface-2)', borderRadius: 10, padding: 3, marginBottom: 20 }}>
              {(['password', 'magic'] as Mode[]).map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(''); }}
                  style={{
                    flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                    background: mode === m ? 'var(--surface-3)' : 'transparent',
                    color: mode === m ? 'var(--text)' : 'var(--text-faint)',
                    transition: 'all 0.15s',
                  }}
                >
                  {m === 'password' ? '🔑 Password' : '✉ Magic link'}
                </button>
              ))}
            </div>

            {mode === 'password' ? (
              <form onSubmit={handlePasswordLogin}>
                <div className="field">
                  <label>Work email</label>
                  <input type="email" placeholder="you@yourrefinery.com" value={email}
                    onChange={e => setEmail(e.target.value)} autoComplete="email" disabled={loading} />
                </div>
                <div className="field">
                  <label>Password</label>
                  <input type="password" placeholder="••••••••" value={password}
                    onChange={e => setPassword(e.target.value)} autoComplete="current-password" disabled={loading} />
                </div>
                {error && <div style={{ fontSize: 12.5, color: 'var(--red)', marginBottom: 8 }}>{error}</div>}
                <button type="submit" className="magic-btn" disabled={loading || !email.trim() || !password.trim()}>
                  <LockIcon />
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleMagicLink}>
                <div className="field">
                  <label>Work email</label>
                  <input type="email" placeholder="you@yourrefinery.com" value={email}
                    onChange={e => setEmail(e.target.value)} autoComplete="email" disabled={loading} />
                </div>
                {error && <div style={{ fontSize: 12.5, color: 'var(--red)', marginBottom: 8 }}>{error}</div>}
                <button type="submit" className="magic-btn" disabled={loading || !email.trim()}>
                  <MailIcon />
                  {loading ? 'Sending…' : 'Send magic link'}
                </button>
              </form>
            )}

            {/* Demo credentials hint */}
            <div style={{ marginTop: 20, padding: '12px 14px', background: 'rgba(99,102,241,0.08)', borderRadius: 10, border: '1px solid rgba(99,102,241,0.2)' }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--accent)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Demo accounts</div>
              {[
                { email: 'sarah.mitchell@refineiq.io', pass: 'Admin@1234', role: 'Admin' },
                { email: 'james.okafor@refineiq.io',   pass: 'Manager@1234', role: 'Manager' },
                { email: 'hamad.alrashidi@refineiq.io',pass: 'User@1234',  role: 'User' },
              ].map(u => (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => { setEmail(u.email); setPassword(u.pass); setMode('password'); }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 0', fontSize: 12.5, color: 'var(--text-dim)' }}
                >
                  <span style={{ color: 'var(--text-faint)', fontSize: 11 }}>{u.role}</span>{'  '}
                  <span style={{ fontFamily: 'var(--mono)' }}>{u.email}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="magic-sent">
            <div className="check"><CheckIcon /></div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Check your inbox</div>
            <div style={{ fontSize: 13.5, color: 'var(--text-faint)', marginBottom: 20 }}>
              We sent a magic link to <strong style={{ color: 'var(--text-dim)' }}>{email}</strong>
            </div>
            <button className="magic-btn" onClick={() => { setSent(false); setError(''); }}>
              <MailIcon /> Use a different email
            </button>
          </div>
        )}

        <div className="login-foot">
          <span className="powered"><span className="pdot" />Powered by RefineIQ Engine v4</span>
        </div>
      </div>
    </div>
  );
}
