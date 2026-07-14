// features/billing/components/PricingModal.tsx
// Tarif rejalari oynasi — desktop.plan.png / mobile.plan.png dizayniga mos:
// mobilda pastdan chiquvchi varaq, sm:dan boshlab markazlashgan dialog
// (MediaUploadDialog/TwoFactorSetupDialog bilan bir xil naqsh).
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { useBillingStore } from '../model/billing.store';
import { billingApi, type Plan, type PlanDef } from '../api/billing.api';
import { purchasePlan, purchaseSlot } from '../lib/native-billing';
import { formatBytes } from '@/features/storage/storage.store';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';

interface Props {
  open: boolean;
  onClose: () => void;
}

const PLAN_LABEL_KEY: Record<Plan, string> = {
  FREE: 'billing.plan.free',
  PRO: 'billing.plan.pro',
  PREMIUM: 'billing.plan.premium',
};

export function PricingModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  const { status, loaded, error, loadStatus, setStatus } = useBillingStore();
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [tab, setTab] = useState<'storage' | 'slot'>('storage');
  const [slotQty, setSlotQty] = useState(1);
  const [slotProgress, setSlotProgress] = useState<{ done: number; total: number } | null>(null);
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (open) void loadStatus();
  }, [open, loadStatus]);

  if (!open) return null;

  const buy = async (productId: string) => {
    if (!isNative) {
      setActionError(t('billing.webOnlyView'));
      return;
    }
    setActionError(null);
    setBusyProductId(productId);
    try {
      const result = await purchasePlan(productId);
      const newStatus = await billingApi.verifyPurchase({
        productId: result.productId,
        purchaseToken: result.purchaseToken,
      });
      setStatus(newStatus);
    } catch (e) {
      const err = e as { message?: string; code?: string };
      if (err.code === 'USER_CANCELED') return;
      setActionError(err.message ?? t('billing.purchaseFailed'));
    } finally {
      setBusyProductId(null);
    }
  };

  /** Play Billing bir so'rovda BITTA birlik sotadi — N ta slot ketma-ket
   * xarid qilinadi, har biri backend'da alohida tekshiriladi/beriladi.
   * Foydalanuvchi bekor qilsa — shu paytgacha muvaffaqiyatli bo'lganlari
   * saqlanib qoladi (backend idempotent, har biri alohida grant qilingan). */
  const buySlots = async () => {
    if (!isNative) {
      setActionError(t('billing.webOnlyView'));
      return;
    }
    if (!status) return;
    setActionError(null);
    setSlotProgress({ done: 0, total: slotQty });
    for (let i = 0; i < slotQty; i++) {
      try {
        const result = await purchaseSlot(status.slotProduct.productId);
        const newStatus = await billingApi.verifyPurchase({
          productId: result.productId,
          purchaseToken: result.purchaseToken,
        });
        setStatus(newStatus);
        setSlotProgress({ done: i + 1, total: slotQty });
      } catch (e) {
        const err = e as { message?: string; code?: string };
        if (err.code !== 'USER_CANCELED') setActionError(err.message ?? t('billing.purchaseFailed'));
        break;
      }
    }
    setSlotProgress(null);
    setSlotQty(1);
  };

  const usagePercent = status
    ? Math.min(100, Math.round((status.storageUsedBytes / status.storageLimitBytes) * 100))
    : 0;
  const canBuy = !!status?.canPurchase && isNative;
  const canBuySlot = canBuy && status?.plan !== 'FREE';

  // Portal — document.body'ga to'g'ridan-to'g'ri chiqadi. Sidebar kabi
  // transform (translate-x) ishlatuvchi ajdodlar `position: fixed`ni o'zining
  // ichiga "qamab" qo'yadi (CSS spec: transform ajdod fixed uchun yangi
  // containing block yaratadi) — portalsiz modal butun ekranga EMAS, faqat
  // shu tor Sidebar ustuniga sig'ib qolardi.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-brand-950/40 px-3 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('billing.title')}
        className="max-h-[88vh] w-full overflow-y-auto rounded-t-[28px] bg-white p-5 shadow-card sm:max-w-2xl sm:rounded-[22px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-serif text-xl font-semibold text-brand-900">{t('billing.title')}</h2>
            {status && (
              <p className="mt-0.5 text-[13px] text-brand-500">
                {t('billing.currentPlan', { plan: t(PLAN_LABEL_KEY[status.plan]) })} ·{' '}
                {formatBytes(status.storageUsedBytes)} / {formatBytes(status.storageLimitBytes)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 transition-colors hover:bg-brand-100"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {status && (
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-200">
            <div
              className="h-full rounded-full bg-brand-600 transition-all"
              style={{ width: `${Math.max(usagePercent, 2)}%` }}
            />
          </div>
        )}

        {!loaded && !error && (
          <div className="flex justify-center py-10">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />
          </div>
        )}
        {error && (
          <div className="mt-4">
            <Alert>{error}</Alert>
          </div>
        )}
        {actionError && (
          <div className="mt-4">
            <Alert>{actionError}</Alert>
          </div>
        )}

        {status && (
          <>
            {/* Xotira/Slot toggle — ikkalasi ham shu BITTA Plan oynasi ICHIDA, tashqarida alohida tugma YO'Q */}
            <div className="mt-4 inline-flex w-full rounded-full border-2 border-brand-100 bg-brand-50/60 p-1">
              <button
                type="button"
                onClick={() => setTab('storage')}
                className={`flex-1 rounded-full py-2 text-[13px] font-semibold transition-colors ${
                  tab === 'storage' ? 'bg-white text-brand-900 shadow-sm' : 'text-brand-500'
                }`}
              >
                {t('billing.tabs.storage')}
              </button>
              <button
                type="button"
                onClick={() => setTab('slot')}
                className={`flex-1 rounded-full py-2 text-[13px] font-semibold transition-colors ${
                  tab === 'slot' ? 'bg-white text-brand-900 shadow-sm' : 'text-brand-500'
                }`}
              >
                {t('billing.tabs.slot')}
              </button>
            </div>

            {tab === 'storage' ? (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {status.plans.map((p) => (
                  <PlanCard
                    key={p.id}
                    plan={p}
                    isCurrent={p.id === status.plan}
                    canBuy={canBuy}
                    webOnly={!isNative}
                    busy={!!p.productId && busyProductId === p.productId}
                    onBuy={() => p.productId && buy(p.productId)}
                  />
                ))}
              </div>
            ) : status.plan === 'FREE' ? (
              <div className="mt-4 rounded-2xl border border-brand-100 bg-brand-50/60 p-5 text-center">
                <p className="text-sm font-medium text-brand-700">{t('billing.slot.freeBlocked')}</p>
                <button
                  type="button"
                  onClick={() => setTab('storage')}
                  className="mt-3 text-[13px] font-semibold text-brand-600"
                >
                  {t('billing.tabs.storage')} →
                </button>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-brand-100 bg-brand-50/60 p-5">
                <p className="text-center text-xs text-brand-500">
                  {t('billing.slot.desc', { extraSlots: status.extraSlots, maxMembers: status.maxMembers })}
                </p>
                <div className="mt-4 flex items-center justify-center gap-5">
                  <button
                    type="button"
                    onClick={() => setSlotQty((q) => Math.max(1, q - 1))}
                    disabled={slotQty <= 1 || !!slotProgress}
                    aria-label="-"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-brand-200 bg-white text-xl font-semibold text-brand-700 disabled:opacity-40"
                  >
                    −
                  </button>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-brand-900">+{slotQty * status.slotProduct.membersPerSlot}</p>
                    <p className="text-xs text-brand-500">{t('billing.feature.members')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSlotQty((q) => Math.min(20, q + 1))}
                    disabled={slotQty >= 20 || !!slotProgress}
                    aria-label="+"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-brand-200 bg-white text-xl font-semibold text-brand-700 disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
                <Button className="mt-4 !py-3 !text-sm" loading={!!slotProgress} disabled={!canBuySlot} onClick={buySlots}>
                  {slotProgress
                    ? `${slotProgress.done}/${slotProgress.total}…`
                    : isNative
                      ? `${t('billing.slot.buy')} — $${slotQty * status.slotProduct.priceUsd}`
                      : t('billing.buyInApp')}
                </Button>
              </div>
            )}

            {!status.canPurchase && <p className="mt-4 text-center text-xs text-brand-500">{t('billing.viewerReadOnly')}</p>}
            {status.canPurchase && !isNative && (
              <p className="mt-4 text-center text-xs text-brand-500">{t('billing.webOnlyView')}</p>
            )}
            <p className="mt-3 text-center text-[11px] text-brand-400">{t('billing.footerNote')}</p>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

interface PlanCardProps {
  plan: PlanDef;
  isCurrent: boolean;
  canBuy: boolean;
  webOnly: boolean;
  busy: boolean;
  onBuy: () => void;
}

function PlanCard({ plan, isCurrent, canBuy, webOnly, busy, onBuy }: PlanCardProps) {
  const { t } = useTranslation();
  const highlighted = plan.id === 'PRO';
  const premium = plan.id === 'PREMIUM';

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-4 ${
        highlighted
          ? 'border-brand-600 bg-brand-50/40'
          : premium
            ? 'border-amber-300 bg-amber-50/30'
            : 'border-neutral-200 bg-white'
      }`}
    >
      {highlighted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-700 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
          {t('billing.mostPopular')}
        </span>
      )}
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
        {t(PLAN_LABEL_KEY[plan.id])}
        {premium && ' +'}
      </p>
      <p className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-brand-900">${plan.priceUsd}</span>
        <span className="text-xs text-brand-500">/ {t('billing.perYear')}</span>
      </p>
      <ul className="mt-3 space-y-1.5 text-[13px] text-brand-700">
        <li>• {formatBytes(plan.storageLimitBytes)} {t('billing.feature.storage')}</li>
        <li>• {plan.maxMembers} {t('billing.feature.members')}</li>
        <li>• {t(plan.mediaFullQuality ? 'billing.feature.mediaFull' : 'billing.feature.mediaCompressed')}</li>
        <li className={plan.id === 'FREE' ? 'text-red-400' : ''}>
          • {plan.id === 'FREE' ? t('billing.feature.noSlots') : t('billing.feature.slotPrice')}
        </li>
      </ul>
      <div className="mt-4">
        {isCurrent ? (
          <button
            type="button"
            disabled
            className="w-full rounded-field bg-neutral-100 py-3 text-[13px] font-medium text-brand-400"
          >
            {t('billing.currentPlanBtn')}
          </button>
        ) : plan.id === 'FREE' ? (
          <div className="h-[46px]" />
        ) : (
          <Button className="!py-3 !text-sm" loading={busy} disabled={!canBuy} onClick={onBuy}>
            {webOnly ? t('billing.buyInApp') : t('billing.upgradeTo', { plan: t(PLAN_LABEL_KEY[plan.id]) })}
          </Button>
        )}
      </div>
    </div>
  );
}
