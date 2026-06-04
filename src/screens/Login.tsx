'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SparkleIcon, MailIcon, CheckIcon, GoogleIcon } from '@/components/icons';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSent(true);
  }

  function handleEnter() {
    router.push('/dashboard');
  }

  return (
    <div className="login">
      <div className="aurora">
        <i className="b1" />
        <i className="b2" />
        <i className="b3" />
      </div>
      <div className="login-grain" />

      <div className="login-card">
        <div className="login-brand">
          <div className="login-mark">
            <SparkleIcon />
          </div>
          <div className="login-title">
            Refine<span style={{ background: 'var(--accent-grad)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>IQ</span>
          </div>
          <div className="login-tag">AI-first refinery operations platform</div>
        </div>

        {!sent ? (
          <>
            <form onSubmit={handleMagicLink}>
              <div className="field">
                <label>Work email</label>
                <input
                  type="email"
                  placeholder="you@yourrefinery.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <button type="submit" className="magic-btn">
                <MailIcon />
                Send magic link
              </button>
            </form>

            <div className="login-divider">or continue with</div>

            <button className="sso-btn" onClick={handleEnter}>
              <GoogleIcon />
              Google Workspace
            </button>

            <button className="sso-btn" onClick={handleEnter}>
              <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 16, height: 16 }}>
                <rect x="2" y="2" width="16" height="16" rx="3" fill="#0078D4" />
                <path d="M4 10H16M10 4V16" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Microsoft Azure AD
            </button>
          </>
        ) : (
          <div className="magic-sent">
            <div className="check">
              <CheckIcon />
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Check your inbox</div>
            <div style={{ fontSize: 13.5, color: 'var(--text-faint)', marginBottom: 20 }}>
              We sent a magic link to <strong style={{ color: 'var(--text-dim)' }}>{email}</strong>
            </div>
            <button className="magic-btn" onClick={handleEnter}>
              <SparkleIcon />
              Enter demo
            </button>
          </div>
        )}

        <div className="login-foot">
          <span className="powered">
            <span className="pdot" />
            Powered by RefineIQ Engine v4
          </span>
        </div>
      </div>
    </div>
  );
}
