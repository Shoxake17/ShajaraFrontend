// features/chat/components/MiniVideoPlayer.tsx
// Suzuvchi kichik video oynasi — MediaLightbox'dagi PiP tugmasi bosilganda
// shu yerga "ko'chadi" va ilova ichida (qaysi sahifada bo'lmang) ko'rinib
// turadi. AppLayout.tsx'da render qilinadi (global, doim mavjud).
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { usePipStore } from '@/features/chat/model/pip.store';

export function MiniVideoPlayer() {
  const url = usePipStore((s) => s.url);
  const startTime = usePipStore((s) => s.startTime);
  const close = usePipStore((s) => s.close);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (url && videoRef.current && startTime) {
      videoRef.current.currentTime = startTime;
    }
    // faqat url o'zgarganda (yangi video ochilganda) boshlanish nuqtasiga o'rnatiladi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  if (!url) return null;

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  };

  return (
    <div className="fixed bottom-24 right-3 z-[90] w-40 overflow-hidden rounded-xl bg-black shadow-2xl lg:bottom-4 lg:w-48">
      <button
        type="button"
        onClick={close}
        aria-label="Yopish"
        className="absolute right-1 top-1 z-10 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-black/80"
      >
        <X size={13} />
      </button>
      <video
        ref={videoRef}
        src={url}
        autoPlay
        playsInline
        className="w-full cursor-pointer"
        onEnded={close}
        onClick={togglePlay}
      />
    </div>
  );
}
