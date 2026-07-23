// features/settings/components/ReportBugDialog.tsx
// "Xato haqida xabar berish" (Sozlamalar → Yordam) — tavsif + ixtiyoriy
// rasm/fayl biriktirish, yuborilgach adminning "Qo'llab-quvvatlash"
// qutisiga (MiniChatThread bilan bir xil kanal — useChatStore.sendMessage)
// SHU FOYDALANUVCHI HISOBIDAN oddiy xabar sifatida tushadi.
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Paperclip, X } from 'lucide-react';
import { useChatStore } from '@/features/chat/model/chat.store';
import { chatApi, uploadChatAttachment } from '@/features/chat/api/chat.api';
import { quotaMessage } from '@/features/storage/storage.store';
import { r2UploadErrorMessage } from '@/shared/lib/upload-errors';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,application/pdf';

export function ReportBugDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const sendMessage = useChatStore((s) => s.sendMessage);

  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setText('');
      setFile(null);
      setUploadPercent(null);
      setError(null);
      setSent(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    setError(null);
    try {
      const { adminId } = await chatApi.getSupportAdminId();
      if (!adminId) throw new Error('support_unavailable');

      let attachment: { attachmentUrl: string; attachmentContentType: string; attachmentSizeBytes: number } | null =
        null;
      if (file) {
        setUploadPercent(0);
        const uploaded = await uploadChatAttachment(file, setUploadPercent);
        attachment = {
          attachmentUrl: uploaded.key,
          attachmentContentType: uploaded.contentType,
          attachmentSizeBytes: uploaded.sizeBytes,
        };
      }
      await sendMessage(adminId, { text: `🐞 ${trimmed}`, ...attachment });
      setSent(true);
    } catch (e) {
      setError(quotaMessage(e) ?? r2UploadErrorMessage(e) ?? "Yuborib bo'lmadi. Qaytadan urinib ko'ring");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('settings.help.reportBug')}
        className="w-full max-w-sm rounded-[20px] bg-white p-5 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-serif text-lg font-semibold text-brand-900">{t('settings.help.reportBug')}</h3>
        <p className="mt-1 text-sm text-neutral-500">{t('settings.help.reportBugDesc')}</p>

        {sent ? (
          <div className="mt-5 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700">
            {t('settings.help.reportBugSent')}
          </div>
        ) : (
          <>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('settings.help.reportBugPlaceholder')}
              rows={4}
              disabled={sending}
              className="mt-4 w-full resize-none rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
            />

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-neutral-100 px-3 py-1.5 text-xs text-neutral-600">
                <Paperclip className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 truncate">{file.name}</span>
                {uploadPercent !== null ? (
                  <span>{uploadPercent}%</span>
                ) : (
                  <button type="button" onClick={() => setFile(null)} aria-label="Bekor qilish">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
                className="mt-2 flex items-center gap-1.5 text-sm text-brand-700 hover:underline disabled:opacity-50"
              >
                <Paperclip className="h-4 w-4" />
                {t('settings.help.reportBugAttach')}
              </button>
            )}

            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
              >
                {t('common.close')}
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={sending || !text.trim()}
                className="flex-1 rounded-xl bg-brand-700 py-2.5 text-sm font-medium text-white disabled:opacity-40"
              >
                {t('settings.help.reportBugSend')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
