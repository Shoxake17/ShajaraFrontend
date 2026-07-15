// features/chat/pages/MessagesPage.tsx
// Telegram-uslubidagi 1-ga-1 xabarlar: chap tomonda kontaktlar (shajara
// doskasidagi ota tomon + ona tomon, hisobini bog'lagan barcha a'zolar),
// o'ngda tanlangan suhbat. Mobilda — ro'yxat YOKI suhbat (bittasi).
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, CheckCheck } from 'lucide-react';
import type { AppLayoutContext } from '@/app/AppLayout';
import { useChatStore } from '@/features/chat/model/chat.store';
import { uploadChatAttachment, type ChatContact, type ChatMessage } from '@/features/chat/api/chat.api';
import { quotaMessage } from '@/features/storage/storage.store';
import { r2UploadErrorMessage } from '@/shared/lib/upload-errors';

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

const svg = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const SendIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...svg}>
    <path d="m4 12 16-8-6 16-3-7-7-1Z" />
  </svg>
);
const AttachIcon = () => (
  <svg viewBox="0 0 24 24" width="19" height="19" {...svg}>
    <path d="M17 7.5 8.5 16a3 3 0 0 1-4.2-4.2L13 3a2 2 0 0 1 2.8 2.8L7.5 14a1 1 0 0 1-1.4-1.4L14 5" />
  </svg>
);
const BackIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" {...svg}>
    <path d="m15 5-7 7 7 7" />
  </svg>
);
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" {...svg}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

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

function MessageBubble({ message, mine }: { message: ChatMessage; mine: boolean }) {
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
          mine ? 'rounded-br-md bg-brand-800 text-white' : 'rounded-bl-md bg-[#F3F6F0] text-brand-900'
        }`}
      >
        {message.attachmentUrl && message.attachmentType === 'IMAGE' && (
          <img src={message.attachmentUrl} alt="" className="mb-1.5 max-h-64 w-full rounded-xl object-cover" />
        )}
        {message.attachmentUrl && message.attachmentType === 'VIDEO' && (
          <video src={message.attachmentUrl} controls className="mb-1.5 max-h-64 w-full rounded-xl" />
        )}
        {message.attachmentUrl && message.attachmentType === 'DOCUMENT' && (
          <a
            href={message.attachmentUrl}
            target="_blank"
            rel="noreferrer"
            className={`mb-1.5 block truncate underline ${mine ? 'text-white' : 'text-brand-700'}`}
          >
            {message.attachmentUrl.split('/').pop()}
          </a>
        )}
        {message.text && <p className="whitespace-pre-wrap break-words">{message.text}</p>}
        <span className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${mine ? 'text-brand-200' : 'text-neutral-400'}`}>
          {fmtBubbleTime(message.createdAt)}
          {mine && (message.readAt ? <CheckCheck size={14} /> : <Check size={14} />)}
        </span>
      </div>
    </div>
  );
}

function Thread({ contact, onBack }: { contact: ChatContact; onBack: () => void }) {
  const { t } = useTranslation();
  const messages = useChatStore((s) => s.messagesByUserId[contact.userId] ?? []);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const doSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError(null);
    setText('');
    try {
      await sendMessage(contact.userId, { text: trimmed });
    } catch {
      setError(t('messages.sendFailed'));
      setText(trimmed);
    } finally {
      setSending(false);
    }
  };

  const onAttach = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const { key, contentType, sizeBytes } = await uploadChatAttachment(file);
      await sendMessage(contact.userId, { attachmentUrl: key, attachmentContentType: contentType, attachmentSizeBytes: sizeBytes });
    } catch (err) {
      const quota = quotaMessage(err);
      setError(quota ?? r2UploadErrorMessage(err) ?? t('messages.sendFailed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2.5 border-b border-brand-100 bg-white px-3 py-2.5">
        <button type="button" onClick={onBack} className="rounded-full p-1.5 text-brand-700 hover:bg-brand-50 lg:hidden">
          <BackIcon />
        </button>
        <Avatar name={contact.fullName} gender={contact.gender} photoUrl={contact.photoUrl} size={36} />
        <span className="truncate text-sm font-semibold text-brand-900">{contact.fullName}</span>
      </div>

      <div className="no-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto bg-brand-50/50 px-3 py-3">
        {messages.length === 0 ? (
          <p className="mt-6 text-center text-sm text-neutral-400">{t('messages.emptyThread')}</p>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} mine={m.senderId !== contact.userId} />)
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="shrink-0 px-3 py-1 text-xs text-red-500">{error}</p>}

      <div className="flex shrink-0 items-center gap-2 border-t border-brand-100 bg-white p-2.5">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,application/pdf"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onAttach(f);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="shrink-0 rounded-full p-2 text-brand-600 transition-colors hover:bg-brand-50 disabled:opacity-50"
          aria-label={t('messages.attach')}
        >
          {uploading ? (
            <span className="block h-[19px] w-[19px] animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />
          ) : (
            <AttachIcon />
          )}
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
          placeholder={t('messages.sendPlaceholder')}
          className="min-w-0 flex-1 rounded-full border border-transparent bg-brand-50 px-4 py-2.5 text-sm outline-none focus:border-brand-300 focus:bg-white"
        />
        <button
          type="button"
          onClick={() => void doSend()}
          disabled={!text.trim() || sending}
          className="shrink-0 rounded-full bg-brand-800 p-2.5 text-white transition-colors hover:bg-brand-900 disabled:opacity-40"
          aria-label={t('messages.send')}
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}

export function MessagesPage() {
  const { t } = useTranslation();
  const { topBarActionsEl } = useOutletContext<AppLayoutContext>();
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
              <SearchIcon />
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
