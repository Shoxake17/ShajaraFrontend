// shared/lib/upload-errors.ts
// R2'ga TO'G'RIDAN-TO'G'RI yuklashdagi xatoni (family.api.ts/media.api.ts'dagi
// R2_NETWORK_ERROR/R2_HTTP_ERROR prefiksli Error'lar) aniq xabarga aylantiradi.
// PhotoPicker va MediaUploadDialog ikkalasi ham shu bitta joydan foydalanadi.
import i18n from '@/i18n';

export function r2UploadErrorMessage(err: unknown): string | null {
  const msg = err instanceof Error ? err.message : '';
  if (msg.startsWith('R2_NETWORK_ERROR')) {
    const host = msg.match(/\[([^\]]+)]$/)?.[1];
    return host ? `${i18n.t('shared.upload.networkError')} [${host}]` : i18n.t('shared.upload.networkError');
  }
  if (msg.startsWith('R2_HTTP_ERROR')) {
    const status = msg.match(/R2_HTTP_ERROR:\s*(\d+)/)?.[1];
    return i18n.t('shared.upload.httpError', { status: status ?? '?' });
  }
  return null;
}
