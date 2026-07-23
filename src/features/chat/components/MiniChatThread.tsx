// features/chat/components/MiniChatThread.tsx
// Kichik, qayta ishlatiladigan suhbat oynasi — MessagesPage.tsx'ning to'liq
// sahifa Thread'idan FARQLI o'laroq, {userId, name, photoUrl?} kabi
// minimal props qabul qiladi (oila daraxti/FamilyMember'ga bog'liq EMAS).
// Settings → "Yordam Markazi" (foydalanuvchi tarafida) va Admin panel →
// "Qo'llab-quvvatlash" (admin tarafida) — IKKALASI HAM shu bitta
// komponentni ishlatadi, faqat "kim bilan gaplashyapman" farq qiladi.
// Real-vaqtli holat qatlami useChatStore'dan (allaqachon AppLayout orqali
// global ulangan) — bu yerda hech qanday alohida socket boshqaruvi yo'q.
import { useEffect, useRef, useState } from 'react';
import { Paperclip, Send, X, Loader2 } from 'lucide-react';
import { useChatStore } from '@/features/chat/model/chat.store';
import { useAuthStore } from '@/features/auth/model/auth.store';
import { uploadChatAttachment, type ChatMessage } from '@/features/chat/api/chat.api';
import { quotaMessage } from '@/features/storage/storage.store';
import { r2UploadErrorMessage } from '@/shared/lib/upload-errors';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,application/pdf';

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
}

function Bubble({ message, own }: { message: ChatMessage; own: boolean }) {
  return (
    <div className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${
          own ? 'rounded-br-sm bg-brand-700 text-white' : 'rounded-bl-sm bg-neutral-100 text-neutral-900'
        }`}
      >
        {message.attachmentUrl && message.attachmentType === 'IMAGE' && (
          <img
            src={message.attachmentUrl}
            alt=""
            className="mb-1.5 max-h-48 w-full rounded-lg object-cover"
            draggable={false}
          />
        )}
        {message.attachmentUrl && message.attachmentType !== 'IMAGE' && (
          <a
            href={message.attachmentUrl}
            target="_blank"
            rel="noreferrer"
            className={`mb-1.5 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs underline ${
              own ? 'bg-white/10' : 'bg-white'
            }`}
          >
            <Paperclip className="h-3.5 w-3.5 shrink-0" />
            Biriktirma
          </a>
        )}
        {message.text && <p className="whitespace-pre-wrap break-words">{message.text}</p>}
        <p className={`mt-0.5 text-right text-[10px] ${own ? 'text-white/70' : 'text-neutral-400'}`}>
          {fmtTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

export function MiniChatThread({
  userId,
  name,
  placeholder,
  emptyLabel,
}: {
  userId: string;
  name: string;
  placeholder: string;
  emptyLabel: string;
}) {
  const myId = useAuthStore((s) => s.user?.id);
  const messages = useChatStore((s) => s.messagesByUserId[userId] ?? []);
  const openConversation = useChatStore((s) => s.openConversation);
  const sendMessage = useChatStore((s) => s.sendMessage);

  const [text, setText] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void openConversation(userId);
  }, [userId, openConversation]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  const doSend = async () => {
    const trimmed = text.trim();
    if (!trimmed && !pendingFile) return;
    setSending(true);
    setError(null);
    try {
      let attachment: { attachmentUrl: string; attachmentContentType: string; attachmentSizeBytes: number } | null =
        null;
      if (pendingFile) {
        setUploadPercent(0);
        const uploaded = await uploadChatAttachment(pendingFile, setUploadPercent);
        attachment = {
          attachmentUrl: uploaded.key,
          attachmentContentType: uploaded.contentType,
          attachmentSizeBytes: uploaded.sizeBytes,
        };
      }
      await sendMessage(userId, { text: trimmed || undefined, ...attachment });
      setText('');
      setPendingFile(null);
      setUploadPercent(null);
    } catch (e) {
      setError(quotaMessage(e) ?? r2UploadErrorMessage(e) ?? "Xabar yuborilmadi. Qaytadan urinib ko'ring");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-400">{emptyLabel}</p>
        ) : (
          messages.map((m) => <Bubble key={m.id} message={m} own={m.senderId === myId} />)
        )}
      </div>

      {error && <p className="px-4 pb-1 text-xs text-red-600">{error}</p>}

      {pendingFile && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg bg-neutral-100 px-3 py-1.5 text-xs text-neutral-600">
          <Paperclip className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 truncate">{pendingFile.name}</span>
          {uploadPercent !== null ? (
            <span>{uploadPercent}%</span>
          ) : (
            <button type="button" onClick={() => setPendingFile(null)} aria-label="Bekor qilish">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-neutral-200 px-3 py-2.5">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setPendingFile(file);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
          className="shrink-0 rounded-full p-2 text-neutral-500 hover:bg-neutral-100 disabled:opacity-50"
          aria-label="Fayl biriktirish"
        >
          <Paperclip className="h-5 w-5" />
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
          placeholder={placeholder}
          disabled={sending}
          className="min-w-0 flex-1 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm outline-none focus:border-brand-400"
        />
        <button
          type="button"
          onClick={() => void doSend()}
          disabled={sending || (!text.trim() && !pendingFile)}
          className="shrink-0 rounded-full bg-brand-700 p-2 text-white disabled:opacity-40"
          aria-label="Yuborish"
        >
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
      </div>
      <p className="sr-only">{name}</p>
    </div>
  );
}
