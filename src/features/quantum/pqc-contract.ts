import type { PqcLabResult } from './pqc-lab';
export const PUBLIC_ABC_SHA256 = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
export function verifiedPqcResult(value: unknown): value is PqcLabResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  return ['kemMatched', 'decrypted', 'signatureVerified', 'alteredSignatureRejected', 'alteredEnvelopeRejected',
    'alteredCiphertextRejected', 'wrongKemRejected'].every(k => r[k] === true) &&
    r.kemPublicKeyBytes === 1568 && r.kemCiphertextBytes === 1568 &&
    r.signaturePublicKeyBytes === 2592 && r.signatureBytes === 4627 && r.sha256 === PUBLIC_ABC_SHA256 &&
    r.fipsValidated === false && r.productionRecordsChanged === false && Object.keys(r).length === 14;
}
