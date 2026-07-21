// features/admin/api/admin.api.ts
import { http } from '@/shared/api/http';
import type { Plan } from '@/features/billing/api/billing.api';
import type { FamilyEdgeDto, FamilyMemberDto } from '@/features/tree/types';

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
}

export interface AdminUsersResponse {
  total: number;
  page: number;
  limit: number;
  users: AdminUserSummary[];
}

export interface AdminUserBoard {
  owner: { id: string; fullName: string; email: string | null; phone: string | null };
  members: FamilyMemberDto[];
  edges: FamilyEdgeDto[];
}

export const adminApi = {
  listUsers: (params: { search?: string; page?: number; limit?: number }) =>
    http.get<AdminUsersResponse>('/admin/users', { params }).then((r) => r.data),

  getUserBoard: (userId: string) =>
    http.get<AdminUserBoard>(`/admin/users/${userId}/board`).then((r) => r.data),

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
