// features/tree/model/graph-levels.ts
// Har tugunning ildizga (root) nisbatan avlod darajasini hisoblaydi.
// Sof funksiya — layout ham, qarindoshlik yorlig'i ham shu asosda ishlaydi.

export interface LevelEdge {
  source: string;
  target: string;
  /** Punktir (turmush o'rtog'i/aka-uka) — bir xil avlod */
  dashed: boolean;
  /** Haqiqiy ota-ona (couple ichidagi shu odam) — layout guruhlash uchun */
  parentHandle?: string;
}

/**
 * BFS bilan avlod darajalari: root = 0, ota-ona = -1, farzand = +1.
 * Solid rishtada source = ota-ona (yuqori), target = farzand (pastki).
 */
export function computeLevels(
  ids: string[],
  edges: LevelEdge[],
  rootId: string | undefined,
): Map<string, number> {
  const adj = new Map<string, { to: string; delta: number }[]>();
  const link = (a: string, b: string, delta: number) => {
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a)!.push({ to: b, delta });
  };
  for (const e of edges) {
    if (e.dashed) {
      link(e.source, e.target, 0);
      link(e.target, e.source, 0);
    } else {
      link(e.source, e.target, 1);
      link(e.target, e.source, -1);
    }
  }

  const level = new Map<string, number>();
  const start = rootId ?? ids[0];
  if (start) {
    level.set(start, 0);
    const queue = [start];
    while (queue.length) {
      const u = queue.shift()!;
      for (const { to, delta } of adj.get(u) ?? []) {
        if (!level.has(to)) {
          level.set(to, level.get(u)! + delta);
          queue.push(to);
        }
      }
    }
  }
  for (const id of ids) if (!level.has(id)) level.set(id, 0);
  return level;
}
