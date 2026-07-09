import { describe, expect, it } from 'vitest';
import {
  computeLayout,
  resolveSubtreeOverlaps,
  type LayoutEdge,
  type LayoutNode,
} from './layout';

const n = (
  id: string,
  isRoot = false,
  birthYear: number | null = null,
  width = 200,
): LayoutNode => ({ id, x: 0, isRoot, birthYear, width });

describe('computeLayout (dagre)', () => {
  it('root avlod darajasi 0 (y=0)', () => {
    const pos = computeLayout([n('root', true)], []);
    expect(pos.get('root')!.y).toBe(0);
  });

  it('ota-ona yuqorida, farzand pastda joylashadi', () => {
    const nodes: LayoutNode[] = [n('root', true), n('ota'), n('ogil')];
    const edges: LayoutEdge[] = [
      { source: 'ota', target: 'root', dashed: false }, // ota -> root
      { source: 'root', target: 'ogil', dashed: false }, // root -> o'g'il
    ];
    const pos = computeLayout(nodes, edges);
    expect(pos.get('ota')!.y).toBeLessThan(pos.get('root')!.y);
    expect(pos.get('root')!.y).toBeLessThan(pos.get('ogil')!.y);
  });

  it('qavatlar orasi ANIQ: tepadagi karta bo\'yi + 60px (30px pastga + 30px tepaga)', () => {
    const nodes: LayoutNode[] = [
      { ...n('root', true), height: 150 },
      { ...n('ogil'), height: 100 },
      { ...n('nabira'), height: 120 },
    ];
    const edges: LayoutEdge[] = [
      { source: 'root', target: 'ogil', dashed: false },
      { source: 'ogil', target: 'nabira', dashed: false },
    ];
    const pos = computeLayout(nodes, edges);
    // O'g'il qavati = root qavati + root balandligi (150) + 60px
    expect(pos.get('ogil')!.y).toBe(pos.get('root')!.y + 150 + 60);
    // Nabira qavati = o'g'il qavati + o'g'il balandligi (100) + 60px
    expect(pos.get('nabira')!.y).toBe(pos.get('ogil')!.y + 100 + 60);
  });

  it('aka-uka (punktir) bir xil avlodda qoladi', () => {
    const nodes: LayoutNode[] = [n('root', true), n('aka')];
    const edges: LayoutEdge[] = [{ source: 'root', target: 'aka', dashed: true }];
    const pos = computeLayout(nodes, edges);
    expect(pos.get('aka')!.y).toBe(pos.get('root')!.y);
  });

  it('qo\'sh xotinlik: har xotin oilasi alohida blok (1-xotin bolalari 2-xotinникидан chapda)', () => {
    // Couple (er) ostida ikki xotin: w1 -> [a1,a2], w2 -> [b1,b2].
    // parentHandle orqali guruhlangan -> 1-xotin bolalari to'liq CHAPDA,
    // 2-xotinники O'NGDA (aralashmaydi, ustma-ust emas).
    const nodes: LayoutNode[] = [
      n('er', true, 1900, 540),
      n('a1', false, 1950, 200),
      n('a2', false, 1955, 200),
      n('b1', false, 1952, 200),
      n('b2', false, 1958, 200),
    ];
    // order: build-board bergandek — 1-xotin bolalari oldin
    nodes[1].order = 1;
    nodes[2].order = 2;
    nodes[3].order = 3;
    nodes[4].order = 4;
    const edges: LayoutEdge[] = [
      { source: 'er', target: 'a1', dashed: false, parentHandle: 'w1' },
      { source: 'er', target: 'a2', dashed: false, parentHandle: 'w1' },
      { source: 'er', target: 'b1', dashed: false, parentHandle: 'w2' },
      { source: 'er', target: 'b2', dashed: false, parentHandle: 'w2' },
    ];
    const pos = computeLayout(nodes, edges);
    const w1max = Math.max(pos.get('a1')!.x + 200, pos.get('a2')!.x + 200);
    const w2min = Math.min(pos.get('b1')!.x, pos.get('b2')!.x);
    // 1-xotin bolalari eng o'ng cheti < 2-xotin bolalari eng chap cheti (ajratilgan)
    expect(w1max).toBeLessThanOrEqual(w2min);
  });

  it("ko'p avlodli keng daraxt — HECH QAYSI qatorда ustma-ust yo'q", () => {
    // root (keng couple) -> 6 bola (2 xotin) -> c1 va c4 ning 3 tadan bolasi
    const nodes: LayoutNode[] = [n('root', true, 1950, 480)];
    const edges: LayoutEdge[] = [];
    for (let i = 1; i <= 6; i++) {
      const nd = n(`c${i}`, false, 1970 + i, 360);
      nd.order = i;
      nodes.push(nd);
      edges.push({ source: 'root', target: `c${i}`, dashed: false, parentHandle: i <= 3 ? 'w1' : 'w2' });
    }
    let k = 0;
    for (const parent of ['c1', 'c4']) {
      for (let j = 0; j < 3; j++) {
        const nd = n(`g${k}`, false, 1996 + j, 360);
        nd.order = 100 + k;
        nodes.push(nd);
        edges.push({ source: parent, target: `g${k}`, dashed: false });
        k++;
      }
    }
    const pos = computeLayout(nodes, edges);
    const widthOf = new Map(nodes.map((nd) => [nd.id, nd.width]));
    const rows = new Map<number, string[]>();
    for (const [id, p] of pos) {
      const arr = rows.get(p.y) ?? [];
      arr.push(id);
      rows.set(p.y, arr);
    }
    for (const ids of rows.values()) {
      ids.sort((a, b) => pos.get(a)!.x - pos.get(b)!.x);
      for (let i = 1; i < ids.length; i++) {
        const left = pos.get(ids[i - 1])!;
        const right = pos.get(ids[i])!;
        expect(right.x).toBeGreaterThanOrEqual(left.x + (widthOf.get(ids[i - 1]) ?? 0));
      }
    }
  });

  it("SHOX to'qnashuvi: kengaygan shox qo'shni shoxdan 100px ajratiladi (butun oilasi bilan)", () => {
    // p1 (bolalari keng yoyilgan) va p2 — p1'ning bolasi c3 p2'ning bolasi d1
    // ustiga chiqib ketgan. p2 SHOXI butunlay o'ngga surilib 100px ochilishi kerak.
    const nodes = [
      { id: 'p1', x: 0, width: 200 },
      { id: 'c1', x: -150, width: 200 },
      { id: 'c2', x: 100, width: 200 },
      { id: 'c3', x: 350, width: 200 },
      { id: 'p2', x: 400, width: 200 },
      { id: 'd1', x: 400, width: 200 }, // c3 (350..550) bilan KESISHADI
    ];
    const edges: LayoutEdge[] = [
      { source: 'p1', target: 'c1', dashed: false },
      { source: 'p1', target: 'c2', dashed: false },
      { source: 'p1', target: 'c3', dashed: false },
      { source: 'p2', target: 'd1', dashed: false },
    ];
    const xs = resolveSubtreeOverlaps(nodes, edges);
    // p1 shoxi joyида (u chapda)
    expect(xs.get('p1')).toBe(0);
    expect(xs.get('c3')).toBe(350);
    // p1 shoxining o'ng cheti = 350+200 = 550; p2 shoxi 550+100 dan boshlanadi
    const shift = 550 + 100 - 400; // 250
    expect(xs.get('p2')).toBe(400 + shift);
    expect(xs.get('d1')).toBe(400 + shift); // bolasi ham birga surildi
  });

  it("KESISHMAGAN shoxlar joyidan qimirlamaydi (qo'lda joylashuv saqlanadi)", () => {
    const nodes = [
      { id: 'p1', x: 0, width: 200 },
      { id: 'c1', x: 0, width: 200 },
      { id: 'p2', x: 500, width: 200 },
      { id: 'd1', x: 500, width: 200 },
    ];
    const edges: LayoutEdge[] = [
      { source: 'p1', target: 'c1', dashed: false },
      { source: 'p2', target: 'd1', dashed: false },
    ];
    const xs = resolveSubtreeOverlaps(nodes, edges);
    expect(xs.get('p1')).toBe(0);
    expect(xs.get('c1')).toBe(0);
    expect(xs.get('p2')).toBe(500);
    expect(xs.get('d1')).toBe(500);
  });

  it('bir avloddagi KENG kartalar ustma-ust chiqmaydi', () => {
    // Uch keng couple karta — hammasi root'ning bir avlodli qarindoshlari (level -1)
    const nodes: LayoutNode[] = [
      n('root', true, 2000, 200),
      n('a', false, 1950, 540),
      n('b', false, 1955, 540),
      n('c', false, 1960, 540),
    ];
    const edges: LayoutEdge[] = [
      { source: 'a', target: 'root', dashed: false },
      { source: 'b', target: 'root', dashed: false },
      { source: 'c', target: 'root', dashed: false },
    ];
    const pos = computeLayout(nodes, edges);

    const items = ['a', 'b', 'c'].map((id) => ({
      id,
      x: pos.get(id)!.x,
      y: pos.get(id)!.y,
      w: 540,
    }));
    // Hammasi bir avlodda (y teng)
    expect(items[0].y).toBe(items[1].y);
    expect(items[1].y).toBe(items[2].y);
    // Bir y'dagi hech bir juftlik x bo'yicha ustma-ust EMAS
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const A = items[i];
        const B = items[j];
        if (A.y === B.y) {
          const overlap = A.x < B.x + B.w && B.x < A.x + A.w;
          expect(overlap).toBe(false);
        }
      }
    }
  });
});
