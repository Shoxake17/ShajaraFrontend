// features/auth/lib/device-format.ts
// SessionsDialog va LoginHistoryDialog uchun umumiy formatlash funksiyalari.
// Komponent EMAS (oddiy funksiya) — useTranslation() hook'i o'rniga i18next
// global instansini to'g'ridan-to'g'ri ishlatamiz (chaqiruvchi komponent
// o'zi useTranslation() orqali til o'zgarishiga obuna bo'lgani uchun,
// qayta render bo'lganda bu funksiya ham YANGI tilda qayta ishga tushadi).
import i18n from '@/i18n';
import { useRegionStore } from '@/shared/hooks/useRegion';

/**
 * ISO vaqtni Sozlamalar → Mintaqa'da tanlangan formatga keltirish —
 * O'zbekiston/Rossiya: DD.MM.YYYY, HH:mm (24 soat); AQSH: MM/DD/YYYY,
 * h:mm AM/PM. Komponent EMAS — chaqiruvchi useRegionStore()ni o'zi
 * o'qisa qayta render bo'ladi, shu bois bu yerda to'g'ridan-to'g'ri
 * `.getState()` orqali joriy qiymat olinadi (fmtIp'dagi i18n bilan bir xil naqsh).
 */
export function fmtTime(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const p = (n: number) => String(n).padStart(2, '0');
  const { dateFormat, hour12 } = useRegionStore.getState().region === 'US'
    ? { dateFormat: 'MDY_SLASH' as const, hour12: true }
    : { dateFormat: 'DMY_DOT' as const, hour12: false };

  const day = p(d.getDate());
  const month = p(d.getMonth() + 1);
  const dateStr = dateFormat === 'MDY_SLASH' ? `${month}/${day}/${d.getFullYear()}` : `${day}.${month}.${d.getFullYear()}`;

  if (hour12) {
    const h24 = d.getHours();
    const h12 = h24 % 12 || 12;
    return `${dateStr}, ${h12}:${p(d.getMinutes())} ${h24 >= 12 ? 'PM' : 'AM'}`;
  }
  return `${dateStr}, ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** IP'ni foydalanuvchiga tushunarli ko'rinishga keltirish */
export function fmtIp(raw: string): string {
  const ip = raw.replace(/^::ffff:/, ''); // IPv4-mapped IPv6 prefiksini olib tashlash
  if (!ip) return i18n.t('auth.sessions.unknownAddress');
  if (ip === '::1' || ip === '127.0.0.1') return i18n.t('auth.sessions.localhost');
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip)) return i18n.t('auth.sessions.localNetwork', { ip });
  return ip;
}
