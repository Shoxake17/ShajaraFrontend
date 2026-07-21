// features/tree/model/kinship.ts
// Qarindoshlik ANIQLASH TIZIMI — har a'zoning ildizga (menga) kimligini
// avtomatik hisoblaydi. Har kishi o'z ankeriga nisbatan qo'shiladi; biz anker
// zanjiri bo'ylab qarindoshlikni "qo'shib" (composition) borib, ildizga nisbatan
// haqiqiy nomni topamiz:
//   onamning onasi  -> Buvi          otamning akasi -> Amaki
//   onamning opasi  -> Xola          akamning bolasi -> Jiyan
//   turmush o'rtog'imning otasi -> Qaynota   amakimning bolasi -> Amakivachcha
import { relationLabel, type Gender, type RelationKey } from './relations';
import type { FamilyEdgeDto, FamilyMemberDto } from '@/features/tree/types';
import i18n from '@/i18n';

const ANCESTOR = new Set<RelationKey>(['OTA', 'ONA', 'BOBO', 'BUVI']);
const DESCEND = new Set<RelationKey>(['OGIL', 'QIZ']);
const SIBLING = new Set<RelationKey>(['AKA', 'UKA', 'OPA', 'SINGIL']);
const CHILD_INLAW = new Set<RelationKey>(['KELINOYI', 'KUYOV']);

// Rishtada yangi a'zo SOURCE bo'ladigan turlar (backend edgeDirection bilan mos).
// Anker (kimga bog'langan) shu qoida bilan topiladi.
const NEW_IS_SOURCE = new Set<RelationKey>([
  'OTA',
  'ONA',
  'BOBO',
  'BUVI',
  'AMAKI',
  'AMMA',
  'TOGA',
  'XOLA',
]);

// PATERNAL/MATERNAL — qon-qarindoshning aniq tomoni. NEUTRAL — ildizning
// (root/anker) O'Z YAQIN doirasi: o'zi, turmush o'rtog'i, farzandlari,
// aka-uka/opa-singil, jiyan — ikkalasiga ham baravar tegishli, shu bois
// "Ota tomon"/"Ona tomon" filtrida DOIM ko'rinadi. Bu ikkovidan farqli
// o'laroq, `sides`da UMUMAN yo'q odam (masalan tog'aning xotinining o'z
// ota-onasi/opa-singli — nikoh orqali qo'shilgan, qondosh emas) HECH
// QAYSI filtrda ko'rinmasligi kerak (faqat filtrsiz to'liq doskada).
export type Side = 'PATERNAL' | 'MATERNAL' | 'NEUTRAL';

const PARENT_SIB: Partial<Record<RelationKey, Side>> = {
  AMAKI: 'PATERNAL',
  AMMA: 'PATERNAL',
  TOGA: 'MATERNAL',
  XOLA: 'MATERNAL',
};

type Kin =
  | { c: 'SELF' }
  // side — ajdod qaysi tomondan (ona tomoni = MATERNAL, ota tomoni = PATERNAL).
  // gen2+ da bolalari xola/tog'a yoki amma/amaki ekanini shu belgilaydi.
  | { c: 'ANC'; gen: number; gender: Gender; side?: Side } // ota/ona, bobo/buvi
  | { c: 'DESC'; gen: number; gender: Gender } // o'g'il/qiz, nabira, chevara
  | { c: 'SIB'; gender: Gender; raw?: RelationKey } // aka/uka/opa/singil
  // degree — qavat: 1=Amaki, 2=Katta amaki, 3=Katta katta amaki, ...
  | { c: 'PIB'; side: Side; gender: Gender; degree?: number } // amaki/amma/tog'a/xola
  | { c: 'NIB'; gender: Gender } // jiyan
  // pibGender — ota-onaning (amaki/amma/tog'a/xola) jinsi: vachcha turini
  // belgilaydi (o'zbekcha so'z shu asosda tanlanadi). gender — VACHCHANING
  // O'ZINING jinsi: o'zbekchada axamiyatsiz (Tog'avachcha unisex), lekin
  // ruschada kerak (брат/сестра — vachchaning o'z jinsiga qarab).
  | { c: 'COUSIN'; side: Side; pibGender: Gender; gender: Gender } // amaki/amma/tog'a/xolavachcha
  | { c: 'SPOUSE'; gender: Gender } // turmush o'rtog'i
  | { c: 'INLAW_PARENT'; gender: Gender } // qaynota/qaynona
  | { c: 'INLAW_SIB'; gender: Gender } // qaynog'a/qaynsingil
  | { c: 'SIB_SPOUSE'; gender: Gender } // kelin (aka xotini) / pochcha (opa eri)
  | { c: 'CHILD_SPOUSE'; gender: Gender } // kelin / kuyov
  | { c: 'OTHER'; raw: RelationKey };

/** Bir qadam: anker qarindoshligi (ka) + yangi a'zoning ankerga rel = yangi qarindoshlik */
function step(ka: Kin, rel: RelationKey, g: Gender): Kin {
  // --- Ajdod tomon (OTA/ONA=1, BOBO/BUVI=2 avlod yuqori) ---
  if (ANCESTOR.has(rel)) {
    const dUp = rel === 'BOBO' || rel === 'BUVI' ? 2 : 1;
    switch (ka.c) {
      case 'SELF':
        return { c: 'ANC', gen: dUp, gender: g };
      case 'ANC': {
        // Ajdod tomonini aniqlaymiz: gen1 ota-ona orqali chiqsa uning jinsi
        // tomonni belgilaydi (ona -> maternal, ota -> paternal); yuqoriroqda saqlanadi.
        const side: Side =
          ka.gen === 1 ? (ka.gender === 'FEMALE' ? 'MATERNAL' : 'PATERNAL') : (ka.side ?? 'PATERNAL');
        return { c: 'ANC', gen: ka.gen + dUp, gender: g, side };
      }
      case 'SIB': // akamning otasi = mening otam
        return { c: 'ANC', gen: dUp, gender: g };
      case 'PIB': // amakimning otasi = mening bobom
        return { c: 'ANC', gen: dUp + 1, gender: g, side: ka.side };
      case 'SPOUSE': // turmush o'rtog'imning otasi/onasi = qaynota/qaynona
        return dUp === 1 ? { c: 'INLAW_PARENT', gender: g } : { c: 'OTHER', raw: rel };
      default:
        return { c: 'OTHER', raw: rel };
    }
  }

  // --- Avlod tomon (farzand) ---
  if (DESCEND.has(rel)) {
    switch (ka.c) {
      case 'SELF':
        return { c: 'DESC', gen: 1, gender: g };
      case 'DESC':
        return { c: 'DESC', gen: ka.gen + 1, gender: g };
      case 'SPOUSE': // turmush o'rtog'imning farzandi = mening farzandim
        return { c: 'DESC', gen: 1, gender: g };
      case 'ANC':
        // ota-onamning farzandi = akam/singlim; bobo/buvimning farzandi = amaki/xola
        // (bobo/buvi qaysi tomondan bo'lsa — xola/tog'a yoki amma/amaki);
        // undan yuqori ajdodning farzandi = qavatiga qarab KATTA amaki/amma
        // (bobokalonning o'g'li -> Katta katta amaki, qizi -> Katta katta amma)
        if (ka.gen === 1) return { c: 'SIB', gender: g };
        return { c: 'PIB', side: ka.side ?? 'PATERNAL', gender: g, degree: ka.gen - 1 };
      case 'SIB': // akamning farzandi = jiyan
        return { c: 'NIB', gender: g };
      case 'PIB':
        // KATTA amakining farzandi = bir qavat pastdagi amaki/amma; oddiy
        // amaki/tog'a/amma/xolamning farzandi = ...vachcha (tomon + jinsga qarab)
        if ((ka.degree ?? 1) > 1)
          return { c: 'PIB', side: ka.side, gender: g, degree: (ka.degree ?? 1) - 1 };
        return { c: 'COUSIN', side: ka.side, pibGender: ka.gender, gender: g };
      default:
        return { c: 'OTHER', raw: rel };
    }
  }

  // --- Aka-uka / opa-singil ---
  if (SIBLING.has(rel)) {
    switch (ka.c) {
      case 'SELF':
        return { c: 'SIB', gender: g, raw: rel };
      case 'ANC':
        // ota-onamning aka-uka/opa-singlisi = amaki/xola (ota-onaning jinsiga
        // qarab); bobo va undan yuqorining aka-ukasi = qavatiga qarab Katta amaki
        if (ka.gen === 1)
          return { c: 'PIB', side: ka.gender === 'FEMALE' ? 'MATERNAL' : 'PATERNAL', gender: g };
        return { c: 'PIB', side: ka.side ?? 'PATERNAL', gender: g, degree: ka.gen };
      case 'SIB': // akamning akasi = ham akam
        return { c: 'SIB', gender: g };
      case 'DESC': // farzandimning aka-ukasi = ham farzandim
        return { c: 'DESC', gen: ka.gen, gender: g };
      case 'PIB': // amakimning akasi = ham amakim (qavati ham bir xil)
        return { c: 'PIB', side: ka.side, gender: g, degree: ka.degree };
      case 'SPOUSE': // turmush o'rtog'imning aka-ukasi = qaynog'a/qaynsingil
        return { c: 'INLAW_SIB', gender: g };
      default:
        return { c: 'OTHER', raw: rel };
    }
  }

  // --- Ota-onaning aka-uka/opa-singlisi (amaki/amma/tog'a/xola) ---
  if (PARENT_SIB[rel]) {
    if (ka.c === 'SELF') return { c: 'PIB', side: PARENT_SIB[rel]!, gender: g };
    return { c: 'OTHER', raw: rel };
  }

  // --- Turmush o'rtog'i ---
  if (rel === 'TURMUSH') {
    switch (ka.c) {
      case 'SELF':
        return { c: 'SPOUSE', gender: g };
      case 'ANC': // bobomning xotini = buvim; otamning xotini = onam (jinsiga qarab)
        return { c: 'ANC', gen: ka.gen, gender: g, side: ka.side };
      case 'DESC': // farzandimning turmush o'rtog'i = kelin/kuyov
        return { c: 'CHILD_SPOUSE', gender: g };
      case 'SIB': // aka/opamning turmush o'rtog'i = kelinoyi (F) / pochcha (M)
        return { c: 'SIB_SPOUSE', gender: g };
      case 'PIB': // tog'a/amakimning xotini = Kelinoyi; xola/ammamning eri = Pochcha
        return { c: 'SIB_SPOUSE', gender: g };
      case 'COUSIN': // tog'avachcha/amakivachchamning xotini = Kelinoyi; erining = Pochcha
        return { c: 'SIB_SPOUSE', gender: g };
      default:
        return { c: 'OTHER', raw: rel };
    }
  }

  // --- Farzandning turmush o'rtog'i to'g'ridan-to'g'ri (kelin/kuyov) ---
  if (CHILD_INLAW.has(rel)) {
    if (ka.c === 'SELF' || ka.c === 'DESC') return { c: 'CHILD_SPOUSE', gender: g };
    return { c: 'OTHER', raw: rel };
  }

  return { c: 'OTHER', raw: rel };
}

/**
 * Ajdod yorlig'i — an'anaviy o'zbek avlod atamalari ("katta katta..." takrorisiz):
 *   gen1 Ota/Ona, gen2 Bobo/Buvi, gen3 Katta bobo/Katta buvi,
 *   gen4 Bobokalon/Momokalon, gen5 To'qabobo/To'qabuvi,
 *   gen6 Jizzabobo/Jizzabuvi, gen7 Zotabobo/Zotabuvi,
 *   gen8+ "N-avlod bobo/buvi" (an'anaviy atama mavjud emas).
 */
/**
 * Ajdod yorlig'i — JORIY tildan i18n orqali o'qiladi (gen1-7 alohida
 * kalitlar, gen8+ "N-avlod bobo/buvi" shabloni bilan).
 */
function ancestorLabel(gen: number, gender: Gender): string {
  const female = gender === 'FEMALE';
  const clamped = Math.max(gen, 1);
  if (clamped <= 7) return i18n.t(`tree.kinship.ancestor${clamped}${female ? 'F' : 'M'}`);
  return i18n.t('tree.kinship.genAncestorFallback', {
    gen,
    term: i18n.t(female ? 'tree.kinship.ancestorFallbackF' : 'tree.kinship.ancestorFallbackM'),
  });
}

/**
 * Bobo/buvi ajdod yorlig'iga "O'gay "/"Приёмная " kabi tilga mos prefiks
 * qo'shadi (qondosh bo'lmagan qo'shimcha juft uchun).
 */
function stepAncestorLabel(base: string, gender: Gender): string {
  const prefix = i18n.t(gender === 'FEMALE' ? 'tree.kinship.stepPrefixF' : 'tree.kinship.stepPrefixM');
  return `${prefix}${base.charAt(0).toLowerCase()}${base.slice(1)}`;
}

/** O'gay ona/ota (qondosh bo'lmagan to'g'ridan-to'g'ri ota-ona) */
function stepParentLabel(gender: Gender): string {
  return i18n.t(gender === 'FEMALE' ? 'tree.kinship.stepMother' : 'tree.kinship.stepFather');
}

/**
 * Amaki/amma/tog'a/xola atamasi — degree (qavat) yuqorilashgan sari
 * kuchayadi: o'zbekchada "Katta " so'zi takrorlanadi (Amaki -> Katta amaki
 * -> Katta katta amaki, ...), ruscha/inglizchada attached prefiks qo'shiladi
 * (Дядя -> Прадядя -> Прапрадядя, ... / Uncle -> Great-uncle -> Great-great-
 * uncle, ...) — ajdod atamalari bilan bir xil andoza.
 * Bobo/Buvi atamalari FAQAT to'g'ri chiziqdagi ajdodlarga qoladi.
 */
function uncleTerm(maternal: boolean, female: boolean, degree = 1): string {
  const baseKey = maternal ? (female ? 'auntM' : 'uncleM') : female ? 'auntP' : 'uncleP';
  const base = i18n.t(`tree.kinship.${baseKey}`);
  if (degree <= 1) return base;
  const lang = i18n.language;
  if (lang === 'ru' || lang === 'en') {
    const prefixKey = lang === 'en' ? 'greatPrefixEn' : 'greatPrefixRu';
    const prefix = i18n.t(`tree.kinship.${prefixKey}`).repeat(degree - 1);
    const combined = `${prefix}${base.charAt(0).toLowerCase()}${base.slice(1)}`;
    return combined.charAt(0).toUpperCase() + combined.slice(1);
  }
  const great = i18n.t('tree.kinship.great');
  const repeated = `${great} `.repeat(degree - 2).toLowerCase();
  return `${great} ${repeated}${base.charAt(0).toLowerCase()}${base.slice(1)}`;
}

function label(kin: Kin): string {
  switch (kin.c) {
    case 'SELF':
      return i18n.t('tree.kinship.self');
    case 'ANC':
      return ancestorLabel(kin.gen, kin.gender);
    case 'DESC': {
      const ctx = { context: kin.gender.toLowerCase() };
      if (kin.gen >= 3) return i18n.t('tree.kinship.greatGrandchild', ctx);
      if (kin.gen === 2) return i18n.t('tree.kinship.grandchild', ctx);
      return relationLabel(kin.gender === 'FEMALE' ? 'QIZ' : 'OGIL');
    }
    case 'SIB':
      if (kin.raw) return relationLabel(kin.raw);
      return relationLabel(kin.gender === 'FEMALE' ? 'OPA' : 'AKA');
    case 'PIB':
      return uncleTerm(kin.side === 'MATERNAL', kin.gender === 'FEMALE', kin.degree);
    case 'NIB':
      return i18n.t('tree.kinship.niece', { context: kin.gender.toLowerCase() });
    case 'COUSIN':
      // Ona tomoni: tog'a(M)->Tog'avachcha, xola(F)->Xolavachcha.
      // Ota tomoni: amaki(M)->Amakivachcha, amma(F)->Ammavachcha.
      // context: o'zbekchada e'tiborga olinmaydi (unisex so'z), ruschada
      // vachchaning O'Z jinsi asosida брат/сестра tanlanadi (locale'da
      // _male/_female kalitlari orqali).
      return kin.side === 'MATERNAL'
        ? i18n.t(kin.pibGender === 'MALE' ? 'tree.kinship.cousinTogavachcha' : 'tree.kinship.cousinXolavachcha', {
            context: kin.gender.toLowerCase(),
          })
        : i18n.t(kin.pibGender === 'MALE' ? 'tree.kinship.cousinAmakivachcha' : 'tree.kinship.cousinAmmavachcha', {
            context: kin.gender.toLowerCase(),
          });
    case 'SPOUSE':
      return i18n.t('tree.kinship.spouse', { context: kin.gender.toLowerCase() });
    case 'INLAW_PARENT':
      return i18n.t(kin.gender === 'FEMALE' ? 'tree.kinship.motherInLaw' : 'tree.kinship.fatherInLaw');
    case 'INLAW_SIB':
      return i18n.t(kin.gender === 'FEMALE' ? 'tree.kinship.sisterInLaw' : 'tree.kinship.brotherInLaw');
    case 'SIB_SPOUSE':
      return i18n.t(kin.gender === 'FEMALE' ? 'tree.kinship.sisterInLaw2' : 'tree.kinship.brotherInLaw2');
    case 'CHILD_SPOUSE':
      // Bu (eski, anker-zanjiri) hisoblash tizimida yosh solishtirish uchun
      // ma'lumot yo'q — shu bois ANIQ bo'lmagan holatdagi standart qiymat
      // ("Kelinoyi", boshqa joylardagi yosh-noma'lum standarti bilan bir xil)
      // qaytariladi. Amaliyotda bu funksiya ISHLATILMAYDI (faqat testda) —
      // haqiqiy hisoblash relationInfoFrom/closeFamilyLabels'da, yosh solishtirib.
      return i18n.t(kin.gender === 'FEMALE' ? 'tree.kinship.daughterInLawOlder' : 'tree.kinship.sonInLaw');
    case 'OTHER':
      return relationLabel(kin.raw);
  }
}

type KinMember = Pick<FamilyMemberDto, 'id' | 'relation' | 'gender' | 'isRoot'>;
type KinEdge = Pick<FamilyEdgeDto, 'sourceId' | 'targetId' | 'relation'>;

// Haqiqiy ota-ona ↔ farzand rishtalari (co-parent aniqlash uchun): tog'a/amaki
// kabi yon ajdodlar EMAS, faqat to'g'ridan-to'g'ri avlod.
const PARENT_CHILD = new Set<RelationKey>(['OTA', 'ONA', 'BOBO', 'BUVI', 'OGIL', 'QIZ']);

/** Har a'zoning ankerini (va qanday rel bilan qo'shilganini) topadi. */
function buildAnchorOf(
  members: KinMember[],
  edges: KinEdge[],
): Map<string, { anchorId: string; rel: RelationKey }> {
  const anchorOf = new Map<string, { anchorId: string; rel: RelationKey }>();
  for (const m of members) {
    if (m.isRoot) continue;
    const rel = m.relation as RelationKey;
    const asSource = NEW_IS_SOURCE.has(rel);
    const edge = asSource
      ? edges.find((e) => e.sourceId === m.id && e.relation === rel)
      : edges.find((e) => e.targetId === m.id && e.relation === rel);
    if (edge) {
      const anchorId = asSource ? edge.targetId : edge.sourceId;
      anchorOf.set(m.id, { anchorId, rel });
    }
  }
  return anchorOf;
}

/**
 * Har a'zoning ildizga nisbatan qarindoshlik TURINI (Kin) hisoblaydi.
 * Anker (kimga bog'langani) rishtaning yo'nalishidan avtomatik aniqlanadi.
 */
export function computeKins(members: KinMember[], edges: KinEdge[]): Map<string, Kin> {
  const byId = new Map(members.map((m) => [m.id, m]));
  const anchorOf = buildAnchorOf(members, edges);

  const memo = new Map<string, Kin>();
  const visiting = new Set<string>();
  function kin(id: string): Kin {
    const cached = memo.get(id);
    if (cached) return cached;
    const m = byId.get(id);
    let result: Kin;
    if (!m || m.isRoot || visiting.has(id)) {
      result =
        m?.isRoot ? { c: 'SELF' } : { c: 'OTHER', raw: (m?.relation as RelationKey) ?? 'OTA' };
    } else {
      const a = anchorOf.get(id);
      if (!a) {
        result = { c: 'OTHER', raw: m.relation as RelationKey };
      } else {
        visiting.add(id);
        result = step(kin(a.anchorId), a.rel, m.gender);
        visiting.delete(id);
      }
    }
    memo.set(id, result);
    return result;
  }

  const out = new Map<string, Kin>();
  for (const m of members) out.set(m.id, m.isRoot ? { c: 'SELF' } : kin(m.id));
  return out;
}

/**
 * Har a'zo uchun ildizga nisbatan qarindoshlik yorlig'i.
 */
export function computeRelationLabels(members: KinMember[], edges: KinEdge[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const [id, k] of computeKins(members, edges)) out.set(id, label(k));
  return out;
}

const SIBLING_REL = new Set<RelationKey>(['AKA', 'UKA', 'OPA', 'SINGIL']);
const GEN1_PARENT = new Set<RelationKey>(['OTA', 'ONA', 'OGIL', 'QIZ']);
const GRANDPARENT_REL = new Set<RelationKey>(['BOBO', 'BUVI']);
const PSIB_SIDE: Partial<Record<RelationKey, 'P' | 'M'>> = {
  AMAKI: 'P',
  AMMA: 'P',
  TOGA: 'M',
  XOLA: 'M',
};

type KSide = 'P' | 'M';
type Cat =
  | { t: 'SELF' }
  | { t: 'SPOUSE' }
  | { t: 'ANC'; gen: number; side?: KSide }
  | { t: 'DESC'; gen: number }
  | { t: 'SIB' }
  | { t: 'UNCLE'; side: KSide; gender: Gender; degree?: number }
  // side FAQAT uzoq (LCA fallback) qavatlarda beriladi — umumiy ajdod ANKERning
  // o'zidan chuqurroqda bo'lganda (masalan amakivachchaning bolasi), aniq bitta
  // tomonga tegishli bo'ladi. To'g'ridan-to'g'ri aka-uka farzandi (jiyan) esa
  // side'siz qoladi — u ikkala tomonga ham baravar tegishli (NEUTRAL).
  | { t: 'NEPHEW'; side?: KSide }
  | { t: 'COUSIN'; side: KSide; uncleGender: Gender };

/**
 * ANKERGA (A) nisbatan TO'LIQ qarindoshlik yorliqlari — GRAF asosida (anker
 * zanjiridan mustaqil). VIEWER umumiy shajarani ham o'ziga nisbatan ko'radi:
 * otasi -> Ota, tog'asi -> Tog'a, jiyani -> Jiyan, amakivachchasi -> Amakivachcha.
 * Qon-daraxt (ota-ona rishtalari) + LCA orqali hisoblanadi; kuyov/kelin/qaynota
 * kabi qudalar turmush o'rtoq orqali aniqlanadi.
 */
export function relationLabelsFrom(
  members: (KinMember & { birthYear?: number | null })[],
  edges: KinEdge[],
  anchorId?: string,
): Map<string, string> {
  return relationInfoFrom(members, edges, anchorId).labels;
}

/**
 * relationLabelsFrom bilan bir xil, lekin AVLOD RAQAMINI ham qaytaradi.
 * Raqamlash ENG TEPADAGI ajdoddan boshlanadi va pastga qarab o'sadi:
 * eng katta ajdod = 1-avlod, uning bolalari = 2-avlod, ... ota = N-avlod,
 * men = N+1-avlod, bolalarim = N+2-avlod. Faqat QONDOSH a'zolarga beriladi
 * (ajdodlar, o'zim, aka-uka, amaki/xola, jiyan, vachcha, avlodlar) —
 * kelin/kuyov/turmush o'rtoq kabi nikoh orqali qo'shilganlarga berilmaydi.
 * Kartadagi "N-avlod" belgisi shu bilan chiqadi.
 */
export function relationInfoFrom(
  members: (KinMember & { birthYear?: number | null })[],
  edges: KinEdge[],
  anchorId?: string,
): { labels: Map<string, string>; generations: Map<string, number>; sides: Map<string, Side> } {
  const out = new Map<string, string>();
  const gens = new Map<string, number>();
  const sides = new Map<string, Side>();
  const A = anchorId ?? members.find((m) => m.isRoot)?.id;
  if (!A) return { labels: out, generations: gens, sides };
  const byId = new Map(members.map((m) => [m.id, m]));
  const has = new Set(members.map((m) => m.id));
  const g = (id: string): Gender => byId.get(id)?.gender ?? 'MALE';
  const yr = (id: string) => byId.get(id)?.birthYear ?? null;

  // Qon-daraxt: gen1 ota-ona rishtalari (source=ota-ona, target=bola)
  const parentLinks = new Map<string, Set<string>>();
  const childLinks = new Map<string, Set<string>>();
  const push = (m: Map<string, Set<string>>, k: string, v: string) => {
    const s = m.get(k) ?? new Set<string>();
    s.add(v);
    m.set(k, s);
  };
  for (const e of edges) {
    if (!has.has(e.sourceId) || !has.has(e.targetId)) continue;
    if (GEN1_PARENT.has(e.relation as RelationKey)) {
      push(parentLinks, e.targetId, e.sourceId);
      push(childLinks, e.sourceId, e.targetId);
    }
  }
  const childrenOf = (x: string) => [...(childLinks.get(x) ?? [])];
  const spousesOf = (x: string): string[] => {
    const s = new Set<string>();
    for (const e of edges) {
      if (e.relation === 'TURMUSH') {
        if (e.sourceId === x && has.has(e.targetId)) s.add(e.targetId);
        else if (e.targetId === x && has.has(e.sourceId)) s.add(e.sourceId);
      }
    }
    for (const c of childrenOf(x)) for (const p of parentLinks.get(c) ?? []) if (p !== x) s.add(p);
    return [...s];
  };
  const parentsOf = (x: string): string[] => {
    const direct = [...(parentLinks.get(x) ?? [])];
    if (direct.length >= 2) return direct;
    const set = new Set(direct);
    for (const p of direct) {
      // QO'SH XOTINLIK/ERLIK: juftlardan qaysi biri QONDOSH ota-ona ekani
      // noma'lum — faqat YAGONA juft bo'lsa uni ota-ona deb olamiz. Bir nechta
      // juft bo'lsa hech biri avtomatik qondosh sanalmaydi (ular "O'gay ..."
      // bo'ladi); haqiqiysi to'g'ridan-to'g'ri rishta bilan belgilanadi.
      const sps = spousesOf(p);
      if (sps.length === 1) set.add(sps[0]);
    }
    return [...set];
  };

  // Ancestors (gen + tomon: A ning qaysi ota-onasi orqali) — BFS yuqoriga
  const ancestorsOf = (start: string): Map<string, { gen: number; side?: KSide }> => {
    const res = new Map<string, { gen: number; side?: KSide }>();
    res.set(start, { gen: 0 });
    let frontier = [{ id: start, gen: 0, side: undefined as KSide | undefined }];
    while (frontier.length) {
      const next: typeof frontier = [];
      for (const f of frontier) {
        for (const p of parentsOf(f.id)) {
          const side: KSide | undefined = f.gen === 0 ? (g(p) === 'MALE' ? 'P' : 'M') : f.side;
          const prev = res.get(p);
          if (!prev || prev.gen > f.gen + 1) {
            res.set(p, { gen: f.gen + 1, side });
            next.push({ id: p, gen: f.gen + 1, side });
          }
        }
      }
      frontier = next;
    }
    return res;
  };
  const ancA = ancestorsOf(A);

  // To'g'ridan-to'g'ri maxsus rishtalar (oraliq tugunsiz qo'shilganlar) A uchun:
  //   BOBO/BUVI -> gen2 ajdod; AMAKI/AMMA/TOGA/XOLA -> A ning tog'a/amaki/xola/ammasi.
  const directUncle = new Map<string, { side: KSide; gender: Gender }>();
  for (const e of edges) {
    if (!has.has(e.sourceId) || !has.has(e.targetId)) continue;
    const rel = e.relation as RelationKey;
    // Bu rishtalarda YANGI a'zo (uncle/grandparent) = source, "jiyan"/nabira = target
    if (e.targetId === A) {
      if (GRANDPARENT_REL.has(rel) && !ancA.has(e.sourceId)) {
        ancA.set(e.sourceId, { gen: 2, side: 'P' });
      } else if (PSIB_SIDE[rel]) {
        directUncle.set(e.sourceId, { side: PSIB_SIDE[rel]!, gender: g(e.sourceId) });
      }
    }
  }

  // Aka-uka/opa-singil rishtalari (AKA/UKA/OPA/SINGIL) + umumiy ota-onaли aka-uka
  const sibLinks = new Map<string, Set<string>>();
  for (const e of edges) {
    if (!has.has(e.sourceId) || !has.has(e.targetId)) continue;
    if (SIBLING_REL.has(e.relation as RelationKey)) {
      push(sibLinks, e.sourceId, e.targetId);
      push(sibLinks, e.targetId, e.sourceId);
    }
  }
  const siblingsOf = (x: string): string[] => {
    const s = new Set(sibLinks.get(x) ?? []);
    for (const p of parentLinks.get(x) ?? []) for (const c of childLinks.get(p) ?? []) if (c !== x) s.add(c);
    s.delete(x);
    return [...s];
  };
  const descendantsOf = (x: string): string[] => {
    const out: string[] = [];
    const seen = new Set([x]);
    const q = [x];
    while (q.length) {
      const u = q.shift()!;
      for (const c of childrenOf(u)) if (!seen.has(c)) { seen.add(c); out.push(c); q.push(c); }
    }
    return out;
  };

  // A ning turmush o'rtoqlari
  const aSpouses = new Set(spousesOf(A));

  // Har tugunni TOIFAlash (qon-qarindoshlik)
  const cat = new Map<string, Cat>();
  cat.set(A, { t: 'SELF' });
  for (const s of aSpouses) cat.set(s, { t: 'SPOUSE' });
  const uncleOf = new Map<string, { side: KSide; gender: Gender }>(directUncle);
  for (const [u, info] of directUncle) if (!cat.has(u)) cat.set(u, { t: 'UNCLE', side: info.side, gender: info.gender });

  const setCat = (id: string, c: Cat) => {
    if (!cat.has(id)) cat.set(id, c);
  };

  // 1) Ajdodlar (Ota/Ona/Bobo/Buvi/Katta...)
  for (const [id, info] of ancA) if (info.gen > 0) setCat(id, { t: 'ANC', gen: info.gen, side: info.side });
  // 2) Avlodlar (O'g'il/Qiz/Nabira/Chevara)
  for (const m of members) {
    if (cat.has(m.id)) continue;
    const gen = ancestorsOf(m.id).get(A)?.gen;
    if (gen && gen > 0) setCat(m.id, { t: 'DESC', gen });
  }
  // 3) Aka-uka/opa-singil
  const aSibs = siblingsOf(A);
  for (const s of aSibs) setCat(s, { t: 'SIB' });
  // 4) Amaki/amma/tog'a/xola — ota-onaning aka-ukasi (tomon = o'sha ota-ona jinsi)
  for (const p of parentsOf(A)) {
    const pSide: KSide = g(p) === 'MALE' ? 'P' : 'M';
    for (const u of siblingsOf(p)) {
      setCat(u, { t: 'UNCLE', side: pSide, gender: g(u) });
      if (!uncleOf.has(u)) uncleOf.set(u, { side: pSide, gender: g(u) });
    }
  }
  // 5) Jiyanlar — aka-uka/opa-singilning avlodlari
  for (const s of aSibs) for (const d of descendantsOf(s)) setCat(d, { t: 'NEPHEW' });
  // 6) Vachchalar — amaki/tog'a/... ning bolalari
  for (const [u, info] of uncleOf) for (const c of childrenOf(u)) setCat(c, { t: 'COUSIN', side: info.side, uncleGender: info.gender });
  // 7) Qolганlar uchun LCA (oraliq tugunли uzoq qarindoshlar)
  for (const m of members) {
    const X = m.id;
    if (cat.has(X)) continue;
    const ax = ancestorsOf(X);
    let best: { dA: number; dX: number; side?: KSide } | null = null;
    for (const [id, info] of ax) {
      const inA = ancA.get(id);
      if (!inA || inA.gen === 0 || info.gen === 0) continue;
      if (!best || inA.gen + info.gen < best.dA + best.dX) best = { dA: inA.gen, dX: info.gen, side: inA.side };
    }
    if (!best) continue;
    const { dA, dX, side } = best;
    if (dA === 1 && dX === 1) setCat(X, { t: 'SIB' });
    else if (dA === 2 && dX === 1) setCat(X, { t: 'UNCLE', side: side ?? 'P', gender: g(X) });
    else if (dA === 1 && dX >= 2) setCat(X, { t: 'NEPHEW' });
    else if (dA === 2 && dX === 2) {
      const uncle = parentsOf(X).find((p) => ax.get(p)?.gen === 1);
      setCat(X, { t: 'COUSIN', side: side ?? 'P', uncleGender: uncle ? g(uncle) : 'MALE' });
    } else {
      // UZOQ qondoshlar — umumiy ajdod chuqurroqda (masalan bobokalonning
      // boshqa bolalari/nabiralari). Bobo/Buvi atamasi berilmaydi — u faqat
      // to'g'ri chiziq uchun. Yorliq QAVAT (row) bo'yicha:
      //   row>=1 -> amaki/amma (tog'a/xola), har qavatga bitta "Katta":
      //             bobokalon o'g'li = Katta katta amaki, nabirasi = Katta amaki;
      //   row=0  -> mening qavatim (vachcha);
      //   row<0  -> pastki qavat (jiyan).
      const row = dA - dX;
      if (row >= 1) setCat(X, { t: 'UNCLE', side: side ?? 'P', gender: g(X), degree: row });
      else if (row === 0) {
        const uncle = parentsOf(X).find((p) => ax.get(p)?.gen === 1);
        setCat(X, { t: 'COUSIN', side: side ?? 'P', uncleGender: uncle ? g(uncle) : 'MALE' });
      } else setCat(X, { t: 'NEPHEW', side: side ?? 'P' });
    }
  }

  // TOIFAdan yorliq
  const ancLabel = (gen: number, gender: Gender) => ancestorLabel(gen, gender);
  const descLabel = (gen: number, gender: Gender) => {
    const ctx = { context: gender.toLowerCase() };
    return gen >= 3
      ? i18n.t('tree.kinship.greatGrandchild', ctx)
      : gen === 2
        ? i18n.t('tree.kinship.grandchild', ctx)
        : relationLabel(gender === 'FEMALE' ? 'QIZ' : 'OGIL');
  };
  const sibLabel = (id: string) => {
    const female = g(id) === 'FEMALE';
    const y = yr(id);
    const ay = yr(A);
    const younger = ay != null && y != null ? y > ay : false;
    return relationLabel(female ? (younger ? 'SINGIL' : 'OPA') : younger ? 'UKA' : 'AKA');
  };
  const uncleLabel = (side: KSide, gender: Gender, degree?: number) =>
    uncleTerm(side === 'M', gender === 'FEMALE', degree);
  const cousinLabel = (side: KSide, ug: Gender, ownGender: Gender) =>
    side === 'M'
      ? i18n.t(ug === 'MALE' ? 'tree.kinship.cousinTogavachcha' : 'tree.kinship.cousinXolavachcha', {
          context: ownGender.toLowerCase(),
        })
      : i18n.t(ug === 'MALE' ? 'tree.kinship.cousinAmakivachcha' : 'tree.kinship.cousinAmmavachcha', {
          context: ownGender.toLowerCase(),
        });

  const labelFromCat = (id: string, c: Cat): string => {
    switch (c.t) {
      case 'SELF': return i18n.t('tree.kinship.self');
      case 'SPOUSE': return i18n.t('tree.kinship.spouse', { context: g(id).toLowerCase() });
      case 'ANC': return ancLabel(c.gen, g(id));
      case 'DESC': return descLabel(c.gen, g(id));
      case 'SIB': return sibLabel(id);
      case 'UNCLE': return uncleLabel(c.side, c.gender, c.degree);
      case 'NEPHEW': return i18n.t('tree.kinship.niece', { context: g(id).toLowerCase() });
      case 'COUSIN': return cousinLabel(c.side, c.uncleGender, g(id));
    }
  };
  for (const [id, c] of cat) out.set(id, labelFromCat(id, c));

  // TOMON (ota tomon / ona tomon / neytral) — qarang: Side turi izohi yuqorida.
  const catSide = (c: Cat): Side | undefined => {
    switch (c.t) {
      case 'ANC': return c.side === 'P' ? 'PATERNAL' : c.side === 'M' ? 'MATERNAL' : undefined;
      case 'UNCLE':
      case 'COUSIN':
        return c.side === 'P' ? 'PATERNAL' : 'MATERNAL';
      case 'NEPHEW':
        return c.side === 'P' ? 'PATERNAL' : c.side === 'M' ? 'MATERNAL' : 'NEUTRAL';
      case 'SELF':
      case 'SPOUSE':
      case 'DESC':
      case 'SIB':
        return 'NEUTRAL';
      default:
        return undefined;
    }
  };
  for (const [id, c] of cat) {
    const s = catSide(c);
    if (s) sides.set(id, s);
  }

  // AVLOD RAQAMLARI — eng tepadagi ajdod 1-avlod, pastga qarab o'sadi.
  // level = ankerga nisbatan qavat (+yuqori / -pastki); faqat QONDOSH toifalar.
  // SPOUSE (turmush o'rtoq) va quyidagi in-law'lar (kelin/kuyov/pochcha/qayn...)
  // qondosh emas — ularga raqam berilmaydi.
  const bloodLevel = (c: Cat): number | null => {
    switch (c.t) {
      case 'ANC':
        return c.gen; // ota=+1, bobo=+2, ...
      case 'UNCLE':
        return c.degree ?? 1; // amaki=ota qavati; katta amaki=bobo qavati; ...
      case 'SELF':
      case 'SIB':
      case 'COUSIN':
        return 0; // mening qavatim
      case 'NEPHEW':
        return -1; // jiyan — bolalar qavati
      case 'DESC':
        return -c.gen; // farzand=-1, nabira=-2, ...
      case 'SPOUSE':
        return null; // nikoh orqali — qondosh emas
    }
  };
  let topGen = 0; // eng chuqur ajdod zanjiri (daraxtdagi eng tepa qavat)
  for (const c of cat.values()) if (c.t === 'ANC' && c.gen > topGen) topGen = c.gen;
  for (const [id, c] of cat) {
    const lvl = bloodLevel(c);
    if (lvl != null) gens.set(id, topGen - lvl + 1);
  }

  // QUDALAR (in-law) — turmush o'rtog'i qon-qarindosh bo'lganlar
  for (const m of members) {
    const X = m.id;
    if (out.has(X)) continue;
    // A ning turmush o'rtog'ining ota-onasi -> Qaynota/Qaynona
    let qayn = false;
    for (const s of aSpouses) {
      if ((parentLinks.get(s) ?? new Set()).has(X) || parentsOf(s).includes(X)) {
        out.set(X, i18n.t(g(X) === 'FEMALE' ? 'tree.kinship.motherInLaw' : 'tree.kinship.fatherInLaw'));
        qayn = true;
        break;
      }
    }
    if (qayn) continue;
    // Qon-qarindoshning turmush o'rtog'i orqali
    for (const sp of spousesOf(X)) {
      const c = cat.get(sp);
      if (!c) continue;
      if (c.t === 'ANC') {
        // Ajdodning QO'SHIMCHA jufti — QONDOSH EMAS (qondosh bo'lsa u allaqachon
        // cat'da ANC bo'lardi): bobo xotini -> O'gay buvi, ota xotini -> O'gay ona
        out.set(X, stepAncestorLabel(ancLabel(c.gen, g(X)), g(X)));
      } else if (c.t === 'DESC') {
        // o'g'il xotini (Kelin/Kelinoyi — ANKERdan yosh KICHIK bo'lsa Kelin,
        // KATTA (yoki noma'lum) bo'lsa hurmat yuzasidan Kelinoyi, xuddi
        // aka/uka-opa/singil kabi yoshga qarab) / qiz eri (doim Kuyov)
        if (g(X) === 'FEMALE') {
          const y = yr(X);
          const ay = yr(A);
          const youngerThanAnchor = ay != null && y != null ? y > ay : false;
          out.set(X, i18n.t(youngerThanAnchor ? 'tree.kinship.daughterInLawYounger' : 'tree.kinship.daughterInLawOlder'));
        } else {
          out.set(X, i18n.t('tree.kinship.sonInLaw'));
        }
      } else if (c.t === 'SIB' || c.t === 'UNCLE' || c.t === 'COUSIN' || c.t === 'NEPHEW') {
        // Jiyanning (yoki aka-uka/tog'a-amaki/vachchaning) turmush o'rtog'i —
        // avval bu yerda NEPHEW HISOBGA OLINMAGANDI, shu sabab hech qanday
        // yorliq o'rnatilmay, buildBoard.ts'dagi zaxira (m.relation'ning
        // xom qiymati — odatda "TURMUSH") ishlatilib, "Turmush o'rtog'i"
        // bo'lib chiqib qolardi (bug — endi tuzatildi).
        out.set(X, i18n.t(g(X) === 'FEMALE' ? 'tree.kinship.sisterInLaw2' : 'tree.kinship.brotherInLaw2'));
      } else if (c.t === 'SELF') {
        out.set(X, i18n.t('tree.kinship.spouse', { context: g(X).toLowerCase() }));
      }
      if (out.has(X)) break;
    }
  }

  return { labels: out, generations: gens, sides };
}

/**
 * Berilgan ildizning (rootId — bo'lmasa isRoot a'zo) YAQIN oila a'zolari id'lari.
 * GRAF asosida (anker zanjiridan mustaqil — shu tufayli VIEWER o'z ANKERiga
 * nisbatan yaqin oilasini ko'radi). Kiritiladi:
 *   o'zi, turmush o'rtog'i, bolalari (o'g'il/qiz), ota-onasi, aka-uka/opa-singil,
 *   bobo-buvi. Chiqmaydi: tog'a/jiyan/nabira/vachcha va OTA/BOBOning ORTIQCHA
 *   xotini (u root liniyasiga tegishli emas — faqat qon-ota-onaning turmush
 *   o'rtog'i qo'shiladi, "turmush o'rtog'ining turmush o'rtog'i" emas).
 */
export function closeFamilyIds(
  members: KinMember[],
  edges: KinEdge[],
  rootId?: string,
): Set<string> {
  const root = rootId ?? members.find((m) => m.isRoot)?.id;
  if (!root) return new Set();
  const has = new Set(members.map((m) => m.id));
  const isParentEdge = (e: KinEdge) => PARENT_CHILD.has(e.relation as RelationKey);

  const parentsOf = (x: string) =>
    edges.filter((e) => e.targetId === x && isParentEdge(e)).map((e) => e.sourceId).filter((id) => has.has(id));
  const childrenOf = (x: string) =>
    edges.filter((e) => e.sourceId === x && isParentEdge(e)).map((e) => e.targetId).filter((id) => has.has(id));
  const spousesOf = (x: string) => {
    const out = new Set<string>();
    for (const e of edges) {
      if (e.relation === 'TURMUSH') {
        if (e.sourceId === x && has.has(e.targetId)) out.add(e.targetId);
        else if (e.targetId === x && has.has(e.sourceId)) out.add(e.sourceId);
      }
    }
    for (const c of childrenOf(x)) for (const p of parentsOf(c)) if (p !== x) out.add(p);
    return [...out];
  };
  const siblingEdges = (x: string) => {
    const out = new Set<string>();
    for (const e of edges) {
      if (SIBLING_REL.has(e.relation as RelationKey)) {
        if (e.sourceId === x && has.has(e.targetId)) out.add(e.targetId);
        else if (e.targetId === x && has.has(e.sourceId)) out.add(e.sourceId);
      }
    }
    return [...out];
  };

  // Bir ER-XOTINning bolalari IKKALASIGA tegishli. Qo'sh xotinlikда bola ko'pincha
  // faqat bitta ota-ona (masalan 2-xotin) orqali ulangan bo'ladi — shu bola erning
  // (otaning) ham bolasi. Bolani topib, uni ulaган co-parentни ham qo'shamiz
  // (rishta uzilmasin + buildBoard juftlikni bitta kartaga birlashtira olsin).
  const addCoupleChildren = (parent: string, skip?: string): string[] => {
    const kids: string[] = [];
    for (const c of childrenOf(parent)) if (c !== skip) kids.push(c);
    for (const s of spousesOf(parent)) {
      const viaSpouse = childrenOf(s).filter((c) => c !== skip);
      if (viaSpouse.length) {
        allow.add(s); // bolani otaga ulaydigan turmush o'rtog'i (2-xotin ham)
        kids.push(...viaSpouse);
      }
    }
    return [...new Set(kids)];
  };

  const allow = new Set<string>([root]);
  for (const s of spousesOf(root)) allow.add(s); // turmush o'rtog'i (qo'sh xotinlik — hammasi)

  // Bolalar (+ kelin/kuyov + nevaralar) — qo'sh xotinlik hisobga olinadi
  for (const c of addCoupleChildren(root)) {
    allow.add(c);
    for (const sp of spousesOf(c)) allow.add(sp); // kelin/kuyov (o'g'il xotini / qiz eri)
    for (const gc of addCoupleChildren(c)) allow.add(gc); // nevaralar (2-xotin orqali ham)
  }

  // ota-ona: qon-ota-ona (to'g'ridan-to'g'ri rishtali) + ularning turmush o'rtog'i.
  // Ko'pincha faqat ONA (yoki ota) to'g'ridan-to'g'ri qo'shilgan, ikkinchi ota-ona
  // uning ERI/XOTINI sifatida ulanган bo'ladi — onaning ERI = root'ning OTAsi.
  const bloodParents = parentsOf(root);
  const parents = new Set<string>(bloodParents);
  // Ikkinchi ota-ona to'g'ridan-to'g'ri qo'shilmagan bo'lsa (faqat BITTA qon-ota-ona
  // ma'lum), uni o'sha ota-onaning ERI/XOTINI orqali topamiz. Ikkovi ham ma'lum
  // bo'lsa — ortiqcha juftlar (o'gay ota-ona) ota-ona sifatida qo'shilmaydi.
  if (bloodParents.length < 2) {
    for (const p of bloodParents) for (const s of spousesOf(p)) parents.add(s);
  }
  for (const p of parents) allow.add(p);

  // aka-uka/opa-singil + ularning turmush o'rtog'i (kelinoyi/pochcha) + bolalari
  // (jiyan). Qon-ota-onaning juftlik bolalari; o'gaylari ham otaga ulanган holda.
  const sibs = new Set<string>();
  for (const p of bloodParents) for (const c of addCoupleChildren(p, root)) sibs.add(c);
  for (const s of siblingEdges(root)) sibs.add(s);
  for (const s of sibs) {
    allow.add(s);
    for (const sp of spousesOf(s)) allow.add(sp); // aka-uka xotini/eri
    for (const nib of addCoupleChildren(s)) allow.add(nib); // jiyan
  }

  // bobo-buvi va UNDAN YUQORI barcha to'g'ri chiziq ajdodlari (katta bobo,
  // bobokalon, momokalon, ...) + ularning turmush o'rtoqlari — yaqin oila
  // doskasida butun ajdodlar zanjiri ko'rinadi
  const climbed = new Set<string>();
  let frontier = [...parents];
  while (frontier.length) {
    const next: string[] = [];
    for (const p of frontier) {
      for (const gp of parentsOf(p)) {
        if (climbed.has(gp)) continue;
        climbed.add(gp);
        allow.add(gp);
        for (const sp of spousesOf(gp)) allow.add(sp);
        next.push(gp);
      }
    }
    frontier = next;
  }
  return allow;
}

/**
 * Yaqin oila yorliqlarini ANKERGA nisbatan hisoblaydi (graf asosida — anker
 * zanjiridan mustaqil). VIEWER o'z ankeriga nisbatan "Men, Ota, Bobo, Aka..."
 * ko'radi. Faqat yaqin oila to'plami uchun (boshqalar bo'sh qoladi).
 */
export function closeFamilyLabels(
  members: (KinMember & { birthYear?: number | null })[],
  edges: KinEdge[],
  rootId?: string,
): Map<string, string> {
  const out = new Map<string, string>();
  const root = rootId ?? members.find((m) => m.isRoot)?.id;
  if (!root) return out;
  const byId = new Map(members.map((m) => [m.id, m]));
  const has = new Set(members.map((m) => m.id));
  const isParentEdge = (e: KinEdge) => PARENT_CHILD.has(e.relation as RelationKey);
  const parentsOf = (x: string) =>
    edges.filter((e) => e.targetId === x && isParentEdge(e)).map((e) => e.sourceId).filter((id) => has.has(id));
  const childrenOf = (x: string) =>
    edges.filter((e) => e.sourceId === x && isParentEdge(e)).map((e) => e.targetId).filter((id) => has.has(id));
  const spousesOf = (x: string) => {
    const s = new Set<string>();
    for (const e of edges) {
      if (e.relation === 'TURMUSH') {
        if (e.sourceId === x && has.has(e.targetId)) s.add(e.targetId);
        else if (e.targetId === x && has.has(e.sourceId)) s.add(e.sourceId);
      }
    }
    for (const c of childrenOf(x)) for (const p of parentsOf(c)) if (p !== x) s.add(p);
    return [...s];
  };
  const g = (id: string) => byId.get(id)?.gender;
  const yr = (id: string) => byId.get(id)?.birthYear ?? null;
  const set = (id: string, l: string) => {
    if (!out.has(id)) out.set(id, l);
  };
  // Er-xotin bolalari (ikkala ota-onaga tegishli — qo'sh xotinlik hisobga olinadi)
  const coupleChildrenOf = (x: string): string[] => {
    const kids = new Set(childrenOf(x));
    for (const s of spousesOf(x)) for (const c of childrenOf(s)) kids.add(c);
    return [...kids];
  };

  set(root, i18n.t('tree.kinship.self'));
  for (const s of spousesOf(root)) set(s, i18n.t('tree.kinship.spouse', { context: (g(s) ?? 'MALE').toLowerCase() }));
  for (const c of coupleChildrenOf(root)) {
    set(c, relationLabel(g(c) === 'FEMALE' ? 'QIZ' : 'OGIL'));
    // kelin (o'g'ilning xotini, ANKERdan kichik bo'lsa Kelin, aniq KATTA
    // bo'lsa hurmat yuzasidan Kelinoyi; yil noma'lum bo'lsa — standart Kelin)
    // / kuyov (qizning eri) — jinsi bo'yicha
    for (const sp of spousesOf(c)) {
      if (g(sp) === 'FEMALE') {
        const y = yr(sp);
        const ry = yr(root);
        const olderThanRoot = ry != null && y != null && y <= ry;
        set(sp, i18n.t(olderThanRoot ? 'tree.kinship.daughterInLawOlder' : 'tree.kinship.daughterInLawYounger'));
      } else {
        set(sp, relationLabel('KUYOV'));
      }
    }
    for (const gc of coupleChildrenOf(c))
      set(gc, i18n.t('tree.kinship.grandchildClose', { context: (g(gc) ?? 'MALE').toLowerCase() })); // nevaralar (2-xotin ham)
  }

  const bloodParents = parentsOf(root);
  for (const p of bloodParents) set(p, relationLabel(g(p) === 'FEMALE' ? 'ONA' : 'OTA'));
  if (bloodParents.length < 2) {
    // Ikkinchi ota-ona = qon-ota-onaning eri/xotini (masalan onaning eri = OTA)
    for (const p of bloodParents)
      for (const s of spousesOf(p)) set(s, relationLabel(g(s) === 'FEMALE' ? 'ONA' : 'OTA'));
  } else {
    // Ikkala ota-ona ma'lum — ularning boshqa juftlari O'GAY ota-ona
    for (const p of bloodParents)
      for (const s of spousesOf(p))
        if (!bloodParents.includes(s)) set(s, stepParentLabel(g(s) ?? 'MALE'));
  }

  // aka-uka/opa-singil — yosh bo'yicha (ma'lum bo'lsa), aks holda Aka/Opa
  const rootYear = yr(root);
  const labelSib = (id: string) => {
    const female = g(id) === 'FEMALE';
    const y = yr(id);
    const younger = rootYear != null && y != null ? y > rootYear : false;
    return relationLabel(female ? (younger ? 'SINGIL' : 'OPA') : younger ? 'UKA' : 'AKA');
  };
  const sibs = new Set<string>();
  for (const p of bloodParents) for (const c of coupleChildrenOf(p)) if (c !== root) sibs.add(c);
  for (const e of edges) {
    if (['AKA', 'UKA', 'OPA', 'SINGIL'].includes(e.relation)) {
      if (e.sourceId === root && has.has(e.targetId)) sibs.add(e.targetId);
      else if (e.targetId === root && has.has(e.sourceId)) sibs.add(e.sourceId);
    }
  }
  // aka-uka + xotini/eri (kelinoyi/pochcha) + bolalari (jiyan)
  for (const s of sibs) {
    set(s, labelSib(s));
    for (const sp of spousesOf(s))
      set(sp, i18n.t(g(sp) === 'FEMALE' ? 'tree.kinship.sisterInLaw2' : 'tree.kinship.brotherInLaw2'));
    for (const nib of coupleChildrenOf(s))
      set(nib, i18n.t('tree.kinship.niece', { context: (g(nib) ?? 'MALE').toLowerCase() }));
  }

  // bobo-buvi va UNDAN YUQORI barcha ajdodlar (Katta bobo, Bobokalon, ...) —
  // qavatiga qarab an'anaviy atama bilan
  const parents = new Set<string>(bloodParents);
  if (bloodParents.length < 2) {
    for (const p of bloodParents) for (const s of spousesOf(p)) parents.add(s);
  }
  const climbed = new Set<string>();
  let frontier = [...parents];
  let gen = 2; // bobo-buvi qavati
  while (frontier.length) {
    const next: string[] = [];
    for (const p of frontier) {
      const gps = parentsOf(p);
      for (const gp of gps) {
        if (climbed.has(gp)) continue;
        climbed.add(gp);
        set(gp, ancestorLabel(gen, g(gp) ?? 'MALE'));
        // Ajdodning juftlari: QO'SH XOTINLIK/ERLIKDA qondosh bo'lmaganlari
        // "O'gay ...". Yagona juft (ikkinchi qondosh ajdod noma'lum) bo'lsagina
        // haqiqiy deb olinadi.
        const sps = spousesOf(gp).filter((s) => !gps.includes(s));
        const presumedReal = gps.length < 2 && sps.length === 1;
        for (const sp of sps) {
          const spGender = g(sp) ?? 'MALE';
          const base = ancestorLabel(gen, spGender);
          set(sp, presumedReal ? base : stepAncestorLabel(base, spGender));
        }
        next.push(gp);
      }
    }
    frontier = next;
    gen++;
  }
  return out;
}
