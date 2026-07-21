// features/tree/components/AddPersonDialog.tsx
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { relationDef, type Gender, type RelationKey } from '@/features/tree/model/relations';
import { PhotoPicker } from './PhotoPicker';
import { GenderToggle } from './GenderToggle';
import { RelationPicker } from './RelationPicker';
import { YearInputs, validateYears } from './YearInputs';
import { TextField } from '@/shared/ui/TextField';
import { Button } from '@/shared/ui/Button';
import { UserIcon } from '@/shared/ui/icons';
import { quotaMessage } from '@/features/storage/storage.store';

export interface NewPerson {
  fullName: string;
  relation: RelationKey;
  gender: Gender;
  birthYear?: number;
  birthMonth?: number;
  birthDay?: number;
  deathYear?: number;
  deathMonth?: number;
  deathDay?: number;
  photoUrl?: string;
  photoSizeBytes?: number;
  /** Nechanchi turmush o'rtog'i (qo'lda: 2, 3, ...) */
  spouseOrder?: number;
}

interface AddPersonDialogProps {
  open: boolean;
  /** Kimga qarindosh qo'shilayotgani (sarlavhada ko'rsatiladi) */
  anchorName?: string;
  /** Anker jinsi — turmush o'rtog'i qo'shilganda teskari jins default bo'ladi */
  anchorGender?: Gender;
  onClose: () => void;
  onAdd: (person: NewPerson) => Promise<void>;
}

export function AddPersonDialog({
  open,
  anchorName,
  anchorGender,
  onClose,
  onAdd,
}: AddPersonDialogProps) {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState('');
  const [relation, setRelation] = useState<RelationKey>('OTA');
  const [gender, setGender] = useState<Gender>('MALE');
  const [birthYear, setBirthYear] = useState('');
  const [deathYear, setDeathYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [deathMonth, setDeathMonth] = useState('');
  const [deathDay, setDeathDay] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoSizeBytes, setPhotoSizeBytes] = useState(0);
  const [spouseOrder, setSpouseOrder] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Qarindoshlik tanlanganda jins avtomatik moslashadi (keyin o'zgartirsa bo'ladi).
  // Turmush o'rtog'i uchun — anker jinsining teskarisi (er erkak -> xotin ayol).
  useEffect(() => {
    if (relation === 'TURMUSH' && anchorGender) {
      setGender(anchorGender === 'MALE' ? 'FEMALE' : 'MALE');
    } else {
      setGender(relationDef(relation).gender);
    }
  }, [relation, anchorGender]);

  if (!open) return null;

  const reset = () => {
    setFullName('');
    setRelation('OTA');
    setBirthYear('');
    setDeathYear('');
    setBirthMonth('');
    setBirthDay('');
    setDeathMonth('');
    setDeathDay('');
    setPhotoUrl(null);
    setPhotoSizeBytes(0);
    setSpouseOrder('');
    setError(null);
  };

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
      await onAdd({
        fullName: name,
        relation,
        gender,
        birthYear: birthYear ? Number(birthYear) : undefined,
        birthMonth: birthMonth ? Number(birthMonth) : undefined,
        birthDay: birthDay ? Number(birthDay) : undefined,
        deathYear: deathYear ? Number(deathYear) : undefined,
        deathMonth: deathMonth ? Number(deathMonth) : undefined,
        deathDay: deathDay ? Number(deathDay) : undefined,
        photoUrl: photoUrl ?? undefined,
        photoSizeBytes: photoUrl ? photoSizeBytes : undefined,
        spouseOrder:
          relation === 'TURMUSH' && spouseOrder ? Number(spouseOrder) : undefined,
      });
      reset();
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
        aria-label={t('tree.addDialog.ariaLabel')}
        className="no-scrollbar max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-[22px] bg-white p-5 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-center font-serif text-xl font-semibold text-brand-900">
          {t('tree.addDialog.title')}
        </h2>
        {anchorName && (
          <p className="mt-1 text-center text-[13px] text-brand-600">
            <span className="font-semibold">{anchorName}</span>
            {t('tree.addDialog.forRelativeSuffix')}
          </p>
        )}

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

          <div>
            <span className="mb-1 block px-1 text-xs text-neutral-500">{t('tree.addDialog.relationLabel')}</span>
            <RelationPicker value={relation} onChange={setRelation} />
          </div>

          <GenderToggle value={gender} onChange={setGender} />
          <YearInputs
            birthYear={birthYear}
            deathYear={deathYear}
            onBirth={setBirthYear}
            onDeath={setDeathYear}
            birthMonth={birthMonth}
            birthDay={birthDay}
            deathMonth={deathMonth}
            deathDay={deathDay}
            onBirthMonth={setBirthMonth}
            onBirthDay={setBirthDay}
            onDeathMonth={setDeathMonth}
            onDeathDay={setDeathDay}
          />

          {relation === 'TURMUSH' && (
            <label className="block">
              <span className="mb-1 block text-[13px] font-medium text-brand-700">
                {t('tree.addDialog.spouseOrderLabel')}
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
              className="flex-1 rounded-field border border-neutral-200 py-3.5 text-[15px] font-medium text-red-600 transition-colors hover:border-red-200 hover:bg-red-50"
            >
              {t('common.cancel')}
            </button>
            <Button type="submit" loading={saving} className="flex-1">
              {t('tree.addDialog.submit')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
