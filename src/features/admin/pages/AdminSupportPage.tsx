// features/admin/pages/AdminSupportPage.tsx
// Admin panel — "Qo'llab-quvvatlash" qutisi: Sozlamalar → "Yordam Markazi"/
// "Xato haqida xabar berish" orqali kelgan BARCHA foydalanuvchi
// suhbatlari (oila daraxtiga bog'liq EMAS — shu bois MessagesPage.tsx
// emas, alohida sahifa + qayta ishlatiladigan MiniChatThread).
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { AppLayoutContext } from '@/app/AppLayout';
import { adminApi, type SupportConversationSummary } from '@/features/admin/api/admin.api';
import { useChatStore } from '@/features/chat/model/chat.store';
import { MiniChatThread } from '@/features/chat/components/MiniChatThread';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function fmtWhen(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' });
}

export function AdminSupportPage() {
  const { topBarActionsEl } = useOutletContext<AppLayoutContext>();
  const { t } = useTranslation();
  const markRead = useChatStore((s) => s.markRead);

  const [conversations, setConversations] = useState<SupportConversationSummary[] | null>(null);
  const [selected, setSelected] = useState<SupportConversationSummary | null>(null);

  const reload = () => {
    void adminApi.listSupportConversations().then(setConversations);
  };

  useEffect(() => {
    reload();
  }, []);

  const select = (c: SupportConversationSummary) => {
    setSelected(c);
    if (c.unreadCount > 0) {
      markRead(c.userId);
      setConversations((prev) => prev?.map((x) => (x.userId === c.userId ? { ...x, unreadCount: 0 } : x)) ?? prev);
    }
  };

  return (
    <div className="flex h-full bg-brand-50">
      {topBarActionsEl &&
        createPortal(
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-brand-900">{t('admin.support.title')}</p>
          </div>,
          topBarActionsEl,
        )}

      {/* Ro'yxat — mobilda suhbat tanlanmagan bo'lsa ko'rinadi */}
      <div className={`w-full shrink-0 overflow-y-auto border-r border-brand-100 bg-white lg:flex lg:w-80 ${selected ? 'hidden' : 'flex'} flex-col`}>
        {conversations === null && (
          <div className="flex flex-1 items-center justify-center">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />
          </div>
        )}
        {conversations?.length === 0 && (
          <p className="p-6 text-center text-sm text-neutral-400">{t('admin.support.empty')}</p>
        )}
        {conversations?.map((c) => (
          <button
            key={c.userId}
            type="button"
            onClick={() => select(c)}
            className={`flex items-center gap-3 border-b border-neutral-100 px-4 py-3 text-left hover:bg-brand-50 ${
              selected?.userId === c.userId ? 'bg-brand-50' : ''
            }`}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {initials(c.fullName)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate font-medium text-brand-900">{c.fullName}</span>
                <span className="shrink-0 text-[11px] text-neutral-400">{fmtWhen(c.lastMessageAt)}</span>
              </span>
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-xs text-neutral-500">
                  {c.lastMessage ?? c.phone ?? c.email ?? ''}
                </span>
                {c.unreadCount > 0 && (
                  <span className="shrink-0 rounded-full bg-brand-700 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {c.unreadCount}
                  </span>
                )}
              </span>
            </span>
          </button>
        ))}
      </div>

      {/* Suhbat — mobilda faqat tanlangan bo'lsa ko'rinadi */}
      <div className={`min-w-0 flex-1 flex-col bg-brand-50 ${selected ? 'flex' : 'hidden lg:flex'}`}>
        {selected ? (
          <>
            <div className="flex items-center gap-3 border-b border-brand-100 bg-white px-4 py-3">
              <button type="button" onClick={() => setSelected(null)} className="text-brand-700 lg:hidden">
                ←
              </button>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                {initials(selected.fullName)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-brand-900">{selected.fullName}</p>
                <p className="truncate text-xs text-neutral-500">{selected.phone ?? selected.email ?? ''}</p>
              </div>
            </div>
            <div className="min-h-0 flex-1 bg-white">
              <MiniChatThread
                userId={selected.userId}
                name={selected.fullName}
                placeholder={t('settings.help.helpCenterPlaceholder')}
                emptyLabel={t('settings.help.helpCenterEmpty')}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-neutral-400">
            {t('admin.support.selectHint')}
          </div>
        )}
      </div>
    </div>
  );
}
