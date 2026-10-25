import { describe, expect, it } from 'vitest';
import { vaultId, vaultSealed, vaultWrite, vaultRemove, VAULT_FORMAT, VAULT_KDF } from '../api/services/projectVaultContract';
import { Buffer } from 'node:buffer';
const sealed = {
  format: VAULT_FORMAT, kdf: VAULT_KDF,
  salt: Buffer.alloc(16, 1).toString('base64'),
  nonce: Buffer.alloc(12, 2).toString('base64'),
  ciphertext: Buffer.alloc(16, 3).toString('base64'),
};
describe('project-vault ciphertext-only contract', () => {
  it('requires canonical fixed-length IV, salt and authenticated ciphertext', () => {
    expect(vaultSealed.parse(sealed)).toEqual(sealed);
    for (const patch of [
      { salt: 'a' }, { nonce: 'too-short' }, { ciphertext: 'not base64!' },
      { ciphertext: Buffer.alloc(24_017).toString('base64') }, { ciphertext: 'AAAA==' },
      { kdf: 'weak-kdf' }, { format: 'luqi.vault.sealed.v0' }, { exposedTitle: 'secret' },
    ]) expect(vaultSealed.safeParse({ ...sealed, ...patch }).success).toBe(false);
  });
  it('requires strict types, bounds and explicit confirmation', () => {
    expect(vaultWrite.parse({ kind: 'quote', expectedRevision: 0, sealed })).toBeTruthy();
    for (const invalid of [
      { kind: 'voice' }, { expectedRevision: -1 }, { expectedRevision: 1000001 },
      { plan: 'creator' }, { plaintext: 'private note' },
    ]) expect(vaultWrite.safeParse({ kind: 'quote', expectedRevision: 0, sealed, ...invalid }).success).toBe(false);
    expect(vaultRemove.safeParse({ confirm: true, expectedRevision: 1 }).success).toBe(true);
    expect(vaultRemove.safeParse({ confirm: false, expectedRevision: 1 }).success).toBe(false);
    expect(vaultId.safeParse('https://example.com').success).toBe(false);
    expect(vaultId.safeParse('da9c1eb2-62f6-45fb-b7f9-a989521270ae').success).toBe(true);
  });
});
