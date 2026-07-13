// features/tree/components/ProfilePanel.tsx
// A'zo kartasi bosilganda ochiladigan to'liq profil paneli.
// Desktop (lg+): o'ng drawer. Mobil (< lg): pastdan chiquvchi panel
// (mockup: profileajdo.png) — 1 kishi (turmush o'rtog'i yo'q) bo'lsa
// ekranning bir qismini egallaydi (ortidan doska ko'rinib turadi),
// 2 yoki undan ortiq kishi (turmush o'rtoqlari bilan) bo'lsa TO'LIQ
// ekranda ochiladi va sig'magani ichkarida scroll bo'ladi.
import { useState, type SVGProps } from 'react';
import { useTranslation } from 'react-i18next';
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

const iconBase = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const PencilIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="15" height="15" {...iconBase} {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);
const TrashIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="15" height="15" {...iconBase} {...p}>
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0-.8 13.2A2 2 0 0 1 16.2 21H7.8a2 2 0 0 1-2-1.8L5 6" />
  </svg>
);
const PlusCircleIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="15" height="15" {...iconBase} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);

/** 12 xonalik ulashish kodi + nusxalash (faqat OWNER'ga ko'rsatiladi) */
function ShareCodeBox({ code }: { code: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="mt-2 rounded-xl border border-brand-100 bg-white p-2.5">
      <p className="mb-1 text-[11px] text-neutral-500">{t('tree.profile.shareCodeLabel')}</p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md bg-brand-50 px-2 py-1.5 text-[13px] font-semibold tracking-wider text-brand-800">
          {code}
        </code>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-md bg-brand-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-800"
        >
          {copied ? t('tree.profile.copied') : t('tree.profile.copy')}
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

interface DetailProps {
  name: string;
  gender: Gender;
  relation: string;
  generation: number | null;
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
}

/** Desktop drawer'dagi kartochka — bitta rangli chegaralangan blok. */
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
}: DetailProps) {
  const { t } = useTranslation();
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
          <dt className="text-neutral-500">{t('tree.profile.genderLabel')}</dt>
          <dd className="font-medium text-brand-900">{female ? t('common.female') : t('common.male')}</dd>
        </div>
        {years && (
          <div className="flex justify-between">
            <dt className="text-neutral-500">{t('tree.profile.yearsLabel')}</dt>
            <dd className="font-medium text-brand-900">{years}</dd>
          </div>
        )}
        {age && (
          <div className="flex justify-between">
            <dt className="text-neutral-500">{t('tree.profile.ageLabel')}</dt>
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
              {t('common.edit')}
            </button>
          )}
          {onDelete && canDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-field border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              {t('common.delete')}
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
        + {name.split(/\s+/)[0]}
        {t('tree.profile.addRelativeSuffix')}
      </button>
    </div>
  );
}

/** Mobil pastki panel kartochkasi — profileajdo.png: avatar+ism+belgilar
    qatorda, keyin border'langan qator-ma'lumotlar, keyin tugmalar. */
function MobileDetail({
  name,
  gender,
  relation,
  generation,
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
}: DetailProps) {
  const { t } = useTranslation();
  const female = gender === 'FEMALE';
  const { years, age } = describeLife(birthYear, deathYear);

  return (
    <div className="py-4 first:pt-0">
      <div className="flex items-start gap-3">
        {photoUrl ? (
          <img src={photoUrl} alt={name} className="h-14 w-14 shrink-0 rounded-full object-cover" />
        ) : (
          <span
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-serif text-base font-semibold ${
              female ? 'bg-pink-100 text-pink-700' : 'bg-brand-100 text-brand-800'
            }`}
          >
            {initials(name)}
          </span>
        )}
        <div className="min-w-0 flex-1 pt-1">
          <h3 className="truncate font-serif text-base font-semibold text-brand-900">{name}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                female ? 'bg-pink-50 text-pink-600' : 'bg-brand-50 text-brand-700'
              }`}
            >
              {relation}
            </span>
            {generation != null && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500">
                {t('tree.generationBadge', { gen: generation })}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 divide-y divide-brand-100 overflow-hidden rounded-2xl border border-brand-100">
        <div className="flex items-center justify-between px-3.5 py-2.5 text-sm">
          <span className="text-neutral-500">{t('tree.profile.genderLabel')}</span>
          <span className="font-medium text-brand-900">{female ? t('common.female') : t('common.male')}</span>
        </div>
        {years && (
          <div className="flex items-center justify-between px-3.5 py-2.5 text-sm">
            <span className="text-neutral-500">{t('tree.profile.yearsLabel')}</span>
            <span className="font-medium text-brand-900">{years}</span>
          </div>
        )}
        {age && (
          <div className="flex items-center justify-between px-3.5 py-2.5 text-sm">
            <span className="text-neutral-500">{t('tree.profile.ageLabel')}</span>
            <span className="font-medium text-brand-900">{age}</span>
          </div>
        )}
      </div>

      {(canEdit || (onDelete && canDelete)) && (
        <div className="mt-3 flex gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-brand-700 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
            >
              <PencilIcon /> {t('common.edit')}
            </button>
          )}
          {onDelete && canDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="flex items-center justify-center gap-1.5 rounded-full bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
            >
              <TrashIcon /> {t('common.delete')}
            </button>
          )}
        </div>
      )}

      {showShareCode && shareCode && <ShareCodeBox code={shareCode} />}

      <button
        type="button"
        onClick={onAddRelative}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full border border-brand-200 bg-white py-2.5 text-sm font-semibold text-brand-800 transition-colors hover:bg-brand-50"
      >
        <PlusCircleIcon /> {name.split(/\s+/)[0]}
        {t('tree.profile.addRelativeSuffix')}
      </button>
    </div>
  );
}

export function ProfilePanel({ node, onClose, onEdit, onDelete, onAddRelative, access }: ProfilePanelProps) {
  const { t } = useTranslation();
  if (!node) return null;
  const isOwner = (access?.role ?? 'OWNER') === 'OWNER';
  const uid = access?.userId;
  // OWNER — hammasini; VIEWER — FAQAT o'zi qo'shgan kartani (to'liq huquq: tahrir + o'chirish)
  const canEditM = (createdById: string | null) => isOwner || createdById === uid;
  const canDeleteM = (createdById: string | null, isRoot: boolean) =>
    !isRoot && (isOwner || createdById === uid);

  const primaryDetail = (Comp: typeof Detail) => (
    <Comp
      name={node.name}
      gender={node.gender}
      relation={node.relation}
      generation={node.generation}
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
  );

  const spouseDetails = (Comp: typeof Detail) =>
    node.spouses.map((sp) => (
      <Comp
        key={sp.id}
        name={sp.name}
        gender={sp.gender}
        relation={sp.relation}
        generation={sp.generation}
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
    ));

  return (
    <>
      {/* Desktop (lg+) — o'ng drawer, Sidebar bilan bir xil suzuvchi
          bordered/yumaloq karta uslubida (mx/my bo'shliq + rounded-2xl +
          border). Modal emas: doska va yuqori panel interaktiv qoladi
          (header to'silmaydi). */}
      <aside className="no-scrollbar absolute bottom-3 right-3 top-3 z-40 hidden w-80 max-w-[85vw] flex-col gap-4 overflow-y-auto rounded-2xl border border-brand-100 bg-white p-4 shadow-sm lg:flex">
        <div className="flex items-center justify-between">
          <span className="font-serif text-lg font-semibold text-brand-900">{t('tree.profile.title')}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-brand-50"
          >
            ✕
          </button>
        </div>
        {primaryDetail(Detail)}
        {spouseDetails(Detail)}
      </aside>

      <div className="fixed inset-x-3 bottom-0 z-40 lg:hidden">
        <div className="relative flex w-full max-h-[90dvh] flex-col rounded-t-3xl border-2 border-b-0 border-brand-200 bg-white shadow-card">
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-neutral-500 transition-colors hover:bg-brand-100"
          >
            ✕
          </button>
          <div className="no-scrollbar min-h-0 flex-1 divide-y divide-brand-100 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
            {primaryDetail(MobileDetail)}
            {spouseDetails(MobileDetail)}
          </div>
        </div>
      </div>
    </>
  );
}
