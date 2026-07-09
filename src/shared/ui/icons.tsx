import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export const UserIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...base} {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5.5 19.5c1.2-3 3.6-4.5 6.5-4.5s5.3 1.5 6.5 4.5" />
  </svg>
);

export const PhoneIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...base} {...p}>
    <path d="M6.6 3.5h2.2l1.4 3.8-1.8 1.4a12 12 0 0 0 5 5l1.4-1.8 3.7 1.4v2.2c0 1.1-.9 2-2 2A14.5 14.5 0 0 1 4.6 5.5c0-1.1.9-2 2-2Z" />
  </svg>
);

export const MailIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...base} {...p}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
    <path d="m4.5 7.5 7.5 5.5 7.5-5.5" />
  </svg>
);

export const LockIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...base} {...p}>
    <rect x="5.5" y="10.5" width="13" height="9" rx="2" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
  </svg>
);

export const EyeIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...base} {...p}>
    <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" />
    <circle cx="12" cy="12" r="2.5" />
  </svg>
);

export const EyeOffIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...base} {...p}>
    <path d="M3 12s3.5-6 9-6c1.6 0 3 .5 4.2 1.2M21 12s-3.5 6-9 6c-1.6 0-3-.5-4.2-1.2" />
    <path d="m4 4 16 16" />
  </svg>
);

export const ArrowLeftIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="22" height="22" {...base} strokeWidth={2} {...p}>
    <path d="M19 12H5m6-6-6 6 6 6" />
  </svg>
);

export const GoogleIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...p}>
    <path
      fill="#4285F4"
      d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.5h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.7 2.9c2.3-2.1 3.7-5.2 3.7-8.9Z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-6-2.1-7-5.1L1.2 17.2C3.2 21.2 7.3 24 12 24Z"
    />
    <path
      fill="#FBBC05"
      d="M5 14.3c-.3-.8-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.2 6.8C.4 8.4 0 10.1 0 12s.4 3.6 1.2 5.2L5 14.3Z"
    />
    <path
      fill="#EA4335"
      d="M12 4.6c2.3 0 3.8 1 4.7 1.8L20 3.1C18 1.2 15.2 0 12 0 7.3 0 3.2 2.8 1.2 6.8L5 9.7c1-3 3.8-5.1 7-5.1Z"
    />
  </svg>
);

export const AppleIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" {...p}>
    <path d="M16.7 12.9c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 2.9-.4 7.3 1.2 9.7.8 1.2 1.8 2.5 3.1 2.4 1.2 0 1.7-.8 3.2-.8s1.9.8 3.2.8c1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8 0 0-2.6-1-2.7-3.8ZM14.4 5.6c.7-.8 1.1-1.9 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4Z" />
  </svg>
);

export const ShieldLockIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...base} {...p}>
    <path d="M12 3.5 5 6.5v5c0 4.5 3 7.5 7 8.5 4-1 7-4 7-8.5v-5Z" />
    <rect x="9.5" y="12.3" width="5" height="4" rx="1" />
    <path d="M10.5 12.3v-1.2a1.5 1.5 0 0 1 3 0v1.2" />
  </svg>
);

export const ShieldCheckIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...base} {...p}>
    <path d="M12 3.5 5 6.5v5c0 4.5 3 7.5 7 8.5 4-1 7-4 7-8.5v-5Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const KeyIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...base} {...p}>
    <circle cx="8" cy="15" r="3.2" />
    <path d="M10.3 12.7 18 5l2 2-1.8 1.8 1.8 1.8-2 2-1.8-1.8L14 13" />
  </svg>
);

export const ChevronRightIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...base} {...p}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export const HelpCircleIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...base} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M9.5 9.3a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.4v.3" />
    <circle cx="12" cy="16.3" r=".6" fill="currentColor" stroke="none" />
  </svg>
);

export const GlobeIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...base} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.5 2.3 2.5 14.7 0 17M12 3.5c-2.5 2.3-2.5 14.7 0 17" />
  </svg>
);

export const ChevronDownIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="16" height="16" {...base} {...p}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const TelegramIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...p}>
    <path
      fill="#2AABEE"
      d="m21.9 3.4-3.2 15.2c-.2 1.1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.4-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6.2 12.3l-4.9-1.5c-1.1-.3-1.1-1.1.2-1.6L20.4 2c.9-.3 1.7.2 1.5 1.4Z"
    />
  </svg>
);

export const TreeIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...base} {...p}>
    <circle cx="12" cy="8" r="5.5" />
    <path d="M12 13.5V21M9 21h6" />
  </svg>
);

export const CloudIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...base} {...p}>
    <path d="M7 18.5a4.5 4.5 0 0 1-.6-8.96 5.5 5.5 0 0 1 10.7-1.9 4 4 0 0 1-.6 10.86H7Z" />
  </svg>
);

export const UsersDuoIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...base} {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 19c1-2.6 3-4 5.5-4s4.5 1.4 5.5 4" />
    <path d="M16 5.2a3 3 0 0 1 0 5.6M17.5 15c2 .4 3.4 1.7 4 4" />
  </svg>
);

export const GiftIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="24" height="24" {...base} {...p}>
    <rect x="4" y="9.5" width="16" height="10" rx="1.5" />
    <path d="M4 9.5h16v3.5H4z" />
    <path d="M12 9.5V20M12 9.5c-1.2-3.2-3-4.5-4.5-4.5a2 2 0 0 0 0 4c1.3 0 3-.5 4.5-1.5.9-.6 1.5-1.4 1.5-2.5a2 2 0 0 0-4-.5c-.3.6-.5 1.2-.5 1.5m4.5 3c1.2-3.2 3-4.5 4.5-4.5a2 2 0 1 1 0 4c-1.3 0-3-.5-4.5-1.5" />
  </svg>
);

export const ArrowRightIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...base} strokeWidth={2} {...p}>
    <path d="M5 12h14m-6-6 6 6-6 6" />
  </svg>
);

export const PlayStoreIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="22" height="22" {...p}>
    <path fill="#00D8FF" d="M4.3 2.6c-.3.3-.5.7-.5 1.2v16.4c0 .5.2.9.5 1.2l.2.1L14 12V11.8L4.5 2.5l-.2.1Z" />
    <path fill="#00F076" d="m17.1 15-3.1-3v-.1l3.1-3 4.5 2.6c1.3.7 1.3 1.9 0 2.6L17.1 15Z" />
    <path fill="#FF3A44" d="M17.1 15 14 11.9 4.3 21.5c.4.4 1 .4 1.7 0L17.1 15Z" />
    <path fill="#FFCF00" d="M17.1 9 6 2.6c-.7-.4-1.3-.4-1.7 0L14 11.9 17.1 9Z" />
  </svg>
);

export const InstagramIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...base} {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const FacebookIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...base} {...p}>
    <path d="M14.5 21v-7h2.5l.5-3h-3V9c0-.9.3-1.5 1.7-1.5H17.5V4.8C17 4.7 16 4.6 15 4.6c-2.2 0-3.5 1.3-3.5 3.7V11H9v3h2.5v7h3Z" />
  </svg>
);
