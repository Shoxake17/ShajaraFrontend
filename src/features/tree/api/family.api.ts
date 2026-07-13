// features/tree/api/family.api.ts
import { http } from '@/shared/api/http';
import type { RelationKey } from '@/features/tree/model/relations';
import type {
  BoardResponse,
  CreateMemberPayload,
  FamilyEdgeDto,
  FamilyMemberDto,
} from '@/features/tree/types';

export interface TreeSummary {
  treeOwnerId: string;
  role: 'OWNER' | 'VIEWER';
  isOwn: boolean;
  ownerName: string;
}

export const familyApi = {
  getBoard: () => http.get<BoardResponse>('/family').then((r) => r.data),

  /** Kirish mumkin bo'lgan daraxtlar (o'z + taklif qilingan) */
  listTrees: () => http.get<TreeSummary[]>('/family/trees').then((r) => r.data),

  /** Faol daraxtni almashtirish */
  setActiveTree: (treeOwnerId: string) =>
    http.patch<void>('/family/active-tree', { treeOwnerId }).then((r) => r.data),

  addMember: (payload: CreateMemberPayload) =>
    http
      .post<{ member: FamilyMemberDto; edge: FamilyEdgeDto }>('/family/members', payload)
      .then((r) => r.data),

  updateMember: (
    id: string,
    patch: Partial<
      Pick<
        FamilyMemberDto,
        | 'posX'
        | 'posY'
        | 'fullName'
        | 'gender'
        | 'birthYear'
        | 'deathYear'
        | 'photoUrl'
        | 'photoSizeBytes'
        | 'relation'
        | 'spouseOrder'
      >
    >,
  ) => http.patch<FamilyMemberDto>(`/family/members/${id}`, patch).then((r) => r.data),

  removeMember: (id: string) => http.delete<void>(`/family/members/${id}`).then((r) => r.data),

  /**
   * Pozitsiyalarni bitta so'rovda saqlash. pinned=true — karta qo'lda
   * joylashtirilgan deb QULFLANADI. view='family' — "Oila a'zolarim"
   * ko'rinishining ALOHIDA joylashuvi (asosiy doskaga tegmaydi).
   */
  updatePositions: (
    positions: { id: string; posX: number; posY: number; pinned?: boolean }[],
    view?: 'main' | 'family',
  ) =>
    http
      .patch<void>('/family/positions', { positions, ...(view ? { view } : {}) })
      .then((r) => r.data),

  /** Mavjud ikki a'zoni bog'lash (toId -> fromId'ga `relation`) */
  connect: (payload: { fromId: string; toId: string; relation: RelationKey }) =>
    http.post<void>('/family/connect', payload).then((r) => r.data),

  /** Cloudflare R2 uchun bir martalik yuklash havolasini olish */
  getUploadUrl: (contentType: string) =>
    http
      .post<{ uploadUrl: string; key: string }>('/family/upload-url', { contentType })
      .then((r) => r.data),
};

/**
 * Rasmni R2'ga TO'G'RIDAN-TO'G'RI yuklash (backend orqali o'tmaydi).
 * Qaytadi: R2 obyekt KALITI (ochiq URL EMAS — bucket endi yopiq; ko'rish
 * uchun backend har safar vaqtinchalik imzolangan havola beradi, faqat
 * shu daraxtga kirish huquqi borlarga) + fayl hajmi (storage kvotasi uchun).
 */
export async function uploadPhoto(file: File): Promise<{ url: string; size: number }> {
  const { uploadUrl, key } = await familyApi.getUploadUrl(file.type);
  let res: Response;
  try {
    res = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    });
  } catch (err) {
    // fetch() javob OLMASDAN rad etsa — CORS yoki tarmoq darajasidagi xato
    // (masalan R2 bucket'ning o'z CORS siyosati so'rov manbasiga ruxsat
    // bermayapti). HTTP status YO'Q — shu bois alohida turkum. Host nomini
    // ham qo'shamiz — CORS siyosati NOTO'G'RI bucket/domenga qo'yilgan
    // bo'lishi mumkinligini tekshirish uchun.
    const host = (() => {
      try {
        return new URL(uploadUrl).host;
      } catch {
        return '?';
      }
    })();
    throw new Error(`R2_NETWORK_ERROR: ${(err as Error).message} [${host}]`);
  }
  if (!res.ok) {
    throw new Error(`R2_HTTP_ERROR: ${res.status} ${res.statusText}`.trim());
  }
  return { url: key, size: file.size };
}
