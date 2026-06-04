'use client';

interface AvatarProps {
  name: string;
  size?: number;
  className?: string;
}

export default function Avatar({ name, size = 32, className = '' }: AvatarProps) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('');

  const fontSize = Math.round(size * 0.38);

  return (
    <div
      className={`avatar ${className}`}
      style={{ width: size, height: size, fontSize }}
    >
      {initials}
    </div>
  );
}
