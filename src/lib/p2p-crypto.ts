import { p2pId, p2pMessage, type P2PMessagePacket } from '../../contracts/p2p';
export const P2P_STORAGE_KEY = 'luqi_sovereign_p2p_v1';
const enc = new TextEncoder();
const MAX_BYTES = 2_000_000;
const iterations = 600_000;
export type VaultEnvelope = { version: 1; iterations: 600000; salt: string; iv: string; ciphertext: string };
function engine() { if (!globalThis.crypto?.subtle) throw Error('Secure browser cryptography is unavailable.'); return globalThis.crypto; }
export function encode64(value: ArrayBuffer | Uint8Array): string {
  return btoa(String.fromCharCode(...new Uint8Array(value))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function decode64(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length > MAX_BYTES * 2) throw Error('Invalid encrypted data.');
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
}
async function hash(value: string): Promise<string> {
  return [...new Uint8Array(await engine().subtle.digest('SHA-256', enc.encode(value)))].map(x => x.toString(16).padStart(2, '0')).join('');
}
export const vaultOwner = (email: string) => hash('luqi-p2p-owner-v1\0' + email.trim().toLowerCase());
export async function vaultKey(passphrase: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  if (passphrase.length < 16 || passphrase.length > 256 || salt.byteLength !== 16) throw Error('Use a vault passphrase of 16–256 characters.');
  const material = await engine().subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return engine().subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', iterations, salt }, material,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export function newSalt() { return engine().getRandomValues(new Uint8Array(16)); }
export function newSecret() { return encode64(engine().getRandomValues(new Uint8Array(32))); }
export async function encryptVault(key: CryptoKey, salt: string, owner: string, data: unknown): Promise<VaultEnvelope> {
  const raw = enc.encode(JSON.stringify(data));
  if (raw.length > MAX_BYTES) throw Error('Device vault is full.');
  const iv = engine().getRandomValues(new Uint8Array(12));
  const ciphertext = await engine().subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode('luqi-p2p-vault-v1\0' + owner), tagLength: 128 }, key, raw);
  // Encode in chunks: spreading a large vault into one call can exhaust the stack.
  const bytes = new Uint8Array(ciphertext); let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return { version: 1, iterations, salt, iv: encode64(iv), ciphertext: btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') };
}
export async function decryptVault(key: CryptoKey, owner: string, envelope: VaultEnvelope): Promise<unknown> {
  if (envelope.version !== 1 || envelope.iterations !== iterations || decode64(envelope.iv).length !== 12) throw Error('Invalid vault format.');
  const data = await engine().subtle.decrypt({ name: 'AES-GCM', iv: decode64(envelope.iv),
    additionalData: enc.encode('luqi-p2p-vault-v1\0' + owner), tagLength: 128 }, key, decode64(envelope.ciphertext));
  if (data.byteLength > MAX_BYTES) throw Error('Device vault is too large.');
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data));
}
export function readEnvelope(owner: string): VaultEnvelope | null {
  const raw = localStorage.getItem(P2P_STORAGE_KEY);
  if (!raw) return null;
  if (raw.length > MAX_BYTES * 4) throw Error('Invalid vault size.');
  const value = JSON.parse(raw);
  if (value.version !== 1 || !value.accounts || typeof value.accounts !== 'object') throw Error('Unreviewed old P2P data detected. Clear it explicitly before continuing.');
  return value.accounts[owner] ?? null;
}
export function saveEnvelope(owner: string, envelope: VaultEnvelope, expectedCiphertext?: string | null) {
  const raw = localStorage.getItem(P2P_STORAGE_KEY);
  const current = raw ? JSON.parse(raw) : { version: 1, accounts: {} };
  if (current.version !== 1 || !current.accounts) throw Error('Unreviewed old P2P data detected.');
  if (expectedCiphertext !== undefined && (current.accounts[owner]?.ciphertext ?? null) !== expectedCiphertext) throw Error('Device vault changed in another tab. Lock and reopen it before making more changes.');
  const value = JSON.stringify({ version: 1, accounts: { ...current.accounts, [owner]: envelope } });
  if (value.length > MAX_BYTES * 4) throw Error('Device storage limit reached.');
  localStorage.setItem(P2P_STORAGE_KEY, value); // Only ciphertext, KDF salt/parameters and owner digest.
}
export async function circleKey(secret: string, circleId: string): Promise<CryptoKey> {
  const bytes = decode64(secret); if (bytes.length !== 32) throw Error('Invalid private invitation key.');
  p2pId.parse(circleId);
  const material = await engine().subtle.importKey('raw', bytes, 'HKDF', false, ['deriveKey']);
  return engine().subtle.deriveKey({ name:'HKDF', hash:'SHA-256', salt:enc.encode(circleId),
    info:enc.encode('luqi-p2p-pair-aes-v1') }, material, { name:'AES-GCM', length:256 }, false, ['encrypt','decrypt']);
}

const metadata = (p: Omit<P2PMessagePacket, 'iv' | 'ciphertext'>) => JSON.stringify(['luqi-p2p-message-v1', p.messageId, p.circleId, p.senderId, p.recipientId, p.timestamp]);
export async function sealMessage(key: CryptoKey, meta: Omit<P2PMessagePacket, 'iv' | 'ciphertext'>, text: string): Promise<P2PMessagePacket> {
  if (!text.trim() || enc.encode(text).length > 6000) throw Error('Use 1–6000 UTF-8 bytes.');
  const iv = engine().getRandomValues(new Uint8Array(12));
  const encrypted = await engine().subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(metadata(meta)), tagLength: 128 }, key, enc.encode(text));
  return p2pMessage.parse({ ...meta, iv: encode64(iv), ciphertext: encode64(encrypted) });
}
export async function openMessage(key: CryptoKey, input: P2PMessagePacket): Promise<string> {
  const packet = p2pMessage.parse(input);
  const plaintext = await engine().subtle.decrypt({ name: 'AES-GCM', iv: decode64(packet.iv),
    additionalData: enc.encode(metadata(packet)), tagLength: 128 }, key, decode64(packet.ciphertext));
  if (plaintext.byteLength > 6000) throw Error('Message exceeds the local limit.');
  return new TextDecoder('utf-8', { fatal: true }).decode(plaintext);
}
export const safetyCode = (circleId: string, secret: string) => hash('luqi-p2p-safety-v1\0' + circleId + '\0' + secret);

export async function persistEnvelope(owner:string,envelope:VaultEnvelope,expectedCiphertext:string|null){
  const save=()=>{saveEnvelope(owner,envelope,expectedCiphertext);return Promise.resolve();};
  if(typeof navigator!=='undefined'&&navigator.locks)await navigator.locks.request('luqi-p2p-vault-'+owner,save);
  else await save();
}
