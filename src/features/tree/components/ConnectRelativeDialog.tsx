// features/tree/components/ConnectRelativeDialog.tsx
// Ikki mavjud a'zoni chiziq bilan bog'laganda "kim bo'ladi?" ni so'raydi.
import { useEffect, useState } from 'react';
import { RELATION_GROUPS, type RelationKey } from '@/features/tree/model/relations';
import { Button } from '@/shared/ui/Button';

export interface PendingConnect {
  fromId: string;
  toId: string;
  fromName: string;
  toName: string;
}

interface ConnectRelativeDialogProps {
  pending: PendingConnect | null;
  onClose: () => void;
  onConfirm: (relation: RelationKey) => Promise<void>;
}

export function ConnectRelativeDialog({ pending, onClose, onConfirm }: ConnectRelativeDialogProps) {
  const [relation, setRelation] = useState<RelationKey>('OGIL');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pending) {
      setRelation('OGIL');
      setError(null);
    }
  }, [pending]);

  if (!pending) return null;

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await onConfirm(relation);
      onClose();
    } catch {
      setError("Bog'lab bo'lmadi. Qaytadan urinib ko'ring");
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
        aria-label="A'zolarni bog'lash"
        className="w-full max-w-sm rounded-[22px] bg-white p-5 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-center font-serif text-xl font-semibold text-brand-900">
          A&#8216;zolarni bog&#8216;lash
        </h2>
        <p className="mt-2 text-center text-sm text-brand-700">
          <span className="font-semibold">{pending.toName}</span> —{' '}
          <span className="font-semibold">{pending.fromName}</span>ga kim bo&#8216;ladi?
        </p>

        <select
          aria-label="Qarindoshlik turi"
          value={relation}
          onChange={(e) => setRelation(e.target.value as RelationKey)}
          className="mt-4 w-full cursor-pointer rounded-field border border-neutral-200 bg-white px-4 py-3.5 text-[15px] text-brand-900 outline-none transition-colors focus:border-brand-600"
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

        {error && <p className="mt-2 text-center text-xs text-red-500">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-field border border-neutral-200 py-3.5 text-[15px] font-medium text-brand-900 transition-colors hover:bg-brand-50"
          >
            Bekor qilish
          </button>
          <Button type="button" loading={saving} className="flex-1" onClick={submit}>
            Bog&#8216;lash
          </Button>
        </div>
      </div>
    </div>
  );
}
