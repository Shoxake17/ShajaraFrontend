// features/chat/components/IncomingCallBanner.tsx
// Kiruvchi qo'ng'iroq (jiringlash) oynasi — CallOverlay bilan bir xil
// Telegram Desktop uslubidagi KICHIK SUZUVCHI OYNA (butun ekranni
// egallamaydi). AppLayout darajasida global render qilinadi.
import { createPortal } from 'react-dom';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useCallStore } from '../model/call.store';
import { ContactAvatar } from './ContactAvatar';

export function IncomingCallBanner() {
  const phase = useCallStore((s) => s.phase);
  const incoming = useCallStore((s) => s.incoming);
  const acceptIncoming = useCallStore((s) => s.acceptIncoming);
  const declineIncoming = useCallStore((s) => s.declineIncoming);

  if (phase !== 'ringing-incoming' || !incoming) return null;

  const isVideo = incoming.callType === 'VIDEO';

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[min(560px,80vh)] w-[min(360px,92vw)] flex-col items-center justify-between overflow-hidden rounded-2xl bg-black px-6 py-10 shadow-2xl ring-1 ring-white/10">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <ContactAvatar name={incoming.callerName} gender="MALE" photoUrl={incoming.callerAvatarUrl} size={120} />
          <p className="mt-2 text-xl font-semibold text-white">{incoming.callerName}</p>
          {incoming.callerRelation && <p className="text-sm text-white/60">{incoming.callerRelation}</p>}
          <p className="text-sm text-white/70">{isVideo ? "Video qo'ng'iroq" : "Ovozli qo'ng'iroq"}</p>
        </div>

        <div className="flex w-full items-center justify-center gap-16 pb-2">
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => declineIncoming()}
              aria-label="Rad etish"
              className="rounded-full bg-red-600 p-4 text-white transition-transform hover:bg-red-700 active:scale-95"
            >
              <PhoneOff size={26} />
            </button>
            <span className="text-xs text-white/70">Rad etish</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => void acceptIncoming()}
              aria-label="Qabul qilish"
              className="rounded-full bg-green-600 p-4 text-white transition-transform hover:bg-green-700 active:scale-95"
            >
              {isVideo ? <Video size={26} /> : <Phone size={26} />}
            </button>
            <span className="text-xs text-white/70">Qabul qilish</span>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
