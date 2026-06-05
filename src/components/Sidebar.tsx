'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { createClient } from '@/lib/supabase/client';
import Avatar from './Avatar';
import RoleBadge from './RoleBadge';
import { DashboardIcon, ChatIcon, AdminIcon, SparkleIcon, PlusIcon, ChevLeftIcon } from './icons';
import type { Role } from '@/lib/types';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface Conversation {
  id: string;
  title: string;
  dept: string;
  updated_at: string;
}

function formatTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, signOut } = useApp();
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('conversations').select('id,title,dept,updated_at')
          .eq('user_id', user.id).order('updated_at', { ascending: false }).limit(8);
        setConversations(Array.isArray(data) ? data as Conversation[] : []);
      } catch {}
    }
    load();
  }, [pathname]);

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', Icon: DashboardIcon },
    { href: '/chat', label: 'Chat', Icon: ChatIcon },
    { href: '/admin', label: 'Admin', Icon: AdminIcon },
  ];

  const displayName = currentUser?.name ?? 'Loading…';
  const displayRole = (currentUser?.role ?? 'user') as Role;

  return (
    <div className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <button className="collapse-btn" onClick={onToggle} aria-label="Toggle sidebar">
        <ChevLeftIcon />
      </button>

      <div className="brand">
        <div className="brand-mark">
          <SparkleIcon style={{ color: 'white' }} />
        </div>
        <span className="brand-name">
          Refine<span className="iq">IQ</span>
        </span>
      </div>

      <nav className="nav">
        {navItems.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={`nav-item${pathname.startsWith(href) ? ' active' : ''}`}
          >
            <Icon />
            <span className="nav-label">{label}</span>
          </Link>
        ))}
      </nav>

      <div className="side-section-label">Recent Chats</div>

      <div className="convo-list">
        <Link href="/chat" className="convo" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-faint)' }}>
          <PlusIcon style={{ width: 14, height: 14, flexShrink: 0 }} />
          New conversation
        </Link>
        {conversations.slice(0, 8).map(c => (
          <Link key={c.id} href={`/chat?conv=${c.id}`} className={`convo${pathname === '/chat' ? '' : ''}`}>
            {c.title}
            <span className="convo-time">{formatTime(c.updated_at)}</span>
          </Link>
        ))}
      </div>

      <div className="sidebar-spacer" />

      <div className="user-card" style={{ cursor: 'pointer' }} onClick={signOut} title="Sign out">
        <Avatar name={displayName} size={32} />
        <div className="user-meta">
          <div className="user-name">{displayName}</div>
          <RoleBadge role={displayRole} />
        </div>
      </div>
    </div>
  );
}
