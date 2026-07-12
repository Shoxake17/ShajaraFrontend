// features/tree/model/tree.store.ts
// Manba — server a'zolari + rishtalari; doska buildBoard orqali derivatsiya qilinadi
// (turmush o'rtoq birlashuvi va qarindoshlik yorliqlari shu yerda hisoblanadi).
import { create } from 'zustand';
import {
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react';
import { familyApi } from '@/features/tree/api/family.api';
import { useStorageStore } from '@/features/storage/storage.store';
import { placementFor, type Gender, type RelationKey } from './relations';
import { alignRowYs, resolveSubtreeOverlaps } from './layout';
import { buildBoard, type PersonNodeType } from './build-board';
import type { BoardAccess, FamilyEdgeDto, FamilyMemberDto } from '@/features/tree/types';

export type { PersonData, PersonNodeType } from './build-board';

interface AddInput {
  fullName: string;
  relation: RelationKey;
  gender: Gender;
  birthYear?: number;
  deathYear?: number;
  photoUrl?: string;
  photoSizeBytes?: number;
  spouseOrder?: number;
}

interface EditInput {
  fullName: string;
  gender: Gender;
  birthYear: number | null;
  deathYear: number | null;
  /** FAQAT yangi rasm tanlangan bo'lsa berilgan (R2 kalit) — aks holda
      yuborilmaydi, chunki eski qiymat ko'rish uchun IMZOLANGAN havola. */
  photoUrl?: string | null;
  photoSizeBytes?: number;
  /** Qarindoshlik (kimligi) o'zgargan bo'lsa */
  relation?: RelationKey;
  /** Nechanchi turmush o'rtog'i (qo'lda). null — avtomatik. */
  spouseOrder?: number | null;
}

interface TreeState {
  members: FamilyMemberDto[];
  rawEdges: FamilyEdgeDto[];
  nodes: PersonNodeType[];
  edges: Edge[];
  loading: boolean;
  /** Foydalanuvchining faol daraxtga huquqi (OWNER/VIEWER, anchor) */
  access: BoardAccess | null;
  /**
   * Joylashuvni to'g'irlash rejimi — faqat tuzatish ikonkasi bilan yoqiladi.
   * Yoqiq: owner kartalarni suradi, surilgan karta QULFLANADI (Tartiblash surmaydi).
   * O'chiq: kartalar surilmaydi (tasodifiy o'zgarishdan himoya).
   */
  layoutEdit: boolean;
  setLayoutEdit: (on: boolean) => void;
  onNodesChange: (changes: NodeChange<PersonNodeType>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  loadBoard: () => Promise<void>;
  /** anchorId berilsa — o'sha odamga, aks holda tanlangan/root ga qo'shiladi */
  addPerson: (input: AddInput, anchorId?: string) => Promise<void>;
  updatePerson: (id: string, patch: EditInput) => Promise<void>;
  removePerson: (id: string) => Promise<void>;
  /** Mavjud ikki a'zoni chiziq bilan bog'lash (toId -> fromId'ga relation) */
  connectMembers: (fromId: string, toId: string, relation: RelationKey) => Promise<void>;
  /**
   * "Tartiblash" — FAQAT VERTIKAL tekislash: har karta o'z qavatiga (avlod
   * qatoriga) y bo'yicha tekislanadi, x (chap-o'ng) UMUMAN o'zgarmaydi.
   * Kartalarning gorizontal joylashuvi faqat qo'lda (joylashuv rejimida) qilinadi.
   */
  autoLayout: () => Promise<void>;
  /**
   * "Oila a'zolarim" ko'rinishining joylashuvini saqlash (asosiy doskadan
   * ALOHIDA — famPosX/famPosY maydonlariga yoziladi).
   */
  updateFamilyPositions: (positions: { id: string; posX: number; posY: number }[]) => void;
  reset: () => void;
}

/**
 * Berilgan tugunning barcha AVLODLARI (pastki oila) — solid rishtalar bo'ylab
 * (source=ota-ona, target=farzand). Ota-ona/bobo-buvi tomonga KETMAYDI.
 * FamilyMembersPage ham oilaviy surish uchun ishlatadi.
 */
export function descendantIds(id: string, edges: Edge[]): string[] {
  const childrenOf = new Map<string, string[]>();
  for (const e of edges) {
    if (!(e.data as { dashed?: boolean } | undefined)?.dashed) {
      const list = childrenOf.get(e.source) ?? [];
      list.push(e.target);
      childrenOf.set(e.source, list);
    }
  }
  const out: string[] = [];
  const seen = new Set([id]);
  const queue = [id];
  while (queue.length) {
    const u = queue.shift()!;
    for (const c of childrenOf.get(u) ?? []) {
      if (!seen.has(c)) {
        seen.add(c);
        out.push(c);
        queue.push(c);
      }
    }
  }
  return out;
}

export const useTreeStore = create<TreeState>()((set, get) => {
  /** Manbadan doskani qayta quradi, tanlovni saqlaydi */
  const rebuild = (members: FamilyMemberDto[], rawEdges: FamilyEdgeDto[]) => {
    const selectedIds = new Set(get().nodes.filter((n) => n.selected).map((n) => n.id));
    // VIEWER umumiy doskani ham o'z ANKERiga nisbatan ko'radi (ega -> isRoot)
    const anchorId = get().access?.anchorMemberId ?? undefined;
    const board = buildBoard(members, rawEdges, anchorId);
    const nodes = board.nodes.map((n) =>
      selectedIds.has(n.id) ? { ...n, selected: true } : n,
    );
    set({ members, rawEdges, nodes, edges: board.edges });
  };

  return {
    members: [],
    rawEdges: [],
    nodes: [],
    edges: [],
    loading: true,
    access: null,
    layoutEdit: false,

    setLayoutEdit: (on) => set({ layoutEdit: on }),

    updateFamilyPositions: (positions) => {
      set((s) => ({
        members: s.members.map((m) => {
          const p = positions.find((pp) => pp.id === m.id);
          return p ? { ...m, famPosX: p.posX, famPosY: p.posY } : m;
        }),
      }));
      void familyApi.updatePositions(positions, 'family').catch(() => undefined);
    },

    onNodesChange: (changes) => {
      const prev = get().nodes;
      const edges = get().edges;
      // JOYLASHUV REJIMI YOQIQ: faqat sudralgan kartaning O'ZI suriladi
      // (nozik to'g'irlash). O'CHIQ: eskicha — bolalari (subtree) birga suriladi.
      const soloDrag = get().layoutEdit;

      // Oilali kartani sudraganda BOLALARI (subtree) ham birga suriladi
      const extra: NodeChange<PersonNodeType>[] = [];
      if (!soloDrag) {
        for (const c of changes) {
          if (c.type === 'position' && c.dragging && c.position) {
            const dragged = prev.find((n) => n.id === c.id);
            if (dragged) {
              const dx = c.position.x - dragged.position.x;
              const dy = c.position.y - dragged.position.y;
              if (dx !== 0 || dy !== 0) {
                for (const id of descendantIds(c.id, edges)) {
                  const node = prev.find((n) => n.id === id);
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

      const nodes = applyNodeChanges(extra.length ? [...changes, ...extra] : changes, prev);
      set({ nodes });

      // Surish tugagach — sudralgan tugun + barcha avlodlari pozitsiyasini saqlaymiz.
      // Qo'lda surilgan karta QULFLANADI (pinned) — keyingi "Tartiblash" uni surmaydi,
      // sen joylashtirgan holatida qoladi.
      for (const c of changes) {
        if (c.type === 'position' && c.dragging === false) {
          const ids = soloDrag ? [c.id] : [c.id, ...descendantIds(c.id, edges)];
          const moved = ids
            .map((id) => nodes.find((n) => n.id === id))
            .filter((n): n is PersonNodeType => n != null)
            .map((n) => ({ id: n.id, posX: n.position.x, posY: n.position.y, pinned: true }));
          set((s) => ({
            members: s.members.map((m) => {
              const p = moved.find((mm) => mm.id === m.id);
              return p ? { ...m, posX: p.posX, posY: p.posY, pinned: true } : m;
            }),
          }));
          void familyApi.updatePositions(moved).catch(() => undefined);
        }
      }
    },

    onEdgesChange: (changes) => set({ edges: applyEdgeChanges(changes, get().edges) }),

    loadBoard: async () => {
      set({ loading: true });
      try {
        const board = await familyApi.getBoard();
        // Anchor rebuild'дан OLDIN o'rnatiladi — VIEWER yorliqlari o'ziga nisbatan
        set({ access: board.access ?? null });
        rebuild(board.members, board.edges);
        set({ loading: false });
      } catch {
        set({ loading: false });
      }
    },

    addPerson: async (input, anchorId) => {
      const { nodes, members, access } = get();

      // Ankerni aniqlaymiz. Turmush o'rtog'i (couple kartaga birlashgan) tugun
      // `nodes`da alohida bo'lmaydi — u holda `members`dan topamiz.
      let anchorMemberId: string | undefined;
      let anchorPos: { x: number; y: number } | undefined;
      if (anchorId) {
        anchorMemberId = anchorId;
        const node = nodes.find((n) => n.id === anchorId);
        if (node) {
          anchorPos = node.position;
        } else {
          const m = members.find((mm) => mm.id === anchorId);
          if (m) anchorPos = { x: m.posX, y: m.posY };
        }
      } else {
        // Zaxira: hech narsa tanlanmagan bo'lsa — VIEWER uchun O'Z ankeriga
        // (access.anchorMemberId — isRoot EMAS, u daraxt egasi bo'lardi),
        // OWNER uchun isRoot'ga.
        const myNode = access?.anchorMemberId
          ? (nodes.find((n) => n.id === access.anchorMemberId) ??
            nodes.find((n) => n.data.spouses.some((s) => s.id === access.anchorMemberId)))
          : undefined;
        const anchorNode = nodes.find((n) => n.selected) ?? myNode ?? nodes.find((n) => n.data.isRoot);
        if (anchorNode) {
          anchorMemberId = anchorNode.id;
          anchorPos = anchorNode.position;
        }
      }
      if (!anchorMemberId || !anchorPos) return;

      const pos = placementFor(input.relation, anchorPos);
      const { member, edge } = await familyApi.addMember({
        fullName: input.fullName,
        relation: input.relation,
        gender: input.gender,
        birthYear: input.birthYear,
        deathYear: input.deathYear,
        photoUrl: input.photoUrl,
        photoSizeBytes: input.photoSizeBytes,
        spouseOrder: input.spouseOrder,
        anchorId: anchorMemberId,
        posX: pos.x,
        posY: pos.y,
      });
      rebuild([...members, member], [...get().rawEdges, edge]);
      void useStorageStore.getState().loadUsage();
      // Qo'shgandan keyin qavatga (y) tekislaymiz
      await get().autoLayout();

      // YANGI karta USTMA-UST tushmasin: o'z qavatidagi kartalar bilan
      // to'qnashsa, bo'sh joy topilguncha O'NGGA suramiz (x faqat yangi
      // kartaniki o'zgaradi — mavjud joylashuvga tegilmaydi).
      const nodesNow = get().nodes;
      const newNode = nodesNow.find((n) => n.id === member.id);
      if (newNode) {
        const GAP = 40;
        const widthOf = (n: PersonNodeType) =>
          n.measured?.width ?? 200 + n.data.spouses.length * 170;
        const heightOf = (n: PersonNodeType) => n.measured?.height ?? 170;
        const myW = widthOf(newNode);
        const myH = heightOf(newNode);
        const y = newNode.position.y;
        // Vertikal kesishuvchi (bir qavat atrofidagi) kartalar
        const rowMates = nodesNow.filter(
          (n) =>
            n.id !== newNode.id &&
            n.position.y < y + myH &&
            y < n.position.y + heightOf(n),
        );
        const overlapsAt = (x: number) =>
          rowMates.find(
            (o) => x < o.position.x + widthOf(o) + GAP && o.position.x < x + myW + GAP,
          );
        // Ikki tomondan ham birinchi bo'sh joyni topamiz va ANKERGA (o'z
        // oilasiga) YAQINROG'INI tanlaymiz — boshqa oilalar orasiga o'tib
        // ketmasin (bir tomon boshqa oila kartalari bilan band bo'lishi mumkin)
        const desired = newNode.position.x;
        let right = desired;
        for (let guard = 0; guard < 100; guard++) {
          const hit = overlapsAt(right);
          if (!hit) break;
          right = hit.position.x + widthOf(hit) + GAP;
        }
        let left = desired;
        for (let guard = 0; guard < 100; guard++) {
          const hit = overlapsAt(left);
          if (!hit) break;
          left = hit.position.x - myW - GAP;
        }
        const x = Math.abs(left - desired) <= Math.abs(right - desired) ? left : right;
        if (x !== newNode.position.x) {
          set((s) => ({
            members: s.members.map((m) => (m.id === member.id ? { ...m, posX: x } : m)),
            nodes: s.nodes.map((n) =>
              n.id === member.id ? { ...n, position: { ...n.position, x } } : n,
            ),
          }));
          void familyApi
            .updatePositions([{ id: member.id, posX: x, posY: y }])
            .catch(() => undefined);
        }
      }
    },

    updatePerson: async (id, patch) => {
      const updated = await familyApi.updateMember(id, {
        fullName: patch.fullName,
        gender: patch.gender,
        birthYear: patch.birthYear,
        deathYear: patch.deathYear,
        ...(patch.photoUrl !== undefined ? { photoUrl: patch.photoUrl } : {}),
        ...(patch.photoSizeBytes !== undefined ? { photoSizeBytes: patch.photoSizeBytes } : {}),
        ...(patch.relation ? { relation: patch.relation } : {}),
        ...(patch.spouseOrder !== undefined ? { spouseOrder: patch.spouseOrder } : {}),
      });
      if (patch.relation) {
        // Qarindoshlik o'zgarsa server rishtani ham qayta uladi — yangi holatni yuklaymiz
        await get().loadBoard();
      } else {
        rebuild(
          get().members.map((m) => (m.id === id ? updated : m)),
          get().rawEdges,
        );
      }
      void useStorageStore.getState().loadUsage();
    },

    connectMembers: async (fromId, toId, relation) => {
      await familyApi.connect({ fromId, toId, relation });
      // Rishta va qarindoshlik o'zgardi — doskani serverdan qayta yuklaymiz
      await get().loadBoard();
      void useStorageStore.getState().loadUsage();
    },

    removePerson: async (id) => {
      await familyApi.removeMember(id);
      void useStorageStore.getState().loadUsage();
      rebuild(
        get().members.filter((m) => m.id !== id),
        get().rawEdges.filter((e) => e.sourceId !== id && e.targetId !== id),
      );
    },

    autoLayout: async () => {
      const { nodes, edges, members } = get();
      const edgeInfos = edges.map((e) => ({
        source: e.source,
        target: e.target,
        dashed: Boolean((e.data as { dashed?: boolean } | undefined)?.dashed),
      }));

      // 1) Vertikal: har karta o'z qavatiga (y) tekislanadi
      const rowYs = alignRowYs(
        nodes.map((n) => ({
          id: n.id,
          isRoot: n.data.isRoot,
          // Haqiqiy balandlik — qavatlar orasi (30px+30px) aniq hisoblanadi
          height: n.measured?.height,
        })),
        edgeInfos,
      );

      // 2) Gorizontal: SHOX to'qnashuvlari yechiladi — bolalari kengaygan shox
      //    qo'shni shox ustiga chiqsa, butun shox surilib 100px joy ochiladi.
      //    Kesishmagan kartalarning x joylashuvi O'ZGARMAYDI (qo'lda terilgani
      //    saqlanadi).
      const newXs = resolveSubtreeOverlaps(
        nodes.map((n) => ({
          id: n.id,
          x: n.position.x,
          width: n.measured?.width ?? 200 + n.data.spouses.length * 170,
        })),
        edgeInfos,
      );

      // Manbadagi pozitsiyalarni yangilaymiz va rebuild qilamiz
      const newMembers = members.map((m) => {
        const y = rowYs.get(m.id);
        const nx = newXs.get(m.id);
        if (y === undefined && nx === undefined) return m;
        return { ...m, posX: nx ?? m.posX, posY: y ?? m.posY };
      });
      rebuild(newMembers, get().rawEdges);

      const posXOf = new Map(members.map((m) => [m.id, m.posX]));
      await familyApi
        .updatePositions(
          [...rowYs.entries()].map(([id, y]) => ({
            id,
            posX: newXs.get(id) ?? posXOf.get(id) ?? 0,
            posY: y,
          })),
        )
        .catch(() => undefined);
    },

    reset: () =>
      set({
        members: [],
        rawEdges: [],
        nodes: [],
        edges: [],
        loading: true,
        access: null,
        layoutEdit: false,
      }),
  };
});
