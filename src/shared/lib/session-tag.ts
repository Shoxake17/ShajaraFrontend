// shared/lib/session-tag.ts
// Har bir brauzer tabi uchun noyob teg — refresh cookie'ni tab-scoped qilish uchun.
//
// Muammo: httpOnly refresh cookie butun BRAUZERGA tegishli, alohida tabga
// emas. Bitta brauzerning ikkinchi tabida qayta login qilinsa, ikkinchisi
// birinchisining cookie'sini ustidan yozib qo'yardi — keyin "Faol
// qurilmalar"dan ikkinchi tabni yakunlasangiz, birinchi tab ham cookie'sisiz
// qolib, keyingi safar (sahifa yangilanganda) chiqib ketardi.
//
// Yechim: sessionStorage — localStorage/cookie'dan farqli — HAQIQATAN HAM
// tab-scoped (yangi tab hech qachon boshqa tabning sessionStorage'ini
// ko'rmaydi). Shu tegni X-Session-Tag headerida yuborib, backend har tab
// uchun alohida nomli cookie ishlatadi (`auth/refresh-cookie.ts`).
const KEY = 'shajara_tab_id';

export function getSessionTag(): string {
  let tag = sessionStorage.getItem(KEY);
  if (!tag) {
    tag = crypto.randomUUID();
    sessionStorage.setItem(KEY, tag);
  }
  return tag;
}
