// features/chat/components/CallOverlay.tsx
// Qo'ng'iroq oynasi — Telegram Desktop uslubidagi HAQIQIY SUZUVCHI OYNA:
// sarlavha panelida minimize(–)/fullscreen(⛶)/yopish(X) tugmalari, butun
// oyna istalgan joyga suriladigan, minimize qilinsa MinimizedCallBar'ga
// "yashiriniladi". AppLayout darajasida GLOBAL render qilinadi (marshrut
// almashsa ham qo'ng'iroq davom etishi uchun). Native (Android) CallActivity
// bilan BIR XIL tarkib: avatar/ism/qarindoshlik/holat, video ulanganda
// kichik o'z-oynam ISTALGAN NUQTAGA SURILADIGAN, unga bosilsa katta/kichik
// tasvir O'RIN ALMASHADI (FaceTime/Zoom uslubi), boshqaruv tugmalari pastda.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Minus,
  PhoneOff,
  ScreenShare,
  ScreenShareOff,
  Video,
  VideoOff,
  Volume2,
  Volume1,
  X,
} from 'lucide-react';
import { RoomEvent, type RemoteTrack } from 'livekit-client';
import { useCallStore } from '../model/call.store';
import { ContactAvatar } from './ContactAvatar';

const canScreenShare =
  typeof navigator !== 'undefined' && !!navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices;
const canSelectAudioOutput =
  typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype;

const WINDOW_W = 800;
const WINDOW_H = 1280;
const SMALL_W = 144;
const SMALL_H = 192;

function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export function CallOverlay() {
  const phase = useCallStore((s) => s.phase);
  const peer = useCallStore((s) => s.peer);
  const callType = useCallStore((s) => s.callType);
  const room = useCallStore((s) => s.room);
  const micMuted = useCallStore((s) => s.micMuted);
  const cameraOff = useCallStore((s) => s.cameraOff);
  const screenSharing = useCallStore((s) => s.screenSharing);
  const callStartedAt = useCallStore((s) => s.callStartedAt);
  const minimized = useCallStore((s) => s.minimized);
  const toggleMic = useCallStore((s) => s.toggleMic);
  const toggleCamera = useCallStore((s) => s.toggleCamera);
  const toggleScreenShare = useCallStore((s) => s.toggleScreenShare);
  const markCallStarted = useCallStore((s) => s.markCallStarted);
  const hangUp = useCallStore((s) => s.hangUp);
  const setMinimized = useCallStore((s) => s.setMinimized);

  const localRef = useRef<HTMLDivElement>(null);
  const remoteRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const [, bump] = useState(0);
  const [hasRemoteMedia, setHasRemoteMedia] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [speakerAlt, setSpeakerAlt] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Kichik (PiP) burchak-oynaning OYNA ICHIDAGI nisbiy joylashuvi
  const [smallPos, setSmallPos] = useState<{ x: number; y: number } | null>(null);
  const smallDragRef = useRef<{ startX: number; startY: number; originX: number; originY: number; dragging: boolean } | null>(null);
  // Butun oynaning VIEWPORT'dagi joylashuvi
  const [windowPos, setWindowPos] = useState<{ x: number; y: number } | null>(null);
  const windowDragRef = useRef<{ startX: number; startY: number; originX: number; originY: number; dragging: boolean } | null>(null);
  // Kamera almashtirish (tap-to-swap): true bo'lsa MAHALLIY video katta
  // (fon), suhbatdoshniki kichik burchakda — aks holda (standart) teskari.
  const [localIsMain, setLocalIsMain] = useState(false);

  // Masofaviy (boshqa tomon) treklarni ulash/uzish — Room hodisalari
  // to'g'ridan-to'g'ri tinglanadi (zustand holatida MediaStreamTrack kabi
  // obyektlarni saqlash shart emas).
  useEffect(() => {
    if (!room) return;
    const container = remoteRef.current;

    const attachTrack = (track: RemoteTrack) => {
      if (track.kind !== 'video' && track.kind !== 'audio') return;
      const el = track.attach();
      container?.appendChild(el);
      if (track.kind === 'video') setHasRemoteMedia(true);
    };
    const onSubscribed = (track: RemoteTrack) => attachTrack(track);
    const onUnsubscribed = (track: RemoteTrack) => {
      track.detach().forEach((el) => el.remove());
      if (track.kind === 'video') {
        setHasRemoteMedia((container?.querySelectorAll('video').length ?? 0) > 0);
      }
    };
    const rerender = () => {
      bump((n) => n + 1);
      if (room.remoteParticipants.size > 0) markCallStarted();
    };

    room.on(RoomEvent.TrackSubscribed, onSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, onUnsubscribed);
    room.on(RoomEvent.ParticipantConnected, rerender);
    room.on(RoomEvent.ParticipantDisconnected, rerender);

    // MUHIM TUZATISH (bir tomonlama video xatosi): qabul qiluvchi (callee)
    // qo'ng'iroqni qabul qilib xonaga ULANGANDA, chaqiruvchi (caller)ning
    // videosi ALLAQACHON (ancha oldin, jiringlash paytida) nashr qilingan
    // bo'ladi. LiveKit mijoz kutubxonasi bunday mavjud treklarga connect()
    // paytidayoq avtomatik obuna bo'ladi va TrackSubscribed hodisasini shu
    // yerdagi useEffect ULGURIB listener biriktirishidan OLDIN otib
    // yuborishi mumkin edi — yechim: listener biriktirilgan zahoti
    // ALLAQACHON obuna bo'lgan treklarni ham qo'lda "ushlab olish".
    for (const participant of room.remoteParticipants.values()) {
      for (const pub of participant.trackPublications.values()) {
        if (pub.isSubscribed && pub.track) attachTrack(pub.track);
      }
    }
    if (room.remoteParticipants.size > 0) markCallStarted();

    return () => {
      room.off(RoomEvent.TrackSubscribed, onSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, onUnsubscribed);
      room.off(RoomEvent.ParticipantConnected, rerender);
      room.off(RoomEvent.ParticipantDisconnected, rerender);
    };
  }, [room, markCallStarted]);

  // O'zimizning kamera oldindan ko'rinishi (kichik yoki katta — swap holatiga qarab)
  useEffect(() => {
    if (!room || callType !== 'VIDEO' || cameraOff) return;
    const pub = [...room.localParticipant.videoTrackPublications.values()][0];
    const track = pub?.videoTrack;
    if (!track || !localRef.current) return;
    const el = track.attach();
    el.muted = true;
    localRef.current.appendChild(el);
    return () => {
      track.detach().forEach((e) => e.remove());
    };
  }, [room, callType, cameraOff]);

  // Davomiylik hisoblagichi — ikki tomonda BIR XIL boshlanish nuqtasidan
  // (markCallStarted() — suhbatdosh xonaga qo'shilgan payt).
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

  // Kichik (PiP) burchak-oynani sudrash — oyna ICHIDA, mavjud tomon
  // (local yoki remote, localIsMain'ga qarab) hozir "kichik" rolda.
  const onSmallPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget;
    box.setPointerCapture(e.pointerId);
    const rect = box.getBoundingClientRect();
    const winRect = windowRef.current?.getBoundingClientRect();
    const originX = smallPos?.x ?? (winRect ? rect.left - winRect.left : 0);
    const originY = smallPos?.y ?? (winRect ? rect.top - winRect.top : 0);
    smallDragRef.current = { startX: e.clientX, startY: e.clientY, originX, originY, dragging: false };
  };
  const onSmallPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = smallDragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.dragging && Math.hypot(dx, dy) < 4) return;
    drag.dragging = true;
    const winRect = windowRef.current?.getBoundingClientRect();
    const maxX = (winRect?.width ?? SMALL_W) - SMALL_W;
    const maxY = (winRect?.height ?? SMALL_H) - SMALL_H;
    setSmallPos({
      x: Math.min(Math.max(0, drag.originX + dx), Math.max(0, maxX)),
      y: Math.min(Math.max(0, drag.originY + dy), Math.max(0, maxY)),
    });
  };
  const onSmallPointerUp = () => {
    // Sudralmagan bo'lsa (oddiy bosish) — katta/kichik tasvir o'rin almashadi
    if (!smallDragRef.current?.dragging) {
      setLocalIsMain((v) => !v);
      setSmallPos(null);
    }
    smallDragRef.current = null;
  };

  // Butun oynani sudrash — sarlavha panelidan, viewport ICHIDA.
  const onTitlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isFullscreen) return;
    const box = e.currentTarget;
    box.setPointerCapture(e.pointerId);
    const rect = windowRef.current?.getBoundingClientRect();
    const originX = windowPos?.x ?? rect?.left ?? 0;
    const originY = windowPos?.y ?? rect?.top ?? 0;
    windowDragRef.current = { startX: e.clientX, startY: e.clientY, originX, originY, dragging: false };
  };
  const onTitlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = windowDragRef.current;
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
    windowDragRef.current = null;
  };

  const toggleSpeaker = async () => {
    if (!canSelectAudioOutput) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const outputs = devices.filter((d) => d.kind === 'audiooutput');
      if (outputs.length < 2) return;
      const next = !speakerAlt;
      const target = outputs[next ? 1 : 0];
      const mediaEls = remoteRef.current?.querySelectorAll('video, audio') ?? [];
      for (const el of Array.from(mediaEls)) {
        await (el as HTMLMediaElement & { setSinkId: (id: string) => Promise<void> }).setSinkId(target.deviceId);
      }
      setSpeakerAlt(next);
    } catch {
      // Chiqish qurilmasini almashtirib bo'lmadi — standart ovoz chiqishi
      // ishlashda davom etadi, foydalanuvchiga xalaqit bermaydi.
    }
  };

  if (phase !== 'ringing-outgoing' && phase !== 'connecting' && phase !== 'active') return null;
  if (minimized) return null;

  const isConnected = phase === 'active' && callStartedAt != null;
  const statusText = isConnected
    ? formatDuration(elapsed)
    : phase === 'connecting'
      ? 'Ulanmoqda...'
      : 'Chaqirilmoqda...';
  const showVideo = callType === 'VIDEO' && hasRemoteMedia;
  const canSwap = callType === 'VIDEO';
  // Kichik burchak-quti hozir qaysi tomonga tegishli bo'lsa, o'sha ko'rinadi
  // (aks holida yo'q — masalan mahalliy kamera o'chiq bo'lsa, o'zini kichik
  // qutida ko'rsatishning ma'nosi yo'q).
  const smallVisible = canSwap && (localIsMain ? showVideo : !cameraOff);
  const smallStyle = smallPos ? { left: smallPos.x, top: smallPos.y } : { right: 16, bottom: 16 };

  return createPortal(
    <div
      ref={windowRef}
      className={`fixed z-[110] flex flex-col overflow-hidden bg-black shadow-2xl ring-1 ring-white/10 ${
        isFullscreen ? 'inset-0 rounded-none' : 'rounded-2xl'
      }`}
      style={
        isFullscreen
          ? undefined
          : {
              width: `min(${WINDOW_W}px,92vw)`,
              height: `min(${WINDOW_H}px,85vh)`,
              ...(windowPos ? { left: windowPos.x, top: windowPos.y } : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }),
            }
      }
    >
      {/* Sarlavha panel — sudrash + minimize/fullscreen/yopish */}
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
          onClick={() => void hangUp()}
          aria-label="Qo'ng'iroqni tugatish"
          className="rounded-md p-1.5 text-white/70 transition-colors hover:bg-red-600 hover:text-white"
        >
          <X size={16} />
        </button>
      </div>

      {/* Video/avatar qismi */}
      <div className="relative min-h-0 flex-1 overflow-hidden bg-neutral-900">
        {/* Masofaviy (suhbatdosh) — katta yoki kichik, localIsMain'ga qarab */}
        <div
          className={
            !localIsMain
              ? 'absolute inset-0 [&>audio]:hidden [&>video]:h-full [&>video]:w-full [&>video]:object-cover'
              : `absolute z-10 cursor-pointer touch-none overflow-hidden rounded-lg bg-black shadow-lg ring-1 ring-white/20 [&>audio]:hidden [&>video]:h-full [&>video]:w-full [&>video]:object-cover`
          }
          style={
            !localIsMain
              ? { display: showVideo ? undefined : 'none' }
              : { width: SMALL_W, height: SMALL_H, display: smallVisible ? undefined : 'none', ...smallStyle }
          }
          onPointerDown={localIsMain ? onSmallPointerDown : undefined}
          onPointerMove={localIsMain ? onSmallPointerMove : undefined}
          onPointerUp={localIsMain ? onSmallPointerUp : undefined}
          onPointerCancel={localIsMain ? onSmallPointerUp : undefined}
        >
          <div ref={remoteRef} className="h-full w-full" />
        </div>

        {/* Mahalliy (o'zim) — teskari rol */}
        <div
          className={
            localIsMain
              ? 'absolute inset-0 [&>video]:h-full [&>video]:w-full [&>video]:object-cover'
              : 'absolute z-10 cursor-pointer touch-none overflow-hidden rounded-lg bg-black shadow-lg ring-1 ring-white/20 [&>video]:h-full [&>video]:w-full [&>video]:object-cover'
          }
          style={
            localIsMain
              ? undefined
              : { width: SMALL_W, height: SMALL_H, display: smallVisible ? undefined : 'none', ...smallStyle }
          }
          onPointerDown={!localIsMain ? onSmallPointerDown : undefined}
          onPointerMove={!localIsMain ? onSmallPointerMove : undefined}
          onPointerUp={!localIsMain ? onSmallPointerUp : undefined}
          onPointerCancel={!localIsMain ? onSmallPointerUp : undefined}
        >
          <div ref={localRef} className="h-full w-full" />
        </div>

        {/* Markaziy avatar-fallback — FAQAT almashtirilmagan holatda va
            suhbatdosh videosi yo'q bo'lganda (audio qo'ng'iroqqa o'xshab) */}
        {!localIsMain && !showVideo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <ContactAvatar name={peer?.fullName ?? 'AJDO'} gender={peer?.gender ?? 'MALE'} photoUrl={peer?.photoUrl ?? null} size={140} />
            <p className="mt-2 text-2xl font-semibold text-white">{peer?.fullName ?? 'AJDO'}</p>
            {peer?.relation && <p className="text-base text-white/60">{peer.relation}</p>}
            <p className="text-base text-white/70">
              {isConnected
                ? statusText
                : `${callType === 'VIDEO' ? "Video qo'ng'iroq" : "Ovozli qo'ng'iroq"} · ${statusText}`}
            </p>
          </div>
        )}

        {/* Tepadagi ism/vaqt belgisi — video ko'rinayotganda YOKI
            almashtirilgan holatda (kontekst yo'qolmasin) */}
        {(showVideo || localIsMain) && (
          <div className="absolute inset-x-0 top-0 z-10 flex justify-center bg-gradient-to-b from-black/70 to-transparent px-4 pb-3 pt-3">
            <div className="rounded-full bg-black/50 px-4 py-1.5 text-center">
              <p className="text-sm font-semibold text-white">
                {peer?.fullName ?? 'AJDO'} &middot; {statusText}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Boshqaruv qatori */}
      <div className="relative z-10 flex shrink-0 flex-col items-center gap-4 bg-gradient-to-t from-black/70 to-transparent px-4 pb-6 pt-8">
        {phase === 'active' && (
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => void toggleMic()}
              aria-label={micMuted ? 'Mikrofonni yoqish' : "Mikrofonni o'chirish"}
              className={`rounded-full p-3.5 text-white transition-colors ${micMuted ? 'bg-white text-black' : 'bg-white/15 hover:bg-white/25'}`}
            >
              {micMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            {callType === 'VIDEO' && (
              <button
                type="button"
                onClick={() => void toggleCamera()}
                aria-label={cameraOff ? 'Kamerani yoqish' : "Kamerani o'chirish"}
                className={`rounded-full p-3.5 text-white transition-colors ${cameraOff ? 'bg-white text-black' : 'bg-white/15 hover:bg-white/25'}`}
              >
                {cameraOff ? <VideoOff size={20} /> : <Video size={20} />}
              </button>
            )}
            {canSelectAudioOutput && (
              <button
                type="button"
                onClick={() => void toggleSpeaker()}
                aria-label="Ovoz chiqishini almashtirish"
                className={`rounded-full p-3.5 text-white transition-colors ${speakerAlt ? 'bg-white text-black' : 'bg-white/15 hover:bg-white/25'}`}
              >
                {speakerAlt ? <Volume2 size={20} /> : <Volume1 size={20} />}
              </button>
            )}
            {canScreenShare && (
              <button
                type="button"
                onClick={() => void toggleScreenShare()}
                aria-label={screenSharing ? "Ekran ulashishni to'xtatish" : 'Ekran ulashish'}
                className={`rounded-full p-3.5 text-white transition-colors ${screenSharing ? 'bg-white text-black' : 'bg-white/15 hover:bg-white/25'}`}
              >
                {screenSharing ? <ScreenShareOff size={20} /> : <ScreenShare size={20} />}
              </button>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => void hangUp()}
          aria-label="Qo'ng'iroqni tugatish"
          className="rounded-full bg-red-600 p-4 text-white transition-colors hover:bg-red-700"
        >
          <PhoneOff size={24} />
        </button>
      </div>
    </div>,
    document.body,
  );
}
