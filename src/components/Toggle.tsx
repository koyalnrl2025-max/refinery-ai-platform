'use client';

interface ToggleProps {
  on: boolean;
  onChange: (val: boolean) => void;
}

export default function Toggle({ on, onChange }: ToggleProps) {
  return (
    <button
      className={`toggle ${on ? 'on' : ''}`}
      onClick={() => onChange(!on)}
      aria-label={on ? 'Disable' : 'Enable'}
      style={{ padding: 0, cursor: 'pointer' }}
    >
      <span className="knob" />
    </button>
  );
}
