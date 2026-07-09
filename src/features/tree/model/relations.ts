// features/tree/model/relations.ts
// Qarindoshlik turlari (backend'dagi relations.ts bilan MOS bo'lishi shart).

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

interface RelationDef {
  value: RelationKey;
  label: string;
  gender: Gender;
  /** anker'ga nisbatan avlod darajasi: -1 ota-ona, -2 bobo-buvi, 0 teng, +1 farzand */
  gen: -2 | -1 | 0 | 1;
}

// Guruhlab ko'rsatiladi (dialogdagi <optgroup>)
export const RELATION_GROUPS: { title: string; items: RelationDef[] }[] = [
  {
    title: 'Ota-ona va ajdodlar',
    items: [
      { value: 'OTA', label: 'Ota', gender: 'MALE', gen: -1 },
      { value: 'ONA', label: 'Ona', gender: 'FEMALE', gen: -1 },
      { value: 'BOBO', label: 'Bobo', gender: 'MALE', gen: -2 },
      { value: 'BUVI', label: 'Buvi', gender: 'FEMALE', gen: -2 },
    ],
  },
  {
    title: 'Aka-uka, opa-singil',
    items: [
      { value: 'AKA', label: 'Aka', gender: 'MALE', gen: 0 },
      { value: 'UKA', label: 'Uka', gender: 'MALE', gen: 0 },
      { value: 'OPA', label: 'Opa', gender: 'FEMALE', gen: 0 },
      { value: 'SINGIL', label: 'Singil', gender: 'FEMALE', gen: 0 },
    ],
  },
  {
    title: 'Amaki, amma, tog\'a, xola',
    items: [
      { value: 'AMAKI', label: 'Amaki', gender: 'MALE', gen: -1 },
      { value: 'AMMA', label: 'Amma', gender: 'FEMALE', gen: -1 },
      { value: 'TOGA', label: "Tog'a", gender: 'MALE', gen: -1 },
      { value: 'XOLA', label: 'Xola', gender: 'FEMALE', gen: -1 },
      { value: 'POCHA', label: 'Pocha', gender: 'MALE', gen: 0 },
    ],
  },
  {
    title: 'Turmush o\'rtog\'i va farzandlar',
    items: [
      { value: 'TURMUSH', label: "Turmush o'rtog'i", gender: 'MALE', gen: 0 },
      { value: 'OGIL', label: "O'g'il", gender: 'MALE', gen: 1 },
      { value: 'QIZ', label: 'Qiz', gender: 'FEMALE', gen: 1 },
      { value: 'KELINOYI', label: 'Kelinoyi', gender: 'FEMALE', gen: 1 },
      { value: 'KUYOV', label: 'Kuyov', gender: 'MALE', gen: 1 },
    ],
  },
];

const ALL: RelationDef[] = RELATION_GROUPS.flatMap((g) => g.items);

export const relationDef = (r: RelationKey): RelationDef =>
  ALL.find((x) => x.value === r) ?? ALL[0];

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
