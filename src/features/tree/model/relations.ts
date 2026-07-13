// features/tree/model/relations.ts
// Qarindoshlik turlari (backend'dagi relations.ts bilan MOS bo'lishi shart).
// Model fayl — komponent EMAS, shu bois useTranslation() hook'i o'rniga
// i18next global instansini to'g'ridan-to'g'ri ishlatamiz (bu funksiyalar
// tree.store.ts/kinship.ts kabi oddiy modul darajasidagi kodda chaqiriladi).
// RELATION_GROUPS/relationLabel FUNKSIYA sifatida — har chaqirilganda JORIY
// tildan o'qiydi (til Sozlamalar'dan o'zgartirilsa, doskadagi yorliqlar ham
// yangilanishi uchun useMemo qaramliklariga `i18n.language` qo'shilgan
// joylarda avtomatik qayta hisoblanadi).
import i18n from '@/i18n';

export type RelationKey =
  | 'OTA'
  | 'ONA'
  | 'BOBO'
  | 'BUVI'
  | 'AKA'
  | 'UKA'
  | 'OPA'
  | 'SINGIL'
  | 'AMAKI'
  | 'AMMA'
  | 'TOGA'
  | 'XOLA'
  | 'POCHA'
  | 'KELINOYI'
  | 'KUYOV'
  | 'TURMUSH'
  | 'OGIL'
  | 'QIZ';

export type Gender = 'MALE' | 'FEMALE';

export interface RelationDef {
  value: RelationKey;
  label: string;
  gender: Gender;
  /** anker'ga nisbatan avlod darajasi: -1 ota-ona, -2 bobo-buvi, 0 teng, +1 farzand */
  gen: -2 | -1 | 0 | 1;
}

interface RelationDefStatic {
  value: RelationKey;
  gender: Gender;
  gen: -2 | -1 | 0 | 1;
}

const STATIC_GROUPS: { titleKey: string; items: RelationDefStatic[] }[] = [
  {
    titleKey: 'tree.relationGroups.parents',
    items: [
      { value: 'OTA', gender: 'MALE', gen: -1 },
      { value: 'ONA', gender: 'FEMALE', gen: -1 },
      { value: 'BOBO', gender: 'MALE', gen: -2 },
      { value: 'BUVI', gender: 'FEMALE', gen: -2 },
    ],
  },
  {
    titleKey: 'tree.relationGroups.siblings',
    items: [
      { value: 'AKA', gender: 'MALE', gen: 0 },
      { value: 'UKA', gender: 'MALE', gen: 0 },
      { value: 'OPA', gender: 'FEMALE', gen: 0 },
      { value: 'SINGIL', gender: 'FEMALE', gen: 0 },
    ],
  },
  {
    titleKey: 'tree.relationGroups.extended',
    items: [
      { value: 'AMAKI', gender: 'MALE', gen: -1 },
      { value: 'AMMA', gender: 'FEMALE', gen: -1 },
      { value: 'TOGA', gender: 'MALE', gen: -1 },
      { value: 'XOLA', gender: 'FEMALE', gen: -1 },
      { value: 'POCHA', gender: 'MALE', gen: 0 },
    ],
  },
  {
    titleKey: 'tree.relationGroups.spouseChildren',
    items: [
      { value: 'TURMUSH', gender: 'MALE', gen: 0 },
      { value: 'OGIL', gender: 'MALE', gen: 1 },
      { value: 'QIZ', gender: 'FEMALE', gen: 1 },
      { value: 'KELINOYI', gender: 'FEMALE', gen: 1 },
      { value: 'KUYOV', gender: 'MALE', gen: 1 },
    ],
  },
];

const ALL_STATIC: RelationDefStatic[] = STATIC_GROUPS.flatMap((g) => g.items);

/** Guruhlab ko'rsatiladi (RelationPicker/ConnectRelativeDialog) — JORIY tilda */
export function getRelationGroups(): { title: string; items: RelationDef[] }[] {
  return STATIC_GROUPS.map((g) => ({
    title: i18n.t(g.titleKey),
    items: g.items.map((it) => ({ ...it, label: i18n.t(`tree.relations.${it.value}`) })),
  }));
}

export const relationDef = (r: RelationKey): RelationDef => {
  const s = ALL_STATIC.find((x) => x.value === r) ?? ALL_STATIC[0];
  return { ...s, label: i18n.t(`tree.relations.${s.value}`) };
};

export const relationLabel = (r: RelationKey): string => relationDef(r).label;

/** Yangi tugunning ankeraga nisbatan doskadagi joylashuvi (avlod darajasiga qarab) */
export function placementFor(
  relation: RelationKey,
  anchor: { x: number; y: number },
): { x: number; y: number } {
  const { gen } = relationDef(relation);
  const jitter = Math.round(Math.random() * 60) - 30;
  const rowGap = 190;
  if (gen === 0) {
    // teng avlod — yon tomonga
    const side = relation === 'TURMUSH' ? 280 : -280;
    return { x: anchor.x + side + jitter, y: anchor.y };
  }
  return { x: anchor.x + jitter, y: anchor.y + gen * rowGap };
}
