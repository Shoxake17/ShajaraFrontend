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
  /** true — "Profil ko'rinishi" sozlamasiga ko'ra SHU VIEWER'dan bu odamning
   * PROFIL PANELI (Tahrirlash/O'chirish) cheklangan — ism/rasm/yillar doskadagi
   * kartada baribir to'liq keladi, faqat panel yashirin bo'ladi. */
  profileHidden?: boolean;
  /** true — "Kimlar sizni topa olishi mumkin" sozlamasiga ko'ra bu odam
   * qidiruv (MemberSearch) natijalaridan chiqarib tashlanishi kerak. */
  searchHidden?: boolean;
  /** true — "Kimlar sizni topa olishi mumkin" = PRIVATE bo'lgani uchun
   * doskadagi KARTANING O'ZI ham bloklangan — backend ism/rasm/yillarni
   * BO'SH yuborgan (fullName=''), UI generic "berkitilgan" karta chizadi. */
  cardHidden?: boolean;
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
