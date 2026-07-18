// features/tree/pages/FamilyMembersPage.tsx
import { useEffect, useMemo, useState, type SVGProps } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Background,
  BackgroundVariant,
  ControlButton,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { AppLayoutContext } from '@/app/AppLayout';
import { descendantIds, useTreeStore, type PersonNodeType } from '@/features/tree/model/tree.store';
import { buildBoard } from '@/features/tree/model/build-board';
import { alignRowYs, computeLayout, resolveSubtreeOverlaps } from '@/features/tree/model/layout';
import { closeFamilyIds, closeFamilyLabels, relationInfoFrom } from '@/features/tree/model/kinship';
import { PersonNode } from '@/features/tree/components/PersonNode';
import { TreeEdge } from '@/features/tree/components/TreeEdge';
import { MemberSearch, type SearchItem } from '@/features/tree/components/MemberSearch';
import { MobileStorageChip, useStorageChipVisibility } from '@/features/storage/components/MobileStorageChip';

const nodeTypes = { person: PersonNode };
const edgeTypes = { tree: TreeEdge };

const iconBase = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const FullscreenEnterIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="15" height="15" {...iconBase} {...p}>
    <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" />
  </svg>
);
const FullscreenExitIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="15" height="15" {...iconBase} {...p}>
    <path d="M8 3v3a2 2 0 0 1-2 2H3M16 3v3a2 2 0 0 0 2 2h3M21 16h-3a2 2 0 0 0-2 2v3M8 21v-3a2 2 0 0 0-2-2H3" />
  </svg>
);

// useReactFlow (setCenter/getNode — qidiruvdan kamera bilan uchib borish
// uchun) faqat ReactFlowProvider ichida ishlaydi.
export function FamilyMembersPage() {
  return (
    <ReactFlowProvider>
      <FamilyMembersBoard />
    </ReactFlowProvider>
  );
}

function FamilyMembersBoard() {
  const { t } = useTranslation();
  const { setCenter, getNode } = useReactFlow();
  const { topBarActionsEl, boardFullscreen, setBoardFullscreen } = useOutletContext<AppLayoutContext>();
  const { effectivelyHidden: storageChipHidden } = useStorageChipVisibility();
  const members = useTreeStore((s) => s.members);
  const rawEdges = useTreeStore((s) => s.rawEdges);
  const loadBoard = useTreeStore((s) => s.loadBoard);
  const loading = useTreeStore((s) => s.loading);
  const updateFamilyPositions = useTreeStore((s) => s.updateFamilyPositions);
  const access = useTreeStore((s) => s.access);
  const anchorId = access?.anchorMemberId ?? undefined;
  const isOwner = access?.role === 'OWNER';

  const [editMode, setEditMode] = useState(false);
  const [fitTick, setFitTick] = useState(0);
  // Mobil qidiruv qatori — sarlavhadagi lupa ikonkasi bosilganda ochiladi/yopiladi
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

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
    }
  };
  const persistPositions = (moved: { id: string; posX: number; posY: number }[]) => {
    if (isOwner) updateFamilyPositions(moved);
    else saveLocalPositions(moved);
  };

  useEffect(() => {
    if (members.length === 0) void loadBoard();
  }, [members.length, loadBoard]);

  const { board, count } = useMemo(() => {
    const allow = closeFamilyIds(members, rawEdges, anchorId);
    const subMembers = members.filter((m) => allow.has(m.id));
    const subEdges = rawEdges.filter((e) => allow.has(e.sourceId) && allow.has(e.targetId));
    const b = buildBoard(subMembers, subEdges);
    const labels = closeFamilyLabels(subMembers, subEdges, anchorId);
    const { generations } = relationInfoFrom(members, rawEdges, anchorId);
    for (const n of b.nodes) {
      n.data.relation = labels.get(n.id) ?? n.data.relation;
      n.data.generation = generations.get(n.id) ?? null;
      for (const sp of n.data.spouses) {
        sp.relation = labels.get(sp.id) ?? sp.relation;
        sp.generation = generations.get(sp.id) ?? null;
      }
    }
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

  useEffect(() => {
    setNodes(board.nodes);
    setEdges(board.edges);
  }, [board, setNodes, setEdges]);

  // Qidiruv ro'yxati — har kartadagi asosiy odam va turmush o'rtoqlar
  const searchItems = useMemo<SearchItem[]>(() => {
    const items: SearchItem[] = [];
    for (const n of nodes) {
      items.push({ id: n.id, name: n.data.name, relation: n.data.relation });
      for (const sp of n.data.spouses) {
        items.push({ id: sp.id, name: sp.name, relation: sp.relation });
      }
    }
    return items;
  }, [nodes]);

  // Berilgan a'zo (asosiy yoki turmush o'rtog'i) qaysi KARTADA — o'sha karta id'si
  const nodeIdForMember = (memberId: string): string | null => {
    for (const n of nodes) {
      if (n.id === memberId) return n.id;
      if (n.data.spouses.some((s) => s.id === memberId)) return n.id;
    }
    return null;
  };

  // A'zoga kamera bilan "uchib borish" — kartani markazga oladi
  const focusMember = (memberId: string) => {
    const nodeId = nodeIdForMember(memberId);
    if (!nodeId) return;
    const node = getNode(nodeId);
    if (!node) return;
    const w = node.measured?.width ?? 220;
    const h = node.measured?.height ?? 90;
    void setCenter(node.position.x + w / 2, node.position.y + h / 2, { zoom: 1.2, duration: 600 });
  };

  // To'liq ekran — FAQAT Sidebar/header/BottomNav Apple uslubida animatsiya
  // bilan yashiriladi (AppLayout'da). Doskaning o'zi (pan/zoom, kartalar
  // joyi) BUTUNLAY TEGILMAYDI — fitView chaqirilmaydi, aks holda kartalar
  // "qimirlab" ketardi.
  const toggleFullscreen = () => {
    setBoardFullscreen(!boardFullscreen);
  };

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
        const ids = soloDrag ? [c.id] : [c.id, ...descendantIds(c.id, edges)];
        const moved = ids
          .map((id) => nodes.find((n) => n.id === id))
          .filter((n): n is PersonNodeType => n != null)
          .map((n) => ({ id: n.id, posX: n.position.x, posY: n.position.y }));
        persistPositions(moved);
      }
    }
  };
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
    setFitTick((t) => t + 1); 
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {topBarActionsEl &&
        createPortal(
          <>
            <div className="min-w-0 shrink-0">
              <p className="truncate text-sm font-semibold text-brand-900">{t('tree.familyPage.title')}</p>
              <p className="hidden truncate text-xs text-brand-500 sm:block">{t('tree.familyPage.subtitle', { count })}</p>
            </div>
            {/* Ism/familiya bo'yicha qidirish — topilgan a'zoga kamera uchib boradi */}
            <div className="mx-2 hidden flex-1 justify-center md:flex">
              <MemberSearch items={searchItems} onSelect={focusMember} />
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3">
              {/* Qidiruv — mobilda lupa ikonkasi pastdagi qatorni ochadi/yopadi;
                  md+ da yuqoridagi to'liq qidiruv maydoni ko'rinadi. */}
              <button
                type="button"
                onClick={() => setMobileSearchOpen((v) => !v)}
                title={t('common.search')}
                aria-label={t('common.search')}
                aria-pressed={mobileSearchOpen}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors md:hidden ${
                  mobileSearchOpen
                    ? 'border-brand-700 bg-brand-700 text-white'
                    : 'border-brand-200 text-brand-700 hover:bg-brand-50'
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setEditMode((v) => !v)}
                title={
                  editMode
                    ? t('tree.board.singleDragOffTitle')
                    : t('tree.board.singleDragOnTitle')
                }
                aria-pressed={editMode}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
                  editMode
                    ? 'bg-brand-700 text-white hover:bg-brand-800'
                    : 'bg-brand-50 text-brand-800 hover:bg-brand-100'
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
                aria-label={t('tree.board.arrange')}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-800 transition-colors hover:bg-brand-100 disabled:opacity-40 sm:h-auto sm:w-auto sm:gap-1.5 sm:rounded-full sm:px-4 sm:py-2 sm:text-sm sm:font-medium"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="shrink-0">
                  <path d="M4 6h16M4 12h10M4 18h13" strokeLinecap="round" />
                </svg>
                <span className="hidden sm:inline">{t('tree.board.arrange')}</span>
              </button>
            </div>
          </>,
          topBarActionsEl,
        )}

      {/* Mobil qidiruv qatori — sarlavhadagi lupa ikonkasi bilan ochiladi/yopiladi */}
      {mobileSearchOpen && (
        <div className="flex shrink-0 items-center gap-2 border-b border-brand-100 bg-white px-4 py-2 md:hidden">
          <MemberSearch items={searchItems} onSelect={focusMember} />
        </div>
      )}

      <div className="relative min-h-0 flex-1 bg-brand-50">
        <MobileStorageChip />

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
            {/* Mobilda MobileStorageChip pastda joylashgani uchun panel ozgina
                YUQORIGA suriladi; chip yashirilgan bo'lsa bo'shliq shart
                emas — desktopda (Sidebar'da xotira bloki bor) odatdagi
                joyida qoladi. */}
            <Controls
              position="bottom-right"
              showFitView={false}
              showInteractive={false}
              className={`${storageChipHidden ? '!bottom-[18px]' : '!bottom-[74px]'} md:!bottom-[10px]`}
            >
              {/* Standart "fit view" tugmasi butunlay o'chirilgan
                  (showFitView=false) — shu o'rniga TO'LIQ EKRAN tugmasi. */}
              <ControlButton
                onClick={toggleFullscreen}
                title={boardFullscreen ? t('tree.board.fullscreenExit') : t('tree.board.fullscreenEnter')}
              >
                {boardFullscreen ? <FullscreenExitIcon /> : <FullscreenEnterIcon />}
              </ControlButton>
            </Controls>
          </ReactFlow>
        )}
        <style>{`
          .react-flow__controls {
            border: 2px solid #CBD9C4;
            border-radius: 1rem;
            overflow: hidden;
            box-shadow: 0 4px 14px rgba(23, 41, 30, 0.12);
          }
          .react-flow__controls-button {
            width: 34px;
            height: 34px;
            background: #ffffff;
            color: #2C4A38;
            border-bottom-color: #E7EDE2;
          }
          .react-flow__controls-button:hover {
            background: #F3F6F0;
            color: #213A2B;
          }
          .react-flow__controls-button:disabled svg {
            fill-opacity: 0.35;
          }

          /* Ko'rinish rejimlari (Soft/Light/Dark) — index.css'dagi BIR XIL
             override texnikasi, shu sahifaga TAKRORLANGAN (yuqoridagi
             izohda tushuntirilgan sabab bilan: umumiy index.css qoidalari
             bu sahifaning alohida React Flow JS chunk'iga yetib bormaydi). */
          [data-theme='light'] .bg-white,
          [data-theme='light'] .bg-white\/90,
          [data-theme='light'] .bg-pink-50,
          [data-theme='light'] .bg-brand-50\/40,
          [data-theme='light'] .bg-brand-50\/50,
          [data-theme='light'] .bg-brand-50\/60,
          [data-theme='light'] .bg-brand-50\/70 {
            background-color: rgb(255 255 255 / 0.16) !important;
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
          }
          /* Sahifaning O'ZI (bu doskaning butun foni) — FAQAT bare
             bg-brand-50 (opacity-suffiksisiz) — .bg-white kabi alohida
             panel emas, shu bois BLUR YO'Q (aks holda tabiat surati
             butun ekran bo'ylab xiralashib ko'rinmay qolardi). */
          [data-theme='light'] .bg-brand-50 {
            background-color: rgb(255 255 255 / 0.06) !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }
          /* ISTISNO: MemberSearch qidiruv maydoni HAM bare bg-brand-50
             ishlatadi, lekin sahifa foni EMAS — kichik input. Composite
             selektor orqali (border-transparent bilan birga) ANIQ
             ajratiladi. */
          [data-theme='light'] .bg-brand-50.border-transparent {
            background-color: rgb(255 255 255 / 0.35) !important;
            backdrop-filter: blur(16px) !important;
            -webkit-backdrop-filter: blur(16px) !important;
            border-color: rgb(255 255 255 / 0.7) !important;
          }
          [data-theme='light'] .border-brand-100,
          [data-theme='light'] .border-brand-200,
          [data-theme='light'] .border-pink-200 {
            border-color: rgb(23 41 30 / 0.16) !important;
          }
          [data-theme='light'] .border-neutral-200 {
            border-color: rgb(255 255 255 / 0.7) !important;
            box-shadow: inset 0 1px 0 0 rgb(255 255 255 / 0.6), 0 2px 8px -4px rgb(23 41 30 / 0.12);
          }
          [data-theme='light'] .react-flow__controls {
            border-color: rgb(255 255 255 / 0.65);
            background: rgb(255 255 255 / 0.16);
            backdrop-filter: blur(12px);
          }
          [data-theme='light'] .react-flow__controls-button {
            background: transparent;
            color: #17291E;
          }
          [data-theme='light'] .react-flow__controls-button:hover {
            background: rgb(255 255 255 / 0.3);
            color: #17291E;
          }
          [data-theme='light'] .shadow-card,
          [data-theme='light'] .shadow-sm {
            box-shadow: 0 10px 36px -6px rgb(23 41 30 / 0.28), inset 0 1px 0 0 rgb(255 255 255 / 0.6);
          }

          [data-theme='dark'] .bg-white,
          [data-theme='dark'] .bg-white\/90,
          [data-theme='dark'] .bg-pink-50,
          [data-theme='dark'] .bg-brand-50\/40,
          [data-theme='dark'] .bg-brand-50\/50,
          [data-theme='dark'] .bg-brand-50\/60,
          [data-theme='dark'] .bg-brand-50\/70 {
            background-color: rgb(18 20 18 / 0.55) !important;
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
          }
          [data-theme='dark'] .bg-brand-50 {
            background-color: rgb(6 8 6 / 0.35) !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }
          [data-theme='dark'] .bg-brand-50.border-transparent {
            background-color: rgb(24 26 24 / 0.6) !important;
            backdrop-filter: blur(16px) !important;
            -webkit-backdrop-filter: blur(16px) !important;
            border-color: rgb(255 255 255 / 0.16) !important;
          }
          [data-theme='dark'] .border-brand-100,
          [data-theme='dark'] .border-brand-200,
          [data-theme='dark'] .border-pink-200 {
            border-color: rgb(255 255 255 / 0.14) !important;
          }
          [data-theme='dark'] .border-neutral-200 {
            border-color: rgb(255 255 255 / 0.14) !important;
            box-shadow: inset 0 1px 0 0 rgb(255 255 255 / 0.06), 0 2px 8px -4px rgb(0 0 0 / 0.5);
          }
          [data-theme='dark'] .shadow-card,
          [data-theme='dark'] .shadow-sm {
            box-shadow: 0 10px 36px -6px rgb(0 0 0 / 0.5), inset 0 1px 0 0 rgb(255 255 255 / 0.06);
          }
          [data-theme='dark'] .text-brand-900 { color: #F0F2EA !important; }
          [data-theme='dark'] .text-brand-800 { color: #E2E6DA !important; }
          [data-theme='dark'] .text-brand-700 { color: #C6D0BC !important; }
          [data-theme='dark'] .text-brand-600 { color: #A8B69C !important; }
          [data-theme='dark'] .text-brand-500 { color: #8FA084 !important; }
          [data-theme='dark'] .react-flow__controls {
            border-color: rgb(255 255 255 / 0.14);
            background: rgb(18 20 18 / 0.55);
            backdrop-filter: blur(12px);
            box-shadow: none;
          }
          [data-theme='dark'] .react-flow__controls-button {
            background: transparent;
            color: #C6D0BC;
            border-bottom-color: rgb(255 255 255 / 0.1);
          }
          [data-theme='dark'] .react-flow__controls-button:hover {
            background: rgb(255 255 255 / 0.08);
            color: #F0F2EA;
          }
        `}</style>
      </div>
    </div>
  );
}
