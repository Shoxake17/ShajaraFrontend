/**
 * Client-side shifrlash (Web Crypto API, AES-GCM 256).
 * Shaxsiy ma'lumotlar serverga yuborilishidan OLDIN brauzerda shifrlanadi.
 */
const ITERATIONS = 310_000;

export async function deriveKey(passphrase: string, salt: BufferSource): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encrypt(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  const payload = new Uint8Array(iv.length + cipher.byteLength);
  payload.set(iv);
  payload.set(new Uint8Array(cipher), iv.length);
  return btoa(String.fromCharCode(...payload));
}

export async function decrypt(encoded: string, key: CryptoKey): Promise<string> {
  const payload = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  const iv = payload.slice(0, 12);
  const data = payload.slice(12);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return new TextDecoder().decode(plain);
}
