import { beforeAll, describe, expect, it } from 'vitest';
import { createHash, sign } from 'node:crypto';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { ml_dsa87 } from '@noble/post-quantum/ml-dsa.js';
import {
  ARCHIVE_FORMAT, ARCHIVE_SUITE, ARCHIVE_MAX_BYTES, ARCHIVE_MAX_ENVELOPE_BYTES,
  ARCHIVE_GENESIS_DIGEST, PqcArchiveError, createPqcArchiveKeys,
  openPqcArchive, sealPqcArchive, type ArchiveBinding, type ArchivePrivateKeys,
} from '../api/security/pqcArchive';

const first: ArchiveBinding = { ownerId: 17, recordId: 'a55f3513-a602-4a3c-9828-d8e3a1b73879',
  revision: 1, previousDigest: ARCHIVE_GENESIS_DIGEST };
let keys: ArchivePrivateKeys, other: ArchivePrivateKeys;
let sealed: { envelope: string; digest: string };
const source = Buffer.from('Synthetic archive copy — no customer record.\0\xff', 'utf8');
const change = (patch: Record<string, unknown>) => JSON.stringify({ ...JSON.parse(sealed.envelope), ...patch });
function flip(encoded: string): string {
  const bytes = Buffer.from(encoded, 'base64'); bytes[0] ^= 1; return bytes.toString('base64');
}
function resign(envelope: string): string {
  const value = JSON.parse(envelope);
  const { mlDsaSignature: _pq, ecdsaSignature: _ec, ...unsigned } = value;
  const message = Buffer.from('LUQI-ARCHIVE-SIGNED-ENVELOPE-v1\0' + JSON.stringify(unsigned));
  const signature = sign('sha384', message, { key: keys.ecdsaPrivateKey, dsaEncoding: 'ieee-p1363' });
  const n = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffc7634d81f4372ddf581a0db248b0a77aecec196accc52973');
  const s = BigInt('0x' + signature.subarray(48).toString('hex'));
  const lowS = Buffer.from((s > n / 2n ? n - s : s).toString(16).padStart(96, '0'), 'hex');
  return JSON.stringify({ ...unsigned,
    mlDsaSignature: Buffer.from(ml_dsa87.sign(message, keys.mlDsaSecretKey)).toString('base64'),
    ecdsaSignature: Buffer.concat([signature.subarray(0, 48), lowS]).toString('base64') });
}
const open = (input: unknown, expected = first, trusted = keys, secret = keys.kemSecretKey,
  digest = sealed.digest) => openPqcArchive(input, expected, trusted, secret, digest);
// Only tests may manufacture an authoritative digest for corrupted input. This
// bypasses the external anchor to exercise signature/AEAD rejection separately.
const openCandidate = (input: string) => open(input, first, keys, keys.kemSecretKey,
  createHash('sha384').update(input).digest('hex'));

beforeAll(() => {
  keys = createPqcArchiveKeys(); other = createPqcArchiveKeys();
  sealed = sealPqcArchive(source, first, keys);
});

describe('isolated PQC archive migration foundation', () => {
  it('encrypts actual bytes and restores only with the separate trusted key and binding', () => {
    const result = open(sealed.envelope);
    expect(result).toEqual(source);
    expect(sealed.envelope).not.toContain(source.toString('utf8'));
    expect(sealed.digest).toBe(createHash('sha384').update(sealed.envelope).digest('hex'));
    const value = JSON.parse(sealed.envelope);
    expect(value.format).toBe(ARCHIVE_FORMAT); expect(value.suite).toBe(ARCHIVE_SUITE);
    expect(Buffer.from(value.kemCiphertext, 'base64')).toHaveLength(1665);
    expect(Buffer.from(value.mlDsaSignature, 'base64')).toHaveLength(4627);
    expect(Buffer.from(value.ecdsaSignature, 'base64')).toHaveLength(96);
    for (const secret of [keys.kemSecretKey, keys.mlDsaSecretKey])
      expect(sealed.envelope).not.toContain(Buffer.from(secret).toString('base64'));
    expect(Object.keys(value)).not.toEqual(expect.arrayContaining(['publicKeys', 'kemPublicKey', 'privateKey', 'plaintext']));
  });

  it('uses fresh encapsulation, salt, nonce and ciphertext for every independent copy', () => {
    const next = sealPqcArchive(source, first, keys);
    const a = JSON.parse(sealed.envelope), b = JSON.parse(next.envelope);
    for (const key of ['kemCiphertext', 'salt', 'nonce', 'ciphertext', 'mlDsaSignature', 'ecdsaSignature'])
      expect(a[key]).not.toBe(b[key]);
    expect(open(next.envelope, first, keys, keys.kemSecretKey, next.digest)).toEqual(source);
    expect(() => open(next.envelope)).toThrow(PqcArchiveError);
  });

  it('rejects another owner, record, revision or chain head supplied as the expected binding', () => {
    for (const patch of [{ ownerId: 18 }, { recordId: '20ab1022-3e31-4ca9-b147-6d5a9e15c330' },
      { revision: 2, previousDigest: sealed.digest }]) {
      expect(() => open(sealed.envelope, { ...first, ...patch })).toThrow(PqcArchiveError);
    }
  });

  it('supports externally anchored revisions and rejects stale replay even when signatures are valid', () => {
    const second = { ...first, revision: 2, previousDigest: sealed.digest };
    const updated = sealPqcArchive(Buffer.from('Synthetic revision two'), second, keys);
    expect(open(updated.envelope, second, keys, keys.kemSecretKey, updated.digest).toString()).toBe('Synthetic revision two');
    expect(() => open(sealed.envelope, second)).toThrow(PqcArchiveError);
    expect(() => open(updated.envelope, { ...second, previousDigest: '1'.repeat(96) }, keys,
      keys.kemSecretKey, updated.digest)).toThrow(PqcArchiveError);
  });

  it('rejects attacker-supplied trust roots and a wrong or malformed recovery secret', () => {
    const foreign = sealPqcArchive(source, first, other);
    expect(() => openCandidate(foreign.envelope)).toThrow(PqcArchiveError);
    expect(() => open(sealed.envelope, first, other)).toThrow(PqcArchiveError);
    expect(() => open(sealed.envelope, first, keys, other.kemSecretKey)).toThrow(PqcArchiveError);
    expect(() => open(sealed.envelope, first, keys, new Uint8Array(31))).toThrow(PqcArchiveError);
    expect(() => open(sealed.envelope, first,
      { ...keys, publicKeys: { ...other.publicKeys, keyId: keys.publicKeys.keyId } })).toThrow(PqcArchiveError);
  });

  it('requires both signatures; either independently altered signature fails', () => {
    const value = JSON.parse(sealed.envelope);
    for (const name of ['mlDsaSignature', 'ecdsaSignature']) {
      expect(() => openCandidate(change({ [name]: flip(value[name]) }))).toThrow(PqcArchiveError);
      expect(() => openCandidate(change({ [name]: '' }))).toThrow(PqcArchiveError);
    }
  });

  it.each(['kemCiphertext', 'salt', 'nonce', 'ciphertext'])('rejects altered %s before releasing plaintext', name => {
    const value = JSON.parse(sealed.envelope);
    expect(() => openCandidate(change({ [name]: flip(value[name]) }))).toThrow(PqcArchiveError);
  });

  it.each(['kemCiphertext', 'salt', 'nonce', 'ciphertext'])('AEAD rejects re-signed but altered %s', name => {
    const value = JSON.parse(sealed.envelope);
    expect(() => openCandidate(resign(change({ [name]: flip(value[name]) })))).toThrow(PqcArchiveError);
  });

  it('supports rotation without deleting old verification keys; revoked keys are unusable', () => {
    const second = { ...first, revision: 2, previousDigest: sealed.digest };
    const rotated = sealPqcArchive(source, second, other);
    const retired = { ...keys, status: 'retired' as const };
    expect(open(sealed.envelope, first, retired)).toEqual(source);
    expect(open(rotated.envelope, second, other, other.kemSecretKey, rotated.digest)).toEqual(source);
    expect(() => sealPqcArchive(source, first, retired)).toThrow(PqcArchiveError);
    expect(() => open(sealed.envelope, first, { ...keys, status: 'revoked' })).toThrow(PqcArchiveError);
    expect(() => sealPqcArchive(source, first, { ...keys, status: 'revoked' })).toThrow(PqcArchiveError);
  });

  it('rejects suite/format downgrade, untrusted extra metadata and noncanonical wire data', () => {
    for (const patch of [{ format: 'luqi.vault.sealed.v1' }, { suite: 'AES-ONLY' },
      { ownerId: 18 }, { revision: 2 }, { previousDigest: '1'.repeat(96) },
      { keyId: other.publicKeys.keyId }, { publicKeys: other.publicKeys },
      { nonce: JSON.parse(sealed.envelope).nonce + '\n' }]) {
      expect(() => open(change(patch))).toThrow(PqcArchiveError);
    }
    for (const raw of [null, {}, '', 'not JSON', sealed.envelope + ' ',
      JSON.stringify(JSON.parse(sealed.envelope), null, 2),
      '{"format":"ignored",' + sealed.envelope.slice(1),
      'x'.repeat(ARCHIVE_MAX_ENVELOPE_BYTES + 1)]) expect(() => open(raw)).toThrow(PqcArchiveError);
  });

  it('validates plaintext and context bounds and never mutates source bytes or keys', () => {
    const originalSource = source.slice(), kem = keys.kemSecretKey.slice(), pq = keys.mlDsaSecretKey.slice();
    for (const bytes of [new Uint8Array(0), new Uint8Array(ARCHIVE_MAX_BYTES + 1)])
      expect(() => sealPqcArchive(bytes, first, keys)).toThrow(PqcArchiveError);
    for (const patch of [{ ownerId: 0 }, { ownerId: Number.MAX_SAFE_INTEGER + 1 },
      { recordId: '../other-account' }, { revision: 0 }, { revision: 1_000_001 },
      { previousDigest: '1'.repeat(96) }, { revision: 2 }, { unexpected: true }]) {
      expect(() => sealPqcArchive(source, { ...first, ...patch }, keys)).toThrow(PqcArchiveError);
    }
    const full = new Uint8Array(ARCHIVE_MAX_BYTES).fill(219);
    const copy = sealPqcArchive(full, first, keys);
    expect(Buffer.byteLength(copy.envelope)).toBeLessThanOrEqual(ARCHIVE_MAX_ENVELOPE_BYTES);
    expect(open(copy.envelope, first, keys, keys.kemSecretKey, copy.digest)).toEqual(Buffer.from(full));
    expect(source).toEqual(originalSource);
    expect(keys.kemSecretKey).toEqual(kem); expect(keys.mlDsaSecretKey).toEqual(pq);
  });

  it('refuses mismatched private/public signing and encryption keys', () => {
    for (const patch of [{ mlDsaSecretKey: other.mlDsaSecretKey },
      { ecdsaPrivateKey: other.ecdsaPrivateKey }, { kemSecretKey: other.kemSecretKey }])
      expect(() => sealPqcArchive(source, first, { ...keys, ...patch })).toThrow(PqcArchiveError);
  });

  it('restores an exact historical record copy without rewriting or interpreting legacy bytes', () => {
    const legacy = Buffer.from(JSON.stringify({ format: 'luqi.vault.sealed.v1',
      kdf: 'PBKDF2-SHA256-310000', salt: 'synthetic', nonce: 'synthetic', ciphertext: 'synthetic' }));
    const before = legacy.toString('hex');
    const copy = sealPqcArchive(legacy, first, keys);
    expect(open(copy.envelope, first, keys, keys.kemSecretKey, copy.digest)).toEqual(legacy);
    expect(legacy.toString('hex')).toBe(before);
    // A legacy format is never silently treated as a verified PQ envelope.
    expect(() => open(legacy.toString())).toThrow(PqcArchiveError);
  });

  it('remains unreachable from the live server and keeps the legacy archive routes unavailable', async () => {
    const built = await build({ entryPoints: ['api/boot.ts'], bundle: true, platform: 'node',
      format: 'esm', write: false, metafile: true, logLevel: 'silent' });
    expect(Object.keys(built.metafile!.inputs).some(path => path.endsWith('/pqcArchive.ts'))).toBe(false);
    const legacy = readFileSync('api/archive.ts', 'utf8');
    expect(legacy).not.toContain('pqcArchive');
    expect(legacy).not.toContain('artifactVault');
    expect(legacy).toContain('TRPC_PROCEDURE_UNAVAILABLE');
  }, 15_000);

  it('rejects ECDSA signature malleability even if the expected digest was replaced', () => {
    const value = JSON.parse(sealed.envelope), bytes = Buffer.from(value.ecdsaSignature, 'base64');
    const n = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffc7634d81f4372ddf581a0db248b0a77aecec196accc52973');
    const s = BigInt('0x' + bytes.subarray(48).toString('hex'));
    const highS = Buffer.from((n - s).toString(16).padStart(96, '0'), 'hex');
    expect(() => openCandidate(change({ ecdsaSignature: Buffer.concat([bytes.subarray(0, 48), highS]).toString('base64') }))).toThrow(PqcArchiveError);
  });

  it('requires the committed envelope digest, rejecting same-revision forks and missing anchors', () => {
    const fork = sealPqcArchive(Buffer.from('Uncommitted alternative at revision one'), first, keys);
    expect(() => open(fork.envelope)).toThrow(PqcArchiveError);
    for (const digest of ['', '1'.repeat(96), undefined, null])
      expect(() => openPqcArchive(sealed.envelope, first, keys, keys.kemSecretKey, digest as string)).toThrow(PqcArchiveError);
  });
});
