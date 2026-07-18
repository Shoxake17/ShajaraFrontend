// features/media/pages/MediaGalleryPage.tsx
// "Media galereya" — yuklangan media (rasm/video/hujjat) + doskadagi a'zo
// rasmlari. Yuklash, o'chirish, filtr (tur/yil), kattalashtirib ko'rish.
// Xavfsiz: R2'ga to'g'ridan-to'g'ri yuklash, server tur/hajm/egalikni tekshiradi.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { AppLayoutContext } from '@/app/AppLayout';
import { useTreeStore } from '@/features/tree/model/tree.store';
import { useStorageStore } from '@/features/storage/storage.store';
import { mediaApi, type MediaDto, type MediaType } from '../api/media.api';
import { MediaUploadDialog } from '../components/MediaUploadDialog';
import { MediaEditDialog, type EditableMedia } from '../components/MediaEditDialog';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';

interface Item {
  key: string;
  mediaId?: string; // yuklangan bo'lsa — o'chirish mumkin
  type: MediaType;
  url: string;
  title: string;
  subtitle: string;
  year: number | null;
}

const svg = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const CameraI = () => (<svg viewBox="0 0 24 24" width="13" height="13" {...svg}><path d="M4.5 8.5h3l1.2-2h6.6l1.2 2h3v9.5h-15Z" /><circle cx="12" cy="13" r="3" /></svg>);
const VideoI = () => (<svg viewBox="0 0 24 24" width="13" height="13" {...svg}><rect x="3.5" y="6" width="12" height="12" rx="2" /><path d="m16 10 4.5-2.5v9L16 14" /></svg>);
const DocI = () => (<svg viewBox="0 0 24 24" width="13" height="13" {...svg}><path d="M7 3.5h6l4 4v13H7Z" /><path d="M13 3.5v4h4" /></svg>);
const CalI = () => (<svg viewBox="0 0 24 24" width="15" height="15" {...svg}><rect x="4.5" y="5.5" width="15" height="14" rx="2" /><path d="M4.5 9.5h15M8.5 3.5v3M15.5 3.5v3" /></svg>);
const TagI = () => (<svg viewBox="0 0 24 24" width="15" height="15" {...svg}><path d="M4 8v-4h4l12 12-4 4L4 8Z" /><circle cx="7" cy="7" r="1" fill="currentColor" stroke="none" /></svg>);
const PlayI = () => (<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M8 5.5v13l11-6.5-11-6.5Z" /></svg>);
const GalleryI = () => (<svg viewBox="0 0 24 24" width="22" height="22" {...svg}><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><circle cx="8.5" cy="9.5" r="1.6" /><path d="m4.5 17 4.5-4 3 2.5 3.5-3 4 4.5" /></svg>);
const UploadI = () => (<svg viewBox="0 0 24 24" width="18" height="18" {...svg}><path d="M12 15V5m0 0 3.5 3.5M12 5 8.5 8.5" /><path d="M5 15v3.5h14V15" /></svg>);
const TrashI = () => (<svg viewBox="0 0 24 24" width="15" height="15" {...svg}><path d="M5.5 7h13M9 7V5.5h6V7M7 7l1 12h8l1-12" /></svg>);
const EditI = () => (<svg viewBox="0 0 24 24" width="15" height="15" {...svg}><path d="M4 20h4L18.5 9.5a2 2 0 0 0-2.8-2.8L5 17.2 4 20Z" /><path d="M14.5 7.5l2.8 2.8" /></svg>);
const DotsI = () => (<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><circle cx="12" cy="5.5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="18.5" r="1.6" /></svg>);
const ChevronI = ({ className }: { className?: string }) => (<svg viewBox="0 0 24 24" width="14" height="14" {...svg} className={className}><path d="m6 9 6 6 6-6" /></svg>);
const CheckI = () => (<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>);

/** Karta ustidagi ⋮ menyu — Tahrirlash / O'chirish */
function CardMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t('media.actions')}
        className="rounded-lg p-2.5 text-neutral-400 transition-colors hover:bg-brand-50 hover:text-brand-700"
      >
        <DotsI />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-36 overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-card">
          <button type="button" onClick={() => { setOpen(false); onEdit(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-brand-800 transition-colors hover:bg-brand-50">
            <EditI /> {t('common.edit')}
          </button>
          <button type="button" onClick={() => { setOpen(false); onDelete(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50">
            <TrashI /> {t('common.delete')}
          </button>
        </div>
      )}
    </div>
  );
}

const TypeBadge = ({ type }: { type: MediaType }) => {
  const { t } = useTranslation();
  return (
    <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 text-[11px] font-medium text-brand-700 shadow-sm">
      {type === 'VIDEO' ? <VideoI /> : type === 'DOCUMENT' ? <DocI /> : <CameraI />}
      {t(`media.typeLabels.${type}`)}
    </span>
  );
};

interface FilterOption {
  value: string;
  label: string;
}

/** Filtr tanlagichi — RelationPicker (Qarindosh qo'shish blogi) bilan bir
    xil Apple uslubidagi custom dropdown: tugma bosilganda ro'yxat ochiladi,
    tanlangan qator ✓ belgi bilan ajralib turadi. Native <select> o'rniga. */
function FilterPicker({
  value,
  options,
  onChange,
  label,
}: {
  value: string;
  options: FilterOption[];
  onChange: (v: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full min-w-0 items-center justify-between gap-1 rounded-field border bg-white px-2.5 py-2 text-left shadow-sm transition-colors sm:px-4 sm:py-3 ${
          open ? 'border-brand-600' : 'border-brand-100 hover:border-brand-200'
        }`}
      >
        <span className="truncate text-[12px] font-medium text-brand-900 sm:text-[15px]">
          {current?.label ?? label}
        </span>
        <ChevronI className={`shrink-0 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={label}
          className="no-scrollbar absolute z-30 mt-1.5 max-h-72 w-max min-w-full overflow-y-auto rounded-2xl border border-brand-100 bg-white p-1.5 shadow-xl"
        >
          {options.map((o) => {
            const selected = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                  selected ? 'bg-brand-50 font-medium text-brand-800' : 'text-brand-900 hover:bg-neutral-50'
                }`}
              >
                <span className="truncate">{o.label}</span>
                {selected && <CheckI />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function MediaGalleryPage() {
  const { t } = useTranslation();
  const { topBarActionsEl } = useOutletContext<AppLayoutContext>();
  const nodes = useTreeStore((s) => s.nodes);
  const members = useTreeStore((s) => s.members);
  const loadBoard = useTreeStore((s) => s.loadBoard);
  const [media, setMedia] = useState<MediaDto[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editItem, setEditItem] = useState<EditableMedia | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | MediaType>('all');
  const [year, setYear] = useState('all');
  const [lightbox, setLightbox] = useState<Item | null>(null);

  const reloadMedia = useCallback(() => {
    mediaApi
      .list()
      .then(setMedia)
      .catch(() => undefined);
    void useStorageStore.getState().loadUsage();
  }, []);

  useEffect(() => {
    if (members.length === 0) void loadBoard();
    reloadMedia();
  }, [members.length, loadBoard, reloadMedia]);

  // Yuklangan media + a'zo rasmlari -> yagona ro'yxat
  const items = useMemo<Item[]>(() => {
    const out: Item[] = media.map((m) => ({
      key: `u:${m.id}`,
      mediaId: m.id,
      type: m.type,
      url: m.url,
      title: m.title,
      subtitle: t(`media.typeLabels.${m.type}`),
      year: m.year,
    }));
    for (const n of nodes) {
      if (n.data.photoUrl)
        out.push({ key: `m:${n.id}`, type: 'IMAGE', url: n.data.photoUrl, title: n.data.name, subtitle: n.data.relation, year: n.data.birthYear });
      for (const sp of n.data.spouses) {
        if (sp.photoUrl)
          out.push({ key: `m:${sp.id}`, type: 'IMAGE', url: sp.photoUrl, title: sp.name, subtitle: sp.relation, year: sp.birthYear });
      }
    }
    return out;
  }, [media, nodes, t]);

  const years = useMemo(
    () => [...new Set(items.map((i) => i.year).filter((y): y is number => y != null))].sort((a, b) => b - a),
    [items],
  );

  const shown = useMemo(
    () => items.filter((i) => (typeFilter === 'all' || i.type === typeFilter) && (year === 'all' || String(i.year) === year)),
    [items, typeFilter, year],
  );

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await mediaApi.remove(deleteId);
      setDeleteId(null);
      reloadMedia();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-brand-50">
      {/* Sarlavha, hujjatlar soni va "Yangi yuklash" tugmasi endi BU YERDA
          emas — AppLayout'ning umumiy, to'liq kenglikdagi header'iga
          portal qilib joylashtiriladi (TreeBoardPage/FamilyMembersPage'dagi
          bilan bir xil andoza). */}
      {topBarActionsEl &&
        createPortal(
          <>
            <div className="min-w-0 shrink-0">
              <p className="truncate text-sm font-semibold text-brand-900">{t('media.title')}</p>
              <p className="hidden truncate text-xs text-brand-500 sm:block">
                {t('media.subtitle', { count: items.length })}
              </p>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setUploadOpen(true)}
                aria-label={t('media.uploadNew')}
                className="flex h-9 w-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-brand-700 text-white shadow-sm transition-colors hover:bg-brand-800 sm:h-auto sm:w-auto sm:rounded-full sm:px-5 sm:py-2"
              >
                <UploadI />
                <span className="hidden text-sm font-semibold sm:inline">{t('media.uploadNew')}</span>
              </button>
            </div>
          </>,
          topBarActionsEl,
        )}

      {/* max-w chegarasi olib tashlandi (Shajara AI sahifasidagi bilan bir
          xil) — Sidebar/ekran chetidan faqat ozgina padding qoladi, kontent
          qolgan joyni to'liq egallaydi. pt-3 — Sidebar'ning mt-3 bilan
          TEPASI TEKIS (bir xil balandlikda boshlanadi). */}
      <div className="px-3 pb-6 pt-3 sm:px-4">
        {/* Filtrlar — barcha qurilmalarda (mobil ham) bitta qatorda 3 tagacha
            sig'adigan panjara; tanlagichlar RelationPicker (Qarindosh
            qo'shish blogi) bilan bir xil Apple uslubida. */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <FilterPicker
            label={t('media.filterType')}
            value={typeFilter}
            onChange={(v) => setTypeFilter(v as 'all' | MediaType)}
            options={[
              { value: 'all', label: t('media.filterAll') },
              { value: 'IMAGE', label: t('media.filterImages') },
              { value: 'VIDEO', label: t('media.filterVideos') },
              { value: 'DOCUMENT', label: t('media.filterDocuments') },
            ]}
          />
          <FilterPicker
            label={t('media.filterYear')}
            value={year}
            onChange={setYear}
            options={[
              { value: 'all', label: t('media.filterYearAll') },
              ...years.map((y) => ({ value: String(y), label: t('media.yearSuffix', { year: y }) })),
            ]}
          />
        </div>

        {/* Kartalar */}
        {items.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-brand-200 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
              <GalleryI />
            </span>
            <p className="text-sm font-medium text-brand-800">{t('media.emptyTitle')}</p>
            <p className="max-w-xs text-xs text-neutral-500">{t('media.emptyDesc')}</p>
          </div>
        ) : shown.length === 0 ? (
          <p className="mt-8 py-16 text-center text-sm text-neutral-500">{t('media.noFilterResults')}</p>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {shown.map((it) => (
              <li key={it.key} className="group rounded-2xl border border-brand-100 bg-white shadow-sm">
                <button type="button" onClick={() => setLightbox(it)} className="relative block aspect-[4/3] w-full overflow-hidden rounded-t-2xl bg-neutral-100">
                  {it.type === 'IMAGE' ? (
                    <img src={it.url} alt={it.title} className="h-full w-full object-contain" />
                  ) : it.type === 'VIDEO' ? (
                    <>
                      <video src={it.url} muted preload="metadata" className="h-full w-full object-contain" />
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 pl-0.5 text-white">
                          <PlayI />
                        </span>
                      </span>
                    </>
                  ) : (
                    <span className="flex h-full w-full flex-col items-center justify-center gap-2 bg-brand-50 text-brand-500">
                      <svg width="40" height="40" viewBox="0 0 24 24" {...svg}>
                        <path d="M7 3.5h6l4 4v13H7Z" />
                        <path d="M13 3.5v4h4M9.5 13h5M9.5 16h5" />
                      </svg>
                      <span className="px-4 text-center text-xs font-medium">{t('media.pdfDocument')}</span>
                    </span>
                  )}
                  <TypeBadge type={it.type} />
                </button>
                <div className="flex items-start justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-brand-900">{it.title}</p>
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-neutral-500">
                      <span className="flex items-center gap-1"><CalI />{it.year ? t('media.yearSuffix', { year: it.year }) : '—'}</span>
                      <span className="flex items-center gap-1"><TagI />{it.subtitle}</span>
                    </div>
                  </div>
                  {it.mediaId && (
                    <CardMenu
                      onEdit={() => setEditItem({ id: it.mediaId!, title: it.title, year: it.year })}
                      onDelete={() => setDeleteId(it.mediaId!)}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/70 p-4" onClick={() => setLightbox(null)}>
          <div className="max-h-[92dvh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white" onClick={(e) => e.stopPropagation()}>
            {lightbox.type === 'IMAGE' ? (
              <img src={lightbox.url} alt={lightbox.title} className="max-h-[74dvh] w-full bg-neutral-900 object-contain" />
            ) : lightbox.type === 'VIDEO' ? (
              <video src={lightbox.url} controls autoPlay className="max-h-[74dvh] w-full bg-black" />
            ) : (
              <iframe src={lightbox.url} title={lightbox.title} className="h-[74dvh] w-full" />
            )}
            <div className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-semibold text-brand-900">{lightbox.title}</p>
                <p className="truncate text-xs text-brand-500">
                  {lightbox.subtitle}
                  {lightbox.year ? ` · ${t('media.yearSuffix', { year: lightbox.year })}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {/* "Ochish" (yangi tab, target=_blank) ATAYLAB yo'q: bu xom
                    (imzolangan bo'lsa ham) R2 havolasini manzil satrida
                    ko'rsatib, nusxalash/ulashishga imkon berardi — media
                    endi shu tarzda ochilmasin (faqat shu lightbox ichida
                    ko'rinsin). */}
                <button
                  type="button"
                  onClick={() => setLightbox(null)}
                  className="rounded-field bg-brand-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-800"
                >
                  {t('common.close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <MediaUploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={reloadMedia} />
      <MediaEditDialog item={editItem} onClose={() => setEditItem(null)} onSaved={reloadMedia} />
      <ConfirmDialog
        open={deleteId !== null}
        title={t('media.deleteTitle')}
        message={t('media.deleteMessage')}
        confirmLabel={t('common.delete')}
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
