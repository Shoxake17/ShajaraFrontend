// features/admin/pages/AdminUsersPage.tsx
// Admin panel Dashboard — umumiy statistika + barcha foydalanuvchilar
// ro'yxati: a'zolar soni, xotira sarfi, tarif, qo'shimcha slot (har
// birligi 100 a'zo) va daraxtni to'liq ko'rish. Ulashish kodi bilan
// qo'shilgan VIEWER'lar ALOHIDA qator EMAS — egasining qatori ichida
// (kengaytiriladigan ro'yxat sifatida) ko'rinadi.
// Kirish FAQAT ADMIN_EMAIL uchun — AdminRoute (frontend, UI yo'naltirish)
// + AdminGuard (backend, haqiqiy tekshiruv, har so'rovda bazadan).
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { AppLayoutContext } from '@/app/AppLayout';
import { adminApi, type AdminStats, type AdminUserSummary } from '@/features/admin/api/admin.api';
import type { Plan } from '@/features/billing/api/billing.api';
import { formatBytes } from '@/features/storage/storage.store';
import { SelectPicker } from '@/shared/ui/SelectPicker';

const PLAN_OPTIONS: { value: Plan; label: string }[] = [
  { value: 'FREE', label: 'FREE' },
  { value: 'PRO', label: 'PRO' },
  { value: 'PREMIUM', label: 'PREMIUM' },
];

const PAGE_SIZE = 50;

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 font-serif text-2xl font-semibold text-brand-900">{value}</p>
    </div>
  );
}

export function AdminUsersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { topBarActionsEl } = useOutletContext<AppLayoutContext>();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    adminApi.getStats().then(setStats).catch(() => undefined);
  }, []);

  const load = async (p: number, q: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.listUsers({ search: q || undefined, page: p, limit: PAGE_SIZE });
      setUsers(res.users);
      setTotal(res.total);
      setPage(res.page);
    } catch {
      setError(t('admin.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(1, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void load(1, search);
  };

  const onPlanChange = async (userId: string, plan: Plan) => {
    setBusyUserId(userId);
    try {
      const updated = await adminApi.setPlan(userId, plan);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, plan: updated.plan, planExpiresAt: updated.planExpiresAt } : u)));
    } catch {
      setError(t('admin.actionFailed'));
    } finally {
      setBusyUserId(null);
    }
  };

  const onSlotDelta = async (userId: string, delta: number) => {
    setBusyUserId(userId);
    try {
      const updated = await adminApi.adjustSlots(userId, delta);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, extraSlots: updated.extraSlots } : u)));
    } catch {
      setError(t('admin.actionFailed'));
    } finally {
      setBusyUserId(null);
    }
  };

  const toggleExpanded = (userId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const rangeLabel = useMemo(() => {
    if (total === 0) return '';
    const from = (page - 1) * PAGE_SIZE + 1;
    const to = Math.min(page * PAGE_SIZE, total);
    return `${from}–${to} / ${total}`;
  }, [page, total]);

  return (
    <div className="h-full overflow-y-auto bg-brand-50">
      {topBarActionsEl &&
        createPortal(
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-brand-900">{t('admin.title')}</p>
          </div>,
          topBarActionsEl,
        )}

      <div className="px-3 pb-6 pt-3 sm:px-4">
        {/* Umumiy statistika */}
        {stats && (
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label={t('admin.stats.totalUsers')} value={String(stats.totalUsers)} />
            <StatCard label={t('admin.stats.totalFamilyMembers')} value={String(stats.totalFamilyMembers)} />
            <StatCard label={t('admin.stats.payingUsers')} value={String(stats.payingUsersCount)} />
            <StatCard label={t('admin.stats.totalRevenue')} value={`$${stats.totalRevenueUsd.toFixed(2)}`} />
          </div>
        )}

        <form onSubmit={onSearchSubmit} className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin.searchPlaceholder')}
            className="w-full max-w-sm rounded-field border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-brand-900 outline-none transition-colors focus:border-brand-600"
          />
          <button
            type="submit"
            className="shrink-0 rounded-field bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
          >
            {t('common.search')}
          </button>
        </form>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        {loading ? (
          <div className="mt-8 flex justify-center">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />
          </div>
        ) : users.length === 0 ? (
          <p className="mt-8 text-center text-sm text-neutral-500">{t('admin.noUsers')}</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-brand-100 bg-white">
            <div className="no-scrollbar overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="border-b border-brand-100 text-xs uppercase tracking-wide text-neutral-500">
                    <th className="px-4 py-3 font-medium">{t('admin.columns.user')}</th>
                    <th className="px-4 py-3 font-medium">{t('admin.columns.members')}</th>
                    <th className="px-4 py-3 font-medium">{t('admin.columns.storage')}</th>
                    <th className="px-4 py-3 font-medium">{t('admin.columns.plan')}</th>
                    <th className="px-4 py-3 font-medium">{t('admin.columns.slots')}</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const hasViewers = u.viewers.length > 0;
                    const isOpen = expanded.has(u.id);
                    const storageRemaining = Math.max(0, u.storageLimitBytes - u.storageUsedBytes);
                    return (
                      <>
                        <tr key={u.id} className="border-b border-brand-50 last:border-0">
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => hasViewers && toggleExpanded(u.id)}
                              className={`flex items-center gap-1.5 text-left ${hasViewers ? '' : 'cursor-default'}`}
                            >
                              {hasViewers ? <ChevronIcon open={isOpen} /> : <span className="w-4" />}
                              <span>
                                <p className="font-medium text-brand-900">{u.fullName}</p>
                                <p className="text-xs text-neutral-500">{u.email ?? u.phone ?? '—'}</p>
                              </span>
                            </button>
                          </td>
                          <td className="px-4 py-3 text-brand-900">{u.memberCount}</td>
                          <td className="px-4 py-3 text-xs text-brand-700">
                            <p>{formatBytes(u.storageUsedBytes)} / {formatBytes(u.storageLimitBytes)}</p>
                            <p className="text-neutral-500">{t('admin.storageRemaining', { size: formatBytes(storageRemaining) })}</p>
                          </td>
                          <td className="px-4 py-3">
                            <SelectPicker
                              value={u.plan}
                              options={PLAN_OPTIONS}
                              onChange={(v) => void onPlanChange(u.id, v as Plan)}
                              label={u.plan}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={busyUserId === u.id || u.extraSlots <= 0}
                                onClick={() => void onSlotDelta(u.id, -1)}
                                aria-label={t('admin.removeSlot')}
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 text-brand-700 transition-colors hover:bg-brand-50 disabled:opacity-40"
                              >
                                −
                              </button>
                              <span className="w-10 text-center font-medium text-brand-900">{u.extraSlots}</span>
                              <button
                                type="button"
                                disabled={busyUserId === u.id}
                                onClick={() => void onSlotDelta(u.id, 1)}
                                aria-label={t('admin.addSlot')}
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 text-brand-700 transition-colors hover:bg-brand-50 disabled:opacity-40"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/users/${u.id}`)}
                              className="rounded-field border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-800 transition-colors hover:bg-brand-100"
                            >
                              {t('admin.viewTree')}
                            </button>
                          </td>
                        </tr>
                        {isOpen &&
                          u.viewers.map((v) => (
                            <tr key={v.id} className="border-b border-brand-50 bg-brand-50/40 last:border-0">
                              <td className="py-2.5 pl-11 pr-4">
                                <p className="text-sm font-medium text-brand-800">{v.fullName}</p>
                                <p className="text-xs text-neutral-500">
                                  {v.email ?? v.phone ?? '—'} · {t('admin.viewerBadge')}
                                </p>
                              </td>
                              <td className="px-4 py-2.5" colSpan={3} />
                              <td className="px-4 py-2.5" />
                              <td className="px-4 py-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => navigate(`/admin/viewers/${v.id}`)}
                                  className="rounded-field border border-brand-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-800 transition-colors hover:bg-brand-100"
                                >
                                  {t('admin.viewTree')}
                                </button>
                              </td>
                            </tr>
                          ))}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-brand-100 px-4 py-3 text-sm">
                <span className="text-neutral-500">{rangeLabel}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => void load(page - 1, search)}
                    className="rounded-field border border-neutral-200 px-3 py-1.5 disabled:opacity-40"
                  >
                    {t('common.back')}
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => void load(page + 1, search)}
                    className="rounded-field border border-neutral-200 px-3 py-1.5 disabled:opacity-40"
                  >
                    {t('common.next')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
