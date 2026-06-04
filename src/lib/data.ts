import type { Department, DeptContent, User, Doc, Conversation, Stat, CoverageItem, ActivityItem, RecentQuery, AdminNavItem } from './types';

export const DEPARTMENTS: Department[] = [
  { id: 'all', name: 'All Departments', short: 'All', icon: 'Building', docs: 0, group: 'overview' },
  { id: 'crude', name: 'Crude Distillation', short: 'CDU', icon: 'Flask', docs: 142, group: 'process' },
  { id: 'fcc', name: 'Fluid Cat Cracking', short: 'FCC', icon: 'Cpu', docs: 98, group: 'process' },
  { id: 'hydro', name: 'Hydroprocessing', short: 'HYD', icon: 'WrenchIcon', docs: 115, group: 'process' },
  { id: 'reforming', name: 'Catalytic Reforming', short: 'REF', icon: 'Flask', docs: 87, group: 'process' },
  { id: 'utilities', name: 'Utilities & Energy', short: 'UTL', icon: 'Cpu', docs: 203, group: 'support' },
  { id: 'safety', name: 'Safety & Environment', short: 'HSE', icon: 'Shield', docs: 311, group: 'support' },
  { id: 'maintenance', name: 'Maintenance', short: 'MNT', icon: 'WrenchIcon', docs: 176, group: 'support' },
  { id: 'lab', name: 'Laboratory', short: 'LAB', icon: 'Flask', docs: 94, group: 'quality' },
  { id: 'planning', name: 'Planning & Scheduling', short: 'PLN', icon: 'Clock', docs: 67, group: 'quality' },
];

export const DEPT_BY_ID: Record<string, Department> = Object.fromEntries(
  DEPARTMENTS.map(d => [d.id, d])
);

export const DEPT_CONTENT: Record<string, DeptContent> = {
  all: {
    placeholder: 'Ask anything about refinery operations…',
    suggestions: [
      'What are the key safety protocols for hot work permits?',
      'Summarise the latest turnaround schedule',
      'Show energy consumption trends for Q2',
      'List overdue maintenance work orders',
    ],
  },
  crude: {
    placeholder: 'Ask about crude distillation operations…',
    suggestions: [
      'What is the current crude blend specification?',
      'Show CDU-1 temperature profile for last 24h',
      'Explain the procedure for crude switch to Arab Heavy',
      'What are the typical ASTM D86 cut points?',
    ],
  },
  fcc: {
    placeholder: 'Ask about FCC unit operations…',
    suggestions: [
      'What is the current regenerator temperature?',
      'Explain catalyst circulation rate optimisation',
      'Show gasoline yield trends for this month',
      'What are the coke burn constraints?',
    ],
  },
  hydro: {
    placeholder: 'Ask about hydroprocessing operations…',
    suggestions: [
      'What is the current WABT for the diesel hydrotreater?',
      'Explain hydrogen make-up gas purity requirements',
      'Show pressure drop trend across reactor beds',
      'When is the next catalyst regeneration due?',
    ],
  },
  reforming: {
    placeholder: 'Ask about catalytic reforming…',
    suggestions: [
      'What is the current RON target for reformate?',
      'Show catalyst activity decline curve',
      'Explain the CCR regeneration sequence',
      'What are the chloride injection setpoints?',
    ],
  },
  utilities: {
    placeholder: 'Ask about utilities and energy…',
    suggestions: [
      'What is the current steam balance?',
      'Show power import vs generation this week',
      'Explain the cooling water treatment programme',
      'What are the boiler efficiency targets?',
    ],
  },
  safety: {
    placeholder: 'Ask about safety and environment…',
    suggestions: [
      'What are the hot work permit requirements?',
      'Show H2S monitor readings for the last shift',
      'Explain the emergency shutdown procedure for CDU',
      'What is the current OSHA recordable rate?',
    ],
  },
  maintenance: {
    placeholder: 'Ask about maintenance operations…',
    suggestions: [
      'Show overdue work orders for this week',
      'What is the vibration trend for P-101A?',
      'Explain the critical spare parts policy',
      'When is the next scheduled turnaround?',
    ],
  },
  lab: {
    placeholder: 'Ask about laboratory operations…',
    suggestions: [
      'What are the current product specifications for jet fuel?',
      'Show sulphur content trend for diesel this month',
      'Explain the ASTM D1655 test procedure',
      'What is the uncertainty budget for octane testing?',
    ],
  },
  planning: {
    placeholder: 'Ask about planning and scheduling…',
    suggestions: [
      'What is the crude run plan for next month?',
      'Show the linear programming model outputs',
      'Explain the turnaround opportunity cost calculation',
      'What is the current margin for gasoline vs diesel?',
    ],
  },
};

export const CONVERSATIONS: Conversation[] = [
  { id: 'c1', title: 'CDU-1 pressure drop analysis', time: '2h ago', dept: 'crude', active: true },
  { id: 'c2', title: 'Hot work permit procedure', time: '5h ago', dept: 'safety' },
  { id: 'c3', title: 'FCC catalyst inventory check', time: 'Yesterday', dept: 'fcc' },
  { id: 'c4', title: 'Q2 energy KPI review', time: 'Yesterday', dept: 'utilities' },
  { id: 'c5', title: 'Diesel hydrotreater WABT', time: 'Mon', dept: 'hydro' },
  { id: 'c6', title: 'Reformer RON optimisation', time: 'Mon', dept: 'reforming' },
  { id: 'c7', title: 'Crude blend feasibility', time: 'Last week', dept: 'crude' },
];

export const STATS: Stat[] = [
  { label: 'Queries Today', value: '1,284', delta: '+12%', up: true, icon: 'Chat' },
  { label: 'Avg Response', value: '1.4s', delta: '-8%', up: true, icon: 'Clock' },
  { label: 'Documents Indexed', value: '1,293', delta: '+34', up: true, icon: 'Doc' },
  { label: 'Active Users', value: '47', delta: '+3', up: true, icon: 'Users' },
];

export const COVERAGE: CoverageItem[] = [
  { name: 'Safety & HSE', pct: 94 },
  { name: 'Crude Distillation', pct: 88 },
  { name: 'FCC Operations', pct: 81 },
  { name: 'Hydroprocessing', pct: 76 },
  { name: 'Utilities', pct: 71 },
  { name: 'Maintenance', pct: 65 },
  { name: 'Laboratory', pct: 58 },
];

export const ACTIVITY: ActivityItem[] = [
  { icon: 'Doc', text: 'CDU Operating Manual v4.2 indexed — 142 chunks', time: '12 min ago' },
  { icon: 'Users', text: 'New user Hamad Al-Rashidi added to FCC dept', time: '1h ago' },
  { icon: 'Shield', text: 'HSE permit template updated by Sarah Mitchell', time: '2h ago' },
  { icon: 'Sparkle', text: 'Model retrained on 38 new documents', time: '4h ago' },
  { icon: 'Clock', text: 'Scheduled report sent to planning team', time: '8h ago' },
];

export const RECENT_Q: RecentQuery[] = [
  { text: 'What is the maximum allowable working pressure for V-201?', dept: 'CDU', sentiment: 'neu', time: '4 min ago' },
  { text: 'Show the hot work permit checklist for furnace area', dept: 'HSE', sentiment: 'pos', time: '11 min ago' },
  { text: 'Why is the FCC regenerator temperature fluctuating?', dept: 'FCC', sentiment: 'neg', time: '18 min ago' },
  { text: 'Explain the catalyst loading procedure for R-301', dept: 'HYD', sentiment: 'pos', time: '22 min ago' },
  { text: 'What are the current diesel pour point specs?', dept: 'LAB', sentiment: 'pos', time: '31 min ago' },
];

export const USERS: User[] = [
  { id: 'u1', name: 'Sarah Mitchell', email: 'sarah.mitchell@refineiq.io', role: 'admin', dept: 'All', status: 'active', lastSeen: 'Now', queries: 312, enabled: true },
  { id: 'u2', name: 'James Okafor', email: 'james.okafor@refineiq.io', role: 'mgr', dept: 'CDU', status: 'active', lastSeen: '5 min', queries: 198, enabled: true },
  { id: 'u3', name: 'Layla Al-Farsi', email: 'layla.alfarsi@refineiq.io', role: 'mgr', dept: 'HSE', status: 'idle', lastSeen: '1h ago', queries: 144, enabled: true },
  { id: 'u4', name: 'Hamad Al-Rashidi', email: 'hamad.alrashidi@refineiq.io', role: 'user', dept: 'FCC', status: 'active', lastSeen: '12 min', queries: 87, enabled: true },
  { id: 'u5', name: 'Chen Wei', email: 'chen.wei@refineiq.io', role: 'user', dept: 'HYD', status: 'off', lastSeen: '2 days', queries: 56, enabled: false },
  { id: 'u6', name: 'Priya Nair', email: 'priya.nair@refineiq.io', role: 'user', dept: 'LAB', status: 'active', lastSeen: '30 min', queries: 203, enabled: true },
  { id: 'u7', name: 'Marco Rossi', email: 'marco.rossi@refineiq.io', role: 'mgr', dept: 'MNT', status: 'idle', lastSeen: '3h ago', queries: 91, enabled: true },
];

export const DOCS: Doc[] = [
  { id: 'd1', name: 'CDU Operating Manual v4.2', dept: 'CDU', size: '8.4 MB', chunks: 142, updated: '12 min ago', status: 'indexed' },
  { id: 'd2', name: 'FCC Unit Safety Procedures', dept: 'FCC', size: '3.2 MB', chunks: 68, updated: '2h ago', status: 'indexed' },
  { id: 'd3', name: 'Hot Work Permit Template 2024', dept: 'HSE', size: '0.8 MB', chunks: 14, updated: '4h ago', status: 'indexed' },
  { id: 'd4', name: 'Hydroprocessing Catalyst Mgmt', dept: 'HYD', size: '5.1 MB', chunks: 98, updated: 'Yesterday', status: 'indexed' },
  { id: 'd5', name: 'Energy KPI Dashboard Manual', dept: 'UTL', size: '2.3 MB', chunks: 41, updated: 'Yesterday', status: 'processing' },
  { id: 'd6', name: 'Reformer Operating Envelope', dept: 'REF', size: '4.7 MB', chunks: 87, updated: 'Mon', status: 'indexed' },
  { id: 'd7', name: 'Lab ASTM Test Procedures', dept: 'LAB', size: '6.9 MB', chunks: 115, updated: 'Mon', status: 'indexed' },
];

export const ADMIN_NAV: AdminNavItem[] = [
  { id: 'users', label: 'Users', icon: 'Users' },
  { id: 'docs', label: 'Documents', icon: 'Doc' },
  { id: 'models', label: 'AI Models', icon: 'Sparkle' },
  { id: 'logs', label: 'Audit Logs', icon: 'Logs' },
  { id: 'settings', label: 'Settings', icon: 'Settings' },
];

export const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  mgr: 'Manager',
  user: 'User',
};
