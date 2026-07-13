// features/auth/lib/device-format.ts
// SessionsDialog va LoginHistoryDialog uchun umumiy formatlash funksiyalari.
// Komponent EMAS (oddiy funksiya) — useTranslation() hook'i o'rniga i18next
// global instansini to'g'ridan-to'g'ri ishlatamiz (chaqiruvchi komponent
// o'zi useTranslation() orqali til o'zgarishiga obuna bo'lgani uchun,
// qayta render bo'lganda bu funksiya ham YANGI tilda qayta ishga tushadi).
import i18n from '@/i18n';

/** ISO vaqtni ilova formatiga (DD.MM.YYYY, HH:mm) keltirish */
export function fmtTime(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}, ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** IP'ni foydalanuvchiga tushunarli ko'rinishga keltirish */
export function fmtIp(raw: string): string {
  const ip = raw.replace(/^::ffff:/, ''); // IPv4-mapped IPv6 prefiksini olib tashlash
  if (!ip) return i18n.t('auth.sessions.unknownAddress');
  if (ip === '::1' || ip === '127.0.0.1') return i18n.t('auth.sessions.localhost');
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip)) return i18n.t('auth.sessions.localNetwork', { ip });
  return ip;
}
