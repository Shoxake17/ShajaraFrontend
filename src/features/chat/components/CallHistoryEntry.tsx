// features/chat/components/CallHistoryEntry.tsx
// Chatdagi "qo'ng'iroqlar tarixi" tizim-yozuvi — Telegram uslubida,
// odatiy xabar pufakchalaridan farqli, markazda kichik pill sifatida.
import { Phone, PhoneMissed, Video, VideoOff } from 'lucide-react';
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

  let label: string;
  if (connected && call.startedAt && call.endedAt) {
    label = `${typeLabel} — ${formatCallDuration(call.startedAt, call.endedAt)}`;
  } else if (call.status === 'MISSED') {
    label = isOutgoing ? `${typeLabel} — javob berilmadi` : `O'tkazib yuborilgan ${typeLabel.toLowerCase()}`;
  } else if (call.status === 'DECLINED') {
    label = isOutgoing ? `${typeLabel} — rad etildi` : `${typeLabel}ni rad etdingiz`;
  } else {
    label = typeLabel;
  }

  const Icon = connected ? (isVideo ? Video : Phone) : isVideo ? VideoOff : PhoneMissed;
  const iconColor = connected ? 'text-green-600' : 'text-red-500';

  return (
    <div className="flex justify-center py-1">
      <div className="flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs text-neutral-600 shadow-sm ring-1 ring-brand-100">
        <Icon size={14} className={iconColor} />
        <span>{label}</span>
        <span className="text-neutral-400">&middot; {fmtTime(call.createdAt)}</span>
      </div>
    </div>
  );
}
