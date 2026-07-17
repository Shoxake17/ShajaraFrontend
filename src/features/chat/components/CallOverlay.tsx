// features/chat/components/CallOverlay.tsx
// Qo'ng'iroq oynasi — Telegram Desktop uslubida KICHIK SUZUVCHI OYNA
// (butun ekranni EGALLAMAYDI), AppLayout darajasida GLOBAL render qilinadi
// (marshrut almashsa ham qo'ng'iroq davom etishi uchun — MiniVideoPlayer
// kabi). Native (Android) CallActivity bilan BIR XIL tarkib: avatar/ism/
// qarindoshlik/holat, video ulanganda kichik o'z-oynam ISTALGAN NUQTAGA
// SURILADIGAN qilib, boshqaruv tugmalari pastda.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Mic, MicOff, PhoneOff, ScreenShare, ScreenShareOff, Video, VideoOff, Volume2, Volume1 } from 'lucide-react';
import { RoomEvent, type RemoteTrack } from 'livekit-client';
import { useCallStore } from '../model/call.store';
import { ContactAvatar } from './ContactAvatar';

const canScreenShare =
  typeof navigator !== 'undefined' && !!navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices;
const canSelectAudioOutput =
  typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype;

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
  const toggleMic = useCallStore((s) => s.toggleMic);
  const toggleCamera = useCallStore((s) => s.toggleCamera);
  const toggleScreenShare = useCallStore((s) => s.toggleScreenShare);
  const markCallStarted = useCallStore((s) => s.markCallStarted);
  const hangUp = useCallStore((s) => s.hangUp);

  const localRef = useRef<HTMLDivElement>(null);
  const remoteRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const [, bump] = useState(0);
  const [hasRemoteMedia, setHasRemoteMedia] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [speakerAlt, setSpeakerAlt] = useState(false);
  const [pipPos, setPipPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number; dragging: boolean } | null>(null);

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
    // yuborishi mumkin edi (React holat yangilanishi socket/room hodisasidan
    // sekinroq) — natijada chaqiruvchining videosi qabul qiluvchi tomonda
    // UMUMAN ko'rinmasdi, garchi chaqiruvchi tomonda hammasi to'g'ri
    // ishlagandek tuyulsa ham (chunki caller o'z tinglovchisini ANCHA oldin,
    // callee hali ulanmasdanoq biriktirgan, shu bois hech qachon shu xatoga
    // duch kelmagan). Yechim: listener biriktirilgan zahoti ALLAQACHON
    // obuna bo'lgan treklarni ham qo'lda "ushlab olish".
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

  // O'zimizning kamera oldindan ko'rinishi (kichik, suriladigan oynada)
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

  // Mening kichik o'z-oynamni (video PiP) istalgan nuqtaga surish — faqat
  // oyna ICHIDA (Telegram Desktop uslubi), tashqariga chiqarilmaydi.
  const onPipPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget;
    box.setPointerCapture(e.pointerId);
    const rect = box.getBoundingClientRect();
    const winRect = windowRef.current?.getBoundingClientRect();
    const originX = pipPos?.x ?? (winRect ? rect.left - winRect.left : 0);
    const originY = pipPos?.y ?? (winRect ? rect.top - winRect.top : 0);
    dragRef.current = { startX: e.clientX, startY: e.clientY, originX, originY, dragging: false };
  };
  const onPipPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.dragging && Math.hypot(dx, dy) < 4) return;
    drag.dragging = true;
    const winRect = windowRef.current?.getBoundingClientRect();
    const boxW = 96;
    const boxH = 128;
    const maxX = (winRect?.width ?? boxW) - boxW;
    const maxY = (winRect?.height ?? boxH) - boxH;
    setPipPos({
      x: Math.min(Math.max(0, drag.originX + dx), Math.max(0, maxX)),
      y: Math.min(Math.max(0, drag.originY + dy), Math.max(0, maxY)),
    });
  };
  const onPipPointerUp = () => {
    dragRef.current = null;
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

  const isConnected = phase === 'active' && callStartedAt != null;
  const statusText = isConnected
    ? formatDuration(elapsed)
    : phase === 'connecting'
      ? 'Ulanmoqda...'
      : 'Chaqirilmoqda...';
  const showVideo = callType === 'VIDEO' && hasRemoteMedia;

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
      <div
        ref={windowRef}
        className="relative flex h-[min(640px,85vh)] w-[min(400px,92vw)] flex-col overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10"
      >
        <div
          ref={remoteRef}
          className="absolute inset-0 flex items-center justify-center bg-neutral-900 [&>audio]:hidden [&>video]:h-full [&>video]:w-full [&>video]:object-cover"
          style={{ display: showVideo ? undefined : 'none' }}
        />

        {!showVideo && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <ContactAvatar name={peer?.fullName ?? 'AJDO'} gender={peer?.gender ?? 'MALE'} photoUrl={peer?.photoUrl ?? null} size={120} />
            <p className="mt-2 text-xl font-semibold text-white">{peer?.fullName ?? 'AJDO'}</p>
            {peer?.relation && <p className="text-sm text-white/60">{peer.relation}</p>}
            <p className="text-sm text-white/70">
              {isConnected
                ? statusText
                : `${callType === 'VIDEO' ? "Video qo'ng'iroq" : "Ovozli qo'ng'iroq"} · ${statusText}`}
            </p>
          </div>
        )}

        {showVideo && (
          <div className="absolute inset-x-0 top-0 z-10 flex justify-center bg-gradient-to-b from-black/70 to-transparent px-4 pb-3 pt-3">
            <div className="rounded-full bg-black/50 px-4 py-1.5 text-center">
              <p className="text-sm font-semibold text-white">
                {peer?.fullName ?? 'AJDO'} &middot; {statusText}
              </p>
            </div>
          </div>
        )}

        {callType === 'VIDEO' && !cameraOff && (
          <div
            onPointerDown={onPipPointerDown}
            onPointerMove={onPipPointerMove}
            onPointerUp={onPipPointerUp}
            onPointerCancel={onPipPointerUp}
            className="absolute z-10 h-32 w-24 cursor-grab touch-none overflow-hidden rounded-lg bg-black shadow-lg ring-1 ring-white/20 active:cursor-grabbing [&>video]:h-full [&>video]:w-full [&>video]:object-cover"
            style={
              pipPos
                ? { left: pipPos.x, top: pipPos.y }
                : { right: 16, bottom: showVideo ? 96 : 16 }
            }
          >
            <div ref={localRef} className="h-full w-full" />
          </div>
        )}

        <div className="relative z-10 mt-auto flex flex-col items-center gap-4 bg-gradient-to-t from-black/70 to-transparent px-4 pb-6 pt-8">
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
      </div>
    </div>,
    document.body,
  );
}
