// features/settings/components/settings-ui.tsx
// Sozlamalar bo'limi uchun qayta ishlatiladigan kichik UI bo'laklari + ikonlar.
import type { ReactElement, ReactNode, SVGProps } from 'react';
import { useTranslation } from 'react-i18next';

type IconProps = SVGProps<SVGSVGElement>;
export type IconCmp = (p: IconProps) => ReactElement;

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;
const mk =
  (path: ReactNode): IconCmp =>
  (p: IconProps) => (
    <svg viewBox="0 0 24 24" width="20" height="20" {...base} {...p}>
      {path}
    </svg>
  );

export const ShieldIcon = mk(<path d="M12 3.5 5.5 6v5c0 4 2.7 7.3 6.5 8.5 3.8-1.2 6.5-4.5 6.5-8.5V6L12 3.5Z" />);
export const BellIcon = mk(<><path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 4 1.5 5.5 1.5 5.5H5s1.5-1.5 1.5-5.5Z" /><path d="M10 18.5a2 2 0 0 0 4 0" /></>);
export const GlobeIcon = mk(<><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.5 2.3 2.5 14.7 0 17M12 3.5c-2.5 2.3-2.5 14.7 0 17" /></>);
export const DownloadIcon = mk(<><path d="M12 4v10m0 0 3.5-3.5M12 14l-3.5-3.5" /><path d="M5 18.5h14" /></>);
export const HelpIcon = mk(<><circle cx="12" cy="12" r="8.5" /><path d="M9.7 9.5a2.3 2.3 0 1 1 3 2.2c-.8.3-1.2.8-1.2 1.6" /><circle cx="11.5" cy="16.3" r=".6" fill="currentColor" stroke="none" /></>);
export const InfoIcon = mk(<><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5" /><circle cx="12" cy="8" r=".7" fill="currentColor" stroke="none" /></>);
export const UserIcon2 = mk(<><circle cx="12" cy="8" r="3.5" /><path d="M5.5 19.5c1.2-3 3.6-4.5 6.5-4.5s5.3 1.5 6.5 4.5" /></>);
export const CameraIcon = mk(<><path d="M4.5 8.5h3l1.2-2h6.6l1.2 2h3v9.5h-15Z" /><circle cx="12" cy="13" r="3" /></>);
export const ChevronIcon = mk(<path d="m9.5 6 5 6-5 6" />);
export const KeyIcon = mk(<><circle cx="8" cy="12" r="3.5" /><path d="M11.5 12h8m-3 0v3m-2-3v2.5" /></>);
export const DevicesIcon = mk(<><rect x="3.5" y="5" width="12" height="9" rx="1.5" /><rect x="16.5" y="9" width="4" height="10" rx="1" /><path d="M6 17.5h6" /></>);
export const ClockIcon = mk(<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>);
export const EyeIcon2 = mk(<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.5" /></>);
export const ChatIcon = mk(<path d="M4.5 6.5h15v9h-9l-3.5 3v-3h-2.5Z" />);
export const PinIcon = mk(<><path d="M12 21s6-5.3 6-10a6 6 0 1 0-12 0c0 4.7 6 10 6 10Z" /><circle cx="12" cy="11" r="2.2" /></>);
export const CalendarIcon = mk(<><rect x="4.5" y="5.5" width="15" height="14" rx="2" /><path d="M4.5 9.5h15M8.5 3.5v3M15.5 3.5v3" /></>);
export const LayersIcon = mk(<path d="M12 3.5 20 8l-8 4.5L4 8l8-4.5ZM4 12l8 4.5L20 12M4 16l8 4.5L20 16" />);
export const RefreshIcon = mk(<path d="M19 8a7.5 7.5 0 0 0-13.6-1M5 5v3.5h3.5M5 16a7.5 7.5 0 0 0 13.6 1M19 19v-3.5h-3.5" />);
export const FileIcon = mk(<><path d="M7 3.5h6l4 4v13H7Z" /><path d="M13 3.5v4h4" /></>);
export const AwardIcon = mk(<><circle cx="12" cy="9" r="4.5" /><path d="M9.5 13 8 21l4-2 4 2-1.5-8" /></>);
export const TrashIcon = mk(<path d="M5.5 7h13M9 7V5.5h6V7M7 7l1 12h8l1-12" />);
export const LockIcon2 = mk(<><rect x="5.5" y="10.5" width="13" height="9" rx="2" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></>);
export const MailIcon2 = mk(<><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="m4.5 7.5 7.5 5.5 7.5-5.5" /></>);
export const SoundIcon = mk(<><path d="M4.5 9.5h3l4-3v11l-4-3h-3Z" /><path d="M15 9a4 4 0 0 1 0 6" /></>);
export const AlertIcon = mk(<><path d="M12 4 3 19.5h18Z" /><path d="M12 10v4" /><circle cx="12" cy="17" r=".6" fill="currentColor" stroke="none" /></>);
export const UsersIcon2 = mk(<><circle cx="9" cy="8" r="3" /><path d="M3.5 19c1-2.6 3-4 5.5-4s4.5 1.4 5.5 4M16 5.2a3 3 0 0 1 0 5.6M17.5 15c2 .4 3.4 1.7 4 4" /></>);
export const LogoutIcon2 = mk(<><path d="M14 4.5H6.5A2 2 0 0 0 4.5 6.5v11a2 2 0 0 0 2 2H14" /><path d="M17 8.5 20.5 12 17 15.5M20 12H9.5" /></>);

export function Card({ title, desc, children, className = '' }: { title: string; desc?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-brand-100 bg-white p-5 shadow-sm ${className}`}>
      <h2 className="font-serif text-base font-semibold text-brand-900">{title}</h2>
      {desc && <p className="mt-0.5 text-xs text-brand-500">{desc}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function SoonBadge() {
  const { t } = useTranslation();
  return (
    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500">
      {t('common.soon')}
    </span>
  );
}

export function Toggle({ on, onChange, disabled }: { on: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange?.(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40 ${on ? 'bg-brand-600' : 'bg-neutral-300'}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

/** Ikonка + yorliq + o'ng tomon (qiymat / chevron / toggle / badge) */
export function Row({
  Icon,
  label,
  right,
  onClick,
  danger,
}: {
  Icon: IconCmp;
  label: string;
  right?: ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  const inner = (
    <>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${danger ? 'bg-red-50 text-red-500' : 'bg-brand-50 text-brand-600'}`}>
        <Icon width={17} height={17} />
      </span>
      <span className={`min-w-0 flex-1 truncate text-sm font-medium ${danger ? 'text-red-600' : 'text-brand-900'}`}>{label}</span>
      <span className="flex shrink-0 items-center gap-2 text-xs text-neutral-400">{right}</span>
    </>
  );
  const cls = 'flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors';
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} hover:bg-brand-50`}>
      {inner}
    </button>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
