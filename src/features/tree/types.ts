// features/tree/types.ts
import type { Gender, RelationKey } from './model/relations';

/** Backend'dan keladigan oila a'zosi (PostgreSQL yozuvi) */
export interface FamilyMemberDto {
  id: string;
  fullName: string;
  gender: Gender;
  relation: string;
  birthYear: number | null;
  deathYear: number | null;
  photoUrl: string | null;
  photoSizeBytes: number | null;
  isRoot: boolean;
  /** true — bu ROOT karta "Profil ko'rinishi" (Sozlamalar → Maxfiylik)
   * sozlamasiga ko'ra SHU foydalanuvchidan (VIEWER) yashirilgan — ism/rasm/
   * yillar backend'da ALLAQACHON bo'sh yuborilgan, faqat ekranda qulf
   * ko'rinishini ko'rsatish uchun. */
  profileHidden?: boolean;
  /** Nechanchi turmush o'rtog'i (qo'lda: 2, 3, ...). null — avtomatik. */
  spouseOrder: number | null;
  /** 12 xonalik ulashish kodi (bu karta orqali daraxtga taklif qilish) */
  shareCode: string | null;
  /** Kim qo'shgan (viewer faqat o'zinikini tahrirlaydi) */
  createdById: string | null;
  /** Owner qo'lda joylashtirgan (qulflangan) karta — "Tartiblash" uni surmaydi */
  pinned?: boolean;
  posX: number;
  posY: number;
  /** "Oila a'zolarim" ko'rinishidagi joylashuv (null — avtomatik teriladi) */
  famPosX?: number | null;
  famPosY?: number | null;
}

/** Foydalanuvchining faol daraxtga huquqi */
export interface BoardAccess {
  role: 'OWNER' | 'VIEWER';
  anchorMemberId: string | null;
  treeOwnerId: string;
  userId: string;
}

export interface FamilyEdgeDto {
  id: string;
  sourceId: string;
  targetId: string;
  relation: string;
  dashed: boolean;
}

export interface BoardResponse {
  members: FamilyMemberDto[];
  edges: FamilyEdgeDto[];
  /** Backend doim yuboradi; test mock'larida bo'lmasligi mumkin */
  access?: BoardAccess;
}

/** Yangi a'zo qo'shish so'rovi */
export interface CreateMemberPayload {
  fullName: string;
  relation: RelationKey;
  gender: Gender;
  birthYear?: number;
  deathYear?: number;
  photoUrl?: string;
  photoSizeBytes?: number;
  /** Nechanchi turmush o'rtog'i (qo'lda: 2, 3, ...). */
  spouseOrder?: number;
  anchorId: string;
  posX: number;
  posY: number;
}
