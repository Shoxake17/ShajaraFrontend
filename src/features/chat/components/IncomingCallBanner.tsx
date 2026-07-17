// features/chat/components/IncomingCallBanner.tsx
// Kiruvchi qo'ng'iroq (jiringlash) oynasi — CallOverlay bilan BIR XIL
// oyna-chrome naqshi (sarlavha panelida minimize(–)/fullscreen(⛶)/
// yopish(X) — X bosilsa rad etiladi), Telegram Desktop uslubidagi suzuvchi
// oyna. AppLayout darajasida global render qilinadi.
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2, Minus, Phone, PhoneOff, Video, X } from 'lucide-react';
import { useCallStore } from '../model/call.store';
import { ContactAvatar } from './ContactAvatar';

const WINDOW_W = 720;
const WINDOW_H = 1120;

export function IncomingCallBanner() {
  const phase = useCallStore((s) => s.phase);
  const incoming = useCallStore((s) => s.incoming);
  const minimized = useCallStore((s) => s.minimized);
  const acceptIncoming = useCallStore((s) => s.acceptIncoming);
  const declineIncoming = useCallStore((s) => s.declineIncoming);
  const setMinimized = useCallStore((s) => s.setMinimized);

  const windowRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [windowPos, setWindowPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number; dragging: boolean } | null>(null);

  const onTitlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isFullscreen) return;
    const box = e.currentTarget;
    box.setPointerCapture(e.pointerId);
    const rect = windowRef.current?.getBoundingClientRect();
    const originX = windowPos?.x ?? rect?.left ?? 0;
    const originY = windowPos?.y ?? rect?.top ?? 0;
    dragRef.current = { startX: e.clientX, startY: e.clientY, originX, originY, dragging: false };
  };
  const onTitlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.dragging && Math.hypot(dx, dy) < 4) return;
    drag.dragging = true;
    const rect = windowRef.current?.getBoundingClientRect();
    const w = rect?.width ?? WINDOW_W;
    const h = rect?.height ?? WINDOW_H;
    const maxX = Math.max(0, window.innerWidth - w);
    const maxY = Math.max(0, window.innerHeight - h);
    setWindowPos({
      x: Math.min(Math.max(0, drag.originX + dx), maxX),
      y: Math.min(Math.max(0, drag.originY + dy), maxY),
    });
  };
  const onTitlePointerUp = () => {
    dragRef.current = null;
  };

  if (phase !== 'ringing-incoming' || !incoming || minimized) return null;

  const isVideo = incoming.callType === 'VIDEO';

  return createPortal(
    <div
      ref={windowRef}
      className={`fixed z-[120] flex flex-col overflow-hidden bg-black shadow-2xl ring-1 ring-white/10 ${
        isFullscreen ? 'inset-0 rounded-none' : 'rounded-2xl'
      }`}
      style={
        isFullscreen
          ? undefined
          : {
              width: `min(${WINDOW_W}px,92vw)`,
              height: `min(${WINDOW_H}px,80vh)`,
              ...(windowPos ? { left: windowPos.x, top: windowPos.y } : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }),
            }
      }
    >
      <div
        onPointerDown={onTitlePointerDown}
        onPointerMove={onTitlePointerMove}
        onPointerUp={onTitlePointerUp}
        onPointerCancel={onTitlePointerUp}
        className={`relative z-20 flex h-10 shrink-0 touch-none items-center justify-end gap-1 bg-white/5 px-2 ${
          isFullscreen ? '' : 'cursor-grab active:cursor-grabbing'
        }`}
      >
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setMinimized(true)}
          aria-label="Kichraytirish"
          className="rounded-md p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Minus size={16} />
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setIsFullscreen((v) => !v)}
          aria-label={isFullscreen ? "To'liq ekrandan chiqish" : "To'liq ekran"}
          className="rounded-md p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => declineIncoming()}
          aria-label="Rad etish"
          className="rounded-md p-1.5 text-white/70 transition-colors hover:bg-red-600 hover:text-white"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-between overflow-hidden px-6 py-10">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <ContactAvatar name={incoming.callerName} gender="MALE" photoUrl={incoming.callerAvatarUrl} size={140} />
          <p className="mt-2 text-2xl font-semibold text-white">{incoming.callerName}</p>
          {incoming.callerRelation && <p className="text-base text-white/60">{incoming.callerRelation}</p>}
          <p className="text-base text-white/70">{isVideo ? "Video qo'ng'iroq" : "Ovozli qo'ng'iroq"}</p>
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
