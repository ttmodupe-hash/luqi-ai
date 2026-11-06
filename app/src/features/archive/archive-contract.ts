/** Local archive files. No account, server secret, storage or network access. */
export const LOCAL_ARCHIVE_FORMAT = 'luqi.archive.envelope.v1' as const;
export const LOCAL_ARCHIVE_SUITE = 'noble-0.7.1-MLKEM1024-P384-CG|HKDF-SHA384|AES-256-GCM|ML-DSA-87+ECDSA-P384-SHA384' as const;
export const RECOVERY_FORMAT = 'luqi.archive.recovery.v1' as const;
export const RECOVERY_KDF = 'PBKDF2-SHA256-310000' as const;
export const MAX_ARCHIVE_BYTES = 50_000, MAX_RECOVERY_BYTES = 16_000, MAX_DOCUMENT_BYTES = 24_000;
export const GENESIS = '0'.repeat(96);
export const P384_ORDER = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffc7634d81f4372ddf581a0db248b0a77aecec196accc52973');
export const DIGEST = /^[0-9a-f]{96}$/;
export const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const utf8 = (value: string) => new TextEncoder().encode(value);
export function archiveError(): never { throw new Error('LOCAL_ARCHIVE_UNAVAILABLE'); }
export interface ArchiveDocument { title: string; text: string }
export interface LocalPublicKeys { keyId: string; kemPublicKey: string; mlDsaPublicKey: string; ecdsaPublicKey: string }
export interface LocalHeader {
  format: typeof LOCAL_ARCHIVE_FORMAT; suite: typeof LOCAL_ARCHIVE_SUITE;
  // 1 is the reserved local-file domain, never an authenticated account claim.
  ownerId: 1; recordId: string; revision: 1; previousDigest: string;
  keyId: string; kemCiphertext: string; salt: string; nonce: string;
}
export interface LocalEnvelope extends LocalHeader { ciphertext: string; mlDsaSignature: string; ecdsaSignature: string }
export interface RecoveryFile { format: typeof RECOVERY_FORMAT; id: string; kdf: typeof RECOVERY_KDF; salt: string; nonce: string; ciphertext: string }
export interface RecoveryKey {
  format: 'luqi.archive.local-key.v1'; id: string; digest: string;
  publicKeys: LocalPublicKeys; kemSecretKey: string;
}
export interface LocalArchiveBundle { id: string; envelope: string; recoveryFile: string }
export function exactKeys(input: unknown, fields: string[]): asserts input is Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).sort().join('|') !== [...fields].sort().join('|')) archiveError();
}
export function base64(bytes: Uint8Array): string {
  let raw = ''; for (const byte of bytes) raw += String.fromCharCode(byte); return btoa(raw);
}
export function decode(input: unknown, min: number, max = min): Uint8Array<ArrayBuffer> {
  if (typeof input !== 'string' || input.length > Math.ceil(max / 3) * 4 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input)) archiveError();
  const raw = atob(input);
  if (raw.length < min || raw.length > max || btoa(raw) !== input) archiveError();
  return Uint8Array.from(raw, x => x.charCodeAt(0));
}
export function validateDocument(input: unknown): ArchiveDocument {
  exactKeys(input, ['title', 'text']);
  if (typeof input.title !== 'string' || !input.title.trim() || input.title.length > 120 ||
      typeof input.text !== 'string' || !input.text.trim() || input.text.length > 20_000) archiveError();
  const doc = { title: input.title, text: input.text };
  if (utf8(JSON.stringify(doc)).length > MAX_DOCUMENT_BYTES) archiveError();
  return doc;
}
export function validatePassphrase(input: unknown): asserts input is string {
  if (typeof input !== 'string' || input.length < 14 || input.length > 128) archiveError();
}
export function header(v: LocalHeader): LocalHeader {
  return { format: v.format, suite: v.suite, ownerId: v.ownerId, recordId: v.recordId,
    revision: v.revision, previousDigest: v.previousDigest, keyId: v.keyId,
    kemCiphertext: v.kemCiphertext, salt: v.salt, nonce: v.nonce };
}
export function canonicalEnvelope(v: LocalEnvelope): string {
  return JSON.stringify({ ...header(v), ciphertext: v.ciphertext,
    mlDsaSignature: v.mlDsaSignature, ecdsaSignature: v.ecdsaSignature });
}
export function lowSEcdsa(signature: Uint8Array): Uint8Array<ArrayBuffer> {
  if (signature.length !== 96) archiveError();
  const hex = (value: Uint8Array) => [...value].map(x => x.toString(16).padStart(2, '0')).join('');
  const r = BigInt('0x' + hex(signature.subarray(0, 48))), s = BigInt('0x' + hex(signature.subarray(48)));
  if (r < 1n || r >= P384_ORDER || s < 1n || s >= P384_ORDER) archiveError();
  const sHex = (s > P384_ORDER / 2n ? P384_ORDER - s : s).toString(16).padStart(96, '0');
  const result = new Uint8Array(signature); result.set(Uint8Array.from(sHex.match(/../g)!, x => parseInt(x, 16)), 48);
  return result;
}
export function parseEnvelope(raw: unknown): LocalEnvelope {
  if (typeof raw !== 'string' || utf8(raw).length > MAX_ARCHIVE_BYTES) archiveError();
  const v = JSON.parse(raw) as LocalEnvelope;
  exactKeys(v, ['format','suite','ownerId','recordId','revision','previousDigest','keyId',
    'kemCiphertext','salt','nonce','ciphertext','mlDsaSignature','ecdsaSignature']);
  if (v.format !== LOCAL_ARCHIVE_FORMAT || v.suite !== LOCAL_ARCHIVE_SUITE || v.ownerId !== 1 ||
      v.revision !== 1 || v.previousDigest !== GENESIS || typeof v.recordId !== 'string' || !ID.test(v.recordId) ||
      typeof v.keyId !== 'string' || !DIGEST.test(v.keyId)) archiveError();
  decode(v.kemCiphertext, 1665); decode(v.salt, 32); decode(v.nonce, 12);
  decode(v.ciphertext, 17, MAX_DOCUMENT_BYTES + 16); decode(v.mlDsaSignature, 4627);
  const signature = decode(v.ecdsaSignature, 96);
  if (base64(lowSEcdsa(signature)) !== v.ecdsaSignature || canonicalEnvelope(v) !== raw) archiveError();
  return v;
}
export function parseRecovery(raw: unknown): RecoveryFile {
  if (typeof raw !== 'string' || utf8(raw).length > MAX_RECOVERY_BYTES) archiveError();
  const v = JSON.parse(raw) as RecoveryFile;
  exactKeys(v, ['format','id','kdf','salt','nonce','ciphertext']);
  if (v.format !== RECOVERY_FORMAT || v.kdf !== RECOVERY_KDF || typeof v.id !== 'string' || !ID.test(v.id)) archiveError();
  decode(v.salt, 16); decode(v.nonce, 12); decode(v.ciphertext, 17, 10_000);
  if (JSON.stringify({ format:v.format,id:v.id,kdf:v.kdf,salt:v.salt,nonce:v.nonce,ciphertext:v.ciphertext }) !== raw) archiveError();
  return v;
}
export function validatedBundle(input: unknown): LocalArchiveBundle {
  exactKeys(input, ['id','envelope','recoveryFile']);
  const envelope = parseEnvelope(input.envelope), recovery = parseRecovery(input.recoveryFile);
  if (envelope.recordId !== input.id || recovery.id !== input.id) archiveError();
  return { id: input.id as string, envelope: input.envelope as string, recoveryFile: input.recoveryFile as string };
}
