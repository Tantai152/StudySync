import { useEffect, useState } from 'react';

interface AvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}

const PASTEL_COLORS = [
  'bg-rose-100 text-rose-700',
  'bg-orange-100 text-orange-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-sky-100 text-sky-700',
  'bg-indigo-100 text-indigo-700',
  'bg-fuchsia-100 text-fuchsia-700',
];

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';

  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return `${first}${last}`.toUpperCase();
};

const getColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash + name.charCodeAt(i)) % PASTEL_COLORS.length;
  }
  return PASTEL_COLORS[hash];
};

export const Avatar = ({ name, avatarUrl, size = 40, className = '' }: AvatarProps) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [avatarUrl]);

  const textSize = size >= 96 ? 'text-4xl' : size >= 48 ? 'text-xl' : 'text-sm';

  if (avatarUrl && !hasError) {
    return (
      <img
        src={avatarUrl}
        alt={`Ảnh đại diện của ${name}`}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        onError={() => setHasError(true)}
        className={`rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-full flex items-center justify-center shrink-0 font-semibold ${textSize} ${getColor(name)} ${className}`}
      aria-label={`Ảnh đại diện của ${name}`}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
};
