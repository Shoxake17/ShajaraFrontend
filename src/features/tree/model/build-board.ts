// features/tree/model/build-board.ts
// Server ma'lumotidan (a'zolar + rishtalar) React Flow doskasini quradi.
// Ikki muhim qoida:
//  1. Turmush o'rtoqlar (TURMUSH rishtasi) BITTA umumiy kartaga birlashadi.
//  2. Qarindoshlik yorlig'i ildizga (menga) nisbatan hisoblanadi (onamning
//     otasi -> "Bobo").
import type { Edge, Node } from '@xyflow/react';
import { relationLabel, type Gender, type RelationKey } from './relations';
import { relationInfoFrom, type Side } from './kinship';
import type { FamilyEdgeDto, FamilyMemberDto } from '@/features/tree/types';

export interface SpouseData {
  id: string;
  name: string;
  gender: Gender;
  /** Ildizga nisbatan yorliq (Turmush o'rtog'i, Buvi, ...) */
  relation: string;
  /** Ajdod avlod raqami (1=Ota/Ona, 2=Bobo/Buvi, ...); ajdod bo'lmasa null */
  generation: number | null;
  /** Ota tomon / ona tomon (faqat aniq tomonli qon-qarindoshda); aks holda null */
  side: Side | null;
  birthYear: number | null;
  deathYear: number | null;
  photoUrl: string | null;
  /** true — "Profil ko'rinishi" sozlamasiga ko'ra bu karta shu VIEWER'dan yashirilgan */
  profileHidden?: boolean;
  /** Tahrirlash uchun xom rishta */
  rawRelation: RelationKey;
  /** Qo'lda belgilangan turmush o'rtoq tartibi (null — avtomatik) */
  spouseOrder: number | null;
  /** 12 xonalik ulashish kodi */
  shareCode: string | null;
  /** Kim qo'shgan (permission uchun) */
  createdById: string | null;
}

export interface PersonData extends Record<string, unknown> {
  memberId: string;
  name: string;
  gender: Gender;
  relation: string; // ildizga nisbatan yorliq (Men, Ota, Bobo, ...)
  /** Ajdod avlod raqami (1=Ota/Ona, 2=Bobo/Buvi, ...); ajdod bo'lmasa null */
  generation: number | null;
  /** Ota tomon / ona tomon (faqat aniq tomonli qon-qarindoshda); aks holda null */
  side: Side | null;
  /** Xom rishta (qanday qo'shilgani) — tahrir dialogida tanlangan tur */
  rawRelation: RelationKey;
  birthYear: number | null;
  deathYear: number | null;
  photoUrl: string | null;
  isRoot: boolean;
  /** true — "Profil ko'rinishi" sozlamasiga ko'ra bu ROOT karta shu VIEWER'dan yashirilgan */
  profileHidden?: boolean;
  /** Qo'lda belgilangan turmush o'rtoq tartibi (null — avtomatik) */
  spouseOrder: number | null;
  /** 12 xonalik ulashish kodi */
  shareCode: string | null;
  /** Kim qo'shgan (permission uchun) */
  createdById: string | null;
  /** Dagre joylashuvi uchun tartib — bolalar xotin bo'yicha guruhlanadi */
  layoutOrder?: number;
  /** Shu kartaga birlashgan turmush o'rtoqlar (nechta bo'lsa ham — qo'sh xotinlar) */
  spouses: SpouseData[];
}

export type PersonNodeType = Node<PersonData, 'person'>;

const SPOUSE_RELATION = 'TURMUSH';

const edgeStyle = (dashed: boolean) => ({
  stroke: '#4C7552',
  strokeWidth: 1.6,
  ...(dashed ? { strokeDasharray: '6 4' } : {}),
});

export function buildBoard(
  members: FamilyMemberDto[],
  edges: FamilyEdgeDto[],
  /** Yorliqlar kimga nisbatan (VIEWER anchor); berilmasa — isRoot (ega) */
  anchorId?: string,
): { nodes: PersonNodeType[]; edges: Edge[] } {
  const byId = new Map(members.map((m) => [m.id, m]));

  // 1. Turmush o'rtoq GURUHLARI (union-find):
  //    (a) TURMUSH rishtasi bilan bog'langanlar;
  //    (b) BIR bolaning OTA va ONA'si — ular avtomatik er-xotin deb tanilib
  //        bitta kartaga birlashadi.
  const uf = new Map<string, string>();
  members.forEach((m) => uf.set(m.id, m.id));
  const find = (x: string): string => {
    let r = x;
    while (uf.get(r) !== r) r = uf.get(r)!;
    while (uf.get(x) !== r) {
      const nx = uf.get(x)!;
      uf.set(x, r);
      x = nx;
    }
    return r;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) uf.set(ra, rb);
  };

  // (a) oshkor turmush o'rtoqlar
  for (const e of edges) {
    if (e.relation === SPOUSE_RELATION && byId.has(e.sourceId) && byId.has(e.targetId)) {
      union(e.sourceId, e.targetId);
    }
  }
  // (b) umumiy farzandning ota va onasi
  const parentsByChild = new Map<string, string[]>();
  for (const e of edges) {
    if ((e.relation === 'OTA' || e.relation === 'ONA') && byId.has(e.sourceId) && byId.has(e.targetId)) {
      const list = parentsByChild.get(e.targetId) ?? [];
      list.push(e.sourceId);
      parentsByChild.set(e.targetId, list);
    }
  }
  for (const parents of parentsByChild.values()) {
    for (let i = 1; i < parents.length; i++) union(parents[0], parents[i]);
  }

  // Har a'zoning NIKOH (TURMUSH) aloqalari soni. Qo'sh xotinlikда umumiy ER
  // hammaga uylangani uchun eng ko'p aloqaga ega bo'ladi (2+), xotinlar 1 tadan.
  const spouseLinks = new Map<string, number>();
  for (const e of edges) {
    if (e.relation === SPOUSE_RELATION && byId.has(e.sourceId) && byId.has(e.targetId)) {
      spouseLinks.set(e.sourceId, (spouseLinks.get(e.sourceId) ?? 0) + 1);
      spouseLinks.set(e.targetId, (spouseLinks.get(e.targetId) ?? 0) + 1);
    }
  }
  const linksOf = (id: string) => spouseLinks.get(id) ?? 0;

  // Har guruh uchun primary (couple kartaning asosiy — MARKAZdagi odami).
  // Ustunlik:
  //   1) root (o'zim) — bo'lsa doim markaz;
  //   2) UMUMIY ER — guruhда eng ko'p turmush aloqasiga ega YAGONA a'zo (2+ nikoh):
  //      qo'sh xotinlikda er markazda, xotinlar chap/o'ngда turadi (er ba'zan
  //      TURMUSH sifatida kiritilgan, xotini esa qon-qarindosh bo'lishi mumkin);
  //   3) QON-QARINDOSH — TURMUSH bo'lmagan a'zo (oddiy juftlik);
  //   4) zaxira — birinchi a'zo.
  const groupMembers = new Map<string, string[]>(); // uf-root -> a'zolar (members tartibida)
  for (const m of members) {
    const root = find(m.id);
    const arr = groupMembers.get(root) ?? [];
    arr.push(m.id);
    groupMembers.set(root, arr);
  }
  const groupPrimary = new Map<string, string>(); // uf-root -> primaryId
  for (const [root, ids] of groupMembers) {
    const rootMember = ids.find((id) => byId.get(id)?.isRoot);
    // Eng ko'p nikohli a'zo YAGONA va 2+ bo'lsa — umumiy er (polygamiya markazi)
    const maxLinks = Math.max(...ids.map(linksOf));
    const topLinked = ids.filter((id) => linksOf(id) === maxLinks);
    const commonHusband = maxLinks >= 2 && topLinked.length === 1 ? topLinked[0] : undefined;
    const primary =
      rootMember ??
      commonHusband ??
      ids.find((id) => byId.get(id)?.relation !== SPOUSE_RELATION) ??
      ids[0];
    groupPrimary.set(root, primary);
  }
  const primaryOf = (id: string) => groupPrimary.get(find(id)) ?? id;
  const redirect = (id: string) => primaryOf(id);

  // Turmush o'rtoqlar ro'yxati (primary'dan tashqari guruh a'zolari)
  const spousesOfPrimary = new Map<string, string[]>();
  for (const m of members) {
    const primary = primaryOf(m.id);
    if (m.id !== primary) {
      const list = spousesOfPrimary.get(primary) ?? [];
      list.push(m.id);
      spousesOfPrimary.set(primary, list);
    }
  }
  // Turmush o'rtoqlarni TUG'ILGAN YIL bo'yicha saralaymiz (eng kattasi birinchi);
  // yili yo'qlar oxirida. Shu tartib raqamlash va bola chizig'i uchun ishlatiladi.
  const spouseSortKey = (id: string) => byId.get(id)?.birthYear ?? Number.POSITIVE_INFINITY;
  for (const list of spousesOfPrimary.values()) {
    list.sort((a, b) => spouseSortKey(a) - spouseSortKey(b));
  }

  // 2. Ko'rinadigan tugunlar (guruh primary'lari)
  const visible = members.filter((m) => primaryOf(m.id) === m.id);

  // 3. Qarindoshlik yorliqlari + ajdod avlod raqamlari — ANKERGA (VIEWER) yoki
  //    isRoot (ega) ga nisbatan.
  const { labels: relationLabels, generations, sides } = relationInfoFrom(members, edges, anchorId);
  const baseLabel = (id: string) => {
    const m = byId.get(id);
    return relationLabels.get(id) ?? (m ? relationLabel(m.relation as RelationKey) : '');
  };

  // Bitta kartadagi (primary + turmush o'rtoqlar) bir xil yorliqlarni raqamlaymiz:
  // ikkita buvi bo'lsa -> "Buvi 1", "Buvi 2". Agar a'zoga qo'lda `spouseOrder`
  // berilgan bo'lsa (masalan 3), o'sha raqam ishlatiladi ("Buvi 3"); qolganlari
  // bo'sh raqamlar bilan (tug'ilgan yil bo'yicha, eng kattasidan) to'ldiriladi.
  const numberedLabel = new Map<string, string>();
  for (const m of visible) {
    const groupIds = [m.id, ...(spousesOfPrimary.get(m.id) ?? [])];
    const byLabel = new Map<string, string[]>();
    for (const id of groupIds) {
      const lbl = baseLabel(id);
      const arr = byLabel.get(lbl) ?? [];
      arr.push(id);
      byLabel.set(lbl, arr);
    }
    for (const [lbl, ids] of byLabel) {
      if (ids.length <= 1) {
        numberedLabel.set(ids[0], lbl);
        continue;
      }
      const taken = new Set<number>();
      for (const id of ids) {
        const so = byId.get(id)?.spouseOrder;
        if (so != null) taken.add(so);
      }
      let next = 1;
      for (const id of ids) {
        const so = byId.get(id)?.spouseOrder;
        let n: number;
        if (so != null) {
          n = so;
        } else {
          while (taken.has(next)) next++;
          n = next;
          taken.add(n);
        }
        numberedLabel.set(id, `${lbl} ${n}`);
      }
    }
  }
  const labelOf = (id: string) => numberedLabel.get(id) ?? baseLabel(id);

  // 4. Tugunlar
  const nodes: PersonNodeType[] = visible.map((m) => {
    const spouses: SpouseData[] = (spousesOfPrimary.get(m.id) ?? [])
      .map((id) => byId.get(id))
      .filter((s): s is FamilyMemberDto => s != null)
      .map((s) => ({
        id: s.id,
        name: s.fullName,
        gender: s.gender,
        relation: labelOf(s.id),
        generation: generations.get(s.id) ?? null,
        side: sides.get(s.id) ?? null,
        birthYear: s.birthYear,
        deathYear: s.deathYear,
        photoUrl: s.photoUrl,
        profileHidden: s.profileHidden,
        rawRelation: (s.relation as RelationKey) ?? 'TURMUSH',
        spouseOrder: s.spouseOrder,
        shareCode: s.shareCode,
        createdById: s.createdById,
      }));

    return {
      id: m.id,
      type: 'person',
      position: { x: m.posX, y: m.posY },
      data: {
        memberId: m.id,
        name: m.fullName,
        gender: m.gender,
        relation: labelOf(m.id),
        generation: generations.get(m.id) ?? null,
        side: sides.get(m.id) ?? null,
        rawRelation: (m.relation as RelationKey) ?? 'OTA',
        birthYear: m.birthYear,
        deathYear: m.deathYear,
        photoUrl: m.photoUrl,
        isRoot: m.isRoot,
        profileHidden: m.profileHidden,
        spouseOrder: m.spouseOrder,
        shareCode: m.shareCode,
        createdById: m.createdById,
        spouses,
      },
    };
  });

  // Har a'zoning kartadagi VIZUAL tartibi (chapdan o'ngga cell indeksi) —
  // PersonNode bilan bir xil: 2+ xotinda primary (er) O'RTADA. Bolalarni to'g'ri
  // xotin tomonidan (chap/o'ng) chizish va guruhlash uchun ishlatiladi.
  const visualOrder = new Map<string, number>();
  for (const m of visible) {
    const sp = spousesOfPrimary.get(m.id) ?? []; // yosh bo'yicha saralangan
    const mid = Math.floor(sp.length / 2);
    const cells = sp.length >= 2 ? [...sp.slice(0, mid), m.id, ...sp.slice(mid)] : [m.id, ...sp];
    cells.forEach((id, i) => visualOrder.set(id, i));
  }

  // 5. Rishtalar. Bola chizig'i qaysi nuqtadan chiqishi:
  //    - YAKKA xotin-erlik (1 turmush o'rtog'i) -> juftlik MARKAZIDAN (ikki tomonlama,
  //      bola ikkalasига ham tegishli ko'rinadi): sourceHandle = `${source}__couple`.
  //    - QO'SH xotinlik (2+) -> HAQIQIY ota-ona (o'sha xotin) nuqtasidan, har xotin
  //      bolasi o'z tomonidan.
  //    - Yolg'iz ota-ona -> o'sha odam nuqtasidan.
  const seen = new Set<string>();
  const built: {
    edge: Edge;
    source: string;
    order: number;
    year: number;
  }[] = [];
  for (const e of edges) {
    if (e.relation === SPOUSE_RELATION) continue;
    const source = redirect(e.sourceId);
    const target = redirect(e.targetId);
    if (source === target) continue;
    const key = `${source}->${target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const spouseCount = spousesOfPrimary.get(source)?.length ?? 0;
    const sourceHandle = spouseCount === 1 ? `${source}__couple` : e.sourceId;
    built.push({
      source,
      order: visualOrder.get(e.sourceId) ?? 0,
      year: byId.get(target)?.birthYear ?? Number.POSITIVE_INFINITY,
      edge: {
        id: e.id,
        source,
        target,
        sourceHandle, // yakka juftlik -> markaz; qo'sh xotinlik -> haqiqiy xotin
        targetHandle: e.targetId, // haqiqiy bola (yuqori nuqta)
        type: 'tree', // TreeEdge — burilish doim bola kartasidan 30px tepada (tekis chiziqlar)
        style: edgeStyle(e.dashed),
        data: { dashed: e.dashed, parentId: e.sourceId },
      },
    });
  }

  // Xotin tartibi -> bola yoshi bo'yicha saralaymiz (dagre guruhlab joylashtiradi)
  built.sort((a, b) => a.source.localeCompare(b.source) || a.order - b.order || a.year - b.year);
  const flowEdges = built.map((b) => b.edge);

  // 6. Bolalarni XOTIN bo'yicha guruhlash tartibi (layoutOrder).
  //    Har couple ostida bolalar ONA (xotin) vizual tartibi bo'yicha, so'ng yosh
  //    bo'yicha joylashadi. Shu tartib dagre'ga beriladi -> 1-xotin bolalari birga,
  //    2-xotin bolalari birga (aralashmaydi). Faqat SOLID (ota-ona) rishtalar.
  const childrenOf = new Map<string, { child: string; handle: string; year: number }[]>();
  const hasParent = new Set<string>();
  for (const b of built) {
    if (b.edge.data && (b.edge.data as { dashed?: boolean }).dashed) continue;
    const child = b.edge.target;
    const arr = childrenOf.get(b.source) ?? [];
    arr.push({ child, handle: (b.edge.sourceHandle as string) ?? b.source, year: b.year });
    childrenOf.set(b.source, arr);
    hasParent.add(child);
  }
  for (const arr of childrenOf.values()) {
    arr.sort(
      (a, b) =>
        (visualOrder.get(a.handle) ?? 0) - (visualOrder.get(b.handle) ?? 0) ||
        a.year - b.year ||
        a.child.localeCompare(b.child),
    );
  }
  const orderOf = new Map<string, number>();
  let counter = 0;
  const visit = (id: string) => {
    if (orderOf.has(id)) return; // sikldan himoya
    orderOf.set(id, counter++);
    for (const c of childrenOf.get(id) ?? []) visit(c.child);
  };
  const roots = nodes
    .map((n) => n.id)
    .filter((id) => !hasParent.has(id))
    .sort(
      (a, b) =>
        (byId.get(a)?.birthYear ?? Number.POSITIVE_INFINITY) -
          (byId.get(b)?.birthYear ?? Number.POSITIVE_INFINITY) || a.localeCompare(b),
    );
  for (const r of roots) visit(r);
  for (const n of nodes) if (!orderOf.has(n.id)) orderOf.set(n.id, counter++);
  for (const n of nodes) n.data.layoutOrder = orderOf.get(n.id) ?? 0;

  return { nodes, edges: flowEdges };
}
