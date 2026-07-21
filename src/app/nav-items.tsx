// app/nav-items.tsx
// Asosiy navigatsiya ro'yxati — Sidebar (desktop) va BottomNav (mobil) IKKALASI
// ham shu yerdan oladi, ikonkalar ikki marta yozilmasin uchun.
import type { ReactElement, SVGProps } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/features/auth';

export type IconProps = SVGProps<SVGSVGElement>;
const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export const UsersIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="22" height="22" {...base} {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 19c1-2.6 3-4 5.5-4s4.5 1.4 5.5 4" />
    <path d="M16 5.2a3 3 0 0 1 0 5.6M17.5 15c2 .4 3.4 1.7 4 4" />
  </svg>
);
export const GalleryIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="22" height="22" {...base} {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
    <circle cx="8.5" cy="9.5" r="1.6" />
    <path d="m4.5 17 4.5-4 3 2.5 3.5-3 4 4.5" />
  </svg>
);
export const MessagesIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="22" height="22" {...base} {...p}>
    <path d="M4 5.5h16a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1H9l-4.5 4V17H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1Z" />
    <path d="M7.5 9.5h9M7.5 13h6" />
  </svg>
);
export const AiIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="22" height="22" {...base} {...p}>
    <path d="M12 3.5 13.6 8l4.5 1.6-4.5 1.6L12 15.7l-1.6-4.5L5.9 9.6 10.4 8 12 3.5Z" />
    <path d="M18.5 15.5l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7.7-1.9Z" />
  </svg>
);
export const SettingsIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="22" height="22" {...base} strokeWidth={2} {...p}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
export const AdminIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="22" height="22" {...base} {...p}>
    <path d="M12 3 4.5 6v6c0 4.5 3 7.5 7.5 9 4.5-1.5 7.5-4.5 7.5-9V6L12 3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
export const LogoutIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="22" height="22" {...base} {...p}>
    <path d="M14 4.5H6.5A2 2 0 0 0 4.5 6.5v11a2 2 0 0 0 2 2H14" />
    <path d="M17 8.5 20.5 12 17 15.5M20 12H9.5" />
  </svg>
);

export interface NavItem {
  to: string;
  label: string;
  shortLabel: string;
  end: boolean;
  Icon?: (p: IconProps) => ReactElement;
  img?: string;
}

interface NavItemDef {
  to: string;
  labelKey: string;
  shortLabelKey: string;
  end: boolean;
  Icon?: (p: IconProps) => ReactElement;
  img?: string;
}

const NAV_ITEMS: NavItemDef[] = [
  { to: '/doska', labelKey: 'nav.tree', shortLabelKey: 'nav.treeShort', img: '/registertree.png', end: true },
  { to: '/oila', labelKey: 'nav.family', shortLabelKey: 'nav.familyShort', Icon: UsersIcon, end: false },
  { to: '/xabarlar', labelKey: 'nav.messages', shortLabelKey: 'nav.messagesShort', Icon: MessagesIcon, end: false },
  { to: '/media', labelKey: 'nav.media', shortLabelKey: 'nav.mediaShort', Icon: GalleryIcon, end: false },
  // { to: '/ai', labelKey: 'nav.ai', shortLabelKey: 'nav.aiShort', Icon: AiIcon, end: false },
  { to: '/sozlamalar', labelKey: 'nav.settings', shortLabelKey: 'nav.settingsShort', Icon: SettingsIcon, end: false },
];

/** Faqat admin hisobiga (isAdmin=true) ko'rinadigan qo'shimcha band —
 * haqiqiy ruxsat baribir server tomonda (AdminGuard) tekshiriladi, bu
 * yerdagi shart faqat UI ko'rinishi uchun. */
const ADMIN_NAV_ITEM: NavItemDef = {
  to: '/admin',
  labelKey: 'nav.admin',
  shortLabelKey: 'nav.adminShort',
  Icon: AdminIcon,
  end: false,
};

const MESSAGES_ITEM = NAV_ITEMS.find((i) => i.to === '/xabarlar')!;
const SETTINGS_ITEM = NAV_ITEMS.find((i) => i.to === '/sozlamalar')!;

/** Tarjima qilingan navigatsiya ro'yxati — Sidebar/BottomNav shu hook orqali
 * oladi. Admin hisobiga FAQAT Dashboard (Admin panel) + Xabarlar +
 * Sozlamalar ko'rinadi — Doska/Oila a'zolarim/Media Galereya ichki
 * boshqaruvchi hisobga tegishli emas (haqiqiy ruxsat baribir server
 * tomonda va marshrut himoyasida — router.tsx'dagi AdminOnlyRoute/
 * NotForAdminRoute — tekshiriladi, bu yerdagi filtr faqat UI ko'rinishi). */
export function useNavItems(): NavItem[] {
  const { t } = useTranslation();
  const isAdmin = useAuthStore((s) => s.user?.isAdmin ?? false);
  const items = isAdmin ? [ADMIN_NAV_ITEM, MESSAGES_ITEM, SETTINGS_ITEM] : NAV_ITEMS;
  return items.map(({ to, labelKey, shortLabelKey, end, Icon, img }) => ({
    to,
    label: t(labelKey),
    shortLabel: t(shortLabelKey),
    end,
    Icon,
    img,
  }));
}
