// features/tree/components/AddPersonDialog.tsx
import { useEffect, useState, type FormEvent } from 'react';
import {
  RELATION_GROUPS,
  relationDef,
  type Gender,
  type RelationKey,
} from '@/features/tree/model/relations';
import { PhotoPicker } from './PhotoPicker';
import { GenderToggle } from './GenderToggle';
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
  deathYear?: number;
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
  const [fullName, setFullName] = useState('');
  const [relation, setRelation] = useState<RelationKey>('OTA');
  const [gender, setGender] = useState<Gender>('MALE');
  const [birthYear, setBirthYear] = useState('');
  const [deathYear, setDeathYear] = useState('');
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
    setPhotoUrl(null);
    setPhotoSizeBytes(0);
    setSpouseOrder('');
    setError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const name = fullName.trim();
    if (name.length < 2) {
      setError("Ism kamida 2 ta belgidan iborat bo'lsin");
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
        deathYear: deathYear ? Number(deathYear) : undefined,
        photoUrl: photoUrl ?? undefined,
        photoSizeBytes: photoUrl ? photoSizeBytes : undefined,
        spouseOrder:
          relation === 'TURMUSH' && spouseOrder ? Number(spouseOrder) : undefined,
      });
      reset();
      onClose();
    } catch (err) {
      setError(quotaMessage(err) ?? "Saqlab bo'lmadi. Qaytadan urinib ko'ring");
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
        aria-label="Oila a'zosini qo'shish"
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-[22px] bg-white p-5 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-center font-serif text-xl font-semibold text-brand-900">
          Oila a&#8216;zosini qo&#8216;shish
        </h2>
        {anchorName && (
          <p className="mt-1 text-center text-[13px] text-brand-600">
            <span className="font-semibold">{anchorName}</span>ga nisbatan
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
            placeholder="Ism familiya"
            value={fullName}
            autoFocus
            onChange={(e) => {
              setFullName(e.target.value);
              setError(null);
            }}
          />

          <select
            aria-label="Qarindoshlik turi"
            value={relation}
            onChange={(e) => setRelation(e.target.value as RelationKey)}
            className="w-full cursor-pointer rounded-field border border-neutral-200 bg-white px-4 py-3.5 text-[15px] text-brand-900 outline-none transition-colors focus:border-brand-600"
          >
            {RELATION_GROUPS.map((g) => (
              <optgroup key={g.title} label={g.title}>
                {g.items.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          <GenderToggle value={gender} onChange={setGender} />
          <YearInputs
            birthYear={birthYear}
            deathYear={deathYear}
            onBirth={setBirthYear}
            onDeath={setDeathYear}
          />

          {relation === 'TURMUSH' && (
            <label className="block">
              <span className="mb-1 block text-[13px] font-medium text-brand-700">
                Nechanchi turmush o&#8216;rtog&#8216;i (ixtiyoriy)
              </span>
              <input
                type="number"
                min={1}
                max={50}
                inputMode="numeric"
                placeholder="masalan 2 — 2-xotin"
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
              Bekor qilish
            </button>
            <Button type="submit" loading={saving} className="flex-1">
              Qo&#8216;shish
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
