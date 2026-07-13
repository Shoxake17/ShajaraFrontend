// features/billing/model/billing.store.ts
import { create } from 'zustand';
import i18n from '@/i18n';
import { billingApi, type BillingStatus } from '../api/billing.api';

interface BillingState {
  status: BillingStatus | null;
  loaded: boolean;
  error: string | null;
  loadStatus: () => Promise<void>;
  setStatus: (status: BillingStatus) => void;
  reset: () => void;
}

export const useBillingStore = create<BillingState>((set) => ({
  status: null,
  loaded: false,
  error: null,
  loadStatus: async () => {
    try {
      const status = await billingApi.getStatus();
      set({ status, loaded: true, error: null });
    } catch {
      set({ error: i18n.t('billing.loadError') });
    }
  },
  setStatus: (status) => set({ status, loaded: true, error: null }),
  reset: () => set({ status: null, loaded: false, error: null }),
}));
