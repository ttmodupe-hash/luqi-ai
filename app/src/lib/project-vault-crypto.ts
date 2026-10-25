/** Browser-only sealed projects for future account sync. No keys or passphrases are persisted. */
import { importQuoteProject } from './business-desk';
import { parseSalesFile } from './business-pipeline';
export type ProjectKind = 'quote' | 'sales';
export interface SealedProject {
  format: 'luqi.vault.sealed.v1';
  kdf: 'PBKDF2-SHA256-310000';
  salt: string; nonce: string; ciphertext: string;
}
const invalid = () => new Error('PROJECT_SEAL_UNAVAILABLE');
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const FORMAT = 'luqi.vault.sealed.v1' as const, KDF = 'PBKDF2-SHA256-310000' as const;
const MAX_RAW = 24_000;
function validateKind(id: string, kind: ProjectKind) {
  if (!idPattern.test(id) || (kind !== 'quote' && kind !== 'sales')) throw invalid();
}
function validateRaw(kind: ProjectKind, plaintext: string) {
  if (typeof plaintext !== 'string' || !plaintext ||
      new TextEncoder().encode(plaintext).length > MAX_RAW) throw invalid();
  try {
    if (kind === 'quote') importQuoteProject(plaintext);
    else parseSalesFile(plaintext);
  } catch { throw invalid(); }
}
function validPassphrase(passphrase: string) {
  // Never trim passwords. This is a deliberate user-owned encryption secret,
  // distinct from their LUQI account password.
  if (typeof passphrase !== 'string' || passphrase.length < 14 || passphrase.length > 128) throw invalid();
}
function base64(bytes: Uint8Array): string {
  let raw = '';
  for (const byte of bytes) raw += String.fromCharCode(byte);
  return btoa(raw);
}
function readBase64(value: string, bytes?: number): Uint8Array<ArrayBuffer> {
  if (typeof value !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw invalid();
  let decoded: string;
  try { decoded = atob(value); } catch { throw invalid(); }
  if (btoa(decoded) !== value || (bytes !== undefined && decoded.length !== bytes) ||
      decoded.length > MAX_RAW + 16) throw invalid();
  return Uint8Array.from(decoded, character => character.charCodeAt(0));
}
async function derive(passphrase: string, salt: Uint8Array<ArrayBuffer>) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase),
    'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 310_000,
    hash: 'SHA-256' }, key, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
const aad = (id: string, kind: ProjectKind) => new TextEncoder().encode([FORMAT, id, kind].join('|'));

/** Seal a validated local quote or sales file; caller never sends passphrase to the server. */
export async function sealProject(id: string, kind: ProjectKind, plaintext: string,
                                   passphrase: string): Promise<SealedProject> {
  validateKind(id, kind); validateRaw(kind, plaintext); validPassphrase(passphrase);
  try {
    if (!crypto?.subtle || !crypto?.getRandomValues) throw invalid();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    const key = await derive(passphrase, salt);
    const encrypted = await crypto.subtle.encrypt({
      name: 'AES-GCM', iv: nonce, additionalData: aad(id, kind), tagLength: 128,
    }, key, new TextEncoder().encode(plaintext));
    return { format: FORMAT, kdf: KDF,
      salt: base64(salt), nonce: base64(nonce),
      ciphertext: base64(new Uint8Array(encrypted)) };
  } catch { throw invalid(); }
}

/** Decrypts only the matching project ID/type and revalidates exact file schema. */
export async function openSealedProject(id: string, kind: ProjectKind,
                                        sealed: SealedProject, passphrase: string): Promise<string> {
  validateKind(id, kind); validPassphrase(passphrase);
  if (!sealed || sealed.format !== FORMAT || sealed.kdf !== KDF ||
      Object.keys(sealed).sort().join('|') !== 'ciphertext|format|kdf|nonce|salt') throw invalid();
  try {
    const salt = readBase64(sealed.salt, 16), nonce = readBase64(sealed.nonce, 12);
    const ciphertext = readBase64(sealed.ciphertext);
    if (ciphertext.length < 16) throw invalid();
    const key = await derive(passphrase, salt);
    const plaintext = new TextDecoder('utf-8', { fatal: true }).decode(
      await crypto.subtle.decrypt({
        name: 'AES-GCM', iv: nonce, additionalData: aad(id, kind), tagLength: 128,
      }, key, ciphertext));
    validateRaw(kind, plaintext);
    return plaintext;
  } catch { throw invalid(); }
}
