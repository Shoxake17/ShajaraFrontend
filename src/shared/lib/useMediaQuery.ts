import { useSyncExternalStore } from 'react';

/**
 * `window.matchMedia` asosidagi responsive hook. Faqat CSS bilan
 * yashirish YETARLI EMAS bo'lgan holatlar uchun kerak — masalan, bir xil
 * react-hook-form maydon nomiga bog'langan ikkita <input> DOM'da bir vaqtda
 * mavjud bo'lsa, RHF faqat oxirgi mount bo'lgan inputning ref'ini kuzatadi
 * va boshqasiga kiritilgan qiymat forma holatiga umuman yozilmaydi. Shu
 * sababli mobil/desktop bloklardan faqat BITTASI haqiqatda mount qilinishi
 * kerak — buni shu hook orqali JS darajasida hal qilamiz.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
