// features/tree/pages/TreeBoardPage.tsx
import { useEffect, useMemo, useState, type SVGProps } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext } from 'react-router-dom';
import {
  Background,
  BackgroundVariant,
  ControlButton,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { AppLayoutContext } from '@/app/AppLayout';
import { useAuthStore } from '@/features/auth';
import { useTreeStore, type PersonNodeType } from '@/features/tree/model/tree.store';
import type { RelationKey } from '@/features/tree/model/relations';
import type { Side } from '@/features/tree/model/kinship';
import { PersonNode } from '@/features/tree/components/PersonNode';
import { TreeEdge } from '@/features/tree/components/TreeEdge';
import { AddPersonDialog, type NewPerson } from '@/features/tree/components/AddPersonDialog';
import {
  EditPersonDialog,
  type EditablePerson,
  type EditedPerson,
} from '@/features/tree/components/EditPersonDialog';
import { ProfilePanel } from '@/features/tree/components/ProfilePanel';
import { MemberSearch, type SearchItem } from '@/features/tree/components/MemberSearch';
import {
  ConnectRelativeDialog,
  type PendingConnect,
} from '@/features/tree/components/ConnectRelativeDialog';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';

// Modul darajasida — har renderda qayta yaratilmaydi (React Flow talabi)
const nodeTypes = { person: PersonNode };
const edgeTypes = { tree: TreeEdge };

// Header/panel ikonkalari — shu sahifada bir necha marta ishlatiladi
const iconBase = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const MaleIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="14" height="14" {...iconBase} {...p}>
    <circle cx="10" cy="14" r="6" />
    <path d="M14.5 9.5 20 4M20 4h-5M20 4v5" />
  </svg>
);
const FemaleIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="14" height="14" {...iconBase} {...p}>
    <circle cx="12" cy="9" r="6" />
    <path d="M12 15v7M9 19h6" />
  </svg>
);
const SearchIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...iconBase} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);
const PlusIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...iconBase} strokeWidth={2.2} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const TargetIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="16" height="16" {...iconBase} {...p}>
    <circle cx="12" cy="12" r="7" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
  </svg>
);

// useReactFlow (fitView) faqat ReactFlowProvider ichida ishlaydi
export function TreeBoardPage() {
  return (
    <ReactFlowProvider>
      <TreeBoard />
    </ReactFlowProvider>
  );
}

function TreeBoard() {
  const { fitView, setCenter, getNode } = useReactFlow();
  const user = useAuthStore((s) => s.user);
  // AppLayout'ning umumiy header'idagi "amallar" bo'shlig'i — shu yerga
  // qidiruv/filtr/tugmalarni portal qilamiz (logotip AJDO ikki marta
  // takrorlanmasin uchun, u AppLayout'ning o'zida).
  const { topBarActionsEl } = useOutletContext<AppLayoutContext>();

  const nodes = useTreeStore((s) => s.nodes);
  const edges = useTreeStore((s) => s.edges);
  const loading = useTreeStore((s) => s.loading);
  const onNodesChange = useTreeStore((s) => s.onNodesChange);
  const onEdgesChange = useTreeStore((s) => s.onEdgesChange);
  const loadBoard = useTreeStore((s) => s.loadBoard);
  const addPerson = useTreeStore((s) => s.addPerson);
  const updatePerson = useTreeStore((s) => s.updatePerson);
  const removePerson = useTreeStore((s) => s.removePerson);
  const connectMembers = useTreeStore((s) => s.connectMembers);
  const autoLayout = useTreeStore((s) => s.autoLayout);
  const access = useTreeStore((s) => s.access);
  const layoutEdit = useTreeStore((s) => s.layoutEdit);
  const setLayoutEdit = useTreeStore((s) => s.setLayoutEdit);
  const isOwner = access?.role === 'OWNER';

  const [addOpen, setAddOpen] = useState(false);
  const [addAnchorId, setAddAnchorId] = useState<string | null>(null);
  const [addAnchorName, setAddAnchorName] = useState('');
  const [addAnchorGender, setAddAnchorGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [profileId, setProfileId] = useState<string | null>(null);
  const [editPerson, setEditPerson] = useState<EditablePerson | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [arranging, setArranging] = useState(false);
  const [pendingConnect, setPendingConnect] = useState<PendingConnect | null>(null);
  // Mobil qidiruv qatori — sarlavhadagi lupa ikonkasi bosilganda ochiladi/yopiladi
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  // Ota tomon / ona tomon — IKKI HOLATLI (radio) filtr, "filtrsiz/hammasi"
  // degan uchinchi holat YO'Q: doskada doim FAQAT bitta tomon ko'rinadi.
  // `side` uchta qiymat oladi: PATERNAL/MATERNAL (aniq qon-qarindosh tomoni),
  // NEUTRAL (ildizning o'z yaqin doirasi — o'zi, turmush o'rtog'i, farzandi,
  // aka-uka, jiyan — ikkala tomonda ham ko'rinadi), yoki umuman yo'q/null
  // (nikoh orqali qo'shilgan, qondosh emas — masalan tog'aning xotinining
  // o'z ota-onasi/opa-singli — "quda") — bunday odam HECH QAYSI tomonda
  // ko'rinmaydi.
  const [sideFilter, setSideFilter] = useState<Side>('PATERNAL');

  // Joriy ko'ruvchining O'Z tuguni: VIEWER uchun uning anker a'zosi
  // (access.anchorMemberId — bu spouse sifatida boshqa kartaga birlashgan
  // bo'lishi ham mumkin, shu sabab kartani qidiramiz), OWNER uchun (yoki
  // anker bo'lmasa) daraxtning isRoot tuguni. AVVAL bu doim isRoot'ga qarardi
  // — shu sabab VIEWER "Menga o'tish"ni bossa har doim DARAXT EGASIga (root)
  // borar edi, o'ziga emas.
  const myId = useMemo(() => {
    const anchorId = access?.anchorMemberId;
    if (anchorId) {
      for (const n of nodes) {
        if (n.id === anchorId || n.data.spouses.some((s) => s.id === anchorId)) return n.id;
      }
    }
    return nodes.find((n) => n.data.isRoot)?.id ?? null;
  }, [nodes, access]);

  const displayedNodes = useMemo(() => {
    // Kartadagi biror kishi (primary yoki turmush o'rtoqlaridan biri) tanlangan
    // tomonga mos yoki NEUTRAL bo'lsa, butun karta ko'rinadi.
    const visible = (side: Side | null) => side === 'NEUTRAL' || side === sideFilter;
    return nodes.filter((n) => visible(n.data.side) || n.data.spouses.some((sp) => visible(sp.side)));
  }, [nodes, sideFilter]);
  const displayedEdges = useMemo(() => {
    const visibleIds = new Set(displayedNodes.map((n) => n.id));
    return edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target));
  }, [edges, displayedNodes]);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  // "Tartiblash" — FAQAT CHIZIQLARNI tekislaydi: har kartani o'z QAVATIGA
  // (avlod qatoriga) tepa-pastga tekislaydi, CHAP-O'NGGA UMUMAN TEGMAYDI.
  // Kartalarning gorizontal joylashuvi faqat qo'lda (joylashuv rejimida).
  const onArrange = async () => {
    setArranging(true);
    try {
      await autoLayout();
      setTimeout(() => fitView({ padding: 0.15, maxZoom: 1.2, duration: 400 }), 50);
    } finally {
      setArranging(false);
    }
  };

  // Profil paneli uchun tanlangan tugun ma'lumoti
  const profileNode = useMemo(() => {
    const node = nodes.find((n) => n.id === profileId);
    return node ? { ...node.data, id: node.id } : null;
  }, [nodes, profileId]);

  // Header'dan qo'shish — tanlangan kartaga (bo'lmasa o'zimga/root);
  // paneldan qo'shish — aynan o'sha odamga.
  const openAddDefault = () => {
    const selected = nodes.find((n) => n.selected);
    setAddAnchorId(selected?.id ?? myId);
    setAddAnchorName(selected?.data.name ?? user?.fullName ?? '');
    setAddAnchorGender(selected?.data.gender ?? 'MALE');
    setAddOpen(true);
  };
  const openAddToPerson = (anchorId: string, anchorName: string, anchorGender: 'MALE' | 'FEMALE') => {
    setAddAnchorId(anchorId);
    setAddAnchorName(anchorName);
    setAddAnchorGender(anchorGender);
    setAddOpen(true);
  };
  const onAdd = async (p: NewPerson) => {
    await addPerson(p, addAnchorId ?? undefined);
    // Avtomatik tartiblashdan keyin butun daraxtni ko'rinishga moslaymiz
    setTimeout(() => fitView({ padding: 0.15, maxZoom: 1.2, duration: 400 }), 60);
  };

  // Qidiruv ro'yxati — har kartadagi asosiy odam va turmush o'rtoqlar
  const searchItems = useMemo<SearchItem[]>(() => {
    const items: SearchItem[] = [];
    for (const n of displayedNodes) {
      items.push({ id: n.id, name: n.data.name, relation: n.data.relation });
      for (const sp of n.data.spouses) {
        items.push({ id: sp.id, name: sp.name, relation: sp.relation });
      }
    }
    return items;
  }, [displayedNodes]);

  // Berilgan a'zo (asosiy yoki turmush o'rtog'i) qaysi KARTADA — o'sha karta id'si
  const nodeIdForMember = (memberId: string): string | null => {
    for (const n of nodes) {
      if (n.id === memberId) return n.id;
      if (n.data.spouses.some((s) => s.id === memberId)) return n.id;
    }
    return null;
  };

  // A'zoга kamera bilan "uchib borish" — kartani markazga olib, profilini ochamiz
  const focusMember = (memberId: string) => {
    const nodeId = nodeIdForMember(memberId);
    if (!nodeId) return;
    const node = getNode(nodeId);
    if (!node) return;
    const w = node.measured?.width ?? 220;
    const h = node.measured?.height ?? 90;
    void setCenter(node.position.x + w / 2, node.position.y + h / 2, { zoom: 1.2, duration: 600 });
    setProfileId(nodeId);
  };

  // "Menga o'tish" — root (o'zim) tuguniga yo'naltiradi
  const goToMe = () => {
    if (myId) focusMember(myId);
  };

  // Kartadagi istalgan odam (primary yoki turmush o'rtog'i) nomini topamiz
  const memberName = (id: string): string => {
    for (const n of nodes) {
      if (n.id === id) return n.data.name;
      const sp = n.data.spouses.find((s) => s.id === id);
      if (sp) return sp.name;
    }
    return '';
  };

  // Chiziq tortib ikki a'zoni bog'lash — "kim bo'ladi?" dialogini ochamiz
  const onConnect = (c: Connection) => {
    let fromId = c.sourceHandle ?? c.source;
    let toId = c.targetHandle ?? c.target;
    if (!fromId || !toId || fromId === toId) return;
    // Root (o'zimiz)ni re-parent qilib bo'lmaydi — u doim ANKER (from) bo'lsin.
    // Shu bois a'zoni root'ga chizsangiz ham to'g'ri ishlaydi (403 bo'lmaydi).
    const isRoot = (id: string) => nodes.find((n) => n.id === id)?.data.isRoot ?? false;
    if (isRoot(toId)) {
      [fromId, toId] = [toId, fromId];
    }
    setPendingConnect({ fromId, toId, fromName: memberName(fromId), toName: memberName(toId) });
  };

  const onConfirmConnect = async (relation: RelationKey) => {
    if (!pendingConnect) return;
    await connectMembers(pendingConnect.fromId, pendingConnect.toId, relation);
    setTimeout(() => fitView({ padding: 0.15, maxZoom: 1.2, duration: 400 }), 60);
  };
  const onSaveEdit = (id: string, patch: EditedPerson) => updatePerson(id, patch);

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await removePerson(deleteId);
      setDeleteId(null);
      setProfileId(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-brand-50">
      {/* Bu sahifaning yuqori panel amallari (qidiruv, filtr, tugmalar) endi
          BU YERDA emas — AppLayout'ning UMUMIY, to'liq kenglikdagi header'iga
          portal qilib joylashtiriladi (logotip AJDO ham shu umumiy header'da,
          ikkinchi marta takrorlanmasin uchun). mockup: desktopajdo.png. */}
      {topBarActionsEl &&
        createPortal(
          <>
            {/* Ism/familiya bo'yicha qidirish — topilgan a'zoga kamera uchib boradi */}
            <div className="mx-2 hidden flex-1 justify-center md:flex">
              <MemberSearch items={searchItems} onSelect={focusMember} />
            </div>

            <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
              {/* Ota tomon / Ona tomon — radio: doim aynan bittasi faol, ikkalasi
                  birga yoki "hammasi" holati yo'q. Doira ikonkalar (♂/♀), o'z
                  bordered "bloki" ichida — app uslubi. Ona tomon tanlansa PUSHTI,
                  Ota tomon — brend yashili (o'z holicha). */}
              <div role="radiogroup" aria-label="Qarindoshlik tomoni" className="flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50/60 p-1">
                <button
                  type="button"
                  onClick={() => setSideFilter('PATERNAL')}
                  role="radio"
                  aria-checked={sideFilter === 'PATERNAL'}
                  title="Faqat ota tomon oila a'zolarini ko'rsatish"
                  className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors sm:h-8 sm:w-8 ${
                    sideFilter === 'PATERNAL'
                      ? 'bg-brand-700 text-white'
                      : 'text-brand-700 hover:bg-white'
                  }`}
                >
                  <MaleIcon />
                </button>
                <button
                  type="button"
                  onClick={() => setSideFilter('MATERNAL')}
                  role="radio"
                  aria-checked={sideFilter === 'MATERNAL'}
                  title="Faqat ona tomon oila a'zolarini ko'rsatish"
                  className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors sm:h-8 sm:w-8 ${
                    sideFilter === 'MATERNAL'
                      ? 'bg-pink-600 text-white'
                      : 'text-pink-600 hover:bg-white'
                  }`}
                >
                  <FemaleIcon />
                </button>
              </div>
              {/* Qidiruv — mobilda lupa ikonkasi pastdagi qatorni ochadi/yopadi;
                  md+ da yuqoridagi to'liq qidiruv maydoni ko'rinadi (shu tugma yo'q).
                  O'z bordered "bloki" — app uslubi. */}
              <button
                type="button"
                onClick={() => setMobileSearchOpen((v) => !v)}
                title="Qidirish"
                aria-label="Qidirish"
                aria-pressed={mobileSearchOpen}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors md:hidden ${
                  mobileSearchOpen
                    ? 'border-brand-700 bg-brand-700 text-white'
                    : 'border-brand-200 text-brand-700 hover:bg-brand-50'
                }`}
              >
                <SearchIcon />
              </button>
              {/* Foydalanuvchi ismini bosish -> o'zimga (root) yo'naltiradi */}
              <button
                type="button"
                onClick={goToMe}
                disabled={!myId}
                title="Menga o'tish (o'zimni ko'rsatish)"
                className="hidden items-center gap-1.5 rounded-full bg-brand-50 py-1.5 pl-1.5 pr-3 text-sm font-medium text-brand-800 transition-colors hover:bg-brand-100 disabled:opacity-40 sm:flex"
              >
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-800"
                  aria-hidden
                >
                  {(user?.fullName ?? '?').trim().charAt(0).toUpperCase()}
                </span>
                {user?.fullName}
              </button>
              {/* Joylashuvni to'g'irlash rejimi — FAQAT OWNER; viewer'ga ko'rinmaydi.
                  Yoqiq: kartalarni surish mumkin, surilgani QULFLANADI (Tartiblash surmaydi).
                  O'chiq: kartalar qimirlamaydi. Mobilda (< sm) joy tejash uchun
                  yashiringan — Tartiblash bilan birga kattaroq ekranda chiqadi. */}
              {isOwner && (
                <button
                  type="button"
                  onClick={() => setLayoutEdit(!layoutEdit)}
                  title={
                    layoutEdit
                      ? "Yakka surish rejimini o'chirish (karta oilasi bilan suriladi)"
                      : "Yakka surish — faqat tanlangan kartani suradi (oilasi joyida qoladi)"
                  }
                  aria-pressed={layoutEdit}
                  className={`hidden h-9 w-9 items-center justify-center rounded-full transition-colors sm:flex ${
                    layoutEdit
                      ? 'bg-brand-700 text-white hover:bg-brand-800'
                      : 'bg-brand-50 text-brand-800 hover:bg-brand-100'
                  }`}
                >
                  {/* Surish (move) ikonkasi */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M12 2v20M2 12h20" strokeLinecap="round" />
                    <path d="M9 5l3-3 3 3M9 19l3 3 3-3M5 9l-3 3 3 3M19 9l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={onArrange}
                disabled={arranging || nodes.length < 2}
                title="Chiziqlarni tekislash — kartalar o'z qavatiga (tepa-past) tekislanadi, chap-o'ng joylashuv o'zgarmaydi"
                aria-label="Tartiblash"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-800 transition-colors hover:bg-brand-100 disabled:opacity-40 sm:h-auto sm:w-auto sm:gap-1.5 sm:rounded-full sm:px-4 sm:py-2 sm:text-sm sm:font-medium"
              >
                {/* Tartiblash (auto-arrange) ikonkasi — mobilда HAM ko'rinadi (faqat
                    ikonka), desktop bilan bir xil vazifa — sm+ da matn ham chiqadi */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="shrink-0">
                  <path d="M4 6h16M4 12h10M4 18h13" strokeLinecap="round" />
                </svg>
                <span className="hidden sm:inline">{arranging ? 'Tartiblanmoqda…' : 'Tartiblash'}</span>
              </button>
              <button
                type="button"
                onClick={openAddDefault}
                title="Qarindosh qo'shish"
                aria-label="Qarindosh qo'shish"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white shadow-sm transition-colors hover:bg-brand-800 sm:h-auto sm:w-auto sm:rounded-full sm:px-4 sm:py-2"
              >
                <PlusIcon className="sm:hidden" />
                <span className="hidden sm:inline text-sm font-semibold">+ Qarindosh qo&#8216;shish</span>
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

      {/* Doska */}
      <div className="relative min-h-0 flex-1">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-brand-50/70">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />
          </div>
        )}

       

        <ReactFlow
          nodes={displayedNodes}
          edges={displayedEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesDraggable={isOwner}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={(_, node: PersonNodeType) => setProfileId(node.id)}
          onConnect={onConnect}
          fitView
          fitViewOptions={{ padding: 0.15, maxZoom: 1.2 }}
          minZoom={0.05}
          maxZoom={4}
          deleteKeyCode={null}
          defaultEdgeOptions={{ type: 'smoothstep' }}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} color="#C8D6C4" />
          <Controls position="bottom-right" showInteractive={false}>
            {/* "Menga o'tish" — zoom panelida, mobilda sarlavha tor bo'lgani
                uchun (u yerdagi matnli tugma sm+da ko'rinadi) doim qo'l
                yetadigan joyda turishi uchun. */}
            <ControlButton onClick={goToMe} disabled={!myId} title="Menga o'tish (o'zimni ko'rsatish)">
              <TargetIcon />
            </ControlButton>
          </Controls>
        </ReactFlow>
        {/* Zoom paneli uslubi — BottomNav bilan bir xil "app" ko'rinishi:
            border + yumaloq burchak + soya, ikonkalar brend rangida.
            index.css'dagi umumiy override ISHLAMAYDI (@xyflow/react/dist/
            style.css shu sahifaning o'z JS chunk'i ichida import qilingani
            uchun Vite ularni build paytida bitta CSS faylga birlashtirib,
            bizning umumiy qoidalarimizni sirli chiqarib tashlaydi) — shu
            sabab bu yerda, komponentning O'ZIDA, inline <style> orqali. */}
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
        `}</style>

        <ProfilePanel
          node={profileNode}
          access={access}
          onClose={() => setProfileId(null)}
          onEdit={(person) => setEditPerson(person)}
          onDelete={(id) => setDeleteId(id)}
          onAddRelative={openAddToPerson}
        />
      </div>

      <AddPersonDialog
        open={addOpen}
        anchorName={addAnchorName}
        anchorGender={addAnchorGender}
        onClose={() => setAddOpen(false)}
        onAdd={onAdd}
      />
      <EditPersonDialog
        person={editPerson}
        onClose={() => setEditPerson(null)}
        onSave={onSaveEdit}
      />
      <ConnectRelativeDialog
        pending={pendingConnect}
        onClose={() => setPendingConnect(null)}
        onConfirm={onConfirmConnect}
      />
      <ConfirmDialog
        open={deleteId !== null}
        title="O'chirasizmi?"
        message="Bu odam va uning rishtalari o'chiriladi. Bu amalni qaytarib bo'lmaydi."
        confirmLabel="O'chirish"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
