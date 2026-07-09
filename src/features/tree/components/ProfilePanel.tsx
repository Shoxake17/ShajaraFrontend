// features/tree/components/ProfilePanel.tsx
// A'zo kartasi bosilganda ochiladigan to'liq profil paneli (o'ng drawer).
import { useState } from 'react';
import type { PersonData } from '@/features/tree/model/tree.store';
import type { Gender } from '@/features/tree/model/relations';
import type { BoardAccess } from '@/features/tree/types';
import { describeLife } from '@/features/tree/model/age';
import type { EditablePerson } from './EditPersonDialog';

interface ProfilePanelProps {
  /** Ochiq bo'lsa — tanlangan tugun ma'lumoti */
  node: (PersonData & { id: string }) | null;
  onClose: () => void;
  onEdit: (person: EditablePerson) => void;
  onDelete: (id: string) => void;
  /** Aynan shu odamga qarindosh qo'shish (anker aniq) */
  onAddRelative: (anchorId: string, anchorName: string, anchorGender: Gender) => void;
  /** Foydalanuvchining huquqi (OWNER/VIEWER) — tugmalarni cheklaydi */
  access: BoardAccess | null;
}

/** 12 xonalik ulashish kodi + nusxalash (faqat OWNER'ga ko'rsatiladi) */
function ShareCodeBox({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="mt-2 rounded-xl border border-brand-100 bg-white p-2.5">
      <p className="mb-1 text-[11px] text-neutral-500">Ulashish kodi (taklif uchun)</p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md bg-brand-50 px-2 py-1.5 text-[13px] font-semibold tracking-wider text-brand-800">
          {code}
        </code>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-md bg-brand-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-800"
        >
          {copied ? 'Nusxalandi ✓' : 'Nusxalash'}
        </button>
      </div>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function Detail({
  name,
  gender,
  relation,
  birthYear,
  deathYear,
  photoUrl,
  onEdit,
  onDelete,
  onAddRelative,
  canDelete,
  canEdit,
  shareCode,
  showShareCode,
}: {
  name: string;
  gender: Gender;
  relation: string;
  birthYear: number | null;
  deathYear: number | null;
  photoUrl: string | null;
  onEdit: () => void;
  onDelete?: () => void;
  onAddRelative: () => void;
  canDelete: boolean;
  canEdit: boolean;
  shareCode?: string | null;
  showShareCode?: boolean;
}) {
  const female = gender === 'FEMALE';
  const { years, age } = describeLife(birthYear, deathYear);

  return (
    <div className={`rounded-2xl border p-4 ${female ? 'border-pink-200 bg-pink-50/50' : 'border-brand-100 bg-brand-50/50'}`}>
      <div className="flex flex-col items-center text-center">
        {photoUrl ? (
          <img src={photoUrl} alt={name} className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <span
            className={`flex h-20 w-20 items-center justify-center rounded-full font-serif text-xl font-semibold ${
              female ? 'bg-pink-100 text-pink-700' : 'bg-brand-100 text-brand-800'
            }`}
          >
            {initials(name)}
          </span>
        )}
        <h3 className="mt-3 font-serif text-lg font-semibold text-brand-900">{name}</h3>
        <span className={`text-sm ${female ? 'text-pink-500' : 'text-brand-600'}`}>{relation}</span>
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-neutral-500">Jinsi</dt>
          <dd className="font-medium text-brand-900">{female ? 'Ayol' : 'Erkak'}</dd>
        </div>
        {years && (
          <div className="flex justify-between">
            <dt className="text-neutral-500">Yillar</dt>
            <dd className="font-medium text-brand-900">{years}</dd>
          </div>
        )}
        {age && (
          <div className="flex justify-between">
            <dt className="text-neutral-500">Yoshi</dt>
            <dd className="font-medium text-brand-900">{age}</dd>
          </div>
        )}
      </dl>

      {(canEdit || (onDelete && canDelete)) && (
        <div className="mt-4 flex gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="flex-1 rounded-field bg-brand-700 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
            >
              Tahrirlash
            </button>
          )}
          {onDelete && canDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-field border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              O&#8216;chirish
            </button>
          )}
        </div>
      )}

      {showShareCode && shareCode && <ShareCodeBox code={shareCode} />}

      {/* Aynan shu odamga qarindosh qo'shish — anker aniq (OWNER va VIEWER) */}
      <button
        type="button"
        onClick={onAddRelative}
        className="mt-2 w-full rounded-field border border-brand-200 bg-white py-2.5 text-sm font-semibold text-brand-800 transition-colors hover:bg-brand-50"
      >
        + {name.split(/\s+/)[0]}ga qarindosh qo&#8216;shish
      </button>
    </div>
  );
}

export function ProfilePanel({ node, onClose, onEdit, onDelete, onAddRelative, access }: ProfilePanelProps) {
  if (!node) return null;
  const isOwner = (access?.role ?? 'OWNER') === 'OWNER';
  const uid = access?.userId;
  // OWNER — hammasini; VIEWER — FAQAT o'zi qo'shgan kartani (to'liq huquq: tahrir + o'chirish)
  const canEditM = (createdById: string | null) => isOwner || createdById === uid;
  const canDeleteM = (createdById: string | null, isRoot: boolean) =>
    !isRoot && (isOwner || createdById === uid);

  // Modal emas — drawer: doska va yuqori panel interaktiv qoladi (header to'silmaydi)
  return (
    <aside className="absolute right-0 top-0 z-40 flex h-full w-80 max-w-[85vw] flex-col gap-4 overflow-y-auto border-l border-brand-100 bg-white p-4 shadow-card">
        <div className="flex items-center justify-between">
          <span className="font-serif text-lg font-semibold text-brand-900">Profil</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-brand-50"
          >
            ✕
          </button>
        </div>

        <Detail
          name={node.name}
          gender={node.gender}
          relation={node.relation}
          birthYear={node.birthYear}
          deathYear={node.deathYear}
          photoUrl={node.photoUrl}
          canDelete={canDeleteM(node.createdById, node.isRoot)}
          canEdit={canEditM(node.createdById)}
          shareCode={node.shareCode}
          showShareCode={isOwner}
          onEdit={() =>
            onEdit({
              id: node.memberId,
              name: node.name,
              gender: node.gender,
              birthYear: node.birthYear,
              deathYear: node.deathYear,
              photoUrl: node.photoUrl,
              relation: node.rawRelation,
              spouseOrder: node.spouseOrder,
              isRoot: node.isRoot,
            })
          }
          onDelete={() => onDelete(node.memberId)}
          onAddRelative={() => onAddRelative(node.memberId, node.name, node.gender)}
        />

        {node.spouses.map((sp) => (
          <Detail
            key={sp.id}
            name={sp.name}
            gender={sp.gender}
            relation={sp.relation}
            birthYear={sp.birthYear}
            deathYear={sp.deathYear}
            photoUrl={sp.photoUrl}
            canDelete={canDeleteM(sp.createdById, false)}
            canEdit={canEditM(sp.createdById)}
            shareCode={sp.shareCode}
            showShareCode={isOwner}
            onEdit={() =>
              onEdit({
                id: sp.id,
                name: sp.name,
                gender: sp.gender,
                birthYear: sp.birthYear,
                deathYear: sp.deathYear,
                photoUrl: sp.photoUrl,
                relation: sp.rawRelation,
                spouseOrder: sp.spouseOrder,
                isRoot: false,
              })
            }
            onDelete={() => onDelete(sp.id)}
            onAddRelative={() => onAddRelative(sp.id, sp.name, sp.gender)}
          />
        ))}
    </aside>
  );
}
