'use client';

import type { Role } from '@/lib/types';

interface RoleBadgeProps {
  role: Role;
}

const roleLabels: Record<Role, string> = {
  admin: 'Admin',
  mgr: 'Manager',
  user: 'User',
};

export default function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <span className={`badge badge-${role}`}>
      <span className="bdot" />
      {roleLabels[role]}
    </span>
  );
}
