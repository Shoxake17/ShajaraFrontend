// features/settings/pages/SettingsPage.tsx
// To'liq "Sozlamalar" bo'limi: chap ichki menyu + bo'limlar (Profil, Xavfsizlik,
// Maxfiylik, Bildirishnomalar, Til, Eksport, Yordam, Tizim). Profil (ism + rasm)
// haqiqatan saqlanadi; backend hali yo'q bo'lganlar "Tez orada" deb belgilangan
// (soxta xavfsizlik da'vosi qilinmaydi — 100% xavfsiz).
import { useMemo, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { AppLayoutContext } from '@/app/AppLayout';
import { LANGUAGE_NAMES, useLanguage } from '@/shared/hooks/useLanguage';
import { REGION_FORMATS, SUPPORTED_REGIONS, useRegion, type Region } from '@/shared/hooks/useRegion';
import { SelectPicker } from '@/shared/ui/SelectPicker';
import {
  ChangePasswordDialog,
  LoginHistoryDialog,
  SessionsDialog,
  TwoFactorDisableDialog,
  TwoFactorSetupDialog,
  useAuthStore,
  type AuthUser,
  type ProfileVisibility,
} from '@/features/auth';
import { authApi } from '@/features/auth/api/auth.api';
import { useTreeStore } from '@/features/tree/model/tree.store';
import { familyApi, uploadPhoto } from '@/features/tree/api/family.api';
import { uploadErrorMessage } from '@/features/tree/components/PhotoPicker';
import { useStorageStore, quotaMessage } from '@/features/storage/storage.store';
import { PricingModal } from '@/features/billing/components/PricingModal';
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
  { id: 'profil', labelKey: 'settings.sections.profile', Icon: UserIcon2 },
  { id: 'obuna', labelKey: 'settings.sections.billing', Icon: AwardIcon },
  { id: 'xavfsizlik', labelKey: 'settings.sections.security', Icon: ShieldIcon },
  { id: 'maxfiylik', labelKey: 'settings.sections.privacy', Icon: LockIcon2 },
  { id: 'bildirishnoma', labelKey: 'settings.sections.notifications', Icon: BellIcon },
  { id: 'til', labelKey: 'settings.sections.language', Icon: GlobeIcon },
  { id: 'eksport', labelKey: 'settings.sections.export', Icon: DownloadIcon },
  { id: 'yordam', labelKey: 'settings.sections.help', Icon: HelpIcon },
  { id: 'tizim', labelKey: 'settings.sections.system', Icon: InfoIcon },
];

/** Til tanlagich — Sozlamalar'dagi "Til" qatorida, MediaGalleryPage'dagi
    filtr-dropdown bilan bir xil Apple uslubidagi ochiladigan ro'yxat */
function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();
  return (
    <SelectPicker
      value={language}
      onChange={(v) => setLanguage(v as 'uz' | 'ru' | 'en')}
      label={LANGUAGE_NAMES[language]}
      options={(['uz', 'ru', 'en'] as const).map((lang) => ({ value: lang, label: LANGUAGE_NAMES[lang] }))}
    />
  );
}

/** Mintaqa tanlagich — tanlangan mintaqaga qarab Sana/Vaqt formati qatorlari
    AVTOMATIK yangilanadi (quyida REGION_FORMATS orqali, alohida sozlash shart emas). */
function RegionSwitch() {
  const { t } = useTranslation();
  const { region, setRegion } = useRegion();
  const REGION_NAMES: Record<Region, string> = {
    UZ: t('settings.language.uzbekistan'),
    RU: t('settings.language.russia'),
    US: t('settings.language.usa'),
  };
  return (
    <SelectPicker
      value={region}
      onChange={(v) => setRegion(v as Region)}
      label={REGION_NAMES[region]}
      options={SUPPORTED_REGIONS.map((r) => ({ value: r, label: REGION_NAMES[r] }))}
    />
  );
}

const PROFILE_VISIBILITY_VALUES: ProfileVisibility[] = ['PUBLIC', 'FAMILY', 'PRIVATE'];

/** "Profil ko'rinishi" / "Kimlar sizni topa olishi mumkin" — ikkalasi ham bir
    xil PUBLIC/FAMILY/PRIVATE tanlovi, faqat qaysi maydonni (`field`) o'zgartirishi
    va qaysi API chaqirig'ini ishlatishi farq qiladi. Backend'da HAQIQATAN
    tekshiriladi (family.service.ts getBoard()), bu yerda faqat tanlov UI'si. */
function VisibilitySwitch({
  field,
  update,
}: {
  field: 'profileVisibility' | 'searchVisibility' | 'dataVisibility';
  update: (v: ProfileVisibility) => Promise<AuthUser>;
}) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const visibility = user?.[field] ?? 'PUBLIC';

  const VISIBILITY_NAMES: Record<ProfileVisibility, string> = {
    PUBLIC: t('settings.privacy.everyone'),
    FAMILY: t('settings.privacy.familyMembers'),
    PRIVATE: t('settings.privacy.noOne'),
  };

  const onChange = async (v: ProfileVisibility) => {
    setError(null);
    setSaving(true);
    try {
      const updated = await update(v);
      setUser(updated);
    } catch {
      setError(t('settings.profile.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <span className="flex items-center gap-2">
      {error && <span className="text-[11px] text-red-500">{error}</span>}
      <SelectPicker
        value={visibility}
        onChange={(v) => void onChange(v as ProfileVisibility)}
        label={saving ? t('common.saving') : VISIBILITY_NAMES[visibility]}
        options={PROFILE_VISIBILITY_VALUES.map((v) => ({ value: v, label: VISIBILITY_NAMES[v] }))}
      />
    </span>
  );
}

const ProfileVisibilitySwitch = () => (
  <VisibilitySwitch field="profileVisibility" update={authApi.updateProfileVisibility} />
);
const SearchVisibilitySwitch = () => (
  <VisibilitySwitch field="searchVisibility" update={authApi.updateSearchVisibility} />
);
const DataVisibilitySwitch = () => (
  <VisibilitySwitch field="dataVisibility" update={authApi.updateDataVisibility} />
);

const chevron = <ChevronIcon width={16} height={16} className="text-neutral-300" />;

export function SettingsPage() {
  const { t } = useTranslation();
  const { topBarActionsEl } = useOutletContext<AppLayoutContext>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  // Sana/Vaqt formati — Mintaqa tanloviga qarab AVTOMATIK (qo'lda sozlanmaydi)
  const { region } = useRegion();
  const regionFormat = REGION_FORMATS[region];
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
  // Profil blogi: standart holatda FAQAT ko'rish (rasm+ism+email+telefon +
  // "Tahrirlash" tugmasi, profile.png mockupidagi kabi); tugma bosilsa
  // haqiqiy tahrirlash formasi (input'lar) ochiladi.
  const [editingProfile, setEditingProfile] = useState(false);
  const [active, setActive] = useState('profil');
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean | null>(null);
  const [twoFactorSetupOpen, setTwoFactorSetupOpen] = useState(false);
  const [twoFactorDisableOpen, setTwoFactorDisableOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
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
    if (!file.type.startsWith('image/')) return setError(t('settings.profile.imageOnly'));
    if (file.size > 5 * 1024 * 1024) return setError(t('settings.profile.imageTooLarge'));
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
    if (name.length < 2) return setError(t('settings.profile.nameTooShort'));
    setError(null);
    setSaving(true);
    try {
      await familyApi.updateMember(myMember.id, {
        fullName: name,
        // photoUrl FAQAT yangi rasm tanlangandagina yuboriladi (shu vaqtda
        // photoSizeBytes ham o'rnatiladi) — aks holda `photoUrl` hali
        // ko'rish uchun IMZOLANGAN havola (createViewUrl) bo'lib qoladi va
        // backend uni "o'ziniki emas" deb 400 bilan rad etardi (rasmni
        // o'zgartirmasdan boshqa maydonni saqlashda ham).
        ...(photoSizeBytes !== undefined ? { photoUrl: photoUrl ?? undefined, photoSizeBytes } : {}),
      });
      await loadBoard();
      void useStorageStore.getState().loadUsage();
      setSaved(true);
      setEditingProfile(false);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(quotaMessage(err) ?? t('settings.profile.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  // Tahrirlashni bekor qilish — saqlanmagan o'zgarishlarni SERVERDAGI
  // (myMember/user) qiymatlarga qaytaradi va ko'rish rejimiga chiqadi.
  const cancelEdit = () => {
    const parts = (user?.fullName ?? '').trim().split(/\s+/);
    setIsm(parts[0] ?? '');
    setFamiliya(parts.slice(1).join(' '));
    setPhotoUrl(myMember?.photoUrl ?? null);
    setPreviewUrl(myMember?.photoUrl ?? null);
    setError(null);
    setEditingProfile(false);
  };

  // Bildirishnoma va maxfiylik — mahalliy (sessiya) holat (backend hali yo'q)
  const [notif, setNotif] = useState({ push: true, email: true, system: true, events: false });
  const inputCls =
    'w-full rounded-field border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-brand-900 outline-none transition-colors focus:border-brand-600';

  // Ism/Familiya/Email/Telefon maydonlari — desktop va mobil tahrirlash
  // formalarida AYNAN bir xil, shu bois bir marta yozib ikkalasida
  // qayta ishlatiladi.
  const profileFieldsGrid = (
    <>
      <label className="block">
        <span className="mb-1 block text-xs text-neutral-500">{t('settings.profile.firstName')}</span>
        <input value={ism} onChange={(e) => setIsm(e.target.value)} maxLength={60} className={inputCls} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-neutral-500">{t('settings.profile.lastName')}</span>
        <input value={familiya} onChange={(e) => setFamiliya(e.target.value)} maxLength={60} className={inputCls} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-neutral-500">{t('settings.profile.email')}</span>
        <input value={user?.email ?? ''} readOnly className={`${inputCls} bg-neutral-50 text-neutral-500`} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-neutral-500">{t('settings.profile.phone')}</span>
        <input value={user?.phone ?? '—'} readOnly className={`${inputCls} bg-neutral-50 text-neutral-500`} />
      </label>
    </>
  );

  return (
    <div className="flex h-full flex-col overflow-hidden bg-brand-50">
      {/* Sarlavha endi BU YERDA emas — AppLayout'ning umumiy header'iga
          portal qilib joylashtiriladi (boshqa sahifalardagi bilan bir xil
          andoza). */}
      {topBarActionsEl &&
        createPortal(
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-brand-900">{t('settings.title')}</p>
          </div>,
          topBarActionsEl,
        )}

      {/* max-w-6xl/mx-auto olib tashlandi va chap padding qisqartirildi —
          ichki menyu Sidebar'ga yaqinroq turadi, bo'shagan joyga esa
          Profil blogi (o'ng, 1fr ustun) cho'ziladi. */}
      <div className="flex w-full flex-1 flex-col overflow-hidden px-3 pb-5 pt-4 sm:px-4">
        {/* Mobilda (<lg) alohida "bo'limlar" panjarasi (tab-bar) YO'Q —
            sahifaning o'zi oddiy, bitta ustunli scroll ro'yxat: Profil
            ma'lumotlari bitta blok, qolgan bo'limlar (Xavfsizlik, Maxfiylik,
            ...) esa har biri o'zining alohida blokida, ketma-ket. */}
        <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[230px_1fr]">
          {/* Ichki menyu — joyidan qimirlamaydi, faqat o'ng tomon scroll bo'ladi */}
          <nav className="hidden rounded-2xl border border-brand-100 bg-white p-2 lg:block lg:h-full lg:overflow-y-auto">
            {SECTIONS.map(({ id, labelKey, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => goTo(id)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  active === id ? 'bg-brand-100 text-brand-900' : 'text-brand-700 hover:bg-brand-50'
                }`}
              >
                <Icon width={18} height={18} className="shrink-0" />
                <span className="truncate">{t(labelKey)}</span>
              </button>
            ))}
          </nav>

          {/* Bo'limlar — faqat shu qism scroll bo'ladi (pastdan joy ochiladi) */}
          <div className="min-h-0 min-w-0 space-y-6 overflow-y-auto pb-6 pr-1">
            <div id="profil" className="scroll-mt-6">
                <Card title={t('settings.sections.profile')} desc={t('settings.profile.desc')}>
                  {/* Rasm tanlash input'i — BITTA, ikkala (desktop/mobil)
                      kamera tugmasi ham shu bitta ref orqali ochadi. */}
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />

                  {/* Desktop (lg+) — HAR DOIM tahrirlash formasi, ko'rish/
                      tahrirlash almashinuvi YO'Q (faqat mobilga xos). */}
                  <div className="hidden lg:block">
                    <div className="flex flex-col gap-4 sm:flex-row">
                      <div className="relative h-24 w-24 shrink-0">
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
                      </div>
                      <div className="grid flex-1 gap-3 sm:grid-cols-2">{profileFieldsGrid}</div>
                    </div>
                    {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
                    <div className="mt-4 flex items-center justify-end gap-3">
                      {saved && <span className="text-xs font-medium text-brand-600">{t('common.saved')}</span>}
                      <button
                        type="button"
                        onClick={onSave}
                        disabled={saving}
                        className="rounded-field bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:opacity-50"
                      >
                        {saving ? t('common.saving') : t('common.save')}
                      </button>
                    </div>
                  </div>

                  {/* Mobil (<lg) — ko'rish rejimi + "Tahrirlash" tugmasi (profile.png) */}
                  <div className="lg:hidden">
                    {editingProfile ? (
                      <>
                        <div className="flex flex-col items-center gap-4">
                          <div className="relative h-24 w-24 shrink-0">
                            {previewUrl ? (
                              <img src={previewUrl} alt={ism} className="h-24 w-24 rounded-full object-cover" />
                            ) : (
                              <span className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-100 font-serif text-2xl font-semibold text-brand-800">
                                {(ism || '?').charAt(0).toUpperCase()}
                              </span>
                            )}
                            {/* Kamera belgisi rasmning O'NG-PAST burchagiga YOPISHGAN
                                holatda (ajralgan emas) — -bottom/-right orqali
                                doira chetiga bir oz botiriladi. */}
                            <button
                              type="button"
                              onClick={() => fileRef.current?.click()}
                              disabled={saving}
                              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-brand-700 text-white transition-colors hover:bg-brand-800 disabled:opacity-50"
                            >
                              <CameraIcon width={15} height={15} />
                            </button>
                          </div>
                          <div className="grid w-full gap-3 sm:grid-cols-2">{profileFieldsGrid}</div>
                        </div>

                        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
                        <div className="mt-4 flex items-center justify-end gap-3">
                          {saved && <span className="text-xs font-medium text-brand-600">{t('common.saved')}</span>}
                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={saving}
                            className="rounded-field border border-neutral-200 px-5 py-2.5 text-sm font-medium text-brand-900 transition-colors hover:bg-brand-50 disabled:opacity-50"
                          >
                            {t('common.cancel')}
                          </button>
                          <button
                            type="button"
                            onClick={onSave}
                            disabled={saving}
                            className="rounded-field bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:opacity-50"
                          >
                            {saving ? t('common.saving') : t('common.save')}
                          </button>
                        </div>
                      </>
                    ) : (
                      // Ko'rish rejimi — bitta ixcham blok (mockup: profile.png):
                      // rasm + ism + email + telefon, o'ngda "Tahrirlash" tugmasi —
                      // BARCHA o'lchamlarda (mobil ham) BITTA qatorda, tugma
                      // rasm bilan bir SATRDA (pastda emas).
                      <div className="flex items-center gap-3">
                        {previewUrl ? (
                          <img src={previewUrl} alt={ism} className="h-14 w-14 shrink-0 rounded-full object-cover" />
                        ) : (
                          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-100 font-serif text-lg font-semibold text-brand-800">
                            {(ism || '?').charAt(0).toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-serif text-base font-semibold text-brand-900">
                            {`${ism} ${familiya}`.trim() || t('settings.profile.unknown')}
                          </p>
                          <p className="truncate text-sm text-neutral-500">{user?.email}</p>
                          <p className="truncate text-sm text-neutral-500">{user?.phone ?? '—'}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingProfile(true)}
                          className="shrink-0 rounded-full bg-brand-50 px-3.5 py-2 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100 sm:px-5 sm:py-2.5 sm:text-sm"
                        >
                          {t('common.edit')}
                        </button>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              <div id="obuna" className="scroll-mt-6">
                <Card title={t('settings.sections.billing')} desc={t('settings.billing.desc')}>
                  <div className="space-y-1">
                    <Row Icon={AwardIcon} label={t('settings.billing.plan')} onClick={() => setPricingOpen(true)} right={chevron} />
                  </div>
                </Card>
              </div>

              <div id="xavfsizlik" className="scroll-mt-6">
                <Card title={t('settings.sections.security')} desc={t('settings.security.desc')}>
                  <div className="space-y-1">
                    <Row Icon={KeyIcon} label={t('settings.security.changePassword')} onClick={() => setPasswordOpen(true)} right={chevron} />
                    <Row
                      Icon={ShieldIcon}
                      label={t('settings.security.twoFactor')}
                      right={
                        <Toggle
                          on={!!twoFactorEnabled}
                          disabled={twoFactorEnabled === null}
                          onChange={(v) => (v ? setTwoFactorSetupOpen(true) : setTwoFactorDisableOpen(true))}
                        />
                      }
                    />
                    <Row Icon={DevicesIcon} label={t('settings.security.activeSessions')} onClick={() => setSessionsOpen(true)} right={chevron} />
                    <Row Icon={ClockIcon} label={t('settings.security.loginHistory')} onClick={() => setHistoryOpen(true)} right={chevron} />
                  </div>
                </Card>
              </div>

            <div id="maxfiylik" className="scroll-mt-6">
                <Card title={t('settings.sections.privacy')} desc={t('settings.privacy.desc')}>
                  <div className="space-y-1">
                    <Row Icon={EyeIcon2} label={t('settings.privacy.profileVisibility')} right={<ProfileVisibilitySwitch />} />
                    <Row Icon={ChatIcon} label={t('settings.privacy.whoCanMessage')} right={<><span>{t('settings.privacy.everyoneShort')}</span>{chevron}</>} />
                    <Row Icon={UsersIcon2} label={t('settings.privacy.whoCanFind')} right={<SearchVisibilitySwitch />} />
                    <Row Icon={LockIcon2} label={t('settings.privacy.dataVisibility')} right={<DataVisibilitySwitch />} />
                  </div>
                </Card>
              </div>

              <div id="bildirishnoma" className="scroll-mt-6">
                <Card title={t('settings.sections.notifications')} desc={t('settings.notifications.desc')}>
                  <div className="space-y-1">
                    <Row Icon={BellIcon} label={t('settings.notifications.push')} right={<Toggle on={notif.push} onChange={(v) => setNotif((n) => ({ ...n, push: v }))} />} />
                    <Row Icon={MailIcon2} label={t('settings.notifications.email')} right={<Toggle on={notif.email} onChange={(v) => setNotif((n) => ({ ...n, email: v }))} />} />
                    <Row Icon={SoundIcon} label={t('settings.notifications.system')} right={<Toggle on={notif.system} onChange={(v) => setNotif((n) => ({ ...n, system: v }))} />} />
                    <Row Icon={CalendarIcon} label={t('settings.notifications.events')} right={<Toggle on={notif.events} onChange={(v) => setNotif((n) => ({ ...n, events: v }))} />} />
                  </div>
                </Card>
              </div>

            <div id="til" className="scroll-mt-6">
                <Card title={t('settings.sections.language')} desc={t('settings.language.desc')}>
                  <div className="space-y-1">
                    <Row Icon={GlobeIcon} label={t('settings.language.language')} right={<LanguageSwitch />} />
                    <Row Icon={PinIcon} label={t('settings.language.region')} right={<RegionSwitch />} />
                    {/* Sana/Vaqt formati — mintaqaga qarab AVTOMATIK, qo'lda o'zgartirilmaydi (chevron yo'q) */}
                    <Row
                      Icon={CalendarIcon}
                      label={t('settings.language.dateFormat')}
                      right={<span className="text-brand-500">{regionFormat.dateFormat === 'MDY_SLASH' ? 'MM/DD/YYYY' : 'DD.MM.YYYY'}</span>}
                    />
                    <Row
                      Icon={ClockIcon}
                      label={t('settings.language.timeFormat')}
                      right={<span className="text-brand-500">{t(regionFormat.hour12 ? 'settings.language.hour12' : 'settings.language.hour24')}</span>}
                    />
                  </div>
                </Card>
              </div>

              <div id="eksport" className="scroll-mt-6">
                <Card title={t('settings.sections.export')} desc={t('settings.export.desc')}>
                  <div className="space-y-1">
                    <Row Icon={DownloadIcon} label={t('settings.export.download')} right={<><SoonBadge />{chevron}</>} />
                    <Row Icon={FileIcon} label={t('settings.export.export')} right={<><SoonBadge />{chevron}</>} />
                    <Row Icon={LayersIcon} label={t('settings.export.googleDrive')} right={<><SoonBadge />{chevron}</>} />
                    <Row Icon={TrashIcon} label={t('settings.export.deleteAccount')} danger right={<><SoonBadge />{chevron}</>} />
                  </div>
                </Card>
              </div>

              <div id="yordam" className="scroll-mt-6">
                <Card title={t('settings.sections.help')} desc={t('settings.help.desc')}>
                  <div className="space-y-1">
                    <Row Icon={HelpIcon} label={t('settings.help.helpCenter')} right={<><SoonBadge />{chevron}</>} />
                    <Row Icon={ChatIcon} label={t('settings.help.contact')} right={<><SoonBadge />{chevron}</>} />
                    <Row Icon={InfoIcon} label={t('settings.help.faq')} right={<><SoonBadge />{chevron}</>} />
                    <Row Icon={AlertIcon} label={t('settings.help.reportBug')} right={<><SoonBadge />{chevron}</>} />
                  </div>
                </Card>
              </div>

            <div id="tizim" className="scroll-mt-6">
              <Card title={t('settings.sections.system')} desc={t('settings.system.desc')}>
                <div className="space-y-1">
                  <Row Icon={LayersIcon} label={t('settings.system.version')} right={<span>1.0.0</span>} />
                  <Row Icon={RefreshIcon} label={t('settings.system.checkUpdates')} right={<SoonBadge />} />
                  <Row Icon={FileIcon} label={t('settings.system.terms')} right={<SoonBadge />} />
                  <Row Icon={ShieldIcon} label={t('settings.system.privacyPolicy')} right={<SoonBadge />} />
                  <Row Icon={AwardIcon} label={t('settings.system.licenses')} right={<SoonBadge />} />
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
              {loggingOut ? t('common.loggingOut') : t('settings.logoutAccount')}
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
      <PricingModal open={pricingOpen} onClose={() => setPricingOpen(false)} />
    </div>
  );
}
