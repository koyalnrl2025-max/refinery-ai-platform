'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { CONVERSATIONS } from '@/lib/data';
import Avatar from './Avatar';
import RoleBadge from './RoleBadge';
import { DashboardIcon, ChatIcon, AdminIcon, SparkleIcon, PlusIcon, ChevLeftIcon } from './icons';
import type { Role } from '@/lib/types';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { currentUser } = useApp();

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', Icon: DashboardIcon },
    { href: '/chat', label: 'Chat', Icon: ChatIcon },
    { href: '/admin', label: 'Admin', Icon: AdminIcon },
  ];

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
        <button className="convo" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-faint)' }}>
          <PlusIcon style={{ width: 14, height: 14, flexShrink: 0 }} />
          New conversation
        </button>
        {CONVERSATIONS.map(c => (
          <Link key={c.id} href="/chat" className={`convo${c.active ? ' active' : ''}`}>
            {c.title}
            <span className="convo-time">{c.time}</span>
          </Link>
        ))}
      </div>

      <div className="sidebar-spacer" />

      <div className="user-card">
        <Avatar name={currentUser.name} size={32} />
        <div className="user-meta">
          <div className="user-name">{currentUser.name}</div>
          <RoleBadge role={currentUser.role as Role} />
        </div>
      </div>
    </div>
  );
}
