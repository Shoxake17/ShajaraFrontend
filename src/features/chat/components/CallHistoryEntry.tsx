// features/chat/components/CallHistoryEntry.tsx
// Chatdagi "qo'ng'iroqlar tarixi" yozuvi — Telegram uslubida: odatiy xabar
// pufakchasi kabi yo'nalish bo'yicha (chapga/o'ngga) tekislangan, qalin
// sarlavha + pastida yo'nalish o'qi (kiruvchi/chiquvchi) va vaqt, o'ng
// tomonda qo'ng'iroq turi ikonkasi.
import { ArrowDownLeft, ArrowUpRight, Phone, Video } from 'lucide-react';
import type { CallHistoryItem } from '../api/chat.api';

function formatCallDuration(startedAt: string, endedAt: string): string {
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return `${mm}:${String(ss).padStart(2, '0')}`;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function CallHistoryEntry({ call, myUserId }: { call: CallHistoryItem; myUserId: string | undefined }) {
  const isOutgoing = call.callerId === myUserId;
  const isVideo = call.callType === 'VIDEO';
  const typeLabel = isVideo ? "Video qo'ng'iroq" : "Ovozli qo'ng'iroq";
  const connected = call.status === 'ENDED' && !!call.startedAt;

  let title: string;
  if (connected && call.startedAt && call.endedAt) {
    title = `${typeLabel} · ${formatCallDuration(call.startedAt, call.endedAt)}`;
  } else if (call.status === 'MISSED') {
    title = isOutgoing ? `${typeLabel} — javob berilmadi` : `O'tkazib yuborilgan ${typeLabel.toLowerCase()}`;
  } else if (call.status === 'DECLINED') {
    title = isOutgoing ? `${typeLabel} — rad etildi` : `${typeLabel}ni rad etdingiz`;
  } else {
    title = typeLabel;
  }

  const ArrowIcon = isOutgoing ? ArrowUpRight : ArrowDownLeft;
  const arrowColor = connected ? 'text-green-500' : 'text-red-500';
  const PhoneIcon = isVideo ? Video : Phone;

  return (
    <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} py-1`}>
      <div
        className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 shadow-sm ${
          isOutgoing ? 'rounded-br-md bg-brand-800 text-white' : 'rounded-bl-md bg-[#F3F6F0] text-brand-900'
        }`}
      >
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-semibold">{title}</span>
          <span className={`flex items-center gap-1 text-xs ${isOutgoing ? 'text-white/70' : 'text-neutral-500'}`}>
            <ArrowIcon size={12} className={arrowColor} />
            {fmtTime(call.createdAt)}
          </span>
        </div>
        <PhoneIcon size={20} className={isOutgoing ? 'text-white/90' : 'text-brand-700'} />
      </div>
    </div>
  );
}
