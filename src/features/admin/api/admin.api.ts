// features/admin/api/admin.api.ts
import { http } from '@/shared/api/http';
import type { Plan } from '@/features/billing/api/billing.api';
import type { BoardAccess, FamilyEdgeDto, FamilyMemberDto } from '@/features/tree/types';

// VIEWER ham oddiy User — o'ziga tegishli tarif/qo'shimcha slot/storage bor
// (boshqa birovning daraxtiga kirish huquqidan MUSTAQIL), shu bois maydonlari
// AdminUserSummary bilan bir xil (faqat ICHKI `viewers`ga ega bo'lolmaydi).
export interface AdminViewerSummary {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  plan: Plan;
  planExpiresAt: string | null;
  extraSlots: number;
  memberCount: number;
  storageUsedBytes: number;
  storageLimitBytes: number;
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

/** Bitta tarif guruhi bo'yicha (FREE/PRO/PREMIUM) yig'indi statistika */
export interface AdminPlanStat {
  plan: Plan;
  usersCount: number;
  storageUsedBytes: number;
  storageLimitBytes: number;
}

export interface AdminStats {
  totalUsers: number;
  totalFamilyMembers: number;
  payingUsersCount: number;
  totalRevenueUsd: number;
  /** Hozir PRO yoki PREMIUM tarifda turgan foydalanuvchilar soni (User.plan
   * bo'yicha — haqiqiy xarid tarixidan MUSTAQIL, admin qo'lda bergan
   * tariflarni ham hisobga oladi) */
  paidPlanUsersCount: number;
  /** Tarif bo'yicha taqsimot — FREE bitta guruhda, PRO/PREMIUM har biri
   * ALOHIDA guruhda (storage limiti tarifga qat'iy bog'liq) */
  planStats: AdminPlanStat[];
  totalStorageUsedBytes: number;
  totalStorageLimitBytes: number;
}

/** "Yordam Markazi"/"Xato haqida xabar berish" (Settings) orqali kelgan
 * qo'llab-quvvatlash so'rovi — oila daraxtiga bog'liq EMAS. */
export interface SupportConversationSummary {
  userId: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
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

  /** "Yordam Markazi"/"Xato haqida xabar berish" orqali kelgan barcha
   * qo'llab-quvvatlash suhbatlari (oila daraxtiga bog'liq EMAS). */
  listSupportConversations: () =>
    http.get<SupportConversationSummary[]>('/admin/support/conversations').then((r) => r.data),
};
