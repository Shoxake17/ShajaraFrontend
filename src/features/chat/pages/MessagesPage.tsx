// features/chat/pages/MessagesPage.tsx
// Telegram-uslubidagi 1-ga-1 xabarlar: chap tomonda kontaktlar (shajara
// doskasidagi ota tomon + ona tomon, hisobini bog'lagan barcha a'zolar),
// o'ngda tanlangan suhbat. Mobilda — ro'yxat YOKI suhbat (bittasi).
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Download,
  Gauge,
  Pause,
  Paperclip,
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

/** Bubble burchagida — o'zi yuborgan xabar uchun kichik o'chirish tugmasi (barcha turdagi xabarlarda, desktop+mobil) */
function BubbleDeleteButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={t('common.delete')}
      className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-red-600/80"
    >
      <Trash2 size={12} />
    </button>
  );
}

/** Faqat media, izohsiz (Telegram uslubi): 2px chegara, vaqt/belgi rasm/video USTIDA (past-o'ng burchakda) */
function MediaOnlyBubble({
  message,
  mine,
  onOpenMedia,
  onRequestDelete,
}: {
  message: ChatMessage;
  mine: boolean;
  onOpenMedia: () => void;
  onRequestDelete: () => void;
}) {
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`relative max-w-[75%] overflow-hidden rounded-2xl border-2 ${
          mine ? 'rounded-br-md border-brand-800/25' : 'rounded-bl-md border-neutral-200'
        }`}
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
        {mine && <BubbleDeleteButton onClick={onRequestDelete} />}
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  mine,
  onOpenMedia,
  onRequestDelete,
}: {
  message: ChatMessage;
  mine: boolean;
  onOpenMedia: () => void;
  onRequestDelete: () => void;
}) {
  const hasMedia =
    !!message.attachmentUrl && (message.attachmentType === 'IMAGE' || message.attachmentType === 'VIDEO');
  const hasDocument = !!message.attachmentUrl && message.attachmentType === 'DOCUMENT';

  // Izohsiz rasm/video — Telegram uslubida: 2px chegara, vaqt media USTIDA
  if (hasMedia && !message.text) {
    return (
      <MediaOnlyBubble message={message} mine={mine} onOpenMedia={onOpenMedia} onRequestDelete={onRequestDelete} />
    );
  }

  // Izoh (matn) BILAN yuborilgan rasm/video — media 2px chegaraga qadar TO'LIQ
  // (bo'shliqsiz), FAQAT pastda izoh uchun joy qoladi (Telegram uslubi).
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`relative max-w-[75%] overflow-hidden rounded-2xl text-sm shadow-sm ${
          mine
            ? `rounded-br-md bg-brand-800 text-white ${hasMedia ? 'border-2 border-brand-800/25' : ''}`
            : `rounded-bl-md bg-[#F3F6F0] text-brand-900 ${hasMedia ? 'border-2 border-neutral-200' : ''}`
        }`}
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
            {fmtBubbleTime(message.createdAt)}
            {mine && (message.readAt ? <CheckCheck size={14} /> : <Check size={14} />)}
          </span>
        </div>
        {mine && <BubbleDeleteButton onClick={onRequestDelete} />}
      </div>
    </div>
  );
}

function Thread({ contact, onBack }: { contact: ChatContact; onBack: () => void }) {
  const { t } = useTranslation();
  const messages = useChatStore((s) => s.messagesByUserId[contact.userId] ?? []);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const deleteMessage = useChatStore((s) => s.deleteMessage);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewingMessage, setViewingMessage] = useState<ChatMessage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChatMessage | null>(null);
  const [deleting, setDeleting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Telegram uslubida: rasm/video TANLANGANDA darhol yuborilmaydi — pastda
  // (input ustida) kichik ko'rinish sifatida "kutib" turadi, foydalanuvchi
  // izoh (caption) yozib, "Yuborish"ni bosgandagina haqiqatan yuklanadi va
  // yuboriladi (matn + biriktirma BIRGA, bitta xabar sifatida).
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const pendingPreviewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (pendingPreviewUrlRef.current) URL.revokeObjectURL(pendingPreviewUrlRef.current);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const pickFile = (file: File) => {
    if (pendingPreviewUrlRef.current) URL.revokeObjectURL(pendingPreviewUrlRef.current);
    const url = URL.createObjectURL(file);
    pendingPreviewUrlRef.current = url;
    setPendingFile(file);
    setPendingPreviewUrl(url);
    setError(null);
  };

  const clearPending = () => {
    if (pendingPreviewUrlRef.current) {
      URL.revokeObjectURL(pendingPreviewUrlRef.current);
      pendingPreviewUrlRef.current = null;
    }
    setPendingFile(null);
    setPendingPreviewUrl(null);
  };

  const doSend = async () => {
    const trimmed = text.trim();
    if (!trimmed && !pendingFile) return;
    if (sending) return;
    setSending(true);
    setError(null);
    const fileToSend = pendingFile;
    const textToSend = trimmed;
    setText('');
    clearPending();
    try {
      if (fileToSend) {
        const { key, contentType, sizeBytes } = await uploadChatAttachment(fileToSend);
        await sendMessage(contact.userId, {
          text: textToSend || undefined,
          attachmentUrl: key,
          attachmentContentType: contentType,
          attachmentSizeBytes: sizeBytes,
        });
      } else {
        await sendMessage(contact.userId, { text: textToSend });
      }
    } catch (err) {
      const quota = quotaMessage(err);
      setError(quota ?? r2UploadErrorMessage(err) ?? t('messages.sendFailed'));
      // Qayta urinish uchun kiritilganlarni tiklaymiz
      setText(textToSend);
      if (fileToSend) pickFile(fileToSend);
    } finally {
      setSending(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await deleteMessage(contact.userId, deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Mobilda AppLayout'ning o'zi (yuqori sarlavha) yashirilgani uchun
          xavfsiz maydon (notch/status bar) shu yerda hisobga olinadi. */}
      <div className="flex shrink-0 items-center gap-2.5 border-b border-brand-100 bg-white px-3 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] lg:pt-2.5">
        <button type="button" onClick={onBack} className="rounded-full p-1.5 text-brand-700 hover:bg-brand-50 lg:hidden">
          <ArrowLeft size={20} />
        </button>
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
              onRequestDelete={() => setDeleteTarget(m)}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="shrink-0 px-3 py-1 text-xs text-red-500">{error}</p>}

      <div className="flex shrink-0 flex-col border-t border-brand-100 bg-white">
        {pendingPreviewUrl && pendingFile && (
          <div className="flex items-center gap-2.5 px-3 pt-2.5">
            <div className="relative shrink-0">
              {pendingFile.type.startsWith('video/') ? (
                <video src={pendingPreviewUrl} className="h-16 w-16 rounded-xl object-cover" muted />
              ) : (
                <img src={pendingPreviewUrl} alt="" className="h-16 w-16 rounded-xl object-cover" />
              )}
              <button
                type="button"
                onClick={clearPending}
                aria-label={t('common.close')}
                className="absolute -right-1.5 -top-1.5 rounded-full bg-neutral-800/90 p-0.5 text-white transition-colors hover:bg-neutral-900"
              >
                <X size={13} />
              </button>
            </div>
            <p className="min-w-0 flex-1 truncate text-xs text-neutral-400">{pendingFile.name}</p>
          </div>
        )}
        <div className="flex items-center gap-2 px-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-2.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,application/pdf"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pickFile(f);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || !!pendingFile}
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
              }
            }}
            maxLength={4000}
            placeholder={pendingFile ? t('messages.captionPlaceholder') : t('messages.sendPlaceholder')}
            className="min-w-0 flex-1 rounded-full border border-transparent bg-brand-50 px-4 py-2.5 text-sm outline-none focus:border-brand-300 focus:bg-white"
          />
          <button
            type="button"
            onClick={() => void doSend()}
            disabled={(!text.trim() && !pendingFile) || sending}
            className="shrink-0 rounded-full bg-brand-800 p-2.5 text-white transition-colors hover:bg-brand-900 disabled:opacity-40"
            aria-label={t('messages.send')}
          >
            {sending ? (
              <span className="block h-[18px] w-[18px] animate-spin rounded-full border-2 border-white/40 border-t-white" />
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
  const { topBarActionsEl, setBoardFullscreen } = useOutletContext<AppLayoutContext>();
  const contacts = useChatStore((s) => s.contacts);
  const contactsLoaded = useChatStore((s) => s.contactsLoaded);
  const activeUserId = useChatStore((s) => s.activeUserId);
  const loadContacts = useChatStore((s) => s.loadContacts);
  const openConversation = useChatStore((s) => s.openConversation);
  const closeConversation = useChatStore((s) => s.closeConversation);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  const activeContact = useMemo(() => contacts.find((c) => c.userId === activeUserId) ?? null, [contacts, activeUserId]);

  // Mobilda suhbat ochilganda AppLayout'ning o'zi (yuqori AJDO sarlavhasi,
  // Sidebar, BottomNav) yashiriladi — Thread'ning o'z sarlavhasi (orqaga +
  // ism-familiya) va yozish maydoni butun ekranni egallaydi (Telegram
  // uslubi). Desktopда (lg+) ikkala panel bir vaqtda ko'rinadi — tegilmaydi.
  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 1023px)').matches;
    setBoardFullscreen(isMobile && !!activeContact);
    return () => setBoardFullscreen(false);
  }, [activeContact, setBoardFullscreen]);

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
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-brand-900">{t('messages.title')}</p>
          </div>,
          topBarActionsEl,
        )}

      <div className="flex min-h-0 flex-1 gap-3 p-3">
        <div
          className={`flex min-h-0 w-full shrink-0 flex-col rounded-2xl border border-brand-100 bg-white lg:flex lg:w-80 ${
            activeContact ? 'hidden' : 'flex'
          }`}
        >
          <div className="relative shrink-0 p-2 pb-1.5">
            <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-brand-400">
              <Search size={16} />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('messages.searchPlaceholder')}
              maxLength={64}
              className="w-full rounded-full border border-transparent bg-brand-50 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-brand-300 focus:bg-white"
            />
          </div>
          <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-2 pt-1">
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
            <Thread contact={activeContact} onBack={closeConversation} />
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
