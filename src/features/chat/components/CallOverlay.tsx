// features/chat/components/CallOverlay.tsx
// To'liq ekran chaqiruv oynasi — MediaLightbox (MessagesPage.tsx) naqshi
// asosida, lekin YUQORIROQ z-index bilan (z-[110] > MediaLightbox'ning
// z-[100]i) va AppLayout darajasida GLOBAL render qilinadi (marshrut
// almashsa ham qo'ng'iroq davom etishi uchun — MiniVideoPlayer kabi).
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Mic, MicOff, PhoneOff, ScreenShare, ScreenShareOff, Video, VideoOff } from 'lucide-react';
import { RoomEvent, type RemoteTrack } from 'livekit-client';
import { useCallStore } from '../model/call.store';

const canScreenShare =
  typeof navigator !== 'undefined' && !!navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices;

export function CallOverlay() {
  const phase = useCallStore((s) => s.phase);
  const peer = useCallStore((s) => s.peer);
  const callType = useCallStore((s) => s.callType);
  const room = useCallStore((s) => s.room);
  const micMuted = useCallStore((s) => s.micMuted);
  const cameraOff = useCallStore((s) => s.cameraOff);
  const screenSharing = useCallStore((s) => s.screenSharing);
  const toggleMic = useCallStore((s) => s.toggleMic);
  const toggleCamera = useCallStore((s) => s.toggleCamera);
  const toggleScreenShare = useCallStore((s) => s.toggleScreenShare);
  const hangUp = useCallStore((s) => s.hangUp);

  const localRef = useRef<HTMLDivElement>(null);
  const remoteRef = useRef<HTMLDivElement>(null);
  const [, bump] = useState(0);

  // Masofaviy (boshqa tomon) treklarni ulash/uzish — Room hodisalari
  // to'g'ridan-to'g'ri tinglanadi (zustand holatida MediaStreamTrack kabi
  // obyektlarni saqlash shart emas).
  useEffect(() => {
    if (!room) return;
    const container = remoteRef.current;

    const onSubscribed = (track: RemoteTrack) => {
      if (track.kind !== 'video' && track.kind !== 'audio') return;
      const el = track.attach();
      container?.appendChild(el);
    };
    const onUnsubscribed = (track: RemoteTrack) => {
      track.detach().forEach((el) => el.remove());
    };
    const rerender = () => bump((n) => n + 1);

    room.on(RoomEvent.TrackSubscribed, onSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, onUnsubscribed);
    room.on(RoomEvent.ParticipantConnected, rerender);
    room.on(RoomEvent.ParticipantDisconnected, rerender);

    return () => {
      room.off(RoomEvent.TrackSubscribed, onSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, onUnsubscribed);
      room.off(RoomEvent.ParticipantConnected, rerender);
      room.off(RoomEvent.ParticipantDisconnected, rerender);
    };
  }, [room]);

  // O'zimizning kamera oldindan ko'rinishi (kichik oynada, pastki o'ng burchak)
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

  if (phase !== 'ringing-outgoing' && phase !== 'connecting' && phase !== 'active') return null;

  const statusText = phase === 'active' ? 'Ulandi' : phase === 'connecting' ? 'Ulanmoqda...' : 'Jiringlamoqda...';

  return createPortal(
    <div className="fixed inset-0 z-[110] flex flex-col bg-black">
      <div className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/70 to-transparent px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="text-sm font-semibold text-white">{peer?.fullName ?? 'AJDO'}</p>
        <p className="text-xs text-white/70">{statusText}</p>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-neutral-900">
        <div
          ref={remoteRef}
          className="flex h-full w-full items-center justify-center [&>audio]:hidden [&>video]:max-h-full [&>video]:max-w-full"
        />
        {callType === 'VIDEO' && (
          <div
            ref={localRef}
            className="absolute bottom-4 right-4 h-32 w-24 overflow-hidden rounded-lg bg-black shadow-lg ring-1 ring-white/20 [&>video]:h-full [&>video]:w-full [&>video]:object-cover"
          />
        )}
      </div>

      <div className="flex items-center justify-center gap-4 bg-gradient-to-t from-black/70 to-transparent px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8">
        <button
          type="button"
          onClick={() => void toggleMic()}
          aria-label={micMuted ? 'Mikrofonni yoqish' : "Mikrofonni o'chirish"}
          className="rounded-full bg-white/15 p-3.5 text-white transition-colors hover:bg-white/25"
        >
          {micMuted ? <MicOff size={22} /> : <Mic size={22} />}
        </button>
        {callType === 'VIDEO' && (
          <button
            type="button"
            onClick={() => void toggleCamera()}
            aria-label={cameraOff ? 'Kamerani yoqish' : "Kamerani o'chirish"}
            className="rounded-full bg-white/15 p-3.5 text-white transition-colors hover:bg-white/25"
          >
            {cameraOff ? <VideoOff size={22} /> : <Video size={22} />}
          </button>
        )}
        {canScreenShare && (
          <button
            type="button"
            onClick={() => void toggleScreenShare()}
            aria-label={screenSharing ? "Ekran ulashishni to'xtatish" : 'Ekran ulashish'}
            className="rounded-full bg-white/15 p-3.5 text-white transition-colors hover:bg-white/25"
          >
            {screenSharing ? <ScreenShareOff size={22} /> : <ScreenShare size={22} />}
          </button>
        )}
        <button
          type="button"
          onClick={() => void hangUp()}
          aria-label="Qo'ng'iroqni tugatish"
          className="rounded-full bg-red-600 p-3.5 text-white transition-colors hover:bg-red-700"
        >
          <PhoneOff size={22} />
        </button>
      </div>
    </div>,
    document.body,
  );
}
