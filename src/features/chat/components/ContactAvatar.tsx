// features/chat/components/ContactAvatar.tsx
// MessagesPage.tsx'dagi Avatar komponenti bilan BIR XIL — endi qo'ng'iroq
// ekranlari (CallOverlay/IncomingCallBanner) ham xuddi shu ko'rinishdan
// foydalanishi uchun umumiy joyga chiqarildi (bitta manba, ikki joyda
// boshqa-boshqa avatar uslubi bo'lib qolmasligi uchun).
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

const themeFor = (female: boolean) => (female ? 'bg-pink-100 text-pink-700' : 'bg-brand-100 text-brand-800');

export function ContactAvatar({
  name,
  gender,
  photoUrl,
  size = 44,
}: {
  name: string;
  gender: string;
  photoUrl: string | null;
  size?: number;
}) {
  const female = gender === 'FEMALE';
  return photoUrl ? (
    <img
      src={photoUrl}
      alt={name}
      style={{ height: size, width: size }}
      className="shrink-0 rounded-full object-cover ring-1 ring-white"
    />
  ) : (
    <span
      style={{ height: size, width: size, fontSize: size / 2.6 }}
      className={`flex shrink-0 items-center justify-center rounded-full font-serif font-semibold ${themeFor(female)}`}
    >
      {initials(name)}
    </span>
  );
}
