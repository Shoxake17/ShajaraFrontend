// features/chat/pages/MessagesPage.tsx
// Telegram-uslubidagi 1-ga-1 xabarlar: chap tomonda kontaktlar (shajara
// doskasidagi ota tomon + ona tomon, hisobini bog'lagan barcha a'zolar),
// o'ngda tanlangan suhbat. Mobilda — ro'yxat YOKI suhbat (bittasi).
import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Download,
  Gauge,
  Pause,
  Paperclip,
  Pencil,
  Play,
  PictureInPicture2,
  Search,
  Send,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { AppLayoutContext } from '@/app/AppLayout';
import { useChatStore } from '@/features/chat/model/chat.store';
import { usePipStore } from '@/features/chat/model/pip.store';
import { uploadChatAttachment, type ChatContact, type ChatMessage } from '@/features/chat/api/chat.api';
import { quotaMessage } from '@/features/storage/storage.store';
import { r2UploadErrorMessage } from '@/shared/lib/upload-errors';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

const themeFor = (female: boolean) =>
  female ? 'bg-pink-100 text-pink-700' : 'bg-brand-100 text-brand-800';

function Avatar({ name, gender, photoUrl, size = 44 }: { name: string; gender: string; photoUrl: string | null; size?: number }) {
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
      style={{ height: size, width: size }}
      className={`flex shrink-0 items-center justify-center rounded-full font-serif text-sm font-semibold ${themeFor(female)}`}
    >
      {initials(name)}
    </span>
  );
}

function fmtBubbleTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** To'liq ekran ko'rinishi sarlavhasi uchun — sana + vaqt */
function fmtFullTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}, ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function fmtDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Video tezligi — bosib ko'rsatiladigan volum-uslubidagi polosa (ro'yxat EMAS) */
function SpeedPopover({ speed, onChange }: { speed: number; onChange: (v: number) => void }) {
  return (
    <div className="absolute right-0 top-full mt-1.5 flex items-center gap-2 rounded-full bg-neutral-900 py-2 pl-3 pr-3.5 shadow-lg">
      <Gauge size={14} className="shrink-0 text-white/70" />
      <input
        type="range"
        min={0.5}
        max={2}
        step={0.25}
        value={speed}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 w-20 shrink-0 cursor-pointer accent-white"
      />
      <span className="w-8 shrink-0 text-xs font-medium tabular-nums text-white">{speed}x</span>
    </div>
  );
}

/**
 * Rasm/video ustiga bosilganda TO'LIQ EKRANDA ochiladigan ko'rinish —
 * Telegram uslubida. Video uchun brauzerning NATIV boshqaruvi (controls,
 * o'zining fullscreen/PiP/"..." menyusi) UMUMAN ishlatilmaydi — hammasi
 * o'zimiz chizgan tugmalar: yuqorida orqaga/ism-familiya/vaqt (chapda) va
 * tezlik/yuklab olish/o'chirish (o'ngda); pastda play-pauza/ovoz/vaqt va
 * ilova ICHIDAGI kichik oyna (PiP).
 */
function MediaLightbox({
  message,
  mine,
  contactName,
  onClose,
  onRequestDelete,
}: {
  message: ChatMessage;
  mine: boolean;
  contactName: string;
  onClose: () => void;
  /** Tasdiqlash oynasi Thread darajasida ko'rsatiladi — shu bois bu yerda
      faqat SO'RALADI, lightbox esa darhol yopiladi (z-index ustma-ust
      tushmasligi uchun — ConfirmDialog oddiy fon ustida ko'rinadi). */
  onRequestDelete: () => void;
}) {
  const { t } = useTranslation();
  const openPip = usePipStore((s) => s.open);
  const [speed, setSpeed] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideo = message.attachmentType === 'VIDEO';

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed]);

  const download = () => {
    if (!message.attachmentUrl) return;
    const a = document.createElement('a');
    a.href = message.attachmentUrl;
    a.download = '';
    a.target = '_blank';
    a.rel = 'noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const seek = (ratio: number) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    v.currentTime = ratio * v.duration;
  };

  const openMiniPlayer = () => {
    if (!message.attachmentUrl) return;
    openPip(message.attachmentUrl, videoRef.current?.currentTime ?? 0);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-black" onClick={onClose}>
      {/* Yuqori panel — Telegram uslubida: chapda ORQAGA + ism-familiya/vaqt,
          o'ngda amallar. Xavfsiz maydon (notch/status bar) uchun pastroq. */}
      <div
        className="absolute inset-x-0 top-0 z-10 flex items-start justify-between bg-gradient-to-b from-black/70 to-transparent px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.back')}
            className="rounded-full p-2 text-white transition-colors hover:bg-white/10"
          >
            <ArrowLeft size={22} />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{contactName}</p>
            <p className="truncate text-xs text-white/70">{fmtFullTime(message.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isVideo && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setSpeedOpen((o) => !o)}
                aria-label={t('messages.playbackSpeed')}
                className="rounded-full p-2.5 text-white transition-colors hover:bg-white/10"
              >
                <Gauge size={19} />
              </button>
              {speedOpen && <SpeedPopover speed={speed} onChange={setSpeed} />}
            </div>
          )}
          <button
            type="button"
            onClick={download}
            aria-label={t('messages.download')}
            className="rounded-full p-2.5 text-white transition-colors hover:bg-white/10"
          >
            <Download size={19} />
          </button>
          {mine && (
            <button
              type="button"
              onClick={onRequestDelete}
              aria-label={t('common.delete')}
              className="rounded-full p-2.5 text-white transition-colors hover:bg-red-600/50"
            >
              <Trash2 size={19} />
            </button>
          )}
        </div>
      </div>

      {/* Media — to'liq ekranni egallaydi */}
      <div className="flex flex-1 items-center justify-center overflow-hidden">
        {isVideo ? (
          <video
            ref={videoRef}
            src={message.attachmentUrl ?? undefined}
            autoPlay
            playsInline
            className="max-h-full max-w-full"
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          />
        ) : (
          <img
            src={message.attachmentUrl ?? undefined}
            alt=""
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>

      {/* Pastki panel — video uchun: play/pauza, ovoz, vaqt, ilova ichidagi
          kichik oyna (PiP). Xavfsiz maydon (gest navigatsiya) uchun yuqoriroq. */}
      {isVideo && (
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 bg-gradient-to-t from-black/70 to-transparent px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-10"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={duration ? currentTime / duration : 0}
            onChange={(e) => seek(Number(e.target.value))}
            className="h-1 w-full cursor-pointer accent-white"
          />
          <div className="flex items-center gap-3">
            <button type="button" onClick={togglePlay} aria-label={playing ? t('messages.pause') : t('messages.play')} className="text-white">
              {playing ? <Pause size={22} fill="white" /> : <Play size={22} fill="white" />}
            </button>
            <button type="button" onClick={toggleMute} aria-label={t('messages.mute')} className="text-white">
              {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <span className="text-xs tabular-nums text-white/80">
              {fmtDuration(currentTime)} / {fmtDuration(duration)}
            </span>
            <div className="flex-1" />
            <button
              type="button"
              onClick={openMiniPlayer}
              aria-label={t('messages.miniPlayer')}
              className="text-white"
            >
              <PictureInPicture2 size={20} />
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}

/**
 * Kontaktlar qidiruvi — bo'sh bo'lganda placeholder Telegram uslubida
 * o'ngdan chapga (oxiridan boshiga) uzluksiz "suzib" o'tadi, native
 * placeholder atributi o'rniga alohida overlay sifatida chiziladi
 * (native placeholder harakatlanmaydi).
 */
function ChatSearchInput({
  value,
  onChange,
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className={`relative ${className}`}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-400">
        <Search size={16} />
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={64}
        aria-label={t('messages.searchPlaceholder')}
        className="w-full rounded-full border border-transparent bg-brand-50 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-brand-300 focus:bg-white"
      />
      {!value && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-9 right-3 flex items-center overflow-hidden"
        >
          {/* Faqat mobil telefon o'lchamida "suzadi" — tab/planshet/desktopда (md+) qotib turadi */}
          <span className="animate-chat-search-marquee inline-block whitespace-nowrap text-sm text-neutral-400 md:animate-none">
            {t('messages.searchPlaceholder')}
          </span>
        </span>
      )}
    </div>
  );
}

function ContactRow({ contact, active, onClick }: { contact: ChatContact; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors ${
        active ? 'bg-brand-800 text-white' : 'hover:bg-brand-50'
      }`}
    >
      <Avatar name={contact.fullName} gender={contact.gender} photoUrl={contact.photoUrl} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className={`truncate text-sm font-semibold ${active ? 'text-white' : 'text-brand-900'}`}>
            {contact.fullName}
          </span>
          {contact.lastMessageAt && (
            <span className={`shrink-0 text-[11px] ${active ? 'text-brand-100' : 'text-neutral-400'}`}>
              {fmtBubbleTime(contact.lastMessageAt)}
            </span>
          )}
        </span>
        <span className="flex items-center justify-between gap-2">
          <span className={`truncate text-xs ${active ? 'text-brand-100' : 'text-neutral-500'}`}>
            {contact.lastMessage ?? ''}
          </span>
          {contact.unreadCount > 0 && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
              {contact.unreadCount > 99 ? '99+' : contact.unreadCount}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

/** Telegram uslubidagi kichik popup menyu — "Tahrirlash" / "O'chirish" */
function BubbleMenu({
  x,
  y,
  onEdit,
  onDelete,
  onClose,
}: {
  x: number;
  y: number;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const left = Math.min(x, window.innerWidth - rect.width - 8);
    const top = Math.min(y, window.innerHeight - rect.height - 8);
    setPos({ left: Math.max(8, left), top: Math.max(8, top) });
  }, [x, y]);

  useEffect(() => {
    const close = () => onClose();
    // Ochilishga sabab bo'lgan AYNAN SHU click/contextmenu hodisasi document'gacha
    // ko'tarilib, menyuni o'zi ochilgan zahoti yopib qo'yishining oldini olish
    // uchun — tinglovchilar KEYINGI "tick"da ulanadi (bitta darajadagi
    // taymer yetarli, chunki native hodisa document'gacha SINXRON ko'tariladi).
    const id = window.setTimeout(() => {
      document.addEventListener('pointerdown', close);
      document.addEventListener('contextmenu', close);
      document.addEventListener('scroll', close, true);
      window.addEventListener('resize', close);
    }, 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('contextmenu', close);
      document.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      style={{ left: pos.left, top: pos.top }}
      className="fixed z-[110] min-w-[168px] overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-black/5"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => {
          onEdit();
          onClose();
        }}
        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-brand-900 transition-colors hover:bg-brand-50"
      >
        <Pencil size={16} />
        {t('common.edit')}
      </button>
      <button
        type="button"
        onClick={() => {
          onDelete();
          onClose();
        }}
        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
      >
        <Trash2 size={16} />
        {t('common.delete')}
      </button>
    </div>,
    document.body,
  );
}

/**
 * O'zi yuborgan xabar bubble'i uchun — Telegram uslubida: sichqoncha o'ng
 * tugmasi (desktop) yoki uzoq bosish (mobil, 500ms) BubbleMenu'ni ochadi.
 * Uzoq bosishdan keyingi sun'iy "click" (media ochilishi) bostiriladi.
 */
function useBubbleContextMenu(mine: boolean) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  const clearTimer = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    touchStartPos.current = null;
  };

  const onContextMenu = (e: ReactMouseEvent) => {
    if (!mine) return;
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY });
  };

  const onTouchStart = (e: ReactTouchEvent) => {
    if (!mine) return;
    longPressFired.current = false;
    const touch = e.touches[0];
    if (!touch) return;
    const x = touch.clientX;
    const y = touch.clientY;
    clearTimer();
    touchStartPos.current = { x, y };
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      if (navigator.vibrate) navigator.vibrate(10);
      setMenu({ x, y });
    }, 500);
  };

  // Uzoq bosish paytida barmoq bir necha piksel titrasa ham bekor bo'lib
  // ketmasin (matn ustida bosganda tabiiy jiter bo'ladi) — faqat HAQIQIY
  // surish (>10px) bekor qiladi.
  const onTouchMove = (e: ReactTouchEvent) => {
    const start = touchStartPos.current;
    const touch = e.touches[0];
    if (!start || !touch) {
      clearTimer();
      return;
    }
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.hypot(dx, dy) > 10) clearTimer();
  };

  const onTouchEnd = () => clearTimer();

  const onClickCapture = (e: ReactMouseEvent) => {
    if (longPressFired.current) {
      e.preventDefault();
      e.stopPropagation();
      longPressFired.current = false;
    }
  };

  return {
    menu,
    closeMenu: () => setMenu(null),
    // Matn ustida uzoq bosilganda mobil brauzer/WebView'ning o'z matn
    // tanlash/"nusxa olish" popup'i BIZNING uzoq-bosish taymerimizdan
    // OLDIN chiqib ketmasligi uchun — shu elementda tanlash/callout
    // butunlay o'chiriladi (faqat "mine" — o'zi yuborgan xabarlar uchun).
    selectionClassName: mine ? 'select-none [-webkit-touch-callout:none]' : '',
    handlers: mine ? { onContextMenu, onTouchStart, onTouchEnd, onTouchMove, onClickCapture } : {},
  };
}

/** Faqat media, izohsiz (Telegram uslubi): 2px chegara, vaqt/belgi rasm/video USTIDA (past-o'ng burchakda) */
function MediaOnlyBubble({
  message,
  mine,
  onOpenMedia,
  onRequestEdit,
  onRequestDelete,
}: {
  message: ChatMessage;
  mine: boolean;
  onOpenMedia: () => void;
  onRequestEdit: () => void;
  onRequestDelete: () => void;
}) {
  const { menu, closeMenu, handlers, selectionClassName } = useBubbleContextMenu(mine);
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`relative max-w-[75%] overflow-hidden rounded-2xl border-2 ${selectionClassName} ${
          mine ? 'rounded-br-md border-brand-800/25' : 'rounded-bl-md border-neutral-200'
        }`}
        {...handlers}
      >
        <button type="button" onClick={onOpenMedia} className="relative block">
          {message.attachmentType === 'IMAGE' ? (
            <img src={message.attachmentUrl ?? undefined} alt="" className="max-h-64 w-full object-cover" />
          ) : (
            <>
              <video src={message.attachmentUrl ?? undefined} className="max-h-64 w-full object-cover" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90">
                  <span className="ml-0.5 border-y-8 border-l-[14px] border-y-transparent border-l-brand-900" />
                </span>
              </span>
            </>
          )}
        </button>
        <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white">
          {fmtBubbleTime(message.createdAt)}
          {mine && (message.readAt ? <CheckCheck size={12} /> : <Check size={12} />)}
        </span>
        {menu && <BubbleMenu x={menu.x} y={menu.y} onEdit={onRequestEdit} onDelete={onRequestDelete} onClose={closeMenu} />}
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  mine,
  onOpenMedia,
  onRequestEdit,
  onRequestDelete,
}: {
  message: ChatMessage;
  mine: boolean;
  onOpenMedia: () => void;
  onRequestEdit: () => void;
  onRequestDelete: () => void;
}) {
  const { t } = useTranslation();
  const { menu, closeMenu, handlers, selectionClassName } = useBubbleContextMenu(mine);
  const hasMedia =
    !!message.attachmentUrl && (message.attachmentType === 'IMAGE' || message.attachmentType === 'VIDEO');
  const hasDocument = !!message.attachmentUrl && message.attachmentType === 'DOCUMENT';

  // Izohsiz rasm/video — Telegram uslubida: 2px chegara, vaqt media USTIDA
  if (hasMedia && !message.text) {
    return (
      <MediaOnlyBubble
        message={message}
        mine={mine}
        onOpenMedia={onOpenMedia}
        onRequestEdit={onRequestEdit}
        onRequestDelete={onRequestDelete}
      />
    );
  }

  // Izoh (matn) BILAN yuborilgan rasm/video — media 2px chegaraga qadar TO'LIQ
  // (bo'shliqsiz), FAQAT pastda izoh uchun joy qoladi (Telegram uslubi).
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`relative max-w-[75%] overflow-hidden rounded-2xl text-sm shadow-sm ${selectionClassName} ${
          mine
            ? `rounded-br-md bg-brand-800 text-white ${hasMedia ? 'border-2 border-brand-800/25' : ''}`
            : `rounded-bl-md bg-[#F3F6F0] text-brand-900 ${hasMedia ? 'border-2 border-neutral-200' : ''}`
        }`}
        {...handlers}
      >
        {message.attachmentUrl && message.attachmentType === 'IMAGE' && (
          <button type="button" onClick={onOpenMedia} className="block w-full">
            <img src={message.attachmentUrl} alt="" className="max-h-64 w-full object-cover" />
          </button>
        )}
        {message.attachmentUrl && message.attachmentType === 'VIDEO' && (
          <button type="button" onClick={onOpenMedia} className="relative block w-full">
            <video src={message.attachmentUrl} className="max-h-64 w-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/20">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90">
                <span className="ml-0.5 border-y-8 border-l-[14px] border-y-transparent border-l-brand-900" />
              </span>
            </span>
          </button>
        )}
        <div className="px-3.5 py-2">
          {hasDocument && (
            <a
              href={message.attachmentUrl ?? undefined}
              target="_blank"
              rel="noreferrer"
              className={`mb-1.5 block truncate underline ${mine ? 'text-white' : 'text-brand-700'}`}
            >
              {message.attachmentUrl?.split('/').pop()}
            </a>
          )}
          {message.text && <p className="whitespace-pre-wrap break-words">{message.text}</p>}
          <span className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${mine ? 'text-brand-200' : 'text-neutral-400'}`}>
            {message.editedAt && <span>{t('messages.edited')} ·</span>}
            {fmtBubbleTime(message.createdAt)}
            {mine && (message.readAt ? <CheckCheck size={14} /> : <Check size={14} />)}
          </span>
        </div>
        {menu && <BubbleMenu x={menu.x} y={menu.y} onEdit={onRequestEdit} onDelete={onRequestDelete} onClose={closeMenu} />}
      </div>
    </div>
  );
}

/**
 * Yuklanayotgan rasm/video — FAQAT yuboruvchining o'z ekranida ko'rinadi
 * (hech qachon serverga/boshqa tomonga yuborilmaydi, sof lokal state).
 * O'rtasida HAQIQIY yuklash foizi (XHR upload.onprogress) — 100% bo'lib
 * xabar chindan yuborilmaguncha boshqa tomon buni umuman bilmaydi.
 */
function UploadingBubble({ previewUrl, isVideo, progress }: { previewUrl: string; isVideo: boolean; progress: number }) {
  return (
    <div className="flex justify-end">
      <div className="relative max-w-[75%] overflow-hidden rounded-2xl rounded-br-md border-2 border-brand-800/25">
        {isVideo ? (
          <video src={previewUrl} muted className="max-h-64 w-full object-cover" />
        ) : (
          <img src={previewUrl} alt="" className="max-h-64 w-full object-cover" />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/45">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition-[background]"
            style={{ background: `conic-gradient(#ffffff ${progress * 3.6}deg, rgba(255,255,255,0.3) 0deg)` }}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-xs font-semibold text-white">
              {progress}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Thread({ contact }: { contact: ChatContact }) {
  const { t } = useTranslation();
  const messages = useChatStore((s) => s.messagesByUserId[contact.userId] ?? []);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const deleteMessage = useChatStore((s) => s.deleteMessage);
  const editMessage = useChatStore((s) => s.editMessage);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewingMessage, setViewingMessage] = useState<ChatMessage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChatMessage | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Telegram uslubida: rasm/video TANLANGANDA darhol yuborilmaydi — pastda
  // (input ustida) kichik ko'rinishlar qatori sifatida "kutib" turadi
  // (BIR NECHTASI birdaniga — xoxlagancha), foydalanuvchi izoh (caption)
  // yozib, "Yuborish"ni bosgandagina haqiqatan yuklanadi va ketma-ket
  // yuboriladi (izoh FAQAT oxirgi faylga biriktiriladi).
  const MAX_BATCH_FILES = 10;
  const [pendingFiles, setPendingFiles] = useState<{ id: string; file: File; previewUrl: string }[]>([]);
  const pendingFilesRef = useRef(pendingFiles);
  pendingFilesRef.current = pendingFiles;

  // Yuklanayotgan fayllar — FAQAT shu foydalanuvchining o'z ekranida
  // (lokal state, hech qachon serverga/boshqa tomonga yuborilmaydi) — video/
  // rasm o'rtasida % ko'rsatiladi, 100% bo'lib xabar HAQIQATAN yuborilmaguncha
  // boshqa tomon buni umuman ko'rmaydi.
  const [uploading, setUploading] = useState<{ id: string; previewUrl: string; isVideo: boolean; progress: number }[]>([]);

  useEffect(() => {
    return () => {
      pendingFilesRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, uploading.length]);

  const pickFiles = (fileList: FileList) => {
    const room = MAX_BATCH_FILES - pendingFilesRef.current.length;
    if (room <= 0) return;
    const files = Array.from(fileList).slice(0, room);
    const items = files.map((file) => ({ id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file) }));
    setPendingFiles((p) => [...p, ...items]);
    setError(null);
  };

  const removePendingFile = (id: string) => {
    setPendingFiles((p) => {
      const item = p.find((x) => x.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return p.filter((x) => x.id !== id);
    });
  };

  const clearPending = () => {
    pendingFilesRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPendingFiles([]);
  };

  const startEdit = (m: ChatMessage) => {
    clearPending();
    setError(null);
    setEditingMessage(m);
    setText(m.text ?? '');
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setText('');
  };

  const doSend = async () => {
    const trimmed = text.trim();

    if (editingMessage) {
      if (!trimmed || sending) return;
      setSending(true);
      setError(null);
      try {
        await editMessage(contact.userId, editingMessage.id, trimmed);
        setEditingMessage(null);
        setText('');
      } catch (err) {
        setError(quotaMessage(err) ?? t('messages.sendFailed'));
      } finally {
        setSending(false);
      }
      return;
    }

    const filesToSend = pendingFiles;
    if (!trimmed && filesToSend.length === 0) return;
    if (sending) return;
    setSending(true);
    setError(null);
    const textToSend = trimmed;
    setText('');
    setPendingFiles([]); // ko'rinishlar egaligi pastdagi "uploading" ro'yxatiga o'tadi — shu yerda revoke qilinmaydi

    if (filesToSend.length === 0) {
      try {
        await sendMessage(contact.userId, { text: textToSend });
      } catch (err) {
        setError(quotaMessage(err) ?? t('messages.sendFailed'));
        setText(textToSend);
      } finally {
        setSending(false);
      }
      return;
    }

    // Bir nechta rasm/video — Telegram uslubida ketma-ket yuboriladi, har
    // birining haqiqiy yuklash foizi bubble o'rtasida ko'rsatiladi; izoh
    // (agar yozilgan bo'lsa) FAQAT oxirgi faylga biriktiriladi.
    for (let i = 0; i < filesToSend.length; i++) {
      const item = filesToSend[i];
      const isLast = i === filesToSend.length - 1;
      setUploading((u) => [
        ...u,
        { id: item.id, previewUrl: item.previewUrl, isVideo: item.file.type.startsWith('video/'), progress: 0 },
      ]);
      try {
        const { key, contentType, sizeBytes } = await uploadChatAttachment(item.file, (pct) => {
          setUploading((u) => u.map((x) => (x.id === item.id ? { ...x, progress: pct } : x)));
        });
        await sendMessage(contact.userId, {
          text: isLast && textToSend ? textToSend : undefined,
          attachmentUrl: key,
          attachmentContentType: contentType,
          attachmentSizeBytes: sizeBytes,
        });
        URL.revokeObjectURL(item.previewUrl);
        setUploading((u) => u.filter((x) => x.id !== item.id));
      } catch (err) {
        setUploading((u) => u.filter((x) => x.id !== item.id));
        setError(quotaMessage(err) ?? r2UploadErrorMessage(err) ?? t('messages.sendFailed'));
        // Yuborilmagan (shu jumladan xato bergan) fayllarni qayta urinish uchun tiklaymiz
        setPendingFiles(filesToSend.slice(i));
        setText(textToSend);
        break;
      }
    }
    setSending(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await deleteMessage(contact.userId, deleteTarget.id);
      if (editingMessage?.id === deleteTarget.id) cancelEdit();
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Desktopда (lg+) — o'zining sarlavhasi; mobilda sarlavha AppLayout'ning
          umumiy header'iga portal qilinadi (MessagesPage), shu bois bu yerda
          faqat lg+ da ko'rinadi. */}
      <div className="hidden shrink-0 items-center gap-2.5 border-b border-brand-100 bg-white px-3 py-2.5 lg:flex">
        <Avatar name={contact.fullName} gender={contact.gender} photoUrl={contact.photoUrl} size={36} />
        <span className="truncate text-sm font-semibold text-brand-900">{contact.fullName}</span>
      </div>

      <div className="no-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto bg-brand-50/50 px-3 py-3">
        {messages.length === 0 ? (
          <p className="mt-6 text-center text-sm text-neutral-400">{t('messages.emptyThread')}</p>
        ) : (
          messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              mine={m.senderId !== contact.userId}
              onOpenMedia={() => setViewingMessage(m)}
              onRequestEdit={() => startEdit(m)}
              onRequestDelete={() => setDeleteTarget(m)}
            />
          ))
        )}
        {uploading.map((u) => (
          <UploadingBubble key={u.id} previewUrl={u.previewUrl} isVideo={u.isVideo} progress={u.progress} />
        ))}
        <div ref={bottomRef} />
      </div>

      {error && <p className="shrink-0 px-3 py-1 text-xs text-red-500">{error}</p>}

      <div className="flex shrink-0 flex-col border-t border-brand-100 bg-white">
        {editingMessage && (
          <div className="flex items-center gap-2 px-3 pt-2.5">
            <Pencil size={14} className="shrink-0 text-brand-500" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-brand-700">{t('messages.editingLabel')}</p>
              <p className="truncate text-xs text-neutral-500">{editingMessage.text}</p>
            </div>
            <button
              type="button"
              onClick={cancelEdit}
              aria-label={t('common.close')}
              className="shrink-0 rounded-full p-1 text-neutral-400 transition-colors hover:bg-neutral-100"
            >
              <X size={14} />
            </button>
          </div>
        )}
        {pendingFiles.length > 0 && (
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto px-3 pt-2.5">
            {pendingFiles.map((item) => (
              <div key={item.id} className="relative shrink-0">
                {item.file.type.startsWith('video/') ? (
                  <video src={item.previewUrl} className="h-16 w-16 rounded-xl object-cover" muted />
                ) : (
                  <img src={item.previewUrl} alt="" className="h-16 w-16 rounded-xl object-cover" />
                )}
                <button
                  type="button"
                  onClick={() => removePendingFile(item.id)}
                  aria-label={t('common.close')}
                  className="absolute -right-1.5 -top-1.5 rounded-full bg-neutral-800/90 p-0.5 text-white transition-colors hover:bg-neutral-900"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 px-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-2.5">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,application/pdf"
            className="sr-only"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) pickFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || pendingFiles.length >= MAX_BATCH_FILES || !!editingMessage}
            className="shrink-0 rounded-full p-2 text-brand-600 transition-colors hover:bg-brand-50 disabled:opacity-40"
            aria-label={t('messages.attach')}
          >
            <Paperclip size={19} />
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void doSend();
              } else if (e.key === 'Escape' && editingMessage) {
                cancelEdit();
              }
            }}
            maxLength={4000}
            placeholder={
              editingMessage
                ? t('messages.editPlaceholder')
                : pendingFiles.length > 0
                  ? t('messages.captionPlaceholder')
                  : t('messages.sendPlaceholder')
            }
            className="min-w-0 flex-1 rounded-full border border-transparent bg-brand-50 px-4 py-2.5 text-sm outline-none focus:border-brand-300 focus:bg-white"
          />
          <button
            type="button"
            onClick={() => void doSend()}
            disabled={(!text.trim() && pendingFiles.length === 0) || sending}
            className="shrink-0 rounded-full bg-brand-800 p-2.5 text-white transition-colors hover:bg-brand-900 disabled:opacity-40"
            aria-label={t('messages.send')}
          >
            {sending ? (
              <span className="block h-[18px] w-[18px] animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : editingMessage ? (
              <Check size={18} />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </div>

      {viewingMessage && (
        <MediaLightbox
          message={viewingMessage}
          mine={viewingMessage.senderId !== contact.userId}
          contactName={contact.fullName}
          onClose={() => setViewingMessage(null)}
          onRequestDelete={() => {
            setDeleteTarget(viewingMessage);
            setViewingMessage(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('messages.deleteTitle')}
        message={t('messages.deleteConfirm')}
        confirmLabel={t('common.delete')}
        danger
        loading={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export function MessagesPage() {
  const { t } = useTranslation();
  const { topBarActionsEl, setChatFullscreen } = useOutletContext<AppLayoutContext>();
  const contacts = useChatStore((s) => s.contacts);
  const contactsLoaded = useChatStore((s) => s.contactsLoaded);
  const activeUserId = useChatStore((s) => s.activeUserId);
  const loadContacts = useChatStore((s) => s.loadContacts);
  const openConversation = useChatStore((s) => s.openConversation);
  const closeConversation = useChatStore((s) => s.closeConversation);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  // Push bildirishnomani (yoki boshqa joydan kelgan havolani) bosib kirilsa —
  // "/xabarlar?with=<userId>" o'sha suhbatni to'g'ridan-to'g'ri ochadi
  // (Telegram uslubi — chat.gateway.ts/push.native.ts shu URL'ni yuboradi).
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const withId = searchParams.get('with');
    if (!withId) return;
    void openConversation(withId);
    setSearchParams((prev) => {
      prev.delete('with');
      return prev;
    }, { replace: true });
  }, [searchParams, openConversation, setSearchParams]);

  const activeContact = useMemo(() => contacts.find((c) => c.userId === activeUserId) ?? null, [contacts, activeUserId]);

  // Mobilda suhbat ochilganda pastki navigatsiya DARHOL (animatsiyasiz)
  // yashiriladi — Thread'ning yozish maydoni butun ekranni egallaydi
  // (Telegram uslubi). Desktopда (lg+) ikkala panel bir vaqtda ko'rinadi —
  // tegilmaydi.
  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 1023px)').matches;
    setChatFullscreen(isMobile && !!activeContact);
    return () => setChatFullscreen(false);
  }, [activeContact, setChatFullscreen]);

  const [query, setQuery] = useState('');
  const filteredContacts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => c.fullName.toLowerCase().includes(q));
  }, [contacts, query]);

  return (
    <>
      {topBarActionsEl &&
        createPortal(
          <>
            {/* Desktop (lg+) — doim statik sarlavha, Thread o'zining sarlavhasini ko'rsatadi */}
            <div className="hidden min-w-0 flex-1 items-center lg:flex">
              <p className="truncate text-sm font-semibold text-brand-900">{t('messages.title')}</p>
            </div>
            {/* Mobil (<lg) — ro'yxat ekranida qidiruv, suhbat ekranida orqaga+ism-familiya */}
            <div className="flex min-w-0 flex-1 items-center lg:hidden">
              {activeContact ? (
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <button
                    type="button"
                    onClick={closeConversation}
                    aria-label={t('common.back')}
                    className="shrink-0 rounded-full p-1.5 text-brand-700 transition-colors hover:bg-brand-50"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <Avatar name={activeContact.fullName} gender={activeContact.gender} photoUrl={activeContact.photoUrl} size={32} />
                  <span className="truncate text-sm font-semibold text-brand-900">{activeContact.fullName}</span>
                </div>
              ) : (
                <ChatSearchInput value={query} onChange={setQuery} className="w-full" />
              )}
            </div>
          </>,
          topBarActionsEl,
        )}

      <div className="flex min-h-0 flex-1 gap-3 p-3">
        <div
          className={`flex min-h-0 w-full shrink-0 flex-col rounded-2xl border border-brand-100 bg-white lg:flex lg:w-80 ${
            activeContact ? 'hidden' : 'flex'
          }`}
        >
          {/* Desktopда o'z qidiruvi; mobilda qidiruv AppLayout header'iga portal qilinadi (yuqorida) */}
          <div className="hidden shrink-0 p-2 pb-1.5 lg:block">
            <ChatSearchInput value={query} onChange={setQuery} />
          </div>
          <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-2 pt-1 lg:pt-1">
            {!contactsLoaded ? (
              <div className="flex justify-center py-8">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />
              </div>
            ) : contacts.length === 0 ? (
              <p className="mt-6 px-2 text-center text-sm text-neutral-400">{t('messages.emptyContacts')}</p>
            ) : filteredContacts.length === 0 ? (
              <p className="mt-6 px-2 text-center text-sm text-neutral-400">{t('messages.noSearchResults')}</p>
            ) : (
              <div className="space-y-1">
                {filteredContacts.map((c) => (
                  <ContactRow
                    key={c.userId}
                    contact={c}
                    active={c.userId === activeUserId}
                    onClick={() => void openConversation(c.userId)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div
          className={`min-h-0 flex-1 overflow-hidden rounded-2xl border border-brand-100 bg-white lg:flex ${
            activeContact ? 'flex' : 'hidden'
          }`}
        >
          {activeContact ? (
            <Thread contact={activeContact} />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-neutral-400">{t('messages.selectContact')}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
