'use client';

import React from 'react';

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
  width?: number | string;
  height?: number | string;
}

export function DashboardIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="2" y="2" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="2" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2" y="11" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="11" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M17 10C17 13.866 13.866 17 10 17C8.61 17 7.31 16.6 6.22 15.9L3 17L4.1 13.78C3.4 12.69 3 11.39 3 10C3 6.134 6.134 3 10 3C13.866 3 17 6.134 17 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function AdminIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M10 2L12.39 7.26L18 8.27L14 12.14L14.76 18L10 15.27L5.24 18L6 12.14L2 8.27L7.61 7.26L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function SparkleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M10 2C10 2 10.8 5.2 12.5 7C14.2 8.8 17.5 9.5 17.5 9.5C17.5 9.5 14.2 10.2 12.5 12C10.8 13.8 10 17 10 17C10 17 9.2 13.8 7.5 12C5.8 10.2 2.5 9.5 2.5 9.5C2.5 9.5 5.8 8.8 7.5 7C9.2 5.2 10 2 10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="8" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 17C2 14.239 4.686 12 8 12C11.314 12 14 14.239 14 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14 5C15.657 5 17 6.343 17 8C17 9.657 15.657 11 14 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 15C17.333 15.333 18 16 18 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function DocIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12 2H5C4.448 2 4 2.448 4 3V17C4 17.552 4.448 18 5 18H15C15.552 18 16 17.552 16 17V6L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 2V6H16" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7 10H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 13H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function BuildingIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="2" y="4" width="16" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 18V13H13V18" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="6" y="8" width="2.5" height="2.5" rx="0.5" stroke="currentColor" strokeWidth="1.3" />
      <rect x="11.5" y="8" width="2.5" height="2.5" rx="0.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 8H18" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function LogsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M3 5H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 9H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 13H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 17H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 2V4M10 16V18M2 10H4M16 10H18M4.343 4.343L5.757 5.757M14.243 14.243L15.657 15.657M4.343 15.657L5.757 14.243M14.243 5.757L15.657 4.343" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M17 3L9 11M17 3L11 17L9 11L3 8L17 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function AttachIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M16.5 9.5L9.5 16.5C7.567 18.433 4.433 18.433 2.5 16.5C0.567 14.567 0.567 11.433 2.5 9.5L9.5 2.5C10.828 1.172 12.996 1.172 14.324 2.5C15.652 3.828 15.652 6.004 14.324 7.332L7.324 14.332C6.66 14.996 5.596 14.996 4.932 14.332C4.268 13.668 4.268 12.596 4.932 11.932L11 5.864" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ChevLeftIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12 5L7 10L12 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevDownIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M5 8L10 13L15 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 7L10 12L18 7" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M4 10L8 14L16 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="7" y="7" width="10" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M13 7V4C13 3.448 12.552 3 12 3H4C3.448 3 3 3.448 3 4V13C3 13.552 3.448 14 4 14H7" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function ThumbIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M7 9L10 3C10.552 3 11.084 3.22 11.475 3.612C11.867 4.003 12.087 4.535 12 5.084L11.5 8H16C16.55 8 17.059 8.224 17.419 8.597C17.779 8.97 17.957 9.47 17.905 9.973L17.1 16.973C17.007 17.841 16.267 18.5 15.395 18.5H8C7.448 18.5 7 18.052 7 17.5V9Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M4 9H7V18.5H4C3.448 18.5 3 18.052 3 17.5V10C3 9.448 3.448 9 4 9Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M3 10C3 6.134 6.134 3 10 3C12.53 3 14.75 4.322 16 6.323" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M17 10C17 13.866 13.866 17 10 17C7.47 17 5.25 15.678 4 13.677" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14 4L16 6L18 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 14L4 12L6 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Doc2Icon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M11 2H5C4.448 2 4 2.448 4 3V17C4 17.552 4.448 18 5 18H15C15.552 18 16 17.552 16 17V7L11 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M11 2V7H16" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7 11H13M7 14H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6V10.5L13 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M10 2L3 5V10C3 13.866 6.134 17.5 10 18.5C13.866 17.5 17 13.866 17 10V5L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7 10L9 12L13 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M10 13V3M6 7L10 3L14 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 15V17H17V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FilterIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M3 5H17M6 10H14M9 15H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function DotsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="4" cy="10" r="1.5" fill="currentColor" />
      <circle cx="10" cy="10" r="1.5" fill="currentColor" />
      <circle cx="16" cy="10" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M10 2C7.239 2 5 4.239 5 7V11L3 14H17L15 11V7C15 4.239 12.761 2 10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 14C8 15.105 8.895 16 10 16C11.105 16 12 15.105 12 14" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function FlaskIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M7 2H13M8 2V8L4 16C3.5 17 4.2 18 5.5 18H14.5C15.8 18 16.5 17 16 16L12 8V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 13H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function WrenchIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M14.5 2C12.015 2 10 4.015 10 6.5C10 7.02 10.088 7.52 10.25 7.988L3.5 14.75C2.672 15.578 2.672 16.922 3.5 17.75C4.328 18.578 5.672 18.578 6.5 17.75L13.25 11C13.718 11.162 14.218 11.25 14.75 11.25C17.235 11.25 19.25 9.235 19.25 6.75C19.25 6.086 19.092 5.462 18.812 4.906L16 7.75L13.5 5.25L16.344 2.406C15.788 2.126 15.164 1.969 14.5 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function CpuIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="5" y="5" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="7.5" y="7.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 2V4M12 2V4M8 16V18M12 16V18M2 8H4M2 12H4M16 8H18M16 12H18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function FileIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12 2H5C4.448 2 4 2.448 4 3V17C4 17.552 4.448 18 5 18H15C15.552 18 16 17.552 16 17V6L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 2V6H16" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width={16} height={16} {...props}>
      <rect x="4" y="9" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 9V6a3 3 0 0 1 6 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function GoogleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M18 10.2C18 9.56 17.944 8.944 17.84 8.352H10V11.872H14.512C14.304 12.944 13.712 13.856 12.808 14.464V16.72H15.52C17.08 15.28 18 12.944 18 10.2Z" fill="#4285F4" />
      <path d="M10 19C12.268 19 14.176 18.248 15.52 16.72L12.808 14.464C12.064 14.976 11.12 15.28 10 15.28C7.808 15.28 5.952 13.824 5.304 11.84H2.496V14.168C3.832 16.816 6.704 19 10 19Z" fill="#34A853" />
      <path d="M5.304 11.84C5.128 11.328 5.032 10.784 5.032 10.224C5.032 9.664 5.128 9.12 5.304 8.608V6.28H2.496C1.9 7.456 1.56 8.8 1.56 10.224C1.56 11.648 1.9 12.992 2.496 14.168L5.304 11.84Z" fill="#FBBC05" />
      <path d="M10 5.168C11.224 5.168 12.32 5.592 13.192 6.424L15.584 4.032C14.176 2.712 12.268 1.888 10 1.888C6.704 1.888 3.832 4.072 2.496 6.72L5.304 9.048C5.952 7.064 7.808 5.168 10 5.168Z" fill="#EA4335" />
    </svg>
  );
}

const Icons: Record<string, React.ComponentType<IconProps>> = {
  Dashboard: DashboardIcon,
  Chat: ChatIcon,
  Admin: AdminIcon,
  Sparkle: SparkleIcon,
  Search: SearchIcon,
  Users: UsersIcon,
  Doc: DocIcon,
  Building: BuildingIcon,
  Logs: LogsIcon,
  Settings: SettingsIcon,
  Send: SendIcon,
  Attach: AttachIcon,
  ChevLeft: ChevLeftIcon,
  ChevDown: ChevDownIcon,
  Plus: PlusIcon,
  Mail: MailIcon,
  Check: CheckIcon,
  Copy: CopyIcon,
  Thumb: ThumbIcon,
  Refresh: RefreshIcon,
  Doc2: Doc2Icon,
  Clock: ClockIcon,
  Shield: ShieldIcon,
  Upload: UploadIcon,
  Filter: FilterIcon,
  Dots: DotsIcon,
  Bell: BellIcon,
  Flask: FlaskIcon,
  WrenchIcon: WrenchIcon,
  Cpu: CpuIcon,
  File: FileIcon,
  Google: GoogleIcon,
};

export default Icons;

export function I(name: string, props?: IconProps): React.ReactElement | null {
  const Component = Icons[name];
  if (!Component) return null;
  return React.createElement(Component, props);
}
