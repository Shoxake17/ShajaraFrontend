// features/chat/components/IncomingCallBanner.tsx
// Kiruvchi qo'ng'iroq (jiringlash) ekrani — mavjud toast/banner yo'q edi,
// shuning uchun CallOverlay bilan bir xil to'liq-ekran uslubida yangidan
// yaratildi. AppLayout darajasida global render qilinadi.
import { createPortal } from 'react-dom';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useCallStore } from '../model/call.store';

export function IncomingCallBanner() {
  const phase = useCallStore((s) => s.phase);
  const incoming = useCallStore((s) => s.incoming);
  const acceptIncoming = useCallStore((s) => s.acceptIncoming);
  const declineIncoming = useCallStore((s) => s.declineIncoming);

  if (phase !== 'ringing-incoming' || !incoming) return null;

  const isVideo = incoming.callType === 'VIDEO';

  return createPortal(
    <div className="fixed inset-0 z-[120] flex flex-col items-center justify-between bg-black/90 px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))]">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-100 text-3xl font-serif font-semibold text-brand-800">
          {incoming.callerName.slice(0, 1).toUpperCase()}
        </div>
        <p className="text-xl font-semibold text-white">{incoming.callerName}</p>
        <p className="text-sm text-white/70">
          {isVideo ? "Video qo'ng'iroq qilyapti..." : "Ovozli qo'ng'iroq qilyapti..."}
        </p>
      </div>

      <div className="flex w-full items-center justify-center gap-16 pb-6">
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
    </div>,
    document.body,
  );
}
