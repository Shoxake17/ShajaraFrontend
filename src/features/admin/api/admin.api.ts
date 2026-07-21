// features/admin/api/admin.api.ts
import { http } from '@/shared/api/http';
import type { Plan } from '@/features/billing/api/billing.api';
import type { BoardAccess, FamilyEdgeDto, FamilyMemberDto } from '@/features/tree/types';

export interface AdminViewerSummary {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
}

export interface AdminUserSummary {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  plan: Plan;
  planExpiresAt: string | null;
  extraSlots: number;
  createdAt: string;
  memberCount: number;
  storageUsedBytes: number;
  storageLimitBytes: number;
  /** Ulashish kodi bilan shu foydalanuvchining daraxtiga qo'shilganlar —
   * alohida qator EMAS, shu yerda ICHKI ro'yxat sifatida */
  viewers: AdminViewerSummary[];
}

export interface AdminUsersResponse {
  total: number;
  page: number;
  limit: number;
  users: AdminUserSummary[];
}

export interface AdminStats {
  totalUsers: number;
  totalFamilyMembers: number;
  payingUsersCount: number;
  totalRevenueUsd: number;
}

export interface AdminUserBoard {
  owner: { id: string; fullName: string; email: string | null; phone: string | null };
  members: FamilyMemberDto[];
  edges: FamilyEdgeDto[];
  /** Faqat getViewerBoard javobida — o'sha VIEWER'ning ANIQ huquqi/ankeri
   * (relation label/filtrlar shu asosda hisoblanadi, xuddi real VIEWER
   * kirganidagi kabi) */
  access?: BoardAccess;
}

export const adminApi = {
  getStats: () => http.get<AdminStats>('/admin/stats').then((r) => r.data),

  listUsers: (params: { search?: string; page?: number; limit?: number }) =>
    http.get<AdminUsersResponse>('/admin/users', { params }).then((r) => r.data),

  /** Daraxt EGASI (root) — to'liq, maxfiylik cheklovlarisiz ko'rinish */
  getUserBoard: (userId: string) =>
    http.get<AdminUserBoard>(`/admin/users/${userId}/board`).then((r) => r.data),

  /** Ulashish kodi bilan qo'shilgan VIEWER — o'sha odam REAL ko'radigan
   * daraxtning aynan o'zi (maxfiylik filtrlari, o'ziga nisbatan yorliqlar) */
  getViewerBoard: (viewerId: string) =>
    http.get<AdminUserBoard>(`/admin/viewers/${viewerId}/board`).then((r) => r.data),

  setPlan: (userId: string, plan: Plan) =>
    http
      .patch<{ id: string; plan: Plan; planExpiresAt: string | null; extraSlots: number }>(
        `/admin/users/${userId}/plan`,
        { plan },
      )
      .then((r) => r.data),

  /** delta: +1 = 100 a'zo qo'shish, -1 = 100 a'zo ayirish */
  adjustSlots: (userId: string, delta: number) =>
    http
      .patch<{ id: string; plan: Plan; planExpiresAt: string | null; extraSlots: number }>(
        `/admin/users/${userId}/slots`,
        { delta },
      )
      .then((r) => r.data),
};
