// StaticBlaze PAT vault - WebCrypto AES-GCM-256, PBKDF2-SHA256 (310k iters).
// The derived key exists only in this module's memory: closing the tab locks the vault.
// localStorage holds { v, salt, iv, ct } - useless without the passphrase.

const enc = new TextEncoder();
const dec = new TextDecoder();
const STORE = 'sb.pat.vault';
const ITERATIONS = 310_000;

let key = null;

const b64 = (bytes) => btoa(String.fromCharCode(...bytes));
const ub64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

async function deriveKey(passphrase, salt) {
  const material = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export function hasVault() {
  return !!localStorage.getItem(STORE);
}

export async function createVault(passphrase, token) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  key = await deriveKey(passphrase, salt);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(token));
  localStorage.setItem(STORE, JSON.stringify({ v: 1, salt: b64(salt), iv: b64(iv), ct: b64(new Uint8Array(ct)) }));
}

export async function unlock(passphrase) {
  const raw = localStorage.getItem(STORE);
  if (!raw) throw new Error('no vault');
  const record = JSON.parse(raw);
  key = await deriveKey(passphrase, ub64(record.salt));
  try {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ub64(record.iv) }, key, ub64(record.ct));
    return dec.decode(pt);
  } catch {
    key = null;
    throw new Error('wrong passphrase');
  }
}

export function lock() {
  key = null;
}

export function destroyVault() {
  key = null;
  localStorage.removeItem(STORE);
}
