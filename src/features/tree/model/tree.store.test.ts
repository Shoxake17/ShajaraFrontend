import { beforeEach, describe, expect, it, vi } from 'vitest';

// API'ni mock qilamiz — testda tarmoq yo'q
vi.mock('@/features/tree/api/family.api', () => ({
  familyApi: {
    getBoard: vi.fn(),
    addMember: vi.fn(),
    removeMember: vi.fn(),
    updateMember: vi.fn(),
    updatePositions: vi.fn(),
    connect: vi.fn(),
  },
}));

import { useTreeStore } from './tree.store';
import { familyApi } from '@/features/tree/api/family.api';
import type { BoardResponse } from '@/features/tree/types';

const mockApi = vi.mocked(familyApi);

const rootMember = {
  id: 'root-1',
  fullName: 'Men Menov',
  gender: 'MALE' as const,
  relation: 'Men',
  birthYear: null,
  deathYear: null,
  photoUrl: null,
  photoSizeBytes: null,
  isRoot: true,
  spouseOrder: null,
  shareCode: null,
  createdById: null,
  posX: 0,
  posY: 0,
};

describe('tree.store (serverga bog\'langan)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // addPerson qo'shgandan keyin avtomatik tartiblaydi -> updatePositions chaqiriladi
    mockApi.updatePositions.mockResolvedValue(undefined);
    useTreeStore.getState().reset();
  });

  it('loadBoard — serverdan tugunlarni yuklaydi', async () => {
    const board: BoardResponse = { members: [rootMember], edges: [] };
    mockApi.getBoard.mockResolvedValue(board);

    await useTreeStore.getState().loadBoard();

    const { nodes, loading } = useTreeStore.getState();
    expect(loading).toBe(false);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].data.isRoot).toBe(true);
    expect(nodes[0].data.name).toBe('Men Menov');
  });

  it('addPerson — API chaqiradi va yangi tugun/rishta qo\'shadi', async () => {
    mockApi.getBoard.mockResolvedValue({ members: [rootMember], edges: [] });
    await useTreeStore.getState().loadBoard();

    mockApi.addMember.mockResolvedValue({
      member: {
        id: 'm-2',
        fullName: 'Akmal Ota',
        gender: 'MALE',
        relation: 'OTA',
        birthYear: 1950,
        deathYear: null,
        photoUrl: null,
        photoSizeBytes: null,
        isRoot: false,
        spouseOrder: null,
        shareCode: null,
        createdById: null,
        posX: 10,
        posY: -190,
      },
      edge: { id: 'e-1', sourceId: 'm-2', targetId: 'root-1', relation: 'OTA', dashed: false },
    });

    await useTreeStore.getState().addPerson({
      fullName: 'Akmal Ota',
      relation: 'OTA',
      gender: 'MALE',
      birthYear: 1950,
    });

    const { nodes, edges } = useTreeStore.getState();
    expect(mockApi.addMember).toHaveBeenCalledOnce();
    // ankerId root ekanini tekshiramiz
    expect(mockApi.addMember.mock.calls[0][0].anchorId).toBe('root-1');
    expect(nodes).toHaveLength(2);
    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe('m-2'); // ota -> men
    expect(edges[0].target).toBe('root-1');
  });

  it('ayol a\'zo FEMALE jinsi bilan saqlanadi', async () => {
    mockApi.getBoard.mockResolvedValue({ members: [rootMember], edges: [] });
    await useTreeStore.getState().loadBoard();

    mockApi.addMember.mockResolvedValue({
      member: {
        id: 'm-3',
        fullName: 'Malika Opa',
        gender: 'FEMALE',
        relation: 'OPA',
        birthYear: null,
        deathYear: null,
        photoUrl: null,
        photoSizeBytes: null,
        isRoot: false,
        spouseOrder: null,
        shareCode: null,
        createdById: null,
        posX: -280,
        posY: 0,
      },
      edge: { id: 'e-2', sourceId: 'root-1', targetId: 'm-3', relation: 'OPA', dashed: false },
    });

    await useTreeStore.getState().addPerson({
      fullName: 'Malika Opa',
      relation: 'OPA',
      gender: 'FEMALE',
    });

    const added = useTreeStore.getState().nodes.find((n) => n.id === 'm-3')!;
    expect(added.data.gender).toBe('FEMALE');
  });

  it('updatePerson — a\'zo ma\'lumotini tahrirlaydi (pozitsiya saqlanadi)', async () => {
    mockApi.getBoard.mockResolvedValue({
      members: [{ ...rootMember, id: 'm-5', relation: 'OTA', isRoot: false, posX: 99, posY: -190 }],
      edges: [],
    });
    await useTreeStore.getState().loadBoard();

    mockApi.updateMember.mockResolvedValue({
      id: 'm-5',
      fullName: 'Yangi Ism',
      gender: 'FEMALE',
      relation: 'OTA',
      birthYear: 1960,
      deathYear: 2020,
      photoUrl: null,
      photoSizeBytes: null,
      isRoot: false,
      spouseOrder: null,
      shareCode: null,
      createdById: null,
      posX: 99,
      posY: -190,
    });

    await useTreeStore.getState().updatePerson('m-5', {
      fullName: 'Yangi Ism',
      gender: 'FEMALE',
      birthYear: 1960,
      deathYear: 2020,
      photoUrl: null,
    });

    const node = useTreeStore.getState().nodes.find((n) => n.id === 'm-5')!;
    expect(node.data.name).toBe('Yangi Ism');
    expect(node.data.gender).toBe('FEMALE');
    expect(node.data.birthYear).toBe(1960);
    expect(node.position).toEqual({ x: 99, y: -190 }); // pozitsiya o'zgarmagan
  });

  it('removePerson — API chaqiradi va tugunni o\'chiradi', async () => {
    mockApi.getBoard.mockResolvedValue({
      members: [
        rootMember,
        { ...rootMember, id: 'm-9', relation: 'OTA', isRoot: false, fullName: 'X' },
      ],
      edges: [{ id: 'e', sourceId: 'm-9', targetId: 'root-1', relation: 'OTA', dashed: false }],
    });
    await useTreeStore.getState().loadBoard();
    mockApi.removeMember.mockResolvedValue(undefined);

    await useTreeStore.getState().removePerson('m-9');

    expect(mockApi.removeMember).toHaveBeenCalledWith('m-9');
    const { nodes, edges } = useTreeStore.getState();
    expect(nodes).toHaveLength(1);
    expect(edges).toHaveLength(0);
  });

  it('oilali kartani sudraganda bolalari birga suriladi, ota-onasi qimirlamaydi', async () => {
    mockApi.getBoard.mockResolvedValue({
      members: [
        { ...rootMember, id: 'p', posX: 0, posY: 0 },
        { ...rootMember, id: 'c', relation: 'OGIL', isRoot: false, posX: 0, posY: 190 },
        { ...rootMember, id: 'gc', relation: 'OGIL', isRoot: false, posX: 0, posY: 380 },
      ],
      edges: [
        { id: 'e1', sourceId: 'p', targetId: 'c', relation: 'OGIL', dashed: false },
        { id: 'e2', sourceId: 'c', targetId: 'gc', relation: 'OGIL', dashed: false },
      ],
    });
    await useTreeStore.getState().loadBoard();

    // 'p' ni o'ngga 100 px sudraymiz -> bola 'c' va nabira 'gc' ham suriladi
    useTreeStore.getState().onNodesChange([
      { id: 'p', type: 'position', position: { x: 100, y: 0 }, dragging: true },
    ]);
    let nodes = useTreeStore.getState().nodes;
    expect(nodes.find((n) => n.id === 'c')!.position.x).toBe(100);
    expect(nodes.find((n) => n.id === 'gc')!.position.x).toBe(100);

    // Endi 'c' ni sudraymiz -> faqat 'gc' suriladi, 'p' (ota) qimirlamaydi
    useTreeStore.getState().onNodesChange([
      { id: 'c', type: 'position', position: { x: 150, y: 190 }, dragging: true },
    ]);
    nodes = useTreeStore.getState().nodes;
    expect(nodes.find((n) => n.id === 'gc')!.position.x).toBe(150);
    expect(nodes.find((n) => n.id === 'p')!.position.x).toBe(100); // ota qimirlamadi
  });

  it('yangi a\'zo USTMA-UST tushmaydi — band joydan o\'ngga suriladi', async () => {
    // Root (0,0) va mavjud uka (-280,0) — yangi uka aynan shu atrofga tushadi
    mockApi.getBoard.mockResolvedValue({
      members: [
        rootMember,
        { ...rootMember, id: 'uka-1', relation: 'UKA', isRoot: false, fullName: 'Uka 1', posX: -280, posY: 0 },
      ],
      edges: [{ id: 'e-u1', sourceId: 'root-1', targetId: 'uka-1', relation: 'UKA', dashed: true }],
    });
    await useTreeStore.getState().loadBoard();
    mockApi.updatePositions.mockResolvedValue(undefined);
    mockApi.addMember.mockImplementation((p) =>
      Promise.resolve({
        member: {
          ...rootMember,
          id: 'uka-2',
          relation: 'UKA',
          isRoot: false,
          fullName: p.fullName,
          posX: p.posX,
          posY: p.posY,
        },
        edge: { id: 'e-u2', sourceId: 'root-1', targetId: 'uka-2', relation: 'UKA', dashed: true },
      }),
    );

    await useTreeStore.getState().addPerson({ fullName: 'Uka 2', relation: 'UKA', gender: 'MALE' });

    const nodes = useTreeStore.getState().nodes;
    const yangi = nodes.find((n) => n.id === 'uka-2')!;
    // Yangi karta hech bir mavjud karta bilan KESISHMAYDI (taxminiy o'lchamda)
    const W = 200;
    const H = 170;
    for (const o of nodes) {
      if (o.id === yangi.id) continue;
      const overlap =
        yangi.position.x < o.position.x + W &&
        o.position.x < yangi.position.x + W &&
        yangi.position.y < o.position.y + H &&
        o.position.y < yangi.position.y + H;
      expect(overlap).toBe(false);
    }
  });

  it("joylashuv rejimi YOQIQ: faqat sudralgan karta suriladi, bolasi joyida qoladi", async () => {
    mockApi.getBoard.mockResolvedValue({
      members: [
        { ...rootMember, id: 'p', posX: 0, posY: 0 },
        { ...rootMember, id: 'c', relation: 'OGIL', isRoot: false, posX: 0, posY: 230 },
      ],
      edges: [{ id: 'e1', sourceId: 'p', targetId: 'c', relation: 'OGIL', dashed: false }],
    });
    await useTreeStore.getState().loadBoard();
    mockApi.updatePositions.mockResolvedValue(undefined);

    useTreeStore.getState().setLayoutEdit(true); // yakka surish rejimi
    useTreeStore.getState().onNodesChange([
      { id: 'p', type: 'position', position: { x: 300, y: 0 }, dragging: true },
    ]);
    const nodes = useTreeStore.getState().nodes;
    expect(nodes.find((n) => n.id === 'p')!.position.x).toBe(300);
    expect(nodes.find((n) => n.id === 'c')!.position.x).toBe(0); // bola QIMIRLAMADI

    // Saqlashda ham faqat sudralgan karta
    useTreeStore.getState().onNodesChange([{ id: 'p', type: 'position', dragging: false }]);
    const saved = mockApi.updatePositions.mock.calls.at(-1)![0];
    expect(saved).toHaveLength(1);
    expect(saved[0].id).toBe('p');
  });

  it("updateFamilyPositions — 'family' ko'rinishiga ALOHIDA saqlaydi (asosiy posX tegilmaydi)", async () => {
    mockApi.getBoard.mockResolvedValue({
      members: [{ ...rootMember, posX: 11, posY: 22 }],
      edges: [],
    });
    await useTreeStore.getState().loadBoard();
    mockApi.updatePositions.mockResolvedValue(undefined);

    useTreeStore.getState().updateFamilyPositions([{ id: 'root-1', posX: 300, posY: 400 }]);

    const m = useTreeStore.getState().members[0];
    expect(m.famPosX).toBe(300);
    expect(m.famPosY).toBe(400);
    expect(m.posX).toBe(11); // asosiy doska joylashuvi O'ZGARMADI
    expect(mockApi.updatePositions).toHaveBeenCalledWith(
      [{ id: 'root-1', posX: 300, posY: 400 }],
      'family',
    );
  });

  it('connectMembers — API chaqiradi va doskani qayta yuklaydi', async () => {
    mockApi.getBoard.mockResolvedValue({ members: [rootMember], edges: [] });
    await useTreeStore.getState().loadBoard();
    mockApi.connect.mockResolvedValue(undefined);

    await useTreeStore.getState().connectMembers('a-id', 'b-id', 'OGIL');

    expect(mockApi.connect).toHaveBeenCalledWith({
      fromId: 'a-id',
      toId: 'b-id',
      relation: 'OGIL',
    });
    // loadBoard: dastlabki + bog'lashdan keyingi = 2 marta
    expect(mockApi.getBoard).toHaveBeenCalledTimes(2);
  });

  it("Tartiblash chap-o'ngga TEGMAYDI — faqat qavatga (y) tekislaydi", async () => {
    mockApi.getBoard.mockResolvedValue({
      members: [
        rootMember,
        { ...rootMember, id: 'ota-1', relation: 'OTA', isRoot: false, fullName: 'Ota', posX: 0, posY: -190 },
      ],
      edges: [{ id: 'e-1', sourceId: 'ota-1', targetId: 'root-1', relation: 'OTA', dashed: false }],
    });
    await useTreeStore.getState().loadBoard();
    mockApi.updatePositions.mockResolvedValue(undefined);

    // Otani qo'lda joyiga suramiz (drag tugadi) — biroz qiyshiq qo'yamiz
    useTreeStore.getState().onNodesChange([
      { id: 'ota-1', type: 'position', position: { x: 500, y: -300 }, dragging: true },
    ]);
    useTreeStore.getState().onNodesChange([
      { id: 'ota-1', type: 'position', dragging: false },
    ]);

    // Serverga saqlanadi (qo'lda joylashtirilgani bilan)
    const saved = mockApi.updatePositions.mock.calls.at(-1)![0];
    expect(saved.find((p) => p.id === 'ota-1')).toMatchObject({
      posX: 500,
      posY: -300,
      pinned: true,
    });

    // Tartiblash: X JOYIDA (500), Y esa o'z qavatiga tekislanadi
    await useTreeStore.getState().autoLayout();
    const ota = useTreeStore.getState().nodes.find((n) => n.id === 'ota-1')!;
    const root = useTreeStore.getState().nodes.find((n) => n.id === 'root-1')!;
    expect(ota.position.x).toBe(500); // chap-o'ng o'zgarmadi
    expect(ota.position.y).toBe(0); // eng tepa qavatga tekislandi
    // root otaning bolasi sifatida drag paytida birga surilgan (x=500) —
    // Tartiblash uning ham x'iga tegmaydi, faqat y tekislanadi
    expect(root.position.x).toBe(500);
    expect(root.position.y).toBe(170 + 60); // ota bo'yi (170) + 60px oraliq
    // Serverga ham x eski, y yangi bilan saqlanadi
    const layoutSaved = mockApi.updatePositions.mock.calls.at(-1)![0];
    expect(layoutSaved.find((p) => p.id === 'ota-1')).toMatchObject({ posX: 500, posY: 0 });
  });

  it('autoLayout — tugunlarni tartiblab BITTA so\'rovda saqlaydi', async () => {
    mockApi.getBoard.mockResolvedValue({
      members: [
        rootMember,
        { ...rootMember, id: 'ota-1', relation: 'OTA', isRoot: false, fullName: 'Ota', posX: 999, posY: 999 },
      ],
      edges: [{ id: 'e', sourceId: 'ota-1', targetId: 'root-1', relation: 'OTA', dashed: false }],
    });
    await useTreeStore.getState().loadBoard();
    mockApi.updatePositions.mockResolvedValue(undefined);

    await useTreeStore.getState().autoLayout();

    // Bitta batch so'rov, ikkala tugun ham
    expect(mockApi.updatePositions).toHaveBeenCalledOnce();
    expect(mockApi.updatePositions.mock.calls[0][0]).toHaveLength(2);
    // Ota root'dan yuqoriroqda (kichikroq y)
    const nodes = useTreeStore.getState().nodes;
    const ota = nodes.find((n) => n.id === 'ota-1')!;
    const root = nodes.find((n) => n.id === 'root-1')!;
    expect(ota.position.y).toBeLessThan(root.position.y);
  });
});
