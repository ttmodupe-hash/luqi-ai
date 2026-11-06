/** Educational KEM-DEM + signature self-test over a fixed PUBLIC message.
 * This is not a FIPS-validated module, a classical/PQ hybrid protocol, or an
 * archival key-management system. No user records/keys are accepted or returned.
 */
import { ml_kem1024 } from '@noble/post-quantum/ml-kem.js';
import { ml_dsa87 } from '@noble/post-quantum/ml-dsa.js';
import { equalBytes } from '@noble/post-quantum/utils.js';

export const PQC_LAB_MESSAGE = 'abc';
export type PqcLabResult = { kemMatched: boolean; decrypted: boolean; signatureVerified: boolean;
  alteredSignatureRejected: boolean; alteredEnvelopeRejected: boolean; alteredCiphertextRejected: boolean; wrongKemRejected: boolean;
  kemPublicKeyBytes: number; kemCiphertextBytes: number; signaturePublicKeyBytes: number;
  signatureBytes: number; sha256: string; fipsValidated: false; productionRecordsChanged: false };

function concatenate(...arrays: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const result = new Uint8Array(arrays.reduce((s, a) => s + a.length, 0));
  let offset = 0; for (const a of arrays) { result.set(a, offset); offset += a.length; }
  return result;
}
async function deriveKey(secret: Uint8Array, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', new Uint8Array(secret), 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-384', salt: new Uint8Array(salt),
    info: new TextEncoder().encode('LUQI-V18-EDUCATIONAL-KEM-DEM-v1') }, material,
  { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function runPqcLabSelfTest(): Promise<PqcLabResult> {
  if (!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues) throw new Error('Secure cryptography is unavailable.');
  const kem = ml_kem1024.keygen(), signer = ml_dsa87.keygen();
  const { cipherText, sharedSecret } = ml_kem1024.encapsulate(kem.publicKey);
  const receiver = ml_kem1024.decapsulate(cipherText, kem.secretKey);
  const damagedKem = cipherText.slice(); damagedKem[0] ^= 1;
  const wrongSecret = ml_kem1024.decapsulate(damagedKem, kem.secretKey);
  const plaintext = new TextEncoder().encode(PQC_LAB_MESSAGE);
  const salt = crypto.getRandomValues(new Uint8Array(32)), iv = crypto.getRandomValues(new Uint8Array(12));
  const aad = concatenate(new TextEncoder().encode('LUQI-LAB-v1|ML-KEM-1024|HKDF-SHA384|AES-256-GCM|ML-DSA-87|'), cipherText, salt);
  try {
    const senderKey = await deriveKey(sharedSecret, salt), receiverKey = await deriveKey(receiver, salt);
    const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 }, senderKey, plaintext));
    const opened = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 }, receiverKey, ciphertext));
    // Sign an unambiguous fixed-layout binary envelope: suite + KEM ct + salt + IV + AES ct.
    const envelope = concatenate(aad, iv, ciphertext), signature = ml_dsa87.sign(envelope, signer.secretKey);
    const altered = envelope.slice(); altered[altered.length - 1] ^= 1;
    const alteredSignature = signature.slice(); alteredSignature[0] ^= 1;
    const damaged = ciphertext.slice(); damaged[damaged.length - 1] ^= 1;
    let alteredCiphertextRejected = false, wrongKemRejected = false;
    try { await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 }, receiverKey, damaged); }
    catch { alteredCiphertextRejected = true; }
    try {
      const wrongKey = await deriveKey(wrongSecret, salt);
      await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 }, wrongKey, ciphertext);
    } catch { wrongKemRejected = true; }
    const result: PqcLabResult = { kemMatched: equalBytes(sharedSecret, receiver), decrypted: equalBytes(plaintext, opened),
      signatureVerified: ml_dsa87.verify(signature, envelope, signer.publicKey),
      alteredSignatureRejected: !ml_dsa87.verify(alteredSignature, envelope, signer.publicKey),
      alteredEnvelopeRejected: !ml_dsa87.verify(signature, altered, signer.publicKey),
      alteredCiphertextRejected, wrongKemRejected, kemPublicKeyBytes: kem.publicKey.length,
      kemCiphertextBytes: cipherText.length, signaturePublicKeyBytes: signer.publicKey.length,
      signatureBytes: signature.length,
      sha256: Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', plaintext)), x => x.toString(16).padStart(2, '0')).join(''),
      fipsValidated: false, productionRecordsChanged: false };
    if (![result.kemMatched, result.decrypted, result.signatureVerified, result.alteredSignatureRejected,
      result.alteredEnvelopeRejected, result.alteredCiphertextRejected, result.wrongKemRejected].every(x => x === true)) throw new Error('Cryptographic self-test failed.');
    return result;
  } finally {
    // Best-effort clearing, not a guarantee against runtime copies or GC behavior.
    kem.secretKey.fill(0); signer.secretKey.fill(0); sharedSecret.fill(0); receiver.fill(0); wrongSecret.fill(0);
  }
}
