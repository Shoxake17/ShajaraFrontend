// features/tree/model/layout.ts
// Avtomatik joylashtirish — dagre kutubxonasi orqali (professional, o'lchamga qarab
// joy ajratadi, kartalar HECH QACHON ustma-ust chiqmaydi).
//  - Gorizontal joylashuv (x): dagre — tugun kengligiga qarab, oralari ajratilgan.
//  - Vertikal (y): avlod darajasidan (root=0, ota-ona=-1, farzand=+1) — ajdodlar
//    yuqorida, avlodlar pastda.
import Dagre from '@dagrejs/dagre';
import { computeLevels, type LevelEdge } from './graph-levels';

export interface LayoutNode {
  id: string;
  x: number;
  isRoot: boolean;
  /** Kartaning asosiy (qon-qarindosh) a'zosining tug'ilgan yili — saralash uchun. */
  birthYear: number | null;
  /** Kartaning HAQIQIY kengligi (px, React Flow o'lchagan). */
  width: number;
  /** Kartaning HAQIQIY balandligi (px) — qavatlar orasini aniq hisoblash uchun. */
  height?: number;
  /**
   * Guruhlash tartibi (build-board bergan). Bolalar ONA (xotin) bo'yicha
   * guruhlangan — dagre tugun kiritish tartibi shu bo'lsa, bir xotin bolalari
   * birga turadi (aralashmaydi). Berilmasa — yosh bo'yicha.
   */
  order?: number;
}

export type LayoutEdge = LevelEdge;

// Qavatlar orasi: tepadagi kartadan 30px pastga + pastdagi kartaga 30px tepaga
// joy ochiladi (jami 60px) — chiziqlar hamma joyda BIR XIL balandlikda buriladi.
export const ROW_V_GAP = 60;
const NODE_HEIGHT = 90; // dagre uchun nominal balandlik (vertikalni o'zimiz hisoblaymiz)
const NODE_SEP = 40; // qo'shni kartalar orasi (~20px har yon)
const RANK_SEP = 120; // darajalar orasi (dagre ichki)
const DEFAULT_WIDTH = 220;
const DEFAULT_HEIGHT = 170; // hali o'lchanmagan kartaning taxminiy balandligi

/**
 * QAVAT (qator) y-koordinatalari: har qavatning ENG BALAND kartasi + ROW_V_GAP
 * (30px tepadagidan + 30px pastdagiga). Shunda qavatlar orasida chiziqlar uchun
 * BIR XIL bo'sh joy qoladi — chiziqlar baland-past bo'lmaydi.
 */
function computeRowYs(
  nodes: { id: string; height?: number }[],
  level: Map<string, number>,
): Map<number, number> {
  const rowMaxH = new Map<number, number>();
  for (const n of nodes) {
    const l = level.get(n.id) ?? 0;
    rowMaxH.set(l, Math.max(rowMaxH.get(l) ?? 0, n.height || DEFAULT_HEIGHT));
  }
  const rowY = new Map<number, number>();
  let nextY = 0;
  for (const l of [...rowMaxH.keys()].sort((a, b) => a - b)) {
    rowY.set(l, nextY);
    nextY += (rowMaxH.get(l) ?? DEFAULT_HEIGHT) + ROW_V_GAP;
  }
  return rowY;
}

/**
 * FAQAT VERTIKAL tekislash ("Tartiblash" tugmasi): har karta o'z QAVATIGA
 * (avlod qatoriga) y bo'yicha tekislanadi — x (chap-o'ng) TEGILMAYDI.
 * Kartalarning gorizontal joylashuvi to'liq foydalanuvchi qo'lida qoladi;
 * bu funksiya faqat chiziqlar tekis bo'lishi uchun qavatlarni tekislaydi.
 */
export function alignRowYs(
  nodes: { id: string; isRoot: boolean; height?: number }[],
  edges: LayoutEdge[],
): Map<string, number> {
  const rootId = nodes.find((n) => n.isRoot)?.id;
  const level = computeLevels(
    nodes.map((n) => n.id),
    edges,
    rootId,
  );
  const rowY = computeRowYs(nodes, level);
  const out = new Map<string, number>();
  for (const n of nodes) out.set(n.id, rowY.get(level.get(n.id) ?? 0) ?? 0);
  return out;
}

/** Qo'shni SHOX (subtree) bloklari orasidagi majburiy oraliq (px) */
export const SUBTREE_GAP = 100;

/**
 * SHOX TO'QNASHUVLARINI YECHISH: har tugunning butun avlodlar bloki (bounding
 * box) qo'shni shox bloki bilan KESISHSA, o'ngdagi shox butunlay (barcha
 * avlodlari bilan) o'ngga surilib, orada 100px joy ochiladi. Kesishmagan
 * shoxlar JOYIDAN QIMIRLAMAYDI — foydalanuvchining qo'lda joylashuvi saqlanadi.
 * Yangi x koordinatalar xaritasi qaytadi.
 */
export function resolveSubtreeOverlaps(
  nodes: { id: string; x: number; width: number }[],
  edges: LayoutEdge[],
): Map<string, number> {
  const x = new Map(nodes.map((n) => [n.id, n.x]));
  const w = new Map(nodes.map((n) => [n.id, n.width || DEFAULT_WIDTH]));
  const has = new Set(nodes.map((n) => n.id));

  // Qon-daraxt: solid (ota-ona -> bola) rishtalar; har bolaga bitta ota-ona
  const children = new Map<string, string[]>();
  const hasParent = new Set<string>();
  for (const e of edges) {
    if (e.dashed || !has.has(e.source) || !has.has(e.target)) continue;
    if (hasParent.has(e.target) || e.source === e.target) continue;
    const arr = children.get(e.source) ?? [];
    arr.push(e.target);
    children.set(e.source, arr);
    hasParent.add(e.target);
  }

  // Shox a'zolari (sikldan himoya bilan)
  const subtreeIds = (id: string): string[] => {
    const out: string[] = [];
    const seen = new Set([id]);
    const q = [id];
    while (q.length) {
      const u = q.shift()!;
      out.push(u);
      for (const c of children.get(u) ?? []) {
        if (!seen.has(c)) {
          seen.add(c);
          q.push(c);
        }
      }
    }
    return out;
  };
  const shift = (id: string, dx: number) => {
    for (const k of subtreeIds(id)) x.set(k, (x.get(k) ?? 0) + dx);
  };
  const bbox = (id: string): { min: number; max: number } => {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const k of subtreeIds(id)) {
      const kx = x.get(k) ?? 0;
      min = Math.min(min, kx);
      max = Math.max(max, kx + (w.get(k) ?? DEFAULT_WIDTH));
    }
    return { min, max };
  };

  // Bir guruh shoxlarni chapdan o'ngga ko'rib chiqib, KESISHGANLARINI ajratamiz
  const separate = (ids: string[]) => {
    const sorted = [...ids].sort((a, b) => (x.get(a) ?? 0) - (x.get(b) ?? 0));
    let runMax = Number.NEGATIVE_INFINITY;
    for (const id of sorted) {
      const b = bbox(id);
      // Faqat HAQIQIY kesishishda suramiz (oldin ham ajralgan bo'lsa tegmaymiz)
      if (b.min < runMax) {
        const dx = runMax + SUBTREE_GAP - b.min;
        shift(id, dx);
        runMax = b.max + dx;
      } else {
        runMax = Math.max(runMax, b.max);
      }
    }
  };

  // Pastdan yuqoriga: har tugunning bolalari (shoxchalari) orasini ajratamiz
  const visitSeen = new Set<string>();
  const visit = (id: string) => {
    if (visitSeen.has(id)) return;
    visitSeen.add(id);
    const kids = children.get(id) ?? [];
    for (const k of kids) visit(k);
    if (kids.length > 1) separate(kids);
  };
  const roots = nodes.filter((n) => !hasParent.has(n.id)).map((n) => n.id);
  for (const r of roots) visit(r);
  // Eng yuqori (ota-onasiz) shoxlar orasini ham ajratamiz
  if (roots.length > 1) separate(roots);

  return x;
}

/**
 * Dagre bilan gorizontal joylashuv (ustma-ust chiqmaydi), avlod darajasi bilan vertikal.
 */
export function computeLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
): Map<string, { x: number; y: number }> {
  const rootId = nodes.find((n) => n.isRoot)?.id;
  const level = computeLevels(
    nodes.map((n) => n.id),
    edges,
    rootId,
  );

  const g = new Dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: NODE_SEP, ranksep: RANK_SEP, marginx: 40, marginy: 40 });
  g.setDefaultEdgeLabel(() => ({}));

  // Tugun kiritish tartibi — dagre bir rank ichida tie'larni shu tartibda hal
  // qiladi. `order` berilgan bo'lsa (bolalar xotin bo'yicha guruhlangan) — o'sha;
  // aks holda tug'ilgan yil bo'yicha.
  const ordered = [...nodes].sort(
    (a, b) =>
      (a.order ?? Number.POSITIVE_INFINITY) - (b.order ?? Number.POSITIVE_INFINITY) ||
      (a.birthYear ?? Number.POSITIVE_INFINITY) - (b.birthYear ?? Number.POSITIVE_INFINITY) ||
      a.id.localeCompare(b.id),
  );
  for (const n of ordered) {
    g.setNode(n.id, { width: n.width || DEFAULT_WIDTH, height: NODE_HEIGHT });
  }
  // Solid (ota-ona) rishtalar. ANCHOR tugun ISHLATILMAYDI — u dagre'да qo'shimcha
  // rank yaratib, bir avloddagi kartalarni turli rankка tashlab, ustma-ustlikка
  // sabab bo'lardi. Endi barcha bolalar to'g'ridan-to'g'ri ota-onaga ulanadi:
  // rank == avlod bo'ladi, dagre har avlodni gorizontal to'liq ajratadi.
  // Guruhlash (xotin bo'yicha) tugun kiritish tartibi (`order`) orqali saqlanadi.
  // Punktir (aka-uka/turmush yon) rishtalar rank buzmasin — chetlab o'tamiz.
  for (const e of edges) {
    if (e.dashed || !g.hasNode(e.source) || !g.hasNode(e.target)) continue;
    g.setEdge(e.source, e.target);
  }

  Dagre.layout(g);

  const rowY = computeRowYs(
    nodes.map((n) => ({ id: n.id, height: n.height })),
    level,
  );

  const widthOf = new Map(nodes.map((n) => [n.id, n.width || DEFAULT_WIDTH]));
  const pos = new Map<string, { x: number; y: number }>();
  for (const n of nodes) {
    const dn = g.node(n.id);
    // dagre markaz koordinatasini beradi; React Flow top-left kutadi.
    const cx = dn?.x ?? 0;
    pos.set(n.id, {
      x: cx - (widthOf.get(n.id) ?? DEFAULT_WIDTH) / 2,
      y: rowY.get(level.get(n.id) ?? 0) ?? 0,
    });
  }

  // KAFOLAT: har avlod (bir xil y) ichида kartalar ustma-ust chiqmasin — chapdan
  // o'ngga surib, qo'shni kartalar orasида kamida NODE_SEP joy qoldiramiz.
  const rows = new Map<number, string[]>();
  for (const n of nodes) {
    const y = pos.get(n.id)!.y;
    const arr = rows.get(y) ?? [];
    arr.push(n.id);
    rows.set(y, arr);
  }
  for (const ids of rows.values()) {
    ids.sort((a, b) => pos.get(a)!.x - pos.get(b)!.x);
    for (let i = 1; i < ids.length; i++) {
      const prev = pos.get(ids[i - 1])!;
      const cur = pos.get(ids[i])!;
      const minX = prev.x + (widthOf.get(ids[i - 1]) ?? DEFAULT_WIDTH) + NODE_SEP;
      if (cur.x < minX) cur.x = minX;
    }
  }
  return pos;
}
