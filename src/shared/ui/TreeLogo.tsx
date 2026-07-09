/**
 * Register sahifasidagi aylana ichidagi chiziqli daraxt logosi.
 */
export function TreeLogo({ className = 'h-20 w-20' }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} fill="none" aria-hidden>
      <circle cx="48" cy="48" r="45" stroke="currentColor" strokeWidth="2.5" />
      {/* tana va ildiz */}
      <path
        d="M48 76V44m0 0c-2-6-8-9-14-9m14 9c2-6 8-9 14-9m-14 3v-8M36 76c3-2 7.5-3 12-3s9 1 12 3"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* barg shoxlari */}
      <g fill="currentColor">
        <circle cx="48" cy="24" r="5" />
        <circle cx="36" cy="28" r="4.5" />
        <circle cx="60" cy="28" r="4.5" />
        <circle cx="28" cy="36" r="4" />
        <circle cx="68" cy="36" r="4" />
        <circle cx="42" cy="33" r="4" />
        <circle cx="54" cy="33" r="4" />
      </g>
    </svg>
  );
}
