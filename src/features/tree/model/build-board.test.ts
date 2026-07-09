import { describe, expect, it } from 'vitest';
import { buildBoard } from './build-board';
import type { FamilyEdgeDto, FamilyMemberDto } from '@/features/tree/types';

const member = (over: Partial<FamilyMemberDto> & { id: string }): FamilyMemberDto => ({
  fullName: 'X',
  gender: 'MALE',
  relation: 'OTA',
  birthYear: null,
  deathYear: null,
  photoUrl: null,
  photoSizeBytes: null,
  isRoot: false,
  spouseOrder: null,
  shareCode: null,
  createdById: null,
  posX: 0,
  posY: 0,
  ...over,
});

describe('buildBoard', () => {
  it('onaning otasi "Bobo" yorlig\'i bilan ko\'rinadi', () => {
    // root -> ona (level -1) -> ona'ning otasi (level -2)
    const members: FamilyMemberDto[] = [
      member({ id: 'root', isRoot: true, relation: 'Men', fullName: 'Men' }),
      member({ id: 'ona', gender: 'FEMALE', relation: 'ONA', fullName: 'Onam' }),
      member({ id: 'bobo', gender: 'MALE', relation: 'OTA', fullName: 'Ona otasi' }),
    ];
    const edges: FamilyEdgeDto[] = [
      { id: 'e1', sourceId: 'ona', targetId: 'root', relation: 'ONA', dashed: false },
      { id: 'e2', sourceId: 'bobo', targetId: 'ona', relation: 'OTA', dashed: false },
    ];

    const { nodes } = buildBoard(members, edges);
    const bobo = nodes.find((n) => n.id === 'bobo')!;
    expect(bobo.data.relation).toBe('Bobo'); // "Ota" emas!
    const ona = nodes.find((n) => n.id === 'ona')!;
    expect(ona.data.relation).toBe('Ona');
  });

  it('turmush o\'rtoqlar bitta kartaga birlashadi', () => {
    const members: FamilyMemberDto[] = [
      member({ id: 'root', isRoot: true, relation: 'Men', fullName: 'Men' }),
      member({ id: 'juft', gender: 'FEMALE', relation: 'TURMUSH', fullName: 'Rafiqam' }),
    ];
    const edges: FamilyEdgeDto[] = [
      { id: 'e1', sourceId: 'root', targetId: 'juft', relation: 'TURMUSH', dashed: true },
    ];

    const { nodes, edges: flowEdges } = buildBoard(members, edges);
    // Ikki a'zo -> bitta karta
    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe('root');
    expect(nodes[0].data.spouses.map((s) => s.name)).toEqual(['Rafiqam']);
    // TURMUSH rishtasi kartaga ichkarilashadi (chiziq chizilmaydi)
    expect(flowEdges).toHaveLength(0);
  });

  it("har xotinning bolasi o'z sourceHandle'i (haqiqiy ota-ona) bilan bog'lanadi", () => {
    const members: FamilyMemberDto[] = [
      member({ id: 'er', isRoot: true, relation: 'Men', fullName: 'Er' }),
      member({ id: 'x1', gender: 'FEMALE', relation: 'TURMUSH', fullName: 'Xotin 1' }),
      member({ id: 'x2', gender: 'FEMALE', relation: 'TURMUSH', fullName: 'Xotin 2' }),
      member({ id: 'bola1', relation: 'OGIL', fullName: '1-bola' }),
      member({ id: 'bola2', relation: 'OGIL', fullName: '2-bola' }),
    ];
    const edges: FamilyEdgeDto[] = [
      { id: 'e1', sourceId: 'er', targetId: 'x1', relation: 'TURMUSH', dashed: true },
      { id: 'e2', sourceId: 'er', targetId: 'x2', relation: 'TURMUSH', dashed: true },
      { id: 'e3', sourceId: 'x1', targetId: 'bola1', relation: 'OGIL', dashed: false }, // 1-xotin bolasi
      { id: 'e4', sourceId: 'x2', targetId: 'bola2', relation: 'OGIL', dashed: false }, // 2-xotin bolasi
    ];

    const { edges: flowEdges } = buildBoard(members, edges);
    // Ikkala bola ham 'er' couple tuguniga, lekin turli sourceHandle (xotin) bilan
    const toB1 = flowEdges.find((e) => e.target === 'bola1')!;
    const toB2 = flowEdges.find((e) => e.target === 'bola2')!;
    expect(toB1.source).toBe('er');
    expect(toB1.sourceHandle).toBe('x1'); // 1-xotin tomonidan
    expect(toB2.source).toBe('er');
    expect(toB2.sourceHandle).toBe('x2'); // 2-xotin tomonidan
  });

  it('bir bolaning OTA va ONA\'si avtomatik bitta kartaga (er-xotin) birlashadi', () => {
    const members: FamilyMemberDto[] = [
      member({ id: 'root', isRoot: true, relation: 'Men', fullName: 'Men' }),
      member({ id: 'ona', gender: 'FEMALE', relation: 'ONA', fullName: 'Onam' }),
      member({ id: 'bobo', gender: 'MALE', relation: 'OTA', fullName: 'Ona otasi' }),
      member({ id: 'buvi', gender: 'FEMALE', relation: 'ONA', fullName: 'Ona onasi' }),
    ];
    const edges: FamilyEdgeDto[] = [
      { id: 'e1', sourceId: 'ona', targetId: 'root', relation: 'ONA', dashed: false },
      { id: 'e2', sourceId: 'bobo', targetId: 'ona', relation: 'OTA', dashed: false }, // onamning otasi
      { id: 'e3', sourceId: 'buvi', targetId: 'ona', relation: 'ONA', dashed: false }, // onamning onasi
    ];

    const { nodes } = buildBoard(members, edges);
    // root, ona, va bobo+buvi (bitta couple) = 3 karta
    expect(nodes).toHaveLength(3);
    expect(nodes.find((n) => n.id === 'buvi')).toBeUndefined(); // buvi birlashgan (yashirin)

    const bobo = nodes.find((n) => n.id === 'bobo')!;
    expect(bobo.data.relation).toBe('Bobo');
    expect(bobo.data.spouses.map((s) => s.name)).toEqual(['Ona onasi']);
    expect(bobo.data.spouses[0].relation).toBe('Buvi'); // turmush o'rtog'ining o'z yorlig'i
  });

  it("bobning ikki xotini: qondoshi Buvi, boshqasi O'gay buvi", () => {
    const members: FamilyMemberDto[] = [
      member({ id: 'root', isRoot: true, relation: 'Men', fullName: 'Men' }),
      member({ id: 'ota', gender: 'MALE', relation: 'OTA', fullName: 'Otam' }),
      member({ id: 'bobo', gender: 'MALE', relation: 'OTA', fullName: 'Bobom' }),
      member({ id: 'b1', gender: 'FEMALE', relation: 'ONA', fullName: 'Qondosh buvi' }),
      member({ id: 'b2', gender: 'FEMALE', relation: 'TURMUSH', fullName: 'Ikkinchi xotin' }),
    ];
    const edges: FamilyEdgeDto[] = [
      { id: 'e1', sourceId: 'ota', targetId: 'root', relation: 'OTA', dashed: false },
      { id: 'e2', sourceId: 'bobo', targetId: 'ota', relation: 'OTA', dashed: false },
      // b1 — otaning ONASI (qondosh buvi); b2 — boboning boshqa xotini (qondosh emas)
      { id: 'e3', sourceId: 'b1', targetId: 'ota', relation: 'ONA', dashed: false },
      { id: 'e4', sourceId: 'bobo', targetId: 'b1', relation: 'TURMUSH', dashed: true },
      { id: 'e5', sourceId: 'bobo', targetId: 'b2', relation: 'TURMUSH', dashed: true },
    ];

    const { nodes } = buildBoard(members, edges);
    const boboNode = nodes.find((n) => n.id === 'bobo')!;
    expect(boboNode.data.relation).toBe('Bobo');
    const labels = boboNode.data.spouses.map((s) => s.relation).sort();
    expect(labels).toEqual(["Buvi", "O'gay buvi"]);
  });

  it("bobning ikki xotini, onasi noma'lum: ikkalasi O'gay buvi (raqamlangan)", () => {
    const members: FamilyMemberDto[] = [
      member({ id: 'root', isRoot: true, relation: 'Men', fullName: 'Men' }),
      member({ id: 'ota', gender: 'MALE', relation: 'OTA', fullName: 'Otam' }),
      member({ id: 'bobo', gender: 'MALE', relation: 'OTA', fullName: 'Bobom' }),
      member({ id: 'b1', gender: 'FEMALE', relation: 'TURMUSH', fullName: 'Birinchi' }),
      member({ id: 'b2', gender: 'FEMALE', relation: 'TURMUSH', fullName: 'Ikkinchi' }),
    ];
    const edges: FamilyEdgeDto[] = [
      { id: 'e1', sourceId: 'ota', targetId: 'root', relation: 'OTA', dashed: false },
      { id: 'e2', sourceId: 'bobo', targetId: 'ota', relation: 'OTA', dashed: false },
      { id: 'e3', sourceId: 'bobo', targetId: 'b1', relation: 'TURMUSH', dashed: true },
      { id: 'e4', sourceId: 'bobo', targetId: 'b2', relation: 'TURMUSH', dashed: true },
    ];

    const { nodes } = buildBoard(members, edges);
    const boboNode = nodes.find((n) => n.id === 'bobo')!;
    // Qaysi biri qondosh buvi ekani noma'lum (otaning ONA rishtasi yo'q) —
    // hech biri avtomatik Buvi deb olinmaydi; bir xil yorliq raqamlanadi
    expect(boboNode.data.spouses.map((s) => s.relation)).toEqual([
      "O'gay buvi 1",
      "O'gay buvi 2",
    ]);
  });

  it('bir nechta turmush o\'rtog\'i (qo\'sh xotinlar) bitta kartada', () => {
    const members: FamilyMemberDto[] = [
      member({ id: 'root', isRoot: true, relation: 'Men', fullName: 'Er' }),
      member({ id: 'x1', gender: 'FEMALE', relation: 'TURMUSH', fullName: 'Xotin 1' }),
      member({ id: 'x2', gender: 'FEMALE', relation: 'TURMUSH', fullName: 'Xotin 2' }),
      member({ id: 'x3', gender: 'FEMALE', relation: 'TURMUSH', fullName: 'Xotin 3' }),
    ];
    const edges: FamilyEdgeDto[] = [
      { id: 'e1', sourceId: 'root', targetId: 'x1', relation: 'TURMUSH', dashed: true },
      { id: 'e2', sourceId: 'root', targetId: 'x2', relation: 'TURMUSH', dashed: true },
      { id: 'e3', sourceId: 'root', targetId: 'x3', relation: 'TURMUSH', dashed: true },
    ];

    const { nodes, edges: flowEdges } = buildBoard(members, edges);
    // 4 a'zo -> bitta karta, uch xotin birlashgan
    expect(nodes).toHaveLength(1);
    expect(nodes[0].data.spouses.map((s) => s.name)).toEqual(['Xotin 1', 'Xotin 2', 'Xotin 3']);
    expect(flowEdges).toHaveLength(0);
  });

  it('primary (markazdagi odam) = qon-qarindosh er, a\'zolar tartibidan qat\'i nazar', () => {
    // Xotin members ro'yxatida BIRINCHI kelsa ham, primary ER (root) bo'lishi kerak.
    // (DB tartibsiz qaytarsa ham couple markazida er turadi.)
    const members: FamilyMemberDto[] = [
      member({ id: 'x1', gender: 'FEMALE', relation: 'TURMUSH', fullName: 'Xotin 1' }),
      member({ id: 'root', isRoot: true, relation: 'Men', fullName: 'Er' }),
      member({ id: 'x2', gender: 'FEMALE', relation: 'TURMUSH', fullName: 'Xotin 2' }),
    ];
    const edges: FamilyEdgeDto[] = [
      { id: 'e1', sourceId: 'root', targetId: 'x1', relation: 'TURMUSH', dashed: true },
      { id: 'e2', sourceId: 'root', targetId: 'x2', relation: 'TURMUSH', dashed: true },
    ];

    const { nodes } = buildBoard(members, edges);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe('root'); // primary = er
    expect(nodes[0].data.name).toBe('Er');
    expect([...nodes[0].data.spouses.map((s) => s.name)].sort()).toEqual(['Xotin 1', 'Xotin 2']);
  });

  it('qo\'sh xotinlikda umumiy ER (eng ko\'p nikohli) markazda — xotini qon-qarindosh bo\'lsa ham', () => {
    // Haqiqiy holat: er TURMUSH sifatida, xotinlardan biri qon-qarindosh (ONA).
    // Er 2 xotinga uylangan -> u markazda (primary), xotinlar yon tomonda.
    const members: FamilyMemberDto[] = [
      member({ id: 'wifeBlood', gender: 'FEMALE', relation: 'ONA', fullName: 'Buvi Ona', birthYear: 1937 }),
      member({ id: 'husband', gender: 'MALE', relation: 'TURMUSH', fullName: 'Bobo Er', birthYear: 1927 }),
      member({ id: 'wife2', gender: 'FEMALE', relation: 'TURMUSH', fullName: 'Ikkinchi Xotin', birthYear: 1931 }),
    ];
    const edges: FamilyEdgeDto[] = [
      { id: 'e1', sourceId: 'wifeBlood', targetId: 'husband', relation: 'TURMUSH', dashed: true },
      { id: 'e2', sourceId: 'husband', targetId: 'wife2', relation: 'TURMUSH', dashed: true },
    ];

    const { nodes } = buildBoard(members, edges);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe('husband'); // umumiy er markazda (primary)
    expect([...nodes[0].data.spouses.map((s) => s.id)].sort()).toEqual(['wife2', 'wifeBlood']);
  });

  it('oddiy juftlikda qon-qarindosh (TURMUSH bo\'lmagan) primary bo\'ladi', () => {
    // Bir xotin -> "umumiy er" qoidasi ishlamaydi (2+ nikoh yo'q); qon-qarindosh primary.
    const members: FamilyMemberDto[] = [
      member({ id: 'wife', gender: 'FEMALE', relation: 'TURMUSH', fullName: 'Xotin' }),
      member({ id: 'root', isRoot: true, relation: 'Men', fullName: 'Er' }),
    ];
    const edges: FamilyEdgeDto[] = [
      { id: 'e1', sourceId: 'root', targetId: 'wife', relation: 'TURMUSH', dashed: true },
    ];
    const { nodes } = buildBoard(members, edges);
    expect(nodes[0].id).toBe('root');
  });

  it('turmush o\'rtoqlar tug\'ilgan yil bo\'yicha saralanadi (eng kattasi birinchi)', () => {
    const members: FamilyMemberDto[] = [
      member({ id: 'root', isRoot: true, relation: 'Men', fullName: 'Er' }),
      member({ id: 'yosh', gender: 'FEMALE', relation: 'TURMUSH', fullName: 'Yosh', birthYear: 1980 }),
      member({ id: 'katta', gender: 'FEMALE', relation: 'TURMUSH', fullName: 'Katta', birthYear: 1960 }),
    ];
    const edges: FamilyEdgeDto[] = [
      { id: 'e1', sourceId: 'root', targetId: 'yosh', relation: 'TURMUSH', dashed: true },
      { id: 'e2', sourceId: 'root', targetId: 'katta', relation: 'TURMUSH', dashed: true },
    ];

    const { nodes } = buildBoard(members, edges);
    // Katta (1960) yoshdan (1980) oldin ko'rinadi
    expect(nodes[0].data.spouses.map((s) => s.name)).toEqual(['Katta', 'Yosh']);
  });

  it('qo\'lda spouseOrder berilsa -> "Buvi 3" bo\'lib raqamlanadi', () => {
    // root -> ota -> bobo; bobo'ning ikki xotini -> Buvi. Biriga qo'lda 3 beramiz.
    const members: FamilyMemberDto[] = [
      member({ id: 'root', isRoot: true, relation: 'Men', fullName: 'Men' }),
      member({ id: 'ota', relation: 'OTA', fullName: 'Ota' }),
      member({ id: 'bobo', relation: 'OTA', fullName: 'Bobo' }),
      member({ id: 'b1', gender: 'FEMALE', relation: 'TURMUSH', fullName: 'Buvi bir', birthYear: 1930 }),
      member({
        id: 'b2',
        gender: 'FEMALE',
        relation: 'TURMUSH',
        fullName: 'Buvi uch',
        birthYear: 1940,
        spouseOrder: 3,
      }),
    ];
    const edges: FamilyEdgeDto[] = [
      { id: 'e1', sourceId: 'ota', targetId: 'root', relation: 'OTA', dashed: false },
      { id: 'e2', sourceId: 'bobo', targetId: 'ota', relation: 'OTA', dashed: false },
      { id: 'e3', sourceId: 'bobo', targetId: 'b1', relation: 'TURMUSH', dashed: true },
      { id: 'e4', sourceId: 'bobo', targetId: 'b2', relation: 'TURMUSH', dashed: true },
    ];

    const { nodes } = buildBoard(members, edges);
    const couple = nodes.find((n) => n.id === 'bobo')!;
    const labels = couple.data.spouses.map((s) => s.relation);
    // Qo'lda 3 berilgan -> "... 3"; qolgani 3 band deb 1 ni oladi
    // (onasi noma'lum polygamiya — ikkala xotin ham O'gay buvi)
    expect(labels).toContain("O'gay buvi 3");
    expect(labels).toContain("O'gay buvi 1");
  });

  it('qo\'sh xotin bolalari xotin bo\'yicha guruhlanadi (aralashmaydi)', () => {
    // Er + 2 xotin. Har xotinning bolalari — yillari aralash bo'lsa ham,
    // layoutOrder'da 1-xotin bolalari birga, 2-xotin bolalari birga bo'lishi kerak.
    const members: FamilyMemberDto[] = [
      member({ id: 'root', isRoot: true, relation: 'Men', fullName: 'Er' }),
      member({ id: 'w1', gender: 'FEMALE', relation: 'TURMUSH', fullName: 'Xotin 1', birthYear: 1960 }),
      member({ id: 'w2', gender: 'FEMALE', relation: 'TURMUSH', fullName: 'Xotin 2', birthYear: 1970 }),
      member({ id: 'c1a', relation: 'OGIL', fullName: '1-xotin o\'g\'li', birthYear: 1995 }),
      member({ id: 'c1b', relation: 'OGIL', fullName: '1-xotin qizi', birthYear: 1985 }),
      member({ id: 'c2a', relation: 'OGIL', fullName: '2-xotin o\'g\'li', birthYear: 1990 }),
    ];
    const edges: FamilyEdgeDto[] = [
      { id: 'm1', sourceId: 'root', targetId: 'w1', relation: 'TURMUSH', dashed: true },
      { id: 'm2', sourceId: 'root', targetId: 'w2', relation: 'TURMUSH', dashed: true },
      { id: 'e1', sourceId: 'w1', targetId: 'c1a', relation: 'OGIL', dashed: false },
      { id: 'e2', sourceId: 'w1', targetId: 'c1b', relation: 'OGIL', dashed: false },
      { id: 'e3', sourceId: 'w2', targetId: 'c2a', relation: 'OGIL', dashed: false },
    ];

    const { nodes } = buildBoard(members, edges);
    const ord = (id: string) => nodes.find((n) => n.id === id)!.data.layoutOrder!;
    // 1-xotin bolalari (c1a, c1b) — 2-xotin bolasidan (c2a) OLDIN (guruhlangan)
    expect(ord('c1a')).toBeLessThan(ord('c2a'));
    expect(ord('c1b')).toBeLessThan(ord('c2a'));
    // guruh ichida yosh bo'yicha: c1b (1985) < c1a (1995)
    expect(ord('c1b')).toBeLessThan(ord('c1a'));
  });

  it('juftning farzandi umumiy kartaga bog\'lanadi', () => {
    const members: FamilyMemberDto[] = [
      member({ id: 'root', isRoot: true, relation: 'Men', fullName: 'Men' }),
      member({ id: 'juft', gender: 'FEMALE', relation: 'TURMUSH', fullName: 'Rafiqam' }),
      member({ id: 'bola', relation: 'OGIL', fullName: 'O\'g\'lim' }),
    ];
    const edges: FamilyEdgeDto[] = [
      { id: 'e1', sourceId: 'root', targetId: 'juft', relation: 'TURMUSH', dashed: true },
      // Farzand juftga (yashiringan) bog'langan — umumiy kartaga yo'naltiriladi
      { id: 'e2', sourceId: 'juft', targetId: 'bola', relation: 'OGIL', dashed: false },
    ];

    const { nodes, edges: flowEdges } = buildBoard(members, edges);
    expect(nodes).toHaveLength(2); // couple + bola
    expect(flowEdges).toHaveLength(1);
    expect(flowEdges[0].source).toBe('root'); // juft -> root ga yo'naltirildi
    expect(flowEdges[0].target).toBe('bola');
  });

  it('yakka xotin-erlik bolasi juftlik MARKAZIDAN (couple handle) chiqadi', () => {
    const members: FamilyMemberDto[] = [
      member({ id: 'root', isRoot: true, relation: 'Men', fullName: 'Er' }),
      member({ id: 'juft', gender: 'FEMALE', relation: 'TURMUSH', fullName: 'Xotin' }),
      member({ id: 'bola', relation: 'OGIL', fullName: 'Bola' }),
    ];
    const edges: FamilyEdgeDto[] = [
      { id: 'm1', sourceId: 'root', targetId: 'juft', relation: 'TURMUSH', dashed: true },
      // Bola OTAga (root) ulangan bo'lsa ham — yakka juftlikda MARKAZDAN chiqadi
      { id: 'e1', sourceId: 'root', targetId: 'bola', relation: 'OGIL', dashed: false },
    ];
    const { edges: flowEdges } = buildBoard(members, edges);
    const toBola = flowEdges.find((e) => e.target === 'bola')!;
    expect(toBola.source).toBe('root');
    expect(toBola.sourceHandle).toBe('root__couple'); // ikki tomonlama markaziy nuqta
  });

  it("yolg'iz ota-ona bolasi o'z nuqtasidan chiqadi (couple handle EMAS)", () => {
    const members: FamilyMemberDto[] = [
      member({ id: 'root', isRoot: true, relation: 'Men', fullName: 'Men' }),
      member({ id: 'bola', relation: 'OGIL', fullName: 'Bola' }),
    ];
    const edges: FamilyEdgeDto[] = [
      { id: 'e1', sourceId: 'root', targetId: 'bola', relation: 'OGIL', dashed: false },
    ];
    const { edges: flowEdges } = buildBoard(members, edges);
    expect(flowEdges.find((e) => e.target === 'bola')!.sourceHandle).toBe('root');
  });
});
