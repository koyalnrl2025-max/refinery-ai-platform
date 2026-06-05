import type { Department, DeptContent, User, Doc, Conversation, Stat, CoverageItem, ActivityItem, RecentQuery, AdminNavItem } from './types';

export const DEPARTMENTS: Department[] = [
  { id: 'all',        name: 'All Departments',  short: 'All', icon: 'Building', docs: 0, group: 'overview' },
  { id: 'operations', name: 'Operations',        short: 'OPS', icon: 'Cpu',     docs: 0, group: 'dept'     },
  { id: 'hr',         name: 'Human Resources',   short: 'HR',  icon: 'Users',   docs: 0, group: 'dept'     },
];

export const DEPT_BY_ID: Record<string, Department> = Object.fromEntries(
  DEPARTMENTS.map(d => [d.id, d])
);

export const DEPT_CONTENT: Record<string, DeptContent> = {
  all: {
    placeholder: 'Ask anything about Operations or HR…',
    suggestions: [
      'What are the leave policy guidelines?',
      'Explain the safety procedures for equipment maintenance',
      'What is the process for raising a grievance?',
      'Summarise the performance appraisal process',
    ],
  },
  operations: {
    placeholder: 'Ask about operations procedures and processes…',
    suggestions: [
      'What is the standard operating procedure for equipment startup?',
      'Explain the permit-to-work system',
      'What are the emergency shutdown procedures?',
      'List the key safety checks for shift handover',
    ],
  },
  hr: {
    placeholder: 'Ask about HR policies and employee matters…',
    suggestions: [
      'What is the annual leave entitlement?',
      'Explain the performance review process',
      'What is the policy on medical leave?',
      'How do I apply for a transfer or deputation?',
    ],
  },
};

export const CONVERSATIONS: Conversation[] = [];

export const STATS: Stat[] = [
  { label: 'Queries Today',     value: '0',   delta: '+0%', up: true,  icon: 'Chat'  },
  { label: 'Avg Response',      value: '—',   delta: '—',   up: true,  icon: 'Clock' },
  { label: 'Documents Indexed', value: '0',   delta: '+0',  up: true,  icon: 'Doc'   },
  { label: 'Active Users',      value: '0',   delta: '+0',  up: true,  icon: 'Users' },
];

export const COVERAGE: CoverageItem[] = [
  { name: 'Human Resources', pct: 0 },
  { name: 'Operations',      pct: 0 },
];

export const ACTIVITY: ActivityItem[] = [];

export const RECENT_Q: RecentQuery[] = [];

export const USERS: User[] = [];

export const DOCS: Doc[] = [];

export const ADMIN_NAV: AdminNavItem[] = [
  { id: 'users',    label: 'Users',      icon: 'Users'   },
  { id: 'docs',     label: 'Documents',  icon: 'Doc'     },
  { id: 'models',   label: 'AI Models',  icon: 'Sparkle' },
  { id: 'logs',     label: 'Audit Logs', icon: 'Logs'    },
  { id: 'settings', label: 'Settings',   icon: 'Settings'},
];

export const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  mgr:   'Manager',
  user:  'User',
};
