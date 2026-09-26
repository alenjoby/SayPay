/**
 * The phone's own wallet key: no seed phrase, never shown, never spoken.
 *
 * The private key is stored encrypted (AES-GCM) in localStorage. The AES key is a
 * non-extractable WebCrypto key kept in IndexedDB, so page scripts can use it but
 * can't read it out. The private key is only decrypted inside withDeviceKey(),
 * after the caller's approve() (the passkey / fingerprint prompt) has succeeded,
 * and only for the one transaction.
 *
 * If the phone is lost, the key is lost too: that is what guardian recovery is for.
 */
import { Wallet } from 'ethers';

const DB = 'saypay-device';
const STORE = 'keys';
const AES_ID = 'aes-v1';

export type DeviceRole = 'owner' | 'newphone';

interface Sealed {
  address: string;
  iv: string; // base64
  ct: string; // base64
}

const storageKey = (scope: string) => `saypay_device_key_v1:${scope.toLowerCase()}`;
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function aesKey(): Promise<CryptoKey> {
  const db = await idb();
  const get = <T>(): Promise<T | undefined> =>
    new Promise((resolve, reject) => {
      const r = db.transaction(STORE).objectStore(STORE).get(AES_ID);
      r.onsuccess = () => resolve(r.result as T | undefined);
      r.onerror = () => reject(r.error);
    });
  const existing = await get<CryptoKey>();
  if (existing) return existing;
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(key, AES_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return key;
}

function readSealed(scope: string): Sealed | null {
  try {
    const raw = localStorage.getItem(storageKey(scope));
    return raw ? (JSON.parse(raw) as Sealed) : null;
  } catch {
    return null;
  }
}

async function seal(scope: string, privateKey: string): Promise<string> {
  const address = new Wallet(privateKey).address;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(), new TextEncoder().encode(privateKey))
  );
  localStorage.setItem(storageKey(scope), JSON.stringify({ address, iv: b64(iv), ct: b64(ct) }));
  return address;
}

/** The device address for this vault, or null if this phone has no key yet. */
export function deviceAddress(scope: string): string | null {
  return readSealed(scope)?.address ?? null;
}

/** First-time setup on a new phone: a fresh random key. Returns its address. */
export async function createDeviceKey(scope: string): Promise<string> {
  return seal(scope, Wallet.createRandom().privateKey);
}

/**
 * Demo pairing: the vault was deployed by a script with a pre-made owner /
 * "new phone" key, so the app stores that key instead of making its own.
 */
export async function importDeviceKey(scope: string, privateKey: string): Promise<string> {
  return seal(scope, privateKey);
}

/** Demo keys written by contracts/scripts/deploy.js into .env.development.local. */
export function demoKeyFor(role: DeviceRole): string | null {
  const v =
    role === 'owner'
      ? (import.meta.env.VITE_DEVICE_KEY_OWNER as string | undefined)
      : (import.meta.env.VITE_DEVICE_KEY_NEWPHONE as string | undefined);
  return v && /^0x[0-9a-fA-F]{64}$/.test(v) ? v : null;
}

export function forgetDeviceKey(scope: string): void {
  try {
    localStorage.removeItem(storageKey(scope));
  } catch {
    /* storage blocked: nothing stored */
  }
}

export class ApprovalRejected extends Error {
  constructor() {
    super('Fingerprint approval was rejected or cancelled.');
    this.name = 'ApprovalRejected';
  }
}

/**
 * Run `fn` with the decrypted key, only after `approve()` (the fingerprint prompt)
 * returns true. The key is not kept anywhere after `fn` finishes.
 */
export async function withDeviceKey<T>(
  scope: string,
  approve: () => Promise<boolean>,
  fn: (privateKey: string) => Promise<T>
): Promise<T> {
  const sealed = readSealed(scope);
  if (!sealed) throw new Error('This phone has no wallet key yet.');
  if (!(await approve())) throw new ApprovalRejected();
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: unb64(sealed.iv) },
    await aesKey(),
    unb64(sealed.ct)
  );
  return fn(new TextDecoder().decode(pt));
}
