import { describe, expect, it } from 'vitest';
import {
  closeFamilyIds,
  closeFamilyLabels,
  computeRelationLabels,
  relationInfoFrom,
  relationLabelsFrom,
} from './kinship';
import type { FamilyEdgeDto, FamilyMemberDto } from '@/features/tree/types';

type M = Pick<FamilyMemberDto, 'id' | 'relation' | 'gender' | 'isRoot'>;
type E = Pick<FamilyEdgeDto, 'sourceId' | 'targetId' | 'relation'>;

const root: M = { id: 'root', relation: 'Men', gender: 'MALE', isRoot: true };

/** Ajdod rishtasi: yangi=source, anker=target */
const ancEdge = (newId: string, anchorId: string, rel: string): E => ({
  sourceId: newId,
  targetId: anchorId,
  relation: rel,
});
/** Yon/avlod rishtasi: anker=source, yangi=target */
const sideEdge = (anchorId: string, newId: string, rel: string): E => ({
  sourceId: anchorId,
  targetId: newId,
  relation: rel,
});

describe('computeRelationLabels (ildizga nisbatan)', () => {
  it('bevosita ota/ona', () => {
    const members: M[] = [
      root,
      { id: 'ota', relation: 'OTA', gender: 'MALE', isRoot: false },
      { id: 'ona', relation: 'ONA', gender: 'FEMALE', isRoot: false },
    ];
    const edges: E[] = [ancEdge('ota', 'root', 'OTA'), ancEdge('ona', 'root', 'ONA')];
    const labels = computeRelationLabels(members, edges);
    expect(labels.get('ota')).toBe('Ota');
    expect(labels.get('ona')).toBe('Ona');
  });

  it("onamning ota-onasi -> Bobo/Buvi (ona sifatida emas)", () => {
    const members: M[] = [
      root,
      { id: 'ona', relation: 'ONA', gender: 'FEMALE', isRoot: false },
      { id: 'ona_otasi', relation: 'OTA', gender: 'MALE', isRoot: false },
      { id: 'ona_onasi', relation: 'ONA', gender: 'FEMALE', isRoot: false },
    ];
    const edges: E[] = [
      ancEdge('ona', 'root', 'ONA'),
      ancEdge('ona_otasi', 'ona', 'OTA'), // onamning otasi
      ancEdge('ona_onasi', 'ona', 'ONA'), // onamning onasi
    ];
    const labels = computeRelationLabels(members, edges);
    expect(labels.get('ona_otasi')).toBe('Bobo');
    expect(labels.get('ona_onasi')).toBe('Buvi');
  });

  it("onamning opasi -> Xola, otamning akasi -> Amaki", () => {
    const members: M[] = [
      root,
      { id: 'ona', relation: 'ONA', gender: 'FEMALE', isRoot: false },
      { id: 'ota', relation: 'OTA', gender: 'MALE', isRoot: false },
      { id: 'ona_opasi', relation: 'OPA', gender: 'FEMALE', isRoot: false },
      { id: 'ota_akasi', relation: 'AKA', gender: 'MALE', isRoot: false },
    ];
    const edges: E[] = [
      ancEdge('ona', 'root', 'ONA'),
      ancEdge('ota', 'root', 'OTA'),
      sideEdge('ona', 'ona_opasi', 'OPA'), // onamning opasi
      sideEdge('ota', 'ota_akasi', 'AKA'), // otamning akasi
    ];
    const labels = computeRelationLabels(members, edges);
    expect(labels.get('ona_opasi')).toBe('Xola');
    expect(labels.get('ota_akasi')).toBe('Amaki');
  });

  it("onamning onasi (buvi)ning bolalari -> Xola/Tog'a (ona tomoni)", () => {
    const members: M[] = [
      root,
      { id: 'ona', relation: 'ONA', gender: 'FEMALE', isRoot: false },
      { id: 'buvi', relation: 'ONA', gender: 'FEMALE', isRoot: false }, // onamning onasi
      { id: 'xola', relation: 'QIZ', gender: 'FEMALE', isRoot: false }, // buvining qizi
      { id: 'toga', relation: 'OGIL', gender: 'MALE', isRoot: false }, // buvining o'g'li
    ];
    const edges: E[] = [
      ancEdge('ona', 'root', 'ONA'),
      ancEdge('buvi', 'ona', 'ONA'),
      sideEdge('buvi', 'xola', 'QIZ'),
      sideEdge('buvi', 'toga', 'OGIL'),
    ];
    const labels = computeRelationLabels(members, edges);
    expect(labels.get('xola')).toBe('Xola'); // ona tomoni ayol -> Xola (Qiz emas!)
    expect(labels.get('toga')).toBe("Tog'a"); // ona tomoni erkak -> Tog'a
  });

  it("otamning otasi (bobo)ning bolalari -> Amma/Amaki (ota tomoni)", () => {
    const members: M[] = [
      root,
      { id: 'ota', relation: 'OTA', gender: 'MALE', isRoot: false },
      { id: 'bobo', relation: 'OTA', gender: 'MALE', isRoot: false }, // otamning otasi
      { id: 'amma', relation: 'QIZ', gender: 'FEMALE', isRoot: false },
      { id: 'amaki', relation: 'OGIL', gender: 'MALE', isRoot: false },
    ];
    const edges: E[] = [
      ancEdge('ota', 'root', 'OTA'),
      ancEdge('bobo', 'ota', 'OTA'),
      sideEdge('bobo', 'amma', 'QIZ'),
      sideEdge('bobo', 'amaki', 'OGIL'),
    ];
    const labels = computeRelationLabels(members, edges);
    expect(labels.get('amma')).toBe('Amma'); // ota tomoni ayol -> Amma
    expect(labels.get('amaki')).toBe('Amaki'); // ota tomoni erkak -> Amaki
  });

  it('bevosita xola/amaki root ga', () => {
    const members: M[] = [
      root,
      { id: 'x', relation: 'XOLA', gender: 'FEMALE', isRoot: false },
      { id: 'a', relation: 'AMAKI', gender: 'MALE', isRoot: false },
    ];
    // XOLA/AMAKI — yangi a'zo SOURCE (backend edgeDirection bilan mos)
    const edges: E[] = [ancEdge('x', 'root', 'XOLA'), ancEdge('a', 'root', 'AMAKI')];
    const labels = computeRelationLabels(members, edges);
    expect(labels.get('x')).toBe('Xola');
    expect(labels.get('a')).toBe('Amaki');
  });

  it('akamning farzandi -> Jiyan; o\'g\'limning o\'g\'li -> Nabira', () => {
    const members: M[] = [
      root,
      { id: 'aka', relation: 'AKA', gender: 'MALE', isRoot: false },
      { id: 'jiyan', relation: 'OGIL', gender: 'MALE', isRoot: false },
      { id: 'ogil', relation: 'OGIL', gender: 'MALE', isRoot: false },
      { id: 'nabira', relation: 'OGIL', gender: 'MALE', isRoot: false },
    ];
    const edges: E[] = [
      sideEdge('root', 'aka', 'AKA'),
      sideEdge('aka', 'jiyan', 'OGIL'),
      sideEdge('root', 'ogil', 'OGIL'),
      sideEdge('ogil', 'nabira', 'OGIL'),
    ];
    const labels = computeRelationLabels(members, edges);
    expect(labels.get('jiyan')).toBe('Jiyan');
    expect(labels.get('nabira')).toBe('Nabira');
  });

  it('amakimning bolasi -> Amakivachcha; xolamning bolasi -> Xolavachcha', () => {
    const members: M[] = [
      root,
      { id: 'amaki', relation: 'AMAKI', gender: 'MALE', isRoot: false },
      { id: 'xola', relation: 'XOLA', gender: 'FEMALE', isRoot: false },
      { id: 'av', relation: 'OGIL', gender: 'MALE', isRoot: false },
      { id: 'xv', relation: 'QIZ', gender: 'FEMALE', isRoot: false },
    ];
    const edges: E[] = [
      ancEdge('amaki', 'root', 'AMAKI'), // amaki/xola — yangi a'zo SOURCE
      ancEdge('xola', 'root', 'XOLA'),
      sideEdge('amaki', 'av', 'OGIL'),
      sideEdge('xola', 'xv', 'QIZ'),
    ];
    const labels = computeRelationLabels(members, edges);
    expect(labels.get('av')).toBe('Amakivachcha');
    expect(labels.get('xv')).toBe('Xolavachcha');
  });

  it("tog'aning bolasi -> Tog'avachcha; ammaning bolasi -> Ammavachcha", () => {
    const members: M[] = [
      root,
      { id: 'toga', relation: 'TOGA', gender: 'MALE', isRoot: false },
      { id: 'amma', relation: 'AMMA', gender: 'FEMALE', isRoot: false },
      { id: 'tv', relation: 'OGIL', gender: 'MALE', isRoot: false }, // tog'aning o'g'li
      { id: 'amv', relation: 'QIZ', gender: 'FEMALE', isRoot: false }, // ammaning qizi
    ];
    const edges: E[] = [
      ancEdge('toga', 'root', 'TOGA'),
      ancEdge('amma', 'root', 'AMMA'),
      sideEdge('toga', 'tv', 'OGIL'),
      sideEdge('amma', 'amv', 'QIZ'),
    ];
    const labels = computeRelationLabels(members, edges);
    expect(labels.get('tv')).toBe("Tog'avachcha"); // Xolavachcha emas!
    expect(labels.get('amv')).toBe('Ammavachcha');
  });

  it('turmush o\'rtog\'imning ota-onasi -> Qaynota/Qaynona', () => {
    const members: M[] = [
      root,
      { id: 'juft', relation: 'TURMUSH', gender: 'FEMALE', isRoot: false },
      { id: 'qota', relation: 'OTA', gender: 'MALE', isRoot: false },
      { id: 'qona', relation: 'ONA', gender: 'FEMALE', isRoot: false },
    ];
    const edges: E[] = [
      sideEdge('root', 'juft', 'TURMUSH'),
      ancEdge('qota', 'juft', 'OTA'),
      ancEdge('qona', 'juft', 'ONA'),
    ];
    const labels = computeRelationLabels(members, edges);
    expect(labels.get('qota')).toBe('Qaynota');
    expect(labels.get('qona')).toBe('Qaynona');
  });

  it('opamning eri -> Pochcha; o\'g\'limning xotini -> Kelinoyi; qizimning eri -> Kuyov', () => {
    const members: M[] = [
      root,
      { id: 'opa', relation: 'OPA', gender: 'FEMALE', isRoot: false },
      { id: 'pochcha', relation: 'TURMUSH', gender: 'MALE', isRoot: false },
      { id: 'ogil', relation: 'OGIL', gender: 'MALE', isRoot: false },
      { id: 'kelin', relation: 'TURMUSH', gender: 'FEMALE', isRoot: false },
      { id: 'qiz', relation: 'QIZ', gender: 'FEMALE', isRoot: false },
      { id: 'kuyov', relation: 'TURMUSH', gender: 'MALE', isRoot: false },
    ];
    const edges: E[] = [
      sideEdge('root', 'opa', 'OPA'),
      sideEdge('opa', 'pochcha', 'TURMUSH'), // opamning eri
      sideEdge('root', 'ogil', 'OGIL'),
      sideEdge('ogil', 'kelin', 'TURMUSH'), // o'g'limning xotini
      sideEdge('root', 'qiz', 'QIZ'),
      sideEdge('qiz', 'kuyov', 'TURMUSH'), // qizimning eri
    ];
    const labels = computeRelationLabels(members, edges);
    expect(labels.get('pochcha')).toBe('Pochcha'); // opa eri (erkak) -> Pochcha
    expect(labels.get('kelin')).toBe('Kelinoyi'); // o'g'il xotini (ayol) -> Kelinoyi (yosh solishtira olmaydigan eski hisoblash)
    expect(labels.get('kuyov')).toBe('Kuyov'); // qiz eri (erkak) -> Kuyov
  });

  it('nabira va chevara (uchinchi avlod)', () => {
    const members: M[] = [
      root,
      { id: 'o', relation: 'OGIL', gender: 'MALE', isRoot: false },
      { id: 'n', relation: 'OGIL', gender: 'MALE', isRoot: false },
      { id: 'c', relation: 'OGIL', gender: 'MALE', isRoot: false },
    ];
    const edges: E[] = [
      sideEdge('root', 'o', 'OGIL'),
      sideEdge('o', 'n', 'OGIL'),
      sideEdge('n', 'c', 'OGIL'),
    ];
    const labels = computeRelationLabels(members, edges);
    expect(labels.get('n')).toBe('Nabira');
    expect(labels.get('c')).toBe('Chevara');
  });

  it("tog'amning xotini -> Kelinoyi; xolamning eri -> Pochcha", () => {
    const members: M[] = [
      root,
      { id: 'toga', relation: 'TOGA', gender: 'MALE', isRoot: false },
      { id: 'xola', relation: 'XOLA', gender: 'FEMALE', isRoot: false },
      { id: 'kelinoyi', relation: 'TURMUSH', gender: 'FEMALE', isRoot: false }, // tog'aning xotini
      { id: 'pochcha', relation: 'TURMUSH', gender: 'MALE', isRoot: false }, // xolaning eri
    ];
    const edges: E[] = [
      ancEdge('toga', 'root', 'TOGA'), // TOGA/XOLA — yangi a'zo SOURCE
      ancEdge('xola', 'root', 'XOLA'),
      sideEdge('toga', 'kelinoyi', 'TURMUSH'),
      sideEdge('xola', 'pochcha', 'TURMUSH'),
    ];
    const labels = computeRelationLabels(members, edges);
    expect(labels.get('kelinoyi')).toBe('Kelinoyi');
    expect(labels.get('pochcha')).toBe('Pochcha');
  });

  it('bobomning xotini -> Buvi; otamning xotini -> Ona', () => {
    const members: M[] = [
      root,
      { id: 'ota', relation: 'OTA', gender: 'MALE', isRoot: false },
      { id: 'bobo', relation: 'OTA', gender: 'MALE', isRoot: false },
      { id: 'buvi', relation: 'TURMUSH', gender: 'FEMALE', isRoot: false }, // bobomning xotini
      { id: 'ona', relation: 'TURMUSH', gender: 'FEMALE', isRoot: false }, // otamning xotini
    ];
    const edges: E[] = [
      ancEdge('ota', 'root', 'OTA'),
      ancEdge('bobo', 'ota', 'OTA'),
      sideEdge('bobo', 'buvi', 'TURMUSH'),
      sideEdge('ota', 'ona', 'TURMUSH'),
    ];
    const labels = computeRelationLabels(members, edges);
    expect(labels.get('buvi')).toBe('Buvi'); // Turmush o'rtog'i emas!
    expect(labels.get('ona')).toBe('Ona');
  });

  it("tog'avachchamning xotini -> Kelinoyi", () => {
    // root -> tog'a (TOGA) -> o'g'li = tog'avachcha (COUSIN) -> xotini = Kelinoyi
    const members: M[] = [
      root,
      { id: 'toga', relation: 'TOGA', gender: 'MALE', isRoot: false },
      { id: 'tv', relation: 'OGIL', gender: 'MALE', isRoot: false }, // tog'aning o'g'li
      { id: 'kelinoyi', relation: 'TURMUSH', gender: 'FEMALE', isRoot: false }, // tog'avachchaning xotini
    ];
    const edges: E[] = [
      ancEdge('toga', 'root', 'TOGA'),
      sideEdge('toga', 'tv', 'OGIL'),
      sideEdge('tv', 'kelinoyi', 'TURMUSH'),
    ];
    const labels = computeRelationLabels(members, edges);
    expect(labels.get('tv')).toBe("Tog'avachcha");
    expect(labels.get('kelinoyi')).toBe('Kelinoyi');
  });

  it('root -> Men', () => {
    expect(computeRelationLabels([root], []).get('root')).toBe('Men');
  });
});

describe('relationLabelsFrom (ANKERGA nisbatan, umumiy doska)', () => {
  it('anchor = root: yorliqlar computeRelationLabels bilan bir xil (tog\'a/jiyan/pochcha)', () => {
    const members: M[] = [
      root,
      { id: 'ona', relation: 'ONA', gender: 'FEMALE', isRoot: false },
      { id: 'buvi', relation: 'ONA', gender: 'FEMALE', isRoot: false }, // onamning onasi
      { id: 'toga', relation: 'OGIL', gender: 'MALE', isRoot: false }, // buvining o'g'li = tog'a
      { id: 'tv', relation: 'OGIL', gender: 'MALE', isRoot: false }, // tog'aning o'g'li
      { id: 'aka', relation: 'AKA', gender: 'MALE', isRoot: false },
      { id: 'jiyan', relation: 'OGIL', gender: 'MALE', isRoot: false },
      { id: 'opa', relation: 'OPA', gender: 'FEMALE', isRoot: false },
      { id: 'pochcha', relation: 'TURMUSH', gender: 'MALE', isRoot: false },
    ];
    const edges: E[] = [
      ancEdge('ona', 'root', 'ONA'),
      ancEdge('buvi', 'ona', 'ONA'),
      sideEdge('buvi', 'toga', 'OGIL'),
      sideEdge('toga', 'tv', 'OGIL'),
      sideEdge('root', 'aka', 'AKA'),
      sideEdge('aka', 'jiyan', 'OGIL'),
      sideEdge('root', 'opa', 'OPA'),
      sideEdge('opa', 'pochcha', 'TURMUSH'),
    ];
    const l = relationLabelsFrom(members, edges); // anchor yo'q -> isRoot
    expect(l.get('toga')).toBe("Tog'a");
    expect(l.get('tv')).toBe("Tog'avachcha");
    expect(l.get('jiyan')).toBe('Jiyan');
    expect(l.get('pochcha')).toBe('Pochcha');
  });

  it('anchor != root: yorliqlar ANKERGA nisbatan qayta hisoblanadi', () => {
    // root(erkak): otasi=ota, onasi=ona; onaning otasi=obobo
    const members: M[] = [
      root,
      { id: 'ota', relation: 'OTA', gender: 'MALE', isRoot: false },
      { id: 'ona', relation: 'ONA', gender: 'FEMALE', isRoot: false },
      { id: 'obobo', relation: 'OTA', gender: 'MALE', isRoot: false }, // onaning otasi
    ];
    const edges: E[] = [
      ancEdge('ota', 'root', 'OTA'),
      ancEdge('ona', 'root', 'ONA'),
      ancEdge('obobo', 'ona', 'OTA'),
    ];
    const l = relationLabelsFrom(members, edges, 'ona'); // ANKER = ona
    expect(l.get('ona')).toBe('Men');
    expect(l.get('root')).toBe("O'g'il"); // ona uchun root = o'g'li
    expect(l.get('ota')).toBe("Turmush o'rtog'i"); // ona uchun ota = eri
    expect(l.get('obobo')).toBe('Ota'); // ona uchun "bobo" = otasi
  });

  it("ajdod atamalari — an'anaviy nomlar (katta bobo, bobokalon, to'qabobo, jizzabobo, zotabobo)", () => {
    const members: M[] = [
      root,
      { id: 'ota', relation: 'OTA', gender: 'MALE', isRoot: false }, // gen1
      { id: 'bobo', relation: 'OTA', gender: 'MALE', isRoot: false }, // gen2
      { id: 'kbobo', relation: 'OTA', gender: 'MALE', isRoot: false }, // gen3
      { id: 'bkalon', relation: 'OTA', gender: 'MALE', isRoot: false }, // gen4
      { id: 'tqbobo', relation: 'OTA', gender: 'MALE', isRoot: false }, // gen5
      { id: 'jzbobo', relation: 'OTA', gender: 'MALE', isRoot: false }, // gen6
      { id: 'ztbobo', relation: 'OTA', gender: 'MALE', isRoot: false }, // gen7
      { id: 'g8bobo', relation: 'OTA', gender: 'MALE', isRoot: false }, // gen8
      { id: 'kbuvi', relation: 'ONA', gender: 'FEMALE', isRoot: false }, // bobo onasi = gen3
      { id: 'mkalon', relation: 'ONA', gender: 'FEMALE', isRoot: false }, // kbobo onasi = gen4
    ];
    const edges: E[] = [
      ancEdge('ota', 'root', 'OTA'),
      ancEdge('bobo', 'ota', 'OTA'),
      ancEdge('kbobo', 'bobo', 'OTA'),
      ancEdge('bkalon', 'kbobo', 'OTA'),
      ancEdge('tqbobo', 'bkalon', 'OTA'),
      ancEdge('jzbobo', 'tqbobo', 'OTA'),
      ancEdge('ztbobo', 'jzbobo', 'OTA'),
      ancEdge('g8bobo', 'ztbobo', 'OTA'),
      ancEdge('kbuvi', 'bobo', 'ONA'),
      ancEdge('mkalon', 'kbobo', 'ONA'),
    ];
    for (const fn of [computeRelationLabels, (m: M[], e: E[]) => relationLabelsFrom(m, e)]) {
      const l = fn(members, edges);
      expect(l.get('bobo')).toBe('Bobo');
      expect(l.get('kbobo')).toBe('Katta bobo');
      expect(l.get('bkalon')).toBe('Bobokalon');
      expect(l.get('tqbobo')).toBe("To'qabobo");
      expect(l.get('jzbobo')).toBe('Jizzabobo');
      expect(l.get('ztbobo')).toBe('Zotabobo');
      expect(l.get('g8bobo')).toBe('8-avlod bobo');
      expect(l.get('kbuvi')).toBe('Katta buvi');
      expect(l.get('mkalon')).toBe('Momokalon');
    }

    // Avlod raqamlari — ENG TEPADAN pastga: eng katta ajdod = 1-avlod.
    // Bu daraxtda eng tepa g8bobo (8 qavat yuqorida) -> u 1-avlod, men 9-avlod.
    const { generations } = relationInfoFrom(members, edges);
    expect(generations.get('g8bobo')).toBe(1);
    expect(generations.get('ztbobo')).toBe(2);
    expect(generations.get('jzbobo')).toBe(3);
    expect(generations.get('tqbobo')).toBe(4);
    expect(generations.get('bkalon')).toBe(5);
    expect(generations.get('kbobo')).toBe(6);
    expect(generations.get('bobo')).toBe(7);
    expect(generations.get('ota')).toBe(8);
    expect(generations.get('root')).toBe(9); // men — oxirgi qavat
    expect(generations.get('kbuvi')).toBe(6); // katta bobo qavatida
    expect(generations.get('mkalon')).toBe(5); // bobokalon qavatida
  });

  it("bobokalonning boshqa bolalari — Katta amaki/amma (Bobo/Buvi EMAS, O'g'il/Qiz EMAS)", () => {
    const members: M[] = [
      root,
      { id: 'ota', relation: 'OTA', gender: 'MALE', isRoot: false }, // gen1
      { id: 'bobo', relation: 'OTA', gender: 'MALE', isRoot: false }, // gen2
      { id: 'kbobo', relation: 'OTA', gender: 'MALE', isRoot: false }, // gen3
      { id: 'bkalon', relation: 'OTA', gender: 'MALE', isRoot: false }, // gen4
      // Bobokalonning BOSHQA bolalari (mening chizig'imda emas) — katta bobo qavati:
      { id: 'kbobo2', relation: 'OGIL', gender: 'MALE', isRoot: false },
      { id: 'kbuvi2', relation: 'QIZ', gender: 'FEMALE', isRoot: false },
      // ularning bolasi — bobo qavati:
      { id: 'bobo2', relation: 'OGIL', gender: 'MALE', isRoot: false },
      // bobo qavatidagining bolasi — ota qavati (amaki):
      { id: 'amaki2', relation: 'OGIL', gender: 'MALE', isRoot: false },
    ];
    const edges: E[] = [
      ancEdge('ota', 'root', 'OTA'),
      ancEdge('bobo', 'ota', 'OTA'),
      ancEdge('kbobo', 'bobo', 'OTA'),
      ancEdge('bkalon', 'kbobo', 'OTA'),
      sideEdge('bkalon', 'kbobo2', 'OGIL'),
      sideEdge('bkalon', 'kbuvi2', 'QIZ'),
      sideEdge('kbobo2', 'bobo2', 'OGIL'),
      sideEdge('bobo2', 'amaki2', 'OGIL'),
    ];
    for (const fn of [computeRelationLabels, (m: M[], e: E[]) => relationLabelsFrom(m, e)]) {
      const l = fn(members, edges);
      // Bobo/Buvi atamasi FAQAT to'g'ri chiziqqa — yon tarmoq Katta amaki/amma
      expect(l.get('kbobo2')).toBe('Katta katta amaki');
      expect(l.get('kbuvi2')).toBe('Katta katta amma');
      expect(l.get('bobo2')).toBe('Katta amaki');
      expect(l.get('amaki2')).toBe('Amaki');
      // To'g'ri chiziq o'zgarishsiz
      expect(l.get('bobo')).toBe('Bobo');
      expect(l.get('kbobo')).toBe('Katta bobo');
      expect(l.get('bkalon')).toBe('Bobokalon');
    }
    // Avlod raqamlari — o'z chizig'imdagi bilan BIR XIL qavat raqami
    const { generations } = relationInfoFrom(members, edges);
    expect(generations.get('bkalon')).toBe(1);
    expect(generations.get('kbobo')).toBe(2);
    expect(generations.get('kbobo2')).toBe(2); // katta bobo bilan bir qavatda
    expect(generations.get('kbuvi2')).toBe(2);
    expect(generations.get('bobo2')).toBe(3); // bobo bilan bir qavatda
    expect(generations.get('amaki2')).toBe(4); // ota bilan bir qavatda
    expect(generations.get('root')).toBe(5);
  });

  it("qo'sh xotinlik/erlik: qondosh buvi 'Buvi', boshqa juftlar 'O'gay buvi/bobo'", () => {
    const members: M[] = [
      root,
      { id: 'ota', relation: 'OTA', gender: 'MALE', isRoot: false },
      { id: 'bobo', relation: 'OTA', gender: 'MALE', isRoot: false },
      { id: 'buvi', relation: 'ONA', gender: 'FEMALE', isRoot: false }, // otaning ONASI — qondosh
      { id: 'ogaybuvi', relation: 'TURMUSH', gender: 'FEMALE', isRoot: false }, // boboning 2-xotini
      { id: 'ogaybobo', relation: 'TURMUSH', gender: 'MALE', isRoot: false }, // buvining 2-eri
    ];
    const edges: E[] = [
      ancEdge('ota', 'root', 'OTA'),
      ancEdge('bobo', 'ota', 'OTA'),
      ancEdge('buvi', 'ota', 'ONA'),
      { sourceId: 'bobo', targetId: 'ogaybuvi', relation: 'TURMUSH' },
      { sourceId: 'buvi', targetId: 'ogaybobo', relation: 'TURMUSH' },
    ];
    const { labels, generations } = relationInfoFrom(members, edges);
    expect(labels.get('buvi')).toBe('Buvi'); // qondosh — haqiqiy buvi
    expect(labels.get('bobo')).toBe('Bobo');
    expect(labels.get('ogaybuvi')).toBe("O'gay buvi"); // qondosh emas
    expect(labels.get('ogaybobo')).toBe("O'gay bobo"); // qondosh emas (qo'sh erlik)
    // Avlod raqami faqat qondoshlarga
    expect(generations.get('buvi')).toBe(1);
    expect(generations.get('ogaybuvi')).toBeUndefined();
    expect(generations.get('ogaybobo')).toBeUndefined();
  });

  it("boboning YAGONA xotini (onasi rishtasiz bo'lsa ham) Buvi bo'lib qoladi", () => {
    const members: M[] = [
      root,
      { id: 'ota', relation: 'OTA', gender: 'MALE', isRoot: false },
      { id: 'bobo', relation: 'OTA', gender: 'MALE', isRoot: false },
      { id: 'xotin', relation: 'TURMUSH', gender: 'FEMALE', isRoot: false },
    ];
    const edges: E[] = [
      ancEdge('ota', 'root', 'OTA'),
      ancEdge('bobo', 'ota', 'OTA'),
      { sourceId: 'bobo', targetId: 'xotin', relation: 'TURMUSH' },
    ];
    const { labels } = relationInfoFrom(members, edges);
    expect(labels.get('xotin')).toBe('Buvi'); // yagona juft — haqiqiy buvi deb olinadi
  });

  it("sides: ota tomon (ota/bobo/amaki/amakivachcha) va ona tomon (ona/xola/xolavachcha) to'g'ri ajratiladi", () => {
    const members: M[] = [
      root,
      { id: 'ota', relation: 'OTA', gender: 'MALE', isRoot: false },
      { id: 'ona', relation: 'ONA', gender: 'FEMALE', isRoot: false },
      { id: 'bobo', relation: 'OTA', gender: 'MALE', isRoot: false },
      { id: 'amaki', relation: 'AMAKI', gender: 'MALE', isRoot: false },
      { id: 'xola', relation: 'XOLA', gender: 'FEMALE', isRoot: false },
      { id: 'amakivachcha', relation: 'OGIL', gender: 'MALE', isRoot: false },
      { id: 'xolavachcha', relation: 'QIZ', gender: 'FEMALE', isRoot: false },
      { id: 'aka', relation: 'AKA', gender: 'MALE', isRoot: false },
      { id: 'ogil', relation: 'OGIL', gender: 'MALE', isRoot: false },
      { id: 'xotin', relation: 'TURMUSH', gender: 'FEMALE', isRoot: false },
    ];
    const edges: E[] = [
      ancEdge('ota', 'root', 'OTA'),
      ancEdge('ona', 'root', 'ONA'),
      ancEdge('bobo', 'ota', 'OTA'),
      { sourceId: 'amaki', targetId: 'root', relation: 'AMAKI' },
      { sourceId: 'xola', targetId: 'root', relation: 'XOLA' },
      { sourceId: 'amaki', targetId: 'amakivachcha', relation: 'OGIL' },
      { sourceId: 'xola', targetId: 'xolavachcha', relation: 'QIZ' },
      sideEdge('root', 'aka', 'AKA'),
      sideEdge('root', 'ogil', 'OGIL'),
      { sourceId: 'root', targetId: 'xotin', relation: 'TURMUSH' },
    ];
    const { sides } = relationInfoFrom(members, edges);
    expect(sides.get('ota')).toBe('PATERNAL');
    expect(sides.get('bobo')).toBe('PATERNAL');
    expect(sides.get('amaki')).toBe('PATERNAL');
    expect(sides.get('amakivachcha')).toBe('PATERNAL');
    expect(sides.get('ona')).toBe('MATERNAL');
    expect(sides.get('xola')).toBe('MATERNAL');
    expect(sides.get('xolavachcha')).toBe('MATERNAL');
    // O'zim, aka-uka, farzand — ildizning o'z yaqin doirasi, NEUTRAL
    // (toggle yoqilganda ham doim ko'rinishi kerak)
    expect(sides.get('root')).toBe('NEUTRAL');
    expect(sides.get('aka')).toBe('NEUTRAL');
    expect(sides.get('ogil')).toBe('NEUTRAL');
    // Turmush o'rtoq — ROOTning o'z turmush o'rtog'i bo'lgani uchun ham NEUTRAL
    expect(sides.get('xotin')).toBe('NEUTRAL');
  });

  it('sides: nikoh orqali qo\'shilgan, qondosh bo\'lmagan qarindosh (masalan amakining xotinining ONASI) hech qaysi tomonga tegishli emas', () => {
    const members: M[] = [
      root,
      { id: 'amaki', relation: 'AMAKI', gender: 'MALE', isRoot: false },
      { id: 'amakixotin', relation: 'TURMUSH', gender: 'FEMALE', isRoot: false },
      // Amakining xotinining o'z onasi — qondosh emas, faqat nikoh orqali
      { id: 'xotinona', relation: 'ONA', gender: 'FEMALE', isRoot: false },
    ];
    const edges: E[] = [
      { sourceId: 'amaki', targetId: 'root', relation: 'AMAKI' },
      { sourceId: 'amaki', targetId: 'amakixotin', relation: 'TURMUSH' },
      ancEdge('xotinona', 'amakixotin', 'ONA'),
    ];
    const { sides } = relationInfoFrom(members, edges);
    expect(sides.get('amaki')).toBe('PATERNAL');
    // Amakining xotini o'zi ham cat'ga kirmaydi (faqat "Kelinoyi" labeli oladi) — side yo'q
    expect(sides.get('amakixotin')).toBeUndefined();
    // Uning onasi ham — hech qaysi filtrda ko'rinmasligi kerak
    expect(sides.get('xotinona')).toBeUndefined();
  });

  it("sides: uzoq jiyan (ammaning nabirasi) NEUTRAL emas, aniq PATERNAL bo'lishi kerak", () => {
    // bobo -> ota (root otasi) va amma (ota singlisi) ikkalasining ham otasi.
    // amma -> ammavachcha -> uzoqjiyan: umumiy ajdod (bobo) rootdan 2 qavat,
    // uzoqjiyandan 3 qavat yuqorida — bu "LCA fallback / row<0" yo'lidan
    // NEPHEW sifatida keladi, lekin AMMA orqali (ota tomon) kelgani uchun
    // side yo'qolib NEUTRAL (har doim ko'rinadigan) bo'lib qolmasligi kerak.
    const members: M[] = [
      root,
      { id: 'ota', relation: 'OTA', gender: 'MALE', isRoot: false },
      { id: 'bobo', relation: 'OTA', gender: 'MALE', isRoot: false },
      { id: 'amma', relation: 'QIZ', gender: 'FEMALE', isRoot: false },
      { id: 'ammavachcha', relation: 'OGIL', gender: 'MALE', isRoot: false },
      { id: 'uzoqjiyan', relation: 'QIZ', gender: 'FEMALE', isRoot: false },
    ];
    const edges: E[] = [
      ancEdge('ota', 'root', 'OTA'),
      ancEdge('bobo', 'ota', 'OTA'),
      sideEdge('bobo', 'amma', 'QIZ'),
      sideEdge('amma', 'ammavachcha', 'OGIL'),
      sideEdge('ammavachcha', 'uzoqjiyan', 'QIZ'),
    ];
    const { sides, labels } = relationInfoFrom(members, edges);
    expect(labels.get('uzoqjiyan')).toBe('Jiyan');
    expect(sides.get('uzoqjiyan')).toBe('PATERNAL');
  });

  it("closeFamilyLabels: boboning qo'shimcha xotini O'gay buvi", () => {
    const members: M[] = [
      root,
      { id: 'ota', relation: 'OTA', gender: 'MALE', isRoot: false },
      { id: 'bobo', relation: 'OTA', gender: 'MALE', isRoot: false },
      { id: 'buvi', relation: 'ONA', gender: 'FEMALE', isRoot: false },
      { id: 'ogaybuvi', relation: 'TURMUSH', gender: 'FEMALE', isRoot: false },
    ];
    const edges: E[] = [
      ancEdge('ota', 'root', 'OTA'),
      ancEdge('bobo', 'ota', 'OTA'),
      ancEdge('buvi', 'ota', 'ONA'),
      { sourceId: 'bobo', targetId: 'ogaybuvi', relation: 'TURMUSH' },
    ];
    const labels = closeFamilyLabels(members, edges);
    expect(labels.get('bobo')).toBe('Bobo');
    expect(labels.get('buvi')).toBe('Buvi');
    expect(labels.get('ogaybuvi')).toBe("O'gay buvi");
  });

  it("avlod raqami faqat qondoshlarga — kelin/kuyov/turmush o'rtoqqa berilmaydi", () => {
    const members: M[] = [
      root,
      { id: 'xotin', relation: 'TURMUSH', gender: 'FEMALE', isRoot: false },
      { id: 'ota', relation: 'OTA', gender: 'MALE', isRoot: false }, // qondosh
      { id: 'bobo', relation: 'OTA', gender: 'MALE', isRoot: false }, // qondosh
      { id: 'ogil', relation: 'OGIL', gender: 'MALE', isRoot: false }, // qondosh
      { id: 'kelin', relation: 'TURMUSH', gender: 'FEMALE', isRoot: false }, // o'g'il xotini
      { id: 'qiz', relation: 'QIZ', gender: 'FEMALE', isRoot: false }, // qondosh
      { id: 'kuyov', relation: 'TURMUSH', gender: 'MALE', isRoot: false }, // qiz eri
    ];
    const edges: E[] = [
      ancEdge('ota', 'root', 'OTA'),
      ancEdge('bobo', 'ota', 'OTA'),
      { sourceId: 'root', targetId: 'xotin', relation: 'TURMUSH' },
      sideEdge('root', 'ogil', 'OGIL'),
      { sourceId: 'ogil', targetId: 'kelin', relation: 'TURMUSH' },
      sideEdge('root', 'qiz', 'QIZ'),
      { sourceId: 'qiz', targetId: 'kuyov', relation: 'TURMUSH' },
    ];
    const { labels, generations } = relationInfoFrom(members, edges);
    // Qondoshlar — eng tepa bobo = 1-avlod, ota = 2, men = 3, bolalarim = 4
    expect(generations.get('bobo')).toBe(1);
    expect(generations.get('ota')).toBe(2);
    expect(generations.get('root')).toBe(3);
    expect(generations.get('ogil')).toBe(4);
    expect(generations.get('qiz')).toBe(4);
    // Nikoh orqali qo'shilganlar — raqam YO'Q
    expect(generations.get('xotin')).toBeUndefined();
    expect(generations.get('kelin')).toBeUndefined();
    expect(generations.get('kuyov')).toBeUndefined();
    // Yorliqlari esa joyida qoladi
    expect(labels.get('xotin')).toBe("Turmush o'rtog'i");
    expect(labels.get('kelin')).toBe('Kelinoyi');
    expect(labels.get('kuyov')).toBe('Kuyov');
  });

  it("jiyanning xotini -> Kelinoyi, jiyanning eri -> Pochcha (Turmush o'rtog'i EMAS — bug tuzatildi)", () => {
    const members: M[] = [
      root,
      { id: 'aka', relation: 'AKA', gender: 'MALE', isRoot: false },
      { id: 'jiyan', relation: 'OGIL', gender: 'MALE', isRoot: false }, // akaning o'g'li
      { id: 'jiyan_xotini', relation: 'TURMUSH', gender: 'FEMALE', isRoot: false },
      { id: 'opa', relation: 'OPA', gender: 'FEMALE', isRoot: false },
      { id: 'jiyan_qiz', relation: 'QIZ', gender: 'FEMALE', isRoot: false }, // opaning qizi
      { id: 'jiyan_qiz_eri', relation: 'TURMUSH', gender: 'MALE', isRoot: false },
    ];
    const edges: E[] = [
      sideEdge('root', 'aka', 'AKA'),
      sideEdge('aka', 'jiyan', 'OGIL'),
      sideEdge('jiyan', 'jiyan_xotini', 'TURMUSH'),
      sideEdge('root', 'opa', 'OPA'),
      sideEdge('opa', 'jiyan_qiz', 'QIZ'),
      sideEdge('jiyan_qiz', 'jiyan_qiz_eri', 'TURMUSH'),
    ];
    const labels = relationLabelsFrom(members, edges);
    expect(labels.get('jiyan')).toBe('Jiyan');
    expect(labels.get('jiyan_xotini')).toBe('Kelinoyi');
    expect(labels.get('jiyan_qiz')).toBe('Jiyan');
    expect(labels.get('jiyan_qiz_eri')).toBe('Pochcha');
  });
});

describe('closeFamilyIds (yaqin oila)', () => {
  it("faqat o'zim, turmush, bolam, ota-ona, aka, bobo — qolganlari yo'q", () => {
    const members: M[] = [
      root,
      { id: 'ota', relation: 'OTA', gender: 'MALE', isRoot: false }, // yaqin
      { id: 'ona', relation: 'ONA', gender: 'FEMALE', isRoot: false }, // yaqin
      { id: 'bobo', relation: 'OTA', gender: 'MALE', isRoot: false }, // yaqin (bobo)
      { id: 'katta_bobo', relation: 'OTA', gender: 'MALE', isRoot: false }, // yaqin (gen3 — endi ko'rinadi)
      { id: 'aka', relation: 'AKA', gender: 'MALE', isRoot: false }, // yaqin
      { id: 'ogil', relation: 'OGIL', gender: 'MALE', isRoot: false }, // yaqin
      { id: 'nabira', relation: 'OGIL', gender: 'MALE', isRoot: false }, // yaqin (nevara)
      { id: 'turmush', relation: 'TURMUSH', gender: 'FEMALE', isRoot: false }, // yaqin
      { id: 'toga', relation: 'TOGA', gender: 'MALE', isRoot: false }, // YO'Q
      { id: 'jiyan', relation: 'OGIL', gender: 'MALE', isRoot: false }, // YO'Q (aka bolasi)
    ];
    const edges: E[] = [
      ancEdge('ota', 'root', 'OTA'),
      ancEdge('ona', 'root', 'ONA'),
      ancEdge('bobo', 'ota', 'OTA'),
      ancEdge('katta_bobo', 'bobo', 'OTA'),
      sideEdge('root', 'aka', 'AKA'),
      sideEdge('root', 'ogil', 'OGIL'),
      sideEdge('ogil', 'nabira', 'OGIL'),
      sideEdge('root', 'turmush', 'TURMUSH'),
      ancEdge('toga', 'root', 'TOGA'),
      sideEdge('aka', 'jiyan', 'OGIL'),
    ];
    const ids = closeFamilyIds(members, edges);
    expect([...ids].sort()).toEqual([
      'aka',
      'bobo',
      'jiyan',
      'katta_bobo',
      'nabira',
      'ogil',
      'ona',
      'ota',
      'root',
      'turmush',
    ]);
    expect(ids.has('katta_bobo')).toBe(true); // gen3 bobo — TO'G'RI CHIZIQ, ko'rinadi
    expect(ids.has('nabira')).toBe(true); // nevara
    expect(ids.has('jiyan')).toBe(true); // aka bolasi (jiyan) — endi ko'rinadi
    expect(ids.has('toga')).toBe(false); // tog'a — chiqmaydi
  });

  it("yaqin oilada BUTUN ajdodlar zanjiri ko'rinadi va to'g'ri nomlanadi", () => {
    const members: M[] = [
      root,
      { id: 'ota', relation: 'OTA', gender: 'MALE', isRoot: false },
      { id: 'bobo', relation: 'OTA', gender: 'MALE', isRoot: false },
      { id: 'kbobo', relation: 'OTA', gender: 'MALE', isRoot: false }, // gen3
      { id: 'bkalon', relation: 'OTA', gender: 'MALE', isRoot: false }, // gen4
      { id: 'mkalon', relation: 'ONA', gender: 'FEMALE', isRoot: false }, // gen4 (kbobo onasi)
      { id: 'tqbobo', relation: 'OTA', gender: 'MALE', isRoot: false }, // gen5
    ];
    const edges: E[] = [
      ancEdge('ota', 'root', 'OTA'),
      ancEdge('bobo', 'ota', 'OTA'),
      ancEdge('kbobo', 'bobo', 'OTA'),
      ancEdge('bkalon', 'kbobo', 'OTA'),
      ancEdge('mkalon', 'kbobo', 'ONA'),
      ancEdge('tqbobo', 'bkalon', 'OTA'),
    ];
    const ids = closeFamilyIds(members, edges);
    // Butun to'g'ri chiziq ajdodlari kiradi
    for (const id of ['bobo', 'kbobo', 'bkalon', 'mkalon', 'tqbobo']) {
      expect(ids.has(id)).toBe(true);
    }
    // Yorliqlar qavatiga qarab an'anaviy atama bilan
    const labels = closeFamilyLabels(members, edges);
    expect(labels.get('bobo')).toBe('Bobo');
    expect(labels.get('kbobo')).toBe('Katta bobo');
    expect(labels.get('bkalon')).toBe('Bobokalon');
    expect(labels.get('mkalon')).toBe('Momokalon');
    expect(labels.get('tqbobo')).toBe("To'qabobo");
  });

  it("bobomning IKKINCHI xotini (root'ga tegishli emas) chiqmaydi", () => {
    // root -> ota -> Kubraxon (ota'ning onasi = qon-buvi) + Sotixon (buvining eri = bobo)
    // Sotixonning ikkinchi xotini Nafisaxon -> root'ga tegishli EMAS, chiqmasin.
    const members: M[] = [
      root,
      { id: 'ota', relation: 'OTA', gender: 'MALE', isRoot: false },
      { id: 'kubra', relation: 'ONA', gender: 'FEMALE', isRoot: false }, // qon-buvi
      { id: 'sotix', relation: 'TURMUSH', gender: 'MALE', isRoot: false }, // bobo (buvining eri)
      { id: 'nafisa', relation: 'TURMUSH', gender: 'FEMALE', isRoot: false }, // 2-xotin
    ];
    const edges: E[] = [
      ancEdge('ota', 'root', 'OTA'),
      ancEdge('kubra', 'ota', 'ONA'),
      sideEdge('kubra', 'sotix', 'TURMUSH'), // Sotixon <-> Kubraxon
      sideEdge('sotix', 'nafisa', 'TURMUSH'), // Sotixon <-> Nafisaxon (2-xotin)
    ];
    const ids = closeFamilyIds(members, edges);
    expect([...ids].sort()).toEqual(['kubra', 'ota', 'root', 'sotix']);
    expect(ids.has('nafisa')).toBe(false); // ikkinchi xotin chiqmaydi
  });

  it("kelin (o'g'il xotini) va kuyov (qiz eri) yaqin oilaga kiradi", () => {
    const members: M[] = [
      root,
      { id: 'ogil', relation: 'OGIL', gender: 'MALE', isRoot: false },
      { id: 'kelin', relation: 'TURMUSH', gender: 'FEMALE', isRoot: false }, // o'g'il xotini
      { id: 'qiz', relation: 'QIZ', gender: 'FEMALE', isRoot: false },
      { id: 'kuyov', relation: 'TURMUSH', gender: 'MALE', isRoot: false }, // qiz eri
    ];
    const edges: E[] = [
      sideEdge('root', 'ogil', 'OGIL'),
      sideEdge('ogil', 'kelin', 'TURMUSH'),
      sideEdge('root', 'qiz', 'QIZ'),
      sideEdge('qiz', 'kuyov', 'TURMUSH'),
    ];
    const ids = closeFamilyIds(members, edges);
    expect(ids.has('kelin')).toBe(true);
    expect(ids.has('kuyov')).toBe(true);

    const labels = closeFamilyLabels(members, edges);
    expect(labels.get('kelin')).toBe('Kelin');
    expect(labels.get('kuyov')).toBe('Kuyov');
    expect(labels.get('ogil')).toBe("O'g'il");
    expect(labels.get('qiz')).toBe('Qiz');
  });

  // --- QO'SH XOTINLIK: bola XOTINGA ulangan bo'lsa ham OTAsi ko'rinsin ---
  it("qo'sh xotinlik — o'g'ilning 2-xotini bolasi (nevara) otaga ulanган holda kiradi", () => {
    const members: M[] = [
      root,
      { id: 'son', relation: 'OGIL', gender: 'MALE', isRoot: false },
      { id: 'w1', relation: 'TURMUSH', gender: 'FEMALE', isRoot: false },
      { id: 'w2', relation: 'TURMUSH', gender: 'FEMALE', isRoot: false },
      { id: 'gc1', relation: 'OGIL', gender: 'MALE', isRoot: false }, // w1 bolasi
      { id: 'gc2', relation: 'OGIL', gender: 'MALE', isRoot: false }, // w2 bolasi
    ];
    const edges: E[] = [
      sideEdge('root', 'son', 'OGIL'),
      sideEdge('son', 'w1', 'TURMUSH'),
      sideEdge('son', 'w2', 'TURMUSH'),
      sideEdge('w1', 'gc1', 'OGIL'),
      sideEdge('w2', 'gc2', 'OGIL'),
    ];
    const ids = closeFamilyIds(members, edges);
    expect(ids.has('gc1')).toBe(true);
    expect(ids.has('gc2')).toBe(true);
    const labels = closeFamilyLabels(members, edges);
    expect(labels.get('gc1')).toBe('Nevara');
    expect(labels.get('gc2')).toBe('Nevara');
  });

  it("qo'sh xotinlik — root 2-xotinининг bolasi (o'g'il) kiradi", () => {
    const members: M[] = [
      root,
      { id: 'w1', relation: 'TURMUSH', gender: 'FEMALE', isRoot: false },
      { id: 'w2', relation: 'TURMUSH', gender: 'FEMALE', isRoot: false },
      { id: 'c', relation: 'OGIL', gender: 'MALE', isRoot: false }, // w2 bolasi
    ];
    const edges: E[] = [
      sideEdge('root', 'w1', 'TURMUSH'),
      sideEdge('root', 'w2', 'TURMUSH'),
      sideEdge('w2', 'c', 'OGIL'),
    ];
    const ids = closeFamilyIds(members, edges);
    expect(ids.has('c')).toBe(true);
    expect(closeFamilyLabels(members, edges).get('c')).toBe("O'g'il");
  });

  it("qo'sh xotinlik — otaning 2-xotinидан o'gay aka otaga ulanган holda kiradi", () => {
    const members: M[] = [
      root,
      { id: 'ota', relation: 'OTA', gender: 'MALE', isRoot: false },
      { id: 'ona', relation: 'ONA', gender: 'FEMALE', isRoot: false },
      { id: 'ona2', relation: 'TURMUSH', gender: 'FEMALE', isRoot: false }, // otaning 2-xotini
      { id: 'half', relation: 'OGIL', gender: 'MALE', isRoot: false }, // o'gay aka (ona2 bolasi)
    ];
    const edges: E[] = [
      ancEdge('ota', 'root', 'OTA'),
      ancEdge('ona', 'root', 'ONA'),
      sideEdge('ota', 'ona2', 'TURMUSH'),
      sideEdge('ona2', 'half', 'OGIL'),
    ];
    const ids = closeFamilyIds(members, edges);
    expect(ids.has('half')).toBe(true); // o'gay aka
    expect(ids.has('ona2')).toBe(true); // uni otaga ulaydigan o'gay ona
    const labels = closeFamilyLabels(members, edges);
    expect(['Aka', 'Uka']).toContain(labels.get('half'));
    expect(labels.get('ona2')).toBe("O'gay ona");
  });

  it("OTA (onaning eri) + aka-uka xotini/bolalari ko'rinadi, o'gay ona chiqmaydi", () => {
    // Onaga (kubra) ulanган root; ota (sotix) faqat onaning ERI sifatida bor.
    const members: M[] = [
      root,
      { id: 'kubra', relation: 'ONA', gender: 'FEMALE', isRoot: false }, // ona
      { id: 'sotix', relation: 'TURMUSH', gender: 'MALE', isRoot: false }, // OTA (onaning eri)
      { id: 'nafisa', relation: 'TURMUSH', gender: 'FEMALE', isRoot: false }, // sotix 2-xotini
      { id: 'nomon', relation: 'OGIL', gender: 'MALE', isRoot: false }, // aka
      { id: 'zamira', relation: 'TURMUSH', gender: 'FEMALE', isRoot: false }, // aka xotini
      { id: 'jiyan1', relation: 'OGIL', gender: 'MALE', isRoot: false }, // jiyan (aka xotini bolasi)
    ];
    const edges: E[] = [
      sideEdge('kubra', 'root', 'QIZ'),
      sideEdge('kubra', 'sotix', 'TURMUSH'),
      sideEdge('sotix', 'nafisa', 'TURMUSH'),
      sideEdge('kubra', 'nomon', 'OGIL'),
      sideEdge('nomon', 'zamira', 'TURMUSH'),
      sideEdge('zamira', 'jiyan1', 'OGIL'),
    ];
    const ids = closeFamilyIds(members, edges);
    expect(ids.has('sotix')).toBe(true); // OTA — endi ko'rinadi
    expect(ids.has('zamira')).toBe(true); // aka xotini
    expect(ids.has('jiyan1')).toBe(true); // jiyan
    expect(ids.has('nafisa')).toBe(false); // o'gay ona — chiqmaydi

    const labels = closeFamilyLabels(members, edges);
    expect(labels.get('sotix')).toBe('Ota');
    expect(labels.get('kubra')).toBe('Ona');
    expect(labels.get('zamira')).toBe('Kelinoyi');
    expect(labels.get('jiyan1')).toBe('Jiyan');
    expect(['Aka', 'Uka']).toContain(labels.get('nomon'));
  });
});
