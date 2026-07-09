// features/auth/lib/device-format.ts
// SessionsDialog va LoginHistoryDialog uchun umumiy formatlash funksiyalari.

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
  if (!ip) return "Manzil noma'lum";
  if (ip === '::1' || ip === '127.0.0.1') return 'Shu kompyuter (localhost)';
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip)) return `Mahalliy tarmoq · ${ip}`;
  return ip;
}
