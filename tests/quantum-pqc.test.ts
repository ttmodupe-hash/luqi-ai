import { expect, it } from 'vitest';
import { runPqcLabSelfTest } from '../src/features/quantum/pqc-lab';
import { PUBLIC_ABC_SHA256, verifiedPqcResult } from '../src/features/quantum/pqc-contract';

it('runs real ML-KEM-1024 / ML-DSA-87 and AEAD tamper tests, without returning keys or protection claims', async () => {
  const result = await runPqcLabSelfTest();
  expect(verifiedPqcResult(result)).toBe(true);
  expect(result.sha256).toBe(PUBLIC_ABC_SHA256);
  expect(result.kemPublicKeyBytes).toBe(1568); expect(result.kemCiphertextBytes).toBe(1568);
  expect(result.signaturePublicKeyBytes).toBe(2592); expect(result.signatureBytes).toBe(4627);
  expect(result.productionRecordsChanged).toBe(false); expect(result.fipsValidated).toBe(false);
  expect(Object.keys(result)).not.toEqual(expect.arrayContaining(['secretKey', 'sharedSecret', 'signature', 'cipherText']));
  for (const bad of [{ ...result, signatureVerified: 'true' }, { ...result, fipsValidated: true },
    { ...result, sha256: 'not-sha256' }, { ...result, productionRecordsChanged: true }, { ...result, secretKey: 'must not leave worker' }]) {
    expect(verifiedPqcResult(bad)).toBe(false);
  }
});
