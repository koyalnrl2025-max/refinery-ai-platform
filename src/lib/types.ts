export type Role = 'admin' | 'mgr' | 'user';

export interface Department {
  id: string;
  name: string;
  short: string;
  icon: string;
  docs: number;
  group: string;
}

export interface DeptContent {
  placeholder: string;
  suggestions: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  dept: string;
  status: 'active' | 'idle' | 'off';
  lastSeen: string;
  queries: number;
  enabled: boolean;
}

export interface Doc {
  id: string;
  name: string;
  dept: string;
  size: string;
  chunks: number;
  updated: string;
  status: 'indexed' | 'processing' | 'error';
}

export interface Conversation {
  id: string;
  title: string;
  time: string;
  dept: string;
  active?: boolean;
}

export interface Stat {
  label: string;
  value: string;
  delta: string;
  up: boolean;
  icon: string;
}

export interface CoverageItem {
  name: string;
  pct: number;
}

export interface ActivityItem {
  icon: string;
  text: string;
  time: string;
}

export interface RecentQuery {
  text: string;
  dept: string;
  sentiment: 'pos' | 'neu' | 'neg';
  time: string;
}

export interface AdminNavItem {
  id: string;
  label: string;
  icon: string;
}
