/** Offline archive migration foundation. Deliberately NOT imported by a live API.
 * No storage, logging, environment secrets, account lookup or automatic migration.
 * The caller must supply an independently trusted key and current record binding.
 * Uses a draft hybrid KEM preset; this module is not FIPS validated or audited.
 */
import {
  createCipheriv, createDecipheriv, createHash, generateKeyPairSync, hkdfSync,
  randomBytes, sign, verify, createPublicKey, type KeyObject,
} from 'node:crypto';
import { ml_kem1024_p384 as hybridKem } from '@noble/post-quantum/hybrid.js';
import { ml_dsa87 } from '@noble/post-quantum/ml-dsa.js';

export const ARCHIVE_FORMAT = 'luqi.archive.envelope.v1' as const;
// Explicitly bind the implementation and draft construction. No suite negotiation
// or fallback: a future incompatible implementation requires a new format/suite.
export const ARCHIVE_SUITE = 'noble-0.7.1-MLKEM1024-P384-CG|HKDF-SHA384|AES-256-GCM|ML-DSA-87+ECDSA-P384-SHA384' as const;
export const ARCHIVE_MAX_BYTES = 24_000;
export const ARCHIVE_MAX_ENVELOPE_BYTES = 50_000;
export const ARCHIVE_GENESIS_DIGEST = '0'.repeat(96);
// Wire sizes are pinned to this exact suite; dependency drift must not silently
// reinterpret historical envelopes.
const KEM_PUBLIC_BYTES = 1665, KEM_CIPHERTEXT_BYTES = 1665, KEM_SECRET_BYTES = 32;
const MLDSA_PUBLIC_BYTES = 2592, MLDSA_SIGNATURE_BYTES = 4627;
// SEC 2 secp384r1 subgroup order. Normalize ECDSA's S coordinate so an attacker
// cannot create a second valid wire envelope by replacing S with n-S.
const P384_ORDER = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffc7634d81f4372ddf581a0db248b0a77aecec196accc52973');
const SIGN_DOMAIN = 'LUQI-ARCHIVE-SIGNED-ENVELOPE-v1\0';
const KDF_DOMAIN = 'LUQI-ARCHIVE-CONTENT-KEY-v1\0';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const digestPattern = /^[0-9a-f]{96}$/;
const b64Pattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export class PqcArchiveError extends Error {
  constructor() { super('ARCHIVE_VERIFICATION_UNAVAILABLE'); this.name = 'PqcArchiveError'; }
}
function invalid(): never { throw new PqcArchiveError(); }
export interface ArchiveBinding {
  ownerId: number;
  recordId: string;
  revision: number;
  previousDigest: string;
}
export interface ArchivePublicKeys {
  keyId: string;
  kemPublicKey: string;
  mlDsaPublicKey: string;
  ecdsaPublicKey: string;
}
export interface TrustedArchiveKey {
  status: 'active' | 'retired' | 'revoked';
  publicKeys: ArchivePublicKeys;
}
export interface ArchivePrivateKeys extends TrustedArchiveKey {
  kemSecretKey: Uint8Array;
  mlDsaSecretKey: Uint8Array;
  ecdsaPrivateKey: KeyObject;
}
interface Header extends ArchiveBinding {
  format: typeof ARCHIVE_FORMAT;
  suite: typeof ARCHIVE_SUITE;
  keyId: string;
  kemCiphertext: string;
  salt: string;
  nonce: string;
}
interface Envelope extends Header {
  ciphertext: string;
  mlDsaSignature: string;
  ecdsaSignature: string;
}
function exactKeys(input: unknown, keys: string[]): asserts input is Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).sort().join('|') !== [...keys].sort().join('|')) invalid();
}
function binding(input: ArchiveBinding): ArchiveBinding {
  exactKeys(input, ['ownerId', 'recordId', 'revision', 'previousDigest']);
  if (!Number.isSafeInteger(input.ownerId) || input.ownerId < 1 ||
      typeof input.recordId !== 'string' || !uuid.test(input.recordId) ||
      !Number.isSafeInteger(input.revision) || input.revision < 1 || input.revision > 1_000_000 ||
      typeof input.previousDigest !== 'string' || !digestPattern.test(input.previousDigest) ||
      (input.revision === 1) !== (input.previousDigest === ARCHIVE_GENESIS_DIGEST)) invalid();
  return { ownerId: input.ownerId, recordId: input.recordId,
    revision: input.revision, previousDigest: input.previousDigest };
}
function decode(value: unknown, min: number, max = min): Buffer {
  if (typeof value !== 'string' || value.length > Math.ceil(max / 3) * 4 || !b64Pattern.test(value)) invalid();
  const bytes = Buffer.from(value, 'base64');
  if (bytes.length < min || bytes.length > max || bytes.toString('base64') !== value) invalid();
  return bytes;
}
const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64');
const sha384 = (bytes: Uint8Array | string) => createHash('sha384').update(bytes).digest('hex');
function ecdsaLowS(bytes: Buffer): Buffer {
  if (bytes.length !== 96) invalid();
  const r = BigInt('0x' + bytes.subarray(0, 48).toString('hex'));
  const s = BigInt('0x' + bytes.subarray(48).toString('hex'));
  if (r < 1n || r >= P384_ORDER || s < 1n || s >= P384_ORDER) invalid();
  const canonicalS = s > P384_ORDER / 2n ? P384_ORDER - s : s;
  return Buffer.concat([bytes.subarray(0, 48), Buffer.from(canonicalS.toString(16).padStart(96, '0'), 'hex')]);
}
function publicKeyId(keys: Omit<ArchivePublicKeys, 'keyId'>): string {
  return sha384(JSON.stringify(['LUQI-ARCHIVE-TRUSTED-KEY-v1', ARCHIVE_SUITE,
    keys.kemPublicKey, keys.mlDsaPublicKey, keys.ecdsaPublicKey]));
}
function trustedKey(input: TrustedArchiveKey, writing: boolean) {
  if (!input || (input.status !== 'active' && (writing || input.status !== 'retired'))) invalid();
  const keys = input.publicKeys;
  exactKeys(keys, ['keyId', 'kemPublicKey', 'mlDsaPublicKey', 'ecdsaPublicKey']);
  decode(keys.kemPublicKey, KEM_PUBLIC_BYTES);
  decode(keys.mlDsaPublicKey, MLDSA_PUBLIC_BYTES);
  const spki = decode(keys.ecdsaPublicKey, 120);
  const ecKey = createPublicKey({ key: spki, format: 'der', type: 'spki' });
  if (ecKey.asymmetricKeyType !== 'ec' || ecKey.asymmetricKeyDetails?.namedCurve !== 'secp384r1' ||
      !digestPattern.test(keys.keyId) || keys.keyId !== publicKeyId(keys)) invalid();
  return { keys, ecKey };
}
function header(value: Header): Header {
  return { format: value.format, suite: value.suite, ...binding({ ownerId: value.ownerId,
    recordId: value.recordId, revision: value.revision, previousDigest: value.previousDigest }),
    keyId: value.keyId, kemCiphertext: value.kemCiphertext, salt: value.salt, nonce: value.nonce };
}
const signedData = (value: Header & { ciphertext: string }) =>
  Buffer.from(SIGN_DOMAIN + JSON.stringify({ ...header(value), ciphertext: value.ciphertext }));
function deriveContentKey(secret: Uint8Array, value: Header): Buffer {
  return Buffer.from(hkdfSync('sha384', secret, decode(value.salt, 32),
    Buffer.concat([Buffer.from(KDF_DOMAIN), createHash('sha384').update(JSON.stringify(header(value))).digest()]), 32));
}
function serialize(value: Envelope): string {
  return JSON.stringify({ ...header(value), ciphertext: value.ciphertext,
    mlDsaSignature: value.mlDsaSignature, ecdsaSignature: value.ecdsaSignature });
}
function parse(raw: unknown): Envelope {
  if (typeof raw !== 'string' || Buffer.byteLength(raw) > ARCHIVE_MAX_ENVELOPE_BYTES) invalid();
  const value = JSON.parse(raw) as Envelope;
  exactKeys(value, ['format', 'suite', 'ownerId', 'recordId', 'revision', 'previousDigest',
    'keyId', 'kemCiphertext', 'salt', 'nonce', 'ciphertext', 'mlDsaSignature', 'ecdsaSignature']);
  if (value.format !== ARCHIVE_FORMAT || value.suite !== ARCHIVE_SUITE ||
      typeof value.keyId !== 'string' || !digestPattern.test(value.keyId)) invalid();
  header(value);
  decode(value.kemCiphertext, KEM_CIPHERTEXT_BYTES);
  decode(value.salt, 32); decode(value.nonce, 12);
  decode(value.ciphertext, 17, ARCHIVE_MAX_BYTES + 16);
  decode(value.mlDsaSignature, MLDSA_SIGNATURE_BYTES);
  const ecSignature = decode(value.ecdsaSignature, 96);
  if (!ecdsaLowS(ecSignature).equals(ecSignature)) invalid();
  // One wire representation: no duplicated JSON fields, unknown members,
  // alternate base64 spellings, whitespace variants or permissive downgrade.
  if (serialize(value) !== raw) invalid();
  return value;
}

/** In-memory key creation for isolated evaluation. Caller owns custody/recovery.
 * There is no default production key, plaintext-key file writer or public-key
 * acceptance from an untrusted envelope. No keys are stored by this module.
 */
export function createPqcArchiveKeys(): ArchivePrivateKeys {
  const kem = hybridKem.keygen(), pq = ml_dsa87.keygen();
  const ec = generateKeyPairSync('ec', { namedCurve: 'secp384r1' });
  const fields = { kemPublicKey: b64(kem.publicKey), mlDsaPublicKey: b64(pq.publicKey),
    ecdsaPublicKey: ec.publicKey.export({ format: 'der', type: 'spki' }).toString('base64') };
  return { status: 'active', publicKeys: { keyId: publicKeyId(fields), ...fields },
    kemSecretKey: kem.secretKey, mlDsaSecretKey: pq.secretKey, ecdsaPrivateKey: ec.privateKey };
}

/** Encrypts a bounded record copy. It never mutates input or historical records.
 * Returned digest is a chain link, not an external rollback/immutability proof.
 */
export function sealPqcArchive(plaintext: Uint8Array, record: ArchiveBinding,
                                signer: ArchivePrivateKeys): { envelope: string; digest: string } {
  let shared: Uint8Array | undefined, contentKey: Buffer | undefined;
  try {
    if (!(plaintext instanceof Uint8Array) || plaintext.byteLength < 1 || plaintext.byteLength > ARCHIVE_MAX_BYTES) invalid();
    const expected = binding(record), { keys } = trustedKey(signer, true);
    if (!(signer.mlDsaSecretKey instanceof Uint8Array) ||
        !Buffer.from(ml_dsa87.getPublicKey(signer.mlDsaSecretKey)).equals(decode(keys.mlDsaPublicKey, MLDSA_PUBLIC_BYTES)) ||
        !createPublicKey(signer.ecdsaPrivateKey).export({ format: 'der', type: 'spki' }).equals(decode(keys.ecdsaPublicKey, 120)) ||
        !Buffer.from(hybridKem.getPublicKey(signer.kemSecretKey)).equals(decode(keys.kemPublicKey, KEM_PUBLIC_BYTES))) invalid();
    const encapsulated = hybridKem.encapsulate(decode(keys.kemPublicKey, KEM_PUBLIC_BYTES));
    shared = encapsulated.sharedSecret;
    const meta: Header = { format: ARCHIVE_FORMAT, suite: ARCHIVE_SUITE, ...expected,
      keyId: keys.keyId, kemCiphertext: b64(encapsulated.cipherText),
      salt: b64(randomBytes(32)), nonce: b64(randomBytes(12)) };
    contentKey = deriveContentKey(shared, meta);
    const cipher = createCipheriv('aes-256-gcm', contentKey, decode(meta.nonce, 12), { authTagLength: 16 });
    cipher.setAAD(Buffer.from(JSON.stringify(header(meta))));
    const ciphertext = b64(Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]));
    const message = signedData({ ...meta, ciphertext });
    const mlDsaSignature = b64(ml_dsa87.sign(message, signer.mlDsaSecretKey));
    const ecdsaSignature = ecdsaLowS(sign('sha384', message,
      { key: signer.ecdsaPrivateKey, dsaEncoding: 'ieee-p1363' })).toString('base64');
    const envelope = serialize({ ...meta, ciphertext, mlDsaSignature, ecdsaSignature });
    // Independently verify the complete write before claiming a sealed copy.
    const digest = sha384(envelope);
    const restored = openPqcArchive(envelope, expected, signer, signer.kemSecretKey, digest);
    try { if (!restored.equals(Buffer.from(plaintext))) invalid(); }
    finally { restored.fill(0); }
    return { envelope, digest };
  } catch { return invalid(); }
  finally { shared?.fill(0); contentKey?.fill(0); }
}

/** Both signatures AND AEAD must pass before plaintext is returned.
 * `expected` must come from the trusted owner/revision/chain-head store, not
 * from the envelope being opened. `expectedDigest` is the current committed
 * envelope digest from that same trusted store, rejecting same-revision forks.
 * Retired keys read history; revoked keys fail.
 */
export function openPqcArchive(raw: unknown, expected: ArchiveBinding,
  trusted: TrustedArchiveKey, kemSecretKey: Uint8Array, expectedDigest: string): Buffer {
  let shared: Uint8Array | undefined, contentKey: Buffer | undefined, pending: Buffer | undefined;
  try {
    const record = binding(expected), value = parse(raw), { keys, ecKey } = trustedKey(trusted, false);
    if (typeof expectedDigest !== 'string' || !digestPattern.test(expectedDigest) ||
        sha384(raw as string) !== expectedDigest) invalid();
    if (value.keyId !== keys.keyId || JSON.stringify(binding(valueBinding(value))) !== JSON.stringify(record)) invalid();
    const message = signedData(value);
    if (!ml_dsa87.verify(decode(value.mlDsaSignature, MLDSA_SIGNATURE_BYTES), message,
      decode(keys.mlDsaPublicKey, MLDSA_PUBLIC_BYTES)) ||
      !verify('sha384', message, { key: ecKey, dsaEncoding: 'ieee-p1363' }, decode(value.ecdsaSignature, 96))) invalid();
    if (!(kemSecretKey instanceof Uint8Array) || kemSecretKey.length !== KEM_SECRET_BYTES ||
        !Buffer.from(hybridKem.getPublicKey(kemSecretKey)).equals(decode(keys.kemPublicKey, KEM_PUBLIC_BYTES))) invalid();
    shared = hybridKem.decapsulate(decode(value.kemCiphertext, KEM_CIPHERTEXT_BYTES), kemSecretKey);
    contentKey = deriveContentKey(shared, value);
    const bytes = decode(value.ciphertext, 17, ARCHIVE_MAX_BYTES + 16);
    const cipher = createDecipheriv('aes-256-gcm', contentKey, decode(value.nonce, 12), { authTagLength: 16 });
    cipher.setAAD(Buffer.from(JSON.stringify(header(value))));
    cipher.setAuthTag(bytes.subarray(-16));
    pending = cipher.update(bytes.subarray(0, -16));
    const result = Buffer.concat([pending, cipher.final()]);
    return result;
  } catch { return invalid(); }
  finally { shared?.fill(0); contentKey?.fill(0); pending?.fill(0); }
}
function valueBinding(value: Envelope): ArchiveBinding {
  return { ownerId: value.ownerId, recordId: value.recordId,
    revision: value.revision, previousDigest: value.previousDigest };
}
