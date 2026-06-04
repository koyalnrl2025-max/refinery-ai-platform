'use client';

type Status = 'active' | 'idle' | 'off';

interface StatusChipProps {
  status: Status;
}

const labels: Record<Status, string> = {
  active: 'Active',
  idle: 'Idle',
  off: 'Offline',
};

export default function StatusChip({ status }: StatusChipProps) {
  return (
    <span className={`status-chip s-${status}`}>
      <span className="sdot" />
      {labels[status]}
    </span>
  );
}
