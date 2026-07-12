// features/settings/pages/SettingsPage.tsx
// To'liq "Sozlamalar" bo'limi: chap ichki menyu + bo'limlar (Profil, Xavfsizlik,
// Maxfiylik, Bildirishnomalar, Til, Eksport, Yordam, Tizim). Profil (ism + rasm)
// haqiqatan saqlanadi; backend hali yo'q bo'lganlar "Tez orada" deb belgilangan
// (soxta xavfsizlik da'vosi qilinmaydi — 100% xavfsiz).
import { useMemo, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useOutletContext } from 'react-router-dom';
import type { AppLayoutContext } from '@/app/AppLayout';
import {
  ChangePasswordDialog,
  LoginHistoryDialog,
  SessionsDialog,
  TwoFactorDisableDialog,
  TwoFactorSetupDialog,
  useAuthStore,
} from '@/features/auth';
import { authApi } from '@/features/auth/api/auth.api';
import { useTreeStore } from '@/features/tree/model/tree.store';
import { familyApi, uploadPhoto } from '@/features/tree/api/family.api';
import { uploadErrorMessage } from '@/features/tree/components/PhotoPicker';
import { useStorageStore, quotaMessage } from '@/features/storage/storage.store';
import {
  Card,
  Row,
  Toggle,
  SoonBadge,
  ChevronIcon,
  UserIcon2,
  ShieldIcon,
  LockIcon2,
  BellIcon,
  GlobeIcon,
  DownloadIcon,
  HelpIcon,
  InfoIcon,
  CameraIcon,
  KeyIcon,
  DevicesIcon,
  ClockIcon,
  EyeIcon2,
  ChatIcon,
  PinIcon,
  CalendarIcon,
  LayersIcon,
  RefreshIcon,
  FileIcon,
  AwardIcon,
  TrashIcon,
  MailIcon2,
  SoundIcon,
  AlertIcon,
  UsersIcon2,
  LogoutIcon2,
} from '../components/settings-ui';

const SECTIONS = [
  { id: 'profil', label: "Profil ma'lumotlari", Icon: UserIcon2 },
  { id: 'xavfsizlik', label: 'Hisob xavfsizligi', Icon: ShieldIcon },
  { id: 'maxfiylik', label: 'Maxfiylik', Icon: LockIcon2 },
  { id: 'bildirishnoma', label: 'Bildirishnomalar', Icon: BellIcon },
  { id: 'til', label: 'Til va mintaqa', Icon: GlobeIcon },
  { id: 'eksport', label: "Ma'lumotlar va eksport", Icon: DownloadIcon },
  { id: 'yordam', label: "Yordam va qo'llab-quvvatlash", Icon: HelpIcon },
  { id: 'tizim', label: 'Tizim haqida', Icon: InfoIcon },
];

const chevron = <ChevronIcon width={16} height={16} className="text-neutral-300" />;

export function SettingsPage() {
  const { topBarActionsEl } = useOutletContext<AppLayoutContext>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.logout);
  const members = useTreeStore((s) => s.members);
  const access = useTreeStore((s) => s.access);
  const loadBoard = useTreeStore((s) => s.loadBoard);

  useEffect(() => {
    if (members.length === 0) void loadBoard();
  }, [members.length, loadBoard]);

  // Joriy foydalanuvchining O'Z a'zolik yozuvi: VIEWER uchun uning anker
  // a'zosi (access.anchorMemberId — o'zi tizimga kirganda o'zi uchun
  // yaratilgan yozuv, shu sabab uni tahrirlashga huquqi bor), OWNER uchun
  // daraxtning isRoot a'zosi. AVVAL bu doim isRoot'ga qarardi — shu sabab
  // VIEWER "Saqlash"ni bossa DARAXT EGASINING profilini (unga tegishli
  // bo'lmagan a'zoni) o'zgartirishga urinib, backend uni 403 bilan
  // bloklardi (assertCanMutateOwn: faqat o'zi yaratgan a'zoni tahrirlay
  // oladi).
  const myMember = useMemo(() => {
    const anchorId = access?.anchorMemberId;
    if (anchorId) {
      const anchored = members.find((m) => m.id === anchorId);
      if (anchored) return anchored;
    }
    return members.find((m) => m.isRoot);
  }, [members, access]);
  const [ism, setIsm] = useState('');
  const [familiya, setFamiliya] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  // Ko'rsatiladigan rasm — myMember.photoUrl (backend imzolagan, ko'rinadigan
  // havola) YOKI yangi tanlangan faylning MAHALLIY (blob) oldindan ko'rishi.
  // `photoUrl`ning o'zi (saqlashga yuboriladigan qiymat) endi yuklashdan
  // keyin R2 obyekt KALITIGA aylanadi — u to'g'ridan-to'g'ri <img src>
  // sifatida ishlamaydi (bucket endi yopiq), shu bois ikkovi ajratilgan.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewBlobRef = useRef<string | null>(null);
  const [photoSizeBytes, setPhotoSizeBytes] = useState<number | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState('profil');
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean | null>(null);
  const [twoFactorSetupOpen, setTwoFactorSetupOpen] = useState(false);
  const [twoFactorDisableOpen, setTwoFactorDisableOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    authApi.twoFactorStatus().then((s) => setTwoFactorEnabled(s.enabled)).catch(() => setTwoFactorEnabled(false));
  }, []);

  // Boshlang'ich qiymatlar (ism user'dan, rasm o'z a'zolik yozuvidan)
  useEffect(() => {
    const parts = (user?.fullName ?? '').trim().split(/\s+/);
    setIsm(parts[0] ?? '');
    setFamiliya(parts.slice(1).join(' '));
  }, [user?.fullName]);
  useEffect(() => {
    setPhotoUrl(myMember?.photoUrl ?? null);
    setPreviewUrl(myMember?.photoUrl ?? null);
  }, [myMember?.photoUrl]);
  useEffect(() => {
    return () => {
      if (previewBlobRef.current) URL.revokeObjectURL(previewBlobRef.current);
    };
  }, []);

  const goTo = (id: string) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const onLogout = async () => {
    setLoggingOut(true);
    try {
      await authApi.logout().catch(() => undefined);
      useTreeStore.getState().reset();
      useStorageStore.getState().reset();
      clearSession();
      navigate('/login');
    } finally {
      setLoggingOut(false);
    }
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // bir xil faylni qayta tanlash mumkin bo'lsin
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Faqat rasm faylini tanlang');
    if (file.size > 5 * 1024 * 1024) return setError("Rasm 5 MB dan katta bo'lmasin");
    setError(null);
    setSaving(true);
    if (previewBlobRef.current) URL.revokeObjectURL(previewBlobRef.current);
    const blobUrl = URL.createObjectURL(file);
    previewBlobRef.current = blobUrl;
    setPreviewUrl(blobUrl);
    try {
      const { url, size } = await uploadPhoto(file);
      setPhotoUrl(url);
      setPhotoSizeBytes(size);
    } catch (err) {
      setPreviewUrl(photoUrl);
      setError(uploadErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const onSave = async () => {
    if (!myMember) return;
    const name = `${ism} ${familiya}`.trim();
    if (name.length < 2) return setError("Ism kamida 2 ta belgidan iborat bo'lsin");
    setError(null);
    setSaving(true);
    try {
      await familyApi.updateMember(myMember.id, {
        fullName: name,
        photoUrl: photoUrl ?? undefined,
        ...(photoSizeBytes !== undefined ? { photoSizeBytes } : {}),
      });
      await loadBoard();
      void useStorageStore.getState().loadUsage();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(quotaMessage(err) ?? "Saqlab bo'lmadi. Qaytadan urinib ko'ring");
    } finally {
      setSaving(false);
    }
  };

  // Bildirishnoma va maxfiylik — mahalliy (sessiya) holat (backend hali yo'q)
  const [notif, setNotif] = useState({ push: true, email: true, system: true, events: false });
  const inputCls =
    'w-full rounded-field border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-brand-900 outline-none transition-colors focus:border-brand-600';

  return (
    <div className="flex h-full flex-col overflow-hidden bg-brand-50">
      {/* Sarlavha endi BU YERDA emas — AppLayout'ning umumiy header'iga
          portal qilib joylashtiriladi (boshqa sahifalardagi bilan bir xil
          andoza). */}
      {topBarActionsEl &&
        createPortal(
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-brand-900">Sozlamalar</p>
          </div>,
          topBarActionsEl,
        )}

      {/* max-w-6xl/mx-auto olib tashlandi va chap padding qisqartirildi —
          ichki menyu Sidebar'ga yaqinroq turadi, bo'shagan joyga esa
          Profil blogi (o'ng, 1fr ustun) cho'ziladi. */}
      <div className="flex w-full flex-1 flex-col overflow-hidden px-3 pb-5 pt-4 sm:px-4">
        {/* Mobil/tablet (<lg) uchun bo'limlar orasida gorizontal aylantiriladigan
            navigatsiya — chap menyu shu o'lchamlarda yashiringan bo'lgani uchun
            bo'limlarga o'tishning YAGONA yo'li shu (aks holda faqat qo'lda
            scroll qilish qolar edi). */}
        <nav
          aria-label="Sozlamalar bo'limlari"
          className="mb-4 flex shrink-0 gap-2 overflow-x-auto pb-1 lg:hidden"
        >
          {SECTIONS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => goTo(id)}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-medium transition-colors ${
                active === id
                  ? 'border-brand-700 bg-brand-700 text-white'
                  : 'border-neutral-200 bg-white text-brand-700'
              }`}
            >
              <Icon width={15} height={15} className="shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[230px_1fr]">
          {/* Ichki menyu — joyidan qimirlamaydi, faqat o'ng tomon scroll bo'ladi */}
          <nav className="hidden rounded-2xl border border-brand-100 bg-white p-2 lg:block lg:h-full lg:overflow-y-auto">
            {SECTIONS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => goTo(id)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  active === id ? 'bg-brand-100 text-brand-900' : 'text-brand-700 hover:bg-brand-50'
                }`}
              >
                <Icon width={18} height={18} className="shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </nav>

          {/* Bo'limlar — faqat shu qism scroll bo'ladi (pastdan joy ochiladi) */}
          <div className="min-h-0 min-w-0 space-y-6 overflow-y-auto pb-6 pr-1">
            <div id="profil" className="scroll-mt-6">
                <Card title="Profil ma'lumotlari" desc="Shaxsiy ma'lumotlaringizni yangilang va hisobingizni boshqaring.">
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="relative shrink-0">
                      {previewUrl ? (
                        <img src={previewUrl} alt={ism} className="h-24 w-24 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-100 font-serif text-2xl font-semibold text-brand-800">
                          {(ism || '?').charAt(0).toUpperCase()}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={saving}
                        className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-brand-700 text-white transition-colors hover:bg-brand-800 disabled:opacity-50"
                      >
                        <CameraIcon width={15} height={15} />
                      </button>
                      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />
                    </div>

                    <div className="grid flex-1 gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-xs text-neutral-500">Ism</span>
                        <input value={ism} onChange={(e) => setIsm(e.target.value)} maxLength={60} className={inputCls} />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs text-neutral-500">Familiya</span>
                        <input value={familiya} onChange={(e) => setFamiliya(e.target.value)} maxLength={60} className={inputCls} />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs text-neutral-500">Email</span>
                        <input value={user?.email ?? ''} readOnly className={`${inputCls} bg-neutral-50 text-neutral-500`} />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs text-neutral-500">Telefon raqami</span>
                        <input value={user?.phone ?? '—'} readOnly className={`${inputCls} bg-neutral-50 text-neutral-500`} />
                      </label>
                    </div>
                  </div>

                  {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
                  <div className="mt-4 flex items-center justify-end gap-3">
                    {saved && <span className="text-xs font-medium text-brand-600">Saqlandi ✓</span>}
                    <button
                      type="button"
                      onClick={onSave}
                      disabled={saving}
                      className="rounded-field bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:opacity-50"
                    >
                      {saving ? 'Saqlanmoqda…' : 'Saqlash'}
                    </button>
                  </div>
                </Card>
              </div>

              <div id="xavfsizlik" className="scroll-mt-6">
                <Card title="Hisob xavfsizligi" desc="Hisobingiz xavfsizligini ta'minlash uchun parolingiz va sozlamalarni boshqaring.">
                  <div className="space-y-1">
                    <Row Icon={KeyIcon} label="Parolni o'zgartirish" onClick={() => setPasswordOpen(true)} right={chevron} />
                    <Row
                      Icon={ShieldIcon}
                      label="Ikki bosqichli autentifikatsiya"
                      right={
                        <Toggle
                          on={!!twoFactorEnabled}
                          disabled={twoFactorEnabled === null}
                          onChange={(v) => (v ? setTwoFactorSetupOpen(true) : setTwoFactorDisableOpen(true))}
                        />
                      }
                    />
                    <Row Icon={DevicesIcon} label="Faol qurilmalar" onClick={() => setSessionsOpen(true)} right={chevron} />
                    <Row Icon={ClockIcon} label="Kirish tarixi" onClick={() => setHistoryOpen(true)} right={chevron} />
                  </div>
                </Card>
              </div>

            <div id="maxfiylik" className="scroll-mt-6">
                <Card title="Maxfiylik" desc="Ma'lumotlaringiz kimlar uchun ko'rinishini boshqaring.">
                  <div className="space-y-1">
                    <Row Icon={EyeIcon2} label="Profil ko'rinishi" right={<><span>Barcha uchun</span>{chevron}</>} />
                    <Row Icon={ChatIcon} label="Kimlar sizga xabar yuborishi mumkin" right={<><span>Barcha</span>{chevron}</>} />
                    <Row Icon={UsersIcon2} label="Kimlar sizni topa olishi mumkin" right={<><span>Barcha</span>{chevron}</>} />
                    <Row Icon={LockIcon2} label="Ma'lumotlar ko'rinishi" right={<><span>Oila a'zolarim</span>{chevron}</>} />
                  </div>
                </Card>
              </div>

              <div id="bildirishnoma" className="scroll-mt-6">
                <Card title="Bildirishnomalar" desc="Qaysi bildirishnomalarni va qanday usulda olishni tanlang.">
                  <div className="space-y-1">
                    <Row Icon={BellIcon} label="Push bildirishnomalar" right={<Toggle on={notif.push} onChange={(v) => setNotif((n) => ({ ...n, push: v }))} />} />
                    <Row Icon={MailIcon2} label="Email bildirishnomalar" right={<Toggle on={notif.email} onChange={(v) => setNotif((n) => ({ ...n, email: v }))} />} />
                    <Row Icon={SoundIcon} label="Tizim bildirishnomalari" right={<Toggle on={notif.system} onChange={(v) => setNotif((n) => ({ ...n, system: v }))} />} />
                    <Row Icon={CalendarIcon} label="Tadbirlar eslatmalari" right={<Toggle on={notif.events} onChange={(v) => setNotif((n) => ({ ...n, events: v }))} />} />
                  </div>
                </Card>
              </div>

            <div id="til" className="scroll-mt-6">
                <Card title="Til va mintaqa" desc="Ilova tili va hududingizni tanlang.">
                  <div className="space-y-1">
                    <Row Icon={GlobeIcon} label="Til" right={<><span>O'zbekcha</span>{chevron}</>} />
                    <Row Icon={PinIcon} label="Mintaqa" right={<><span>O'zbekiston</span>{chevron}</>} />
                    <Row Icon={CalendarIcon} label="Sana formati" right={<><span>DD.MM.YYYY</span>{chevron}</>} />
                    <Row Icon={ClockIcon} label="Vaqt formati" right={<><span>24 soat</span>{chevron}</>} />
                  </div>
                </Card>
              </div>

              <div id="eksport" className="scroll-mt-6">
                <Card title="Ma'lumotlar va eksport" desc="Ma'lumotlaringizni yuklab oling yoki eksport qiling.">
                  <div className="space-y-1">
                    <Row Icon={DownloadIcon} label="Ma'lumotlarni yuklab olish" right={<><SoonBadge />{chevron}</>} />
                    <Row Icon={FileIcon} label="Ma'lumotlarni eksport qilish" right={<><SoonBadge />{chevron}</>} />
                    <Row Icon={LayersIcon} label="Google Drive'ga eksport" right={<><SoonBadge />{chevron}</>} />
                    <Row Icon={TrashIcon} label="Hisobni o'chirish" danger right={<><SoonBadge />{chevron}</>} />
                  </div>
                </Card>
              </div>

              <div id="yordam" className="scroll-mt-6">
                <Card title="Yordam va qo'llab-quvvatlash" desc="Savollaringiz bormi? Biz yordam berishga tayyormiz.">
                  <div className="space-y-1">
                    <Row Icon={HelpIcon} label="Yordam markazi" right={<><SoonBadge />{chevron}</>} />
                    <Row Icon={ChatIcon} label="Biz bilan bog'lanish" right={<><SoonBadge />{chevron}</>} />
                    <Row Icon={InfoIcon} label="Tez-tez so'raladigan savollar" right={<><SoonBadge />{chevron}</>} />
                    <Row Icon={AlertIcon} label="Xato haqida xabar berish" right={<><SoonBadge />{chevron}</>} />
                  </div>
                </Card>
              </div>

            <div id="tizim" className="scroll-mt-6">
              <Card title="Tizim haqida" desc="Ilova versiyasi va huquqiy ma'lumotlar.">
                <div className="space-y-1">
                  <Row Icon={LayersIcon} label="Ilova versiyasi" right={<span>1.0.0</span>} />
                  <Row Icon={RefreshIcon} label="Yangilanishlarni tekshirish" right={<SoonBadge />} />
                  <Row Icon={FileIcon} label="Foydalanish shartlari" right={<SoonBadge />} />
                  <Row Icon={ShieldIcon} label="Maxfiylik siyosati" right={<SoonBadge />} />
                  <Row Icon={AwardIcon} label="Litsenziyalar" right={<SoonBadge />} />
                </div>
              </Card>
            </div>

            {/* Hisobdan chiqish — mobilда (Sidebar yashiringan holatda) yagona
                chiqish yo'li; desktopда ham qulaylik uchun qoldirilgan
                (Sidebar'dagi bilan bir xil vazifa). */}
            <button
              type="button"
              onClick={() => void onLogout()}
              disabled={loggingOut}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-3.5 text-sm font-semibold text-red-600 shadow-sm transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              <LogoutIcon2 width={18} height={18} />
              {loggingOut ? 'Chiqilmoqda…' : 'Hisobdan chiqish'}
            </button>
          </div>
        </div>
      </div>

      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
      <SessionsDialog open={sessionsOpen} onClose={() => setSessionsOpen(false)} />
      <LoginHistoryDialog open={historyOpen} onClose={() => setHistoryOpen(false)} />
      <TwoFactorSetupDialog
        open={twoFactorSetupOpen}
        onClose={() => setTwoFactorSetupOpen(false)}
        onEnabled={() => setTwoFactorEnabled(true)}
      />
      <TwoFactorDisableDialog
        open={twoFactorDisableOpen}
        onClose={() => setTwoFactorDisableOpen(false)}
        onDisabled={() => setTwoFactorEnabled(false)}
      />
    </div>
  );
}
