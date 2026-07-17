// features/chat/components/MinimizedCallBar.tsx
// Qo'ng'iroq oynasi (CallOverlay yoki IncomingCallBanner) "minimize" (–)
// qilinganda ko'rinadigan kichik suzuvchi panel — MiniVideoPlayer.tsx bilan
// BIR XIL naqsh (fixed burchak, doim mavjud). Bosilsa katta oynaga
// qaytaradi (minimized=false). Kiruvchi (hali javob berilmagan) qo'ng'iroq
// uchun — qabul qilish/rad etish tugmalari ham shu yerda mavjud, minimize
// qilingan holatda ham qo'ng'iroqqa javob berish imkoniyati yo'qolmasin.
import { useEffect, useState } from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import { useCallStore } from '../model/call.store';
import { ContactAvatar } from './ContactAvatar';

function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export function MinimizedCallBar() {
  const phase = useCallStore((s) => s.phase);
  const minimized = useCallStore((s) => s.minimized);
  const peer = useCallStore((s) => s.peer);
  const incoming = useCallStore((s) => s.incoming);
  const callStartedAt = useCallStore((s) => s.callStartedAt);
  const setMinimized = useCallStore((s) => s.setMinimized);
  const hangUp = useCallStore((s) => s.hangUp);
  const acceptIncoming = useCallStore((s) => s.acceptIncoming);
  const declineIncoming = useCallStore((s) => s.declineIncoming);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (callStartedAt == null) {
      setElapsed(0);
      return;
    }
    const tick = () => setElapsed(Date.now() - callStartedAt);
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [callStartedAt]);

  const isRinging = phase === 'ringing-incoming' && !!incoming;
  const isOutgoingOrActive = phase === 'ringing-outgoing' || phase === 'connecting' || phase === 'active';
  if ((!isRinging && !isOutgoingOrActive) || !minimized) return null;

  const name = isRinging ? incoming!.callerName : (peer?.fullName ?? 'AJDO');
  const photoUrl = isRinging ? incoming!.callerAvatarUrl : (peer?.photoUrl ?? null);
  const gender = peer?.gender ?? 'MALE';
  const statusText = isRinging
    ? "Kiruvchi qo'ng'iroq..."
    : phase === 'active' && callStartedAt != null
      ? formatDuration(elapsed)
      : phase === 'connecting'
        ? 'Ulanmoqda...'
        : 'Chaqirilmoqda...';

  return (
    <div
      onClick={() => setMinimized(false)}
      className="fixed bottom-24 right-3 z-[90] flex w-56 cursor-pointer items-center gap-2.5 rounded-full bg-black/90 py-2 pl-2 pr-3 shadow-2xl ring-1 ring-white/10 transition-colors hover:bg-black lg:bottom-4"
    >
      <ContactAvatar name={name} gender={gender} photoUrl={photoUrl} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{name}</p>
        <p className="truncate text-xs text-white/60">{statusText}</p>
      </div>
      {isRinging ? (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              declineIncoming();
            }}
            aria-label="Rad etish"
            className="shrink-0 rounded-full bg-red-600 p-2 text-white transition-colors hover:bg-red-700"
          >
            <PhoneOff size={15} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              // Qabul qilingach katta oynada ko'rinishi uchun — minimize
              // holatida "yashiringan" qo'ng'iroq qabul qilinganini
              // sezmasdan qolib ketmasin.
              setMinimized(false);
              void acceptIncoming();
            }}
            aria-label="Qabul qilish"
            className="shrink-0 rounded-full bg-green-600 p-2 text-white transition-colors hover:bg-green-700"
          >
            <Phone size={15} />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void hangUp();
          }}
          aria-label="Qo'ng'iroqni tugatish"
          className="shrink-0 rounded-full bg-red-600 p-2 text-white transition-colors hover:bg-red-700"
        >
          <PhoneOff size={15} />
        </button>
      )}
    </div>
  );
}
