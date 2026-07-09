// features/tree/pages/FamilyMembersPage.tsx
// "Oila a'zolari" — FAQAT yaqin oila (o'zim, turmush o'rtog'im, bolalarim,
// ota-onam, aka-uka/opa-singillarim, bobo-buvim va butun ajdodlar chizig'i)
// alohida INTERAKTIV doskada. Qolgan qarindoshlar (tog'a, jiyan, vachcha...)
// bu yerda ko'rinmaydi — ular umumiy Shajara doskasida.
// Surish/tartiblash ASOSIY DOSKA bilan bir xil ishlaydi va SAQLANADI —
// lekin ALOHIDA joylashuvda (famPosX/famPosY), asosiy doskaga ta'sir qilmaydi:
//  - ikonka O'CHIQ: karta OILASI (bolalari) bilan birga suriladi;
//  - ikonka YOQIQ: faqat tanlangan kartaning o'zi suriladi;
//  - "Tartiblash": qavatlarga (y) tekislaydi + shox to'qnashuvlarini 100px
//    bilan ochadi, chap-o'ng joylashuvga boshqa tegmaydi.
import { useEffect, useMemo, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { descendantIds, useTreeStore, type PersonNodeType } from '@/features/tree/model/tree.store';
import { buildBoard } from '@/features/tree/model/build-board';
import { alignRowYs, computeLayout, resolveSubtreeOverlaps } from '@/features/tree/model/layout';
import { closeFamilyIds, closeFamilyLabels, relationInfoFrom } from '@/features/tree/model/kinship';
import { PersonNode } from '@/features/tree/components/PersonNode';
import { TreeEdge } from '@/features/tree/components/TreeEdge';

const nodeTypes = { person: PersonNode };
const edgeTypes = { tree: TreeEdge };

export function FamilyMembersPage() {
  const members = useTreeStore((s) => s.members);
  const rawEdges = useTreeStore((s) => s.rawEdges);
  const loadBoard = useTreeStore((s) => s.loadBoard);
  const loading = useTreeStore((s) => s.loading);
  const updateFamilyPositions = useTreeStore((s) => s.updateFamilyPositions);
  const access = useTreeStore((s) => s.access);
  // VIEWER o'z ANKERIGA nisbatan yaqin oilasini ko'radi (owner uchun anchor = root)
  const anchorId = access?.anchorMemberId ?? undefined;
  const isOwner = access?.role === 'OWNER';

  // Joylashuv rejimi: yoqiq — YAKKA surish; o'chiq — OILASI bilan surish.
  const [editMode, setEditMode] = useState(false);
  const [fitTick, setFitTick] = useState(0); // Tartiblashdan keyin fitView uchun

  // VIEWER joylashuvi — FAQAT O'ZIGA (shu qurilma, localStorage): egasining
  // ma'lumotiga yozilmaydi, boshqa hech kimga ko'rinmaydi.
  const localKey = access ? `shajara.famview.${access.userId}.${access.treeOwnerId}` : null;
  const loadLocalPositions = (): Record<string, { x: number; y: number }> => {
    if (!localKey) return {};
    try {
      return JSON.parse(localStorage.getItem(localKey) ?? '{}') as Record<
        string,
        { x: number; y: number }
      >;
    } catch {
      return {};
    }
  };
  const saveLocalPositions = (moved: { id: string; posX: number; posY: number }[]) => {
    if (!localKey) return;
    const cur = loadLocalPositions();
    for (const m of moved) cur[m.id] = { x: m.posX, y: m.posY };
    try {
      localStorage.setItem(localKey, JSON.stringify(cur));
    } catch {
      /* localStorage to'lgan bo'lsa — indamay o'tamiz (faqat vizual qulaylik) */
    }
  };
  // Saqlash — rolga qarab: OWNER serverga (famPos), VIEWER o'z brauzeriga
  const persistPositions = (moved: { id: string; posX: number; posY: number }[]) => {
    if (isOwner) updateFamilyPositions(moved);
    else saveLocalPositions(moved);
  };

  // Doska ochilmagan bo'lsa ham a'zolarni yuklaymiz
  useEffect(() => {
    if (members.length === 0) void loadBoard();
  }, [members.length, loadBoard]);

  // Yaqin oila to'plamini ajratib, alohida doska quramiz
  const { board, count } = useMemo(() => {
    const allow = closeFamilyIds(members, rawEdges, anchorId);
    const subMembers = members.filter((m) => allow.has(m.id));
    const subEdges = rawEdges.filter((e) => allow.has(e.sourceId) && allow.has(e.targetId));
    const b = buildBoard(subMembers, subEdges);
    // Yorliqlarni ANKERGA nisbatan qayta belgilaymiz (viewer o'ziga nisbatan ko'radi)
    const labels = closeFamilyLabels(subMembers, subEdges, anchorId);
    // Avlod raqamlari TO'LIQ daraxt bo'yicha (eng tepa ajdod = 1-avlod) —
    // yaqin-oila kesimida hisoblansa raqamlar asosiy doskadan farq qilib qolardi
    const { generations } = relationInfoFrom(members, rawEdges, anchorId);
    for (const n of b.nodes) {
      n.data.relation = labels.get(n.id) ?? n.data.relation;
      n.data.generation = generations.get(n.id) ?? null;
      for (const sp of n.data.spouses) {
        sp.relation = labels.get(sp.id) ?? sp.relation;
        sp.generation = generations.get(sp.id) ?? null;
      }
    }
    // Boshlang'ich joylashuv: SAQLANGAN famPos bo'lsa — o'sha; bo'lmasa dagre
    const layout = computeLayout(
      b.nodes.map((n) => ({
        id: n.id,
        x: n.position.x,
        isRoot: n.data.isRoot,
        birthYear: n.data.birthYear,
        order: n.data.layoutOrder,
        width: 200 + n.data.spouses.length * 170,
      })),
      b.edges.map((e) => ({
        source: e.source,
        target: e.target,
        dashed: Boolean((e.data as { dashed?: boolean } | undefined)?.dashed),
        parentHandle: (e.sourceHandle as string | undefined) ?? undefined,
      })),
    );
    // Saqlangan joylashuv: OWNER — serverdagi famPos; VIEWER — o'z brauzeridagi
    const localPos = isOwner ? {} : loadLocalPositions();
    const byId = new Map(subMembers.map((m) => [m.id, m]));
    const positioned = b.nodes.map((n) => {
      if (!isOwner && localPos[n.id]) {
        return { ...n, position: { x: localPos[n.id].x, y: localPos[n.id].y } };
      }
      const m = byId.get(n.id);
      const saved = isOwner && m && m.famPosX != null && m.famPosY != null;
      return {
        ...n,
        position: saved
          ? { x: m!.famPosX as number, y: m!.famPosY as number }
          : (layout.get(n.id) ?? n.position),
      };
    });
    return { board: { nodes: positioned, edges: b.edges }, count: subMembers.length };
  }, [members, rawEdges, anchorId, isOwner]);

  const [nodes, setNodes, onNodesChange] = useNodesState(board.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(board.edges);

  // Manba o'zgarsa (yangi a'zo, yuklash) — doskani yangilaymiz
  useEffect(() => {
    setNodes(board.nodes);
    setEdges(board.edges);
  }, [board, setNodes, setEdges]);

  // Surish — ASOSIY DOSKA bilan bir xil: rejim o'chiq bo'lsa bolalari birga
  // suriladi; drag tugagach joylashuv SAQLANADI (famPos — alohida).
  const handleNodesChange = (changes: NodeChange<PersonNodeType>[]) => {
    const soloDrag = editMode;
    const extra: NodeChange<PersonNodeType>[] = [];
    if (!soloDrag) {
      for (const c of changes) {
        if (c.type === 'position' && c.dragging && c.position) {
          const dragged = nodes.find((n) => n.id === c.id);
          if (dragged) {
            const dx = c.position.x - dragged.position.x;
            const dy = c.position.y - dragged.position.y;
            if (dx !== 0 || dy !== 0) {
              for (const id of descendantIds(c.id, edges)) {
                const node = nodes.find((n) => n.id === id);
                if (node) {
                  extra.push({
                    id,
                    type: 'position',
                    position: { x: node.position.x + dx, y: node.position.y + dy },
                    dragging: true,
                  });
                }
              }
            }
          }
        }
      }
    }
    onNodesChange(extra.length ? [...changes, ...extra] : changes);

    for (const c of changes) {
      if (c.type === 'position' && c.dragging === false) {
        // Eng so'nggi holatni keyingi renderda emas, hozir hisoblaymiz
        const ids = soloDrag ? [c.id] : [c.id, ...descendantIds(c.id, edges)];
        const moved = ids
          .map((id) => nodes.find((n) => n.id === id))
          .filter((n): n is PersonNodeType => n != null)
          .map((n) => ({ id: n.id, posX: n.position.x, posY: n.position.y }));
        persistPositions(moved);
      }
    }
  };

  // "Tartiblash" — asosiy doskadagidek: qavatga (y) tekislash + shox
  // to'qnashuvlarini 100px bilan ochish; x boshqa o'zgarmaydi. SAQLANADI.
  const onArrange = () => {
    const edgeInfos = edges.map((e) => ({
      source: e.source,
      target: e.target,
      dashed: Boolean((e.data as { dashed?: boolean } | undefined)?.dashed),
    }));
    const rowYs = alignRowYs(
      nodes.map((n) => ({ id: n.id, isRoot: n.data.isRoot, height: n.measured?.height })),
      edgeInfos,
    );
    const newXs = resolveSubtreeOverlaps(
      nodes.map((n) => ({
        id: n.id,
        x: n.position.x,
        width: n.measured?.width ?? 200 + n.data.spouses.length * 170,
      })),
      edgeInfos,
    );
    const positioned = nodes.map((n) => ({
      ...n,
      position: {
        x: newXs.get(n.id) ?? n.position.x,
        y: rowYs.get(n.id) ?? n.position.y,
      },
    }));
    setNodes(positioned);
    persistPositions(
      positioned.map((n) => ({ id: n.id, posX: n.position.x, posY: n.position.y })),
    );
    setFitTick((t) => t + 1); // remount -> fitView (butun doska ko'rinadi)
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-brand-100 bg-white px-5 py-3.5">
        <div className="min-w-0">
          <h1 className="truncate font-serif text-lg font-semibold text-brand-900">Oila a&#39;zolarim</h1>
          <p className="truncate text-xs text-brand-500">Yaqin oila — {count} ta a&#39;zo</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* Yakka surish rejimi — bu sahifada VIEWER'ga ham ochiq (o'z
              ko'rinishini o'zi teradi; owner ma'lumotiga yozilmaydi).
              Umumiy Shajara doskasida esa ikonka faqat OWNER'da. */}
          <button
            type="button"
            onClick={() => setEditMode((v) => !v)}
            title={
              editMode
                ? "Yakka surish rejimini o'chirish (karta oilasi bilan suriladi)"
                : 'Yakka surish — faqat tanlangan kartani suradi (oilasi joyida qoladi)'
            }
            aria-pressed={editMode}
            className={`flex items-center justify-center rounded-field border px-3 py-2 transition-colors ${
              editMode
                ? 'border-brand-700 bg-brand-700 text-white hover:bg-brand-800'
                : 'border-brand-200 text-brand-800 hover:bg-brand-50'
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 2v20M2 12h20" strokeLinecap="round" />
              <path d="M9 5l3-3 3 3M9 19l3 3 3-3M5 9l-3 3 3 3M19 9l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onArrange}
            disabled={nodes.length < 2}
            title="Chiziqlarni tekislash — kartalar o'z qavatiga tekislanadi, chap-o'ng joylashuv saqlanadi"
            className="flex items-center gap-1.5 rounded-field border border-brand-200 px-2.5 py-2 text-sm font-medium text-brand-800 transition-colors hover:bg-brand-50 disabled:opacity-40 sm:px-4"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="shrink-0">
              <path d="M4 6h16M4 12h10M4 18h13" strokeLinecap="round" />
            </svg>
            <span className="hidden sm:inline">Tartiblash</span>
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1 bg-brand-50">
        {/* Yakka surish rejimi yoqiq — qisqa yo'riqnoma */}
        {editMode && (
          <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full bg-brand-800/90 px-4 py-1.5 text-xs font-medium text-white shadow-lg">
            Faqat TANLANGAN kartaning o&#8216;zi suriladi — rejim o&#8216;chiq bo&#8216;lsa oilasi bilan suriladi
          </div>
        )}
        {loading && members.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />
          </div>
        ) : (
          <ReactFlow
            key={fitTick}
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            nodesDraggable
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            fitViewOptions={{ padding: 0.15, maxZoom: 1.5 }}
            minZoom={0.1}
            maxZoom={2.5}
            nodesConnectable={false}
            deleteKeyCode={null}
            defaultEdgeOptions={{ type: 'smoothstep' }}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} color="#C8D6C4" />
            <Controls position="bottom-right" showInteractive={false} />
          </ReactFlow>
        )}
      </div>
    </div>
  );
}
