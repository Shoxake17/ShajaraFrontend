// features/tree/components/PersonNode.tsx
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useTranslation } from 'react-i18next';
import type { PersonNodeType } from '@/features/tree/model/tree.store';
import type { Gender } from '@/features/tree/model/relations';
import { describeLife } from '@/features/tree/model/age';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

const themeFor = (female: boolean) =>
  female
    ? { avatar: 'bg-pink-100 text-pink-700', sub: 'text-pink-500' }
    : { avatar: 'bg-brand-100 text-brand-800', sub: 'text-brand-500' };

/** Kartadagi bitta odam (avatar + ism + yosh) */
function Person({
  name,
  gender,
  birthYear,
  deathYear,
  sub,
  photoUrl,
  generation,
}: {
  name: string;
  gender: Gender;
  birthYear: number | null;
  deathYear: number | null;
  sub: string;
  photoUrl: string | null;
  generation: number | null;
}) {
  const { t: translate } = useTranslation();
  const female = gender === 'FEMALE';
  const t = themeFor(female);
  const { years, age } = describeLife(birthYear, deathYear);

  return (
    <div className="flex w-32 flex-col items-center gap-1.5 text-center">
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={name}
          className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm"
          draggable={false}
        />
      ) : (
        <span
          className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full font-serif text-lg font-semibold ${t.avatar}`}
        >
          {initials(name)}
        </span>
      )}
      {/* Ism kesilmasin — 2 qatorga sig'adi (uzun ism/familiya uchun) */}
      <span className="line-clamp-2 w-full break-words text-[13px] font-semibold leading-tight text-brand-900">
        {name}
      </span>
      <span className={`w-full truncate text-[11px] ${t.sub}`}>{sub}</span>
      {/* Ajdod avlod raqami — nechanchi avlod ekani kartada ko'rinib turadi */}
      {generation != null && (
        <span className="rounded-full bg-brand-50 px-1.5 py-px text-[9px] font-semibold leading-3 text-brand-700 ring-1 ring-brand-200">
          {translate('tree.generationBadge', { gen: generation })}
        </span>
      )}
      {years && <span className="text-[10px] text-neutral-400">{years}</span>}
      {age && <span className="text-[10px] font-medium text-neutral-500">{age}</span>}
    </div>
  );
}

// Touch qurilmalarda tegish nuqtasi kattaroq bo'lsin deb (10px -> 14px)
// biroz kattalashtirilgan — karta o'lchamiga (128px) nisbatan hali nomutanosib
// katta ko'rinmaydi.
const handleClass = '!h-3.5 !w-3.5 !border-2 !border-white !bg-brand-500';

/**
 * Doskadagi odam kartasi. Turmush o'rtog'i bo'lsa — bitta umumiy kartada
 * ikki kishi yonma-yon ko'rsatiladi.
 */
interface Cell {
  id: string;
  name: string;
  gender: Gender;
  birthYear: number | null;
  deathYear: number | null;
  sub: string;
  photoUrl: string | null;
  generation: number | null;
}

export function PersonNode({ data, selected }: NodeProps<PersonNodeType>) {
  const female = data.gender === 'FEMALE';
  const hasSpouse = data.spouses.length > 0;
  // Yakka xotin-erlik (aynan 1 turmush o'rtog'i): bolalar juftlik MARKAZIDAN
  // chiqadi (ikki tomonlama). Qo'sh xotinlik yoki yolg'iz: har odam alohida.
  const isCouple = data.spouses.length === 1;

  // Kartadagi odamlar tartibi. Turmush o'rtoqlar tug'ilgan yil bo'yicha saralangan
  // (build-board). 2+ turmush o'rtog'i bo'lsa — asosiy odam (er/xotin) O'RTADA
  // turadi: eng katta xotin chapda, primary o'rtada, qolganlari o'ngda.
  const primaryCell: Cell = {
    id: data.memberId,
    name: data.name,
    gender: data.gender,
    birthYear: data.birthYear,
    deathYear: data.deathYear,
    sub: data.relation,
    photoUrl: data.photoUrl,
    generation: data.generation,
  };
  const spouseCells: Cell[] = data.spouses.map((sp) => ({
    id: sp.id,
    name: sp.name,
    gender: sp.gender,
    birthYear: sp.birthYear,
    deathYear: sp.deathYear,
    sub: sp.relation,
    photoUrl: sp.photoUrl,
    generation: sp.generation,
  }));
  const cells: Cell[] =
    spouseCells.length >= 2
      ? (() => {
          const mid = Math.floor(spouseCells.length / 2);
          return [...spouseCells.slice(0, mid), primaryCell, ...spouseCells.slice(mid)];
        })()
      : [primaryCell, ...spouseCells];

  const border = selected
    ? 'border-brand-500 ring-2 ring-brand-300'
    : data.isRoot
      ? 'border-brand-500 ring-1 ring-brand-300'
      : female && !hasSpouse
        ? 'border-pink-200'
        : 'border-brand-200';

  const bg = female && !hasSpouse ? 'bg-pink-50' : 'bg-white';

  return (
    <div
      className={`relative flex items-stretch rounded-2xl border px-3.5 py-2.5 shadow-card ${border} ${bg}`}
    >
      {/* Kartadagi odamlar — har biri O'Z yuqori (ota-ona keladi) va pastki
          (bolalari chiqadi) bog'lanish nuqtasiga ega. Primary 2+ turmush
          o'rtog'ida o'rtada. */}
      {cells.map((c, i) => (
        <div key={c.id} className="flex items-stretch">
          {/* Turmush qurganlar orasidagi NIKOH chizig'i — avatar markazida
              gorizontal chiziq, o'rtasida yurak (ikki kishini biriktiradi). */}
          {i > 0 && (
            <span className="relative flex w-8 shrink-0 justify-center" aria-hidden>
              <span className="absolute -inset-x-6 top-[42px] h-[2px] bg-pink-300" />
              <span className="absolute left-1/2 top-[33px] -translate-x-1/2 rounded-full bg-white px-1 text-[13px] leading-none text-pink-400">
                ♥
              </span>
            </span>
          )}
          <div className="relative">
            {/* Yuqoridan (ota-ona) keluvchi — har odamga alohida */}
            <Handle
              id={c.id}
              type="target"
              position={Position.Top}
              className={`${handleClass} !bottom-full !top-auto`}
            />
            <Person
              name={c.name}
              gender={c.gender}
              birthYear={c.birthYear}
              deathYear={c.deathYear}
              sub={c.sub}
              photoUrl={c.photoUrl}
              generation={c.generation}
            />
            {/* Pastdan (bolalari) chiquvchi. Yakka juftlikда markaziy handle
                ishlatiladi (pastda), shuning uchun bu yerда faqat yolg'iz yoki
                qo'sh xotinlik uchun ko'rsatamiz. */}
            {!isCouple && (
              <Handle
                id={c.id}
                type="source"
                position={Position.Bottom}
                className={`${handleClass} !top-full`}
              />
            )}
          </div>
        </div>
      ))}
      {/* Yakka xotin-erlik: bolalar juftlik MARKAZIDAN chiqadi (ikki tomonlama) */}
      {isCouple && (
        <Handle
          id={`${data.memberId}__couple`}
          type="source"
          position={Position.Bottom}
          className={`${handleClass} !top-full`}
        />
      )}
    </div>
  );
}
