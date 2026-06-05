'use client';

import { usePathname } from 'next/navigation';
import DeptSelector from './DeptSelector';
import Avatar from './Avatar';
import { BellIcon, SearchIcon } from './icons';
import { useApp } from '@/context/AppContext';

const titles: Record<string, { title: string; sub: string }> = {
  '/dashboard': { title: 'Operations Dashboard', sub: 'Live KPIs · AI Insights' },
  '/chat': { title: 'AI Assistant', sub: 'Ask anything about your refinery' },
  '/admin': { title: 'Administration', sub: 'Users · Documents · Settings' },
};

export default function TopBar() {
  const pathname = usePathname();
  const { currentUser } = useApp();

  const info = Object.entries(titles).find(([key]) => pathname.startsWith(key))?.[1] ?? {
    title: 'RefineIQ',
    sub: '',
  };

  return (
    <div className="topbar">
      <div>
        <div className="topbar-title">{info.title}</div>
        {info.sub && <div className="topbar-sub">{info.sub}</div>}
      </div>

      <div className="spacer" />

      <DeptSelector />

      <button className="icon-btn">
        <SearchIcon />
      </button>

      <button className="icon-btn">
        <BellIcon />
      </button>

      <Avatar name={currentUser?.name ?? ''} size={34} />
    </div>
  );
}
