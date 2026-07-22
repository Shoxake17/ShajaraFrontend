// features/billing/api/billing.api.ts
import { http } from '@/shared/api/http';

export type Plan = 'FREE' | 'PRO' | 'PREMIUM';

export interface PlanDef {
  id: Plan;
  priceUsd: number;
  storageLimitBytes: number;
  maxMembers: number;
  mediaFullQuality: boolean;
  productId: string | null;
}

export interface SlotProduct {
  productId: string;
  priceUsd: number;
  membersPerSlot: number;
}

export interface BillingStatus {
  plan: Plan;
  planExpiresAt: string | null;
  extraSlots: number;
  storageUsedBytes: number;
  storageLimitBytes: number;
  memberCount: number;
  maxMembers: number;
  plans: PlanDef[];
  slotProduct: SlotProduct;
}

export const billingApi = {
  getStatus: () => http.get<BillingStatus>('/billing/status').then((r) => r.data),

  /** Nativ ilovada xarid qilingandan keyin backend'ga yuboriladi — backend
   * Google Play'dan HAQIQIY holatni qayta tekshiradi (klientga ishonilmaydi) */
  verifyPurchase: (dto: { productId: string; purchaseToken: string }) =>
    http.post<BillingStatus>('/billing/verify-purchase', dto).then((r) => r.data),
};
