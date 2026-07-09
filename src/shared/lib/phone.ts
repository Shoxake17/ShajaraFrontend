// shared/lib/phone.ts
// Telefon raqam bilan ishlash — bitta joyda, hamma feature shu yerdan oladi.

/** "+998 90 123 45 67" -> "+998901234567" (backend shu formatni kutadi) */
export const normalizePhone = (phone: string): string => phone.replace(/\s/g, '');
