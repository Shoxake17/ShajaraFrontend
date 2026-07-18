// features/chat/components/ContactAvatar.tsx
// MessagesPage.tsx'dagi Avatar komponenti bilan BIR XIL — endi qo'ng'iroq
// ekranlari (CallOverlay/IncomingCallBanner) ham xuddi shu ko'rinishdan
// foydalanishi uchun umumiy joyga chiqarildi (bitta manba, ikki joyda
// boshqa-boshqa avatar uslubi bo'lib qolmasligi uchun).
import { useTheme } from '@/shared/hooks/useTheme';

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

// PersonNode.tsx'dagi bilan BIR XIL sabab: Dark rejimda och bg-brand-100/
// bg-pink-100 + global matn rangi override'i to'qnashib, harf ko'rinmay
// qolardi — shu bois Dark uchun mustaqil, aniq kontrastli rang (erkak —
// yashil, ayol — QIZIL, pushti EMAS) ishlatiladi.
const themeFor = (female: boolean, appTheme: 'soft' | 'light' | 'dark') => {
  if (appTheme === 'dark') {
    return female
      ? 'bg-red-950/70 text-rose-100 ring-1 ring-inset ring-pink-400/40'
      : 'bg-emerald-950/70 text-emerald-100 ring-1 ring-inset ring-emerald-400/30';
  }
  return female ? 'bg-pink-100 text-pink-700' : 'bg-brand-100 text-brand-800';
};

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
  const { theme } = useTheme();
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
      className={`flex shrink-0 items-center justify-center rounded-full font-serif font-semibold ${themeFor(female, theme)}`}
    >
      {initials(name)}
    </span>
  );
}
