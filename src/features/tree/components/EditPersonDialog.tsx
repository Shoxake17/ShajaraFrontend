// features/tree/components/EditPersonDialog.tsx
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { type Gender, type RelationKey } from '@/features/tree/model/relations';
import { PhotoPicker } from './PhotoPicker';
import { GenderToggle } from './GenderToggle';
import { RelationPicker } from './RelationPicker';
import { YearInputs, validateYears } from './YearInputs';
import { TextField } from '@/shared/ui/TextField';
import { Button } from '@/shared/ui/Button';
import { UserIcon } from '@/shared/ui/icons';
import { quotaMessage } from '@/features/storage/storage.store';

export interface EditedPerson {
  fullName: string;
  gender: Gender;
  birthYear: number | null;
  deathYear: number | null;
  /** FAQAT yangi rasm tanlangan bo'lsa berilgan (R2 kalit) — aks holda
      yuborilmaydi, chunki eski qiymat ko'rish uchun IMZOLANGAN havola. */
  photoUrl?: string | null;
  /** Yangi rasm tanlangan bo'lsa uning hajmi (bayt) — storage kvotasi uchun */
  photoSizeBytes?: number;
  /** Qarindoshlik (kimligi) o'zgargan bo'lsa */
  relation?: RelationKey;
  /** Nechanchi turmush o'rtog'i (qo'lda). null — avtomatikga qaytarish. */
  spouseOrder?: number | null;
}

/** Tahrirlanadigan a'zoning minimal shakli (odam yoki turmush o'rtog'i) */
export interface EditablePerson {
  id: string;
  name: string;
  gender: Gender;
  birthYear: number | null;
  deathYear: number | null;
  photoUrl: string | null;
  /** Xom rishta — berilsa va root bo'lmasa, "kimligi" ni tahrirlash mumkin */
  relation?: RelationKey;
  /** Qo'lda belgilangan turmush o'rtoq tartibi (null — avtomatik) */
  spouseOrder?: number | null;
  isRoot?: boolean;
}

interface EditPersonDialogProps {
  /** Tahrirlanayotgan a'zo (null bo'lsa dialog yopiq) */
  person: EditablePerson | null;
  onClose: () => void;
  onSave: (id: string, patch: EditedPerson) => Promise<void>;
}

export function EditPersonDialog({ person, onClose, onSave }: EditPersonDialogProps) {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState('');
  const [relation, setRelation] = useState<RelationKey>('OTA');
  const [gender, setGender] = useState<Gender>('MALE');
  const [birthYear, setBirthYear] = useState('');
  const [deathYear, setDeathYear] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoSizeBytes, setPhotoSizeBytes] = useState<number | undefined>(undefined);
  const [spouseOrder, setSpouseOrder] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialog ochilganda joriy qiymatlar bilan to'ldiriladi
  useEffect(() => {
    if (person) {
      setFullName(person.name);
      setRelation(person.relation ?? 'OTA');
      setGender(person.gender);
      setBirthYear(person.birthYear ? String(person.birthYear) : '');
      setDeathYear(person.deathYear ? String(person.deathYear) : '');
      setPhotoUrl(person.photoUrl);
      setPhotoSizeBytes(undefined); // faqat yangi rasm tanlanса o'rnatiladi
      setSpouseOrder(person.spouseOrder != null ? String(person.spouseOrder) : '');
      setError(null);
    }
  }, [person]);

  if (!person) return null;

  // Qarindoshlik (kimligi) tahriri — root emas va xom rishta ma'lum bo'lsa
  const canEditRelation = !person.isRoot && person.relation != null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const name = fullName.trim();
    if (name.length < 2) {
      setError(t('tree.addDialog.nameRequired'));
      return;
    }
    const yearError = validateYears(birthYear, deathYear);
    if (yearError) {
      setError(yearError);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(person.id, {
        fullName: name,
        gender,
        birthYear: birthYear ? Number(birthYear) : null,
        deathYear: deathYear ? Number(deathYear) : null,
        // photoUrl FAQAT yangi rasm tanlangandagina yuboriladi (shu vaqtda
        // photoSizeBytes ham o'rnatiladi) — aks holda `photoUrl` hali
        // ko'rish uchun IMZOLANGAN havola bo'lib qoladi va backend uni
        // "o'ziniki emas" deb 400 bilan rad etardi.
        ...(photoSizeBytes !== undefined ? { photoUrl, photoSizeBytes } : {}),
        ...(canEditRelation && relation !== person.relation ? { relation } : {}),
        // Turmush o'rtog'i bo'lsa — tartib raqamini saqlaymiz (bo'sh -> avtomatik)
        ...(relation === 'TURMUSH'
          ? { spouseOrder: spouseOrder ? Number(spouseOrder) : null }
          : {}),
      });
      onClose();
    } catch (err) {
      setError(quotaMessage(err) ?? t('tree.addDialog.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={t('tree.editDialog.ariaLabel')}
        className="no-scrollbar max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-[22px] bg-white p-5 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-center font-serif text-xl font-semibold text-brand-900">{t('tree.editDialog.title')}</h2>

        <form onSubmit={submit} className="mt-4 space-y-3">
          <PhotoPicker
            value={photoUrl}
            female={gender === 'FEMALE'}
            onChange={(url, size) => {
              setPhotoUrl(url);
              setPhotoSizeBytes(size);
            }}
            onError={setError}
          />

          <TextField
            icon={<UserIcon />}
            placeholder={t('tree.addDialog.namePlaceholder')}
            value={fullName}
            autoFocus
            onChange={(e) => {
              setFullName(e.target.value);
              setError(null);
            }}
          />

          {canEditRelation && (
            <div>
              <span className="mb-1 block px-1 text-xs text-neutral-500">{t('tree.addDialog.relationLabel')}</span>
              <RelationPicker value={relation} onChange={setRelation} />
            </div>
          )}

          <GenderToggle value={gender} onChange={setGender} />
          <YearInputs
            birthYear={birthYear}
            deathYear={deathYear}
            onBirth={setBirthYear}
            onDeath={setDeathYear}
          />

          {relation === 'TURMUSH' && (
            <label className="block">
              <span className="mb-1 block px-1 text-xs text-neutral-500">
                {t('tree.editDialog.spouseOrderLabel')}
              </span>
              <input
                type="number"
                min={1}
                max={50}
                inputMode="numeric"
                placeholder={t('tree.addDialog.spouseOrderPlaceholder')}
                value={spouseOrder}
                onChange={(e) => setSpouseOrder(e.target.value)}
                className="w-full rounded-field border border-neutral-200 bg-white px-4 py-3.5 text-[15px] text-brand-900 outline-none transition-colors focus:border-brand-600"
              />
            </label>
          )}

          {error && <p className="text-center text-xs text-red-500">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-field border border-neutral-200 py-3.5 text-[15px] font-medium text-brand-900 transition-colors hover:bg-brand-50"
            >
              {t('common.cancel')}
            </button>
            <Button type="submit" loading={saving} className="flex-1">
              {t('common.save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
