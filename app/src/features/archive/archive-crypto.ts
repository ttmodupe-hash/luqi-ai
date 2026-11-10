/** Optional local pilot: browser input/output; no API transmission of records or passphrases.
 * No FIPS validation, independent audit, server migration or remote revocation.
 */
import { ml_kem1024_p384 as kem } from '@noble/post-quantum/hybrid.js';
import { ml_dsa87 } from '@noble/post-quantum/ml-dsa.js';
import { archiveError, base64, canonicalEnvelope, decode, DIGEST, exactKeys, GENESIS,
  header, LOCAL_ARCHIVE_FORMAT, LOCAL_ARCHIVE_SUITE, lowSEcdsa, parseEnvelope,
  parseRecovery, RECOVERY_FORMAT, RECOVERY_KDF, utf8, validateDocument,
  validatePassphrase, validatedBundle, type ArchiveDocument, type LocalArchiveBundle,
  type LocalHeader, type LocalPublicKeys, type RecoveryFile, type RecoveryKey } from './archive-contract';

export async function sha384(input: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-384', utf8(input)));
  return [...bytes].map(x => x.toString(16).padStart(2, '0')).join('');
}
async function fingerprint(keys: LocalPublicKeys): Promise<string> {
  return sha384(JSON.stringify(['LUQI-ARCHIVE-TRUSTED-KEY-v1', LOCAL_ARCHIVE_SUITE,
    keys.kemPublicKey, keys.mlDsaPublicKey, keys.ecdsaPublicKey]));
}
const signed = (v: LocalHeader & { ciphertext: string }) => utf8('LUQI-ARCHIVE-SIGNED-ENVELOPE-v1\0' +
  JSON.stringify({ ...header(v), ciphertext: v.ciphertext }));
async function contentKey(secret: Uint8Array, meta: LocalHeader): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', new Uint8Array(secret), 'HKDF', false, ['deriveKey']);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-384', utf8(JSON.stringify(header(meta)))));
  const domain = utf8('LUQI-ARCHIVE-CONTENT-KEY-v1\0');
  const info = new Uint8Array(domain.length + digest.length); info.set(domain); info.set(digest, domain.length);
  return crypto.subtle.deriveKey({ name:'HKDF', hash:'SHA-384', salt:decode(meta.salt,32), info },
    material, { name:'AES-GCM', length:256 }, false, ['encrypt','decrypt']);
}
async function recoveryKey(passphrase: string, salt: string): Promise<CryptoKey> {
  const bytes = utf8(passphrase);
  try {
    const material = await crypto.subtle.importKey('raw', bytes, 'PBKDF2', false, ['deriveKey']);
    return await crypto.subtle.deriveKey({ name:'PBKDF2', hash:'SHA-256', salt:decode(salt,16), iterations:310_000 },
      material, { name:'AES-GCM', length:256 }, false, ['encrypt','decrypt']);
  } finally { bytes.fill(0); }
}
const recoveryAad = (v: Pick<RecoveryFile,'format'|'id'|'kdf'>) =>
  utf8(JSON.stringify(['LUQI-ARCHIVE-RECOVERY-v1',v.format,v.id,v.kdf,LOCAL_ARCHIVE_SUITE]));

/** Opens the recovery key, then verifies the externally retained digest and both
 * signatures before decrypting. The encrypted recovery file is the local trust
 * anchor; substituting both files plus its passphrase is outside this boundary.
 */
export async function openLocalArchive(envelopeRaw: unknown, recoveryRaw: unknown,
  passphrase: string): Promise<ArchiveDocument> {
  let keyBytes: Uint8Array | undefined, shared: Uint8Array | undefined, recoveryPlain: Uint8Array<ArrayBuffer> | undefined,
    plaintext: Uint8Array<ArrayBuffer> | undefined;
  try {
    validatePassphrase(passphrase);
    const value = parseEnvelope(envelopeRaw), recovery = parseRecovery(recoveryRaw);
    if (value.recordId !== recovery.id) archiveError();
    const unlockKey = await recoveryKey(passphrase, recovery.salt);
    recoveryPlain = new Uint8Array(await crypto.subtle.decrypt({ name:'AES-GCM',iv:decode(recovery.nonce,12),
      additionalData:recoveryAad(recovery),tagLength:128 },unlockKey,decode(recovery.ciphertext,17,10_000)));
    const key = JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(recoveryPlain)) as RecoveryKey;
    exactKeys(key,['format','id','digest','publicKeys','kemSecretKey']);
    if (key.format !== 'luqi.archive.local-key.v1' || key.id !== value.recordId ||
        typeof key.digest !== 'string' || !DIGEST.test(key.digest) || key.digest !== await sha384(envelopeRaw as string)) archiveError();
    exactKeys(key.publicKeys,['keyId','kemPublicKey','mlDsaPublicKey','ecdsaPublicKey']);
    const keys = key.publicKeys;
    if (keys.keyId !== value.keyId || keys.keyId !== await fingerprint(keys)) archiveError();
    decode(keys.kemPublicKey,1665); decode(keys.mlDsaPublicKey,2592);
    const ec = await crypto.subtle.importKey('spki',decode(keys.ecdsaPublicKey,120),
      {name:'ECDSA',namedCurve:'P-384'},false,['verify']);
    const message = signed(value);
    if (!ml_dsa87.verify(decode(value.mlDsaSignature,4627),message,decode(keys.mlDsaPublicKey,2592)) ||
        !await crypto.subtle.verify({name:'ECDSA',hash:'SHA-384'},ec,decode(value.ecdsaSignature,96),message)) archiveError();
    keyBytes = decode(key.kemSecretKey,32);
    if (base64(kem.getPublicKey(keyBytes)) !== keys.kemPublicKey) archiveError();
    shared = kem.decapsulate(decode(value.kemCiphertext,1665),keyBytes);
    const aes = await contentKey(shared,value);
    plaintext = new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(value.nonce,12),
      additionalData:utf8(JSON.stringify(header(value))),tagLength:128},aes,decode(value.ciphertext,17,24_016)));
    const document = validateDocument(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(plaintext)));
    return document;
  } catch { return archiveError(); }
  finally { keyBytes?.fill(0);shared?.fill(0);recoveryPlain?.fill(0);plaintext?.fill(0); }
}

/** Encrypts one new standalone text record; does not migrate any stored chain. */
export async function createLocalArchive(input: ArchiveDocument, passphrase: string): Promise<LocalArchiveBundle> {
  let kemSecret: Uint8Array | undefined, signingSecret: Uint8Array | undefined, shared: Uint8Array | undefined,
    recoveryPlain: Uint8Array<ArrayBuffer> | undefined, plaintext: Uint8Array<ArrayBuffer> | undefined;
  try {
    const document = validateDocument(input); validatePassphrase(passphrase);
    if (!crypto?.subtle || !crypto?.getRandomValues || !crypto?.randomUUID) archiveError();
    const recipient = kem.keygen(), signer = ml_dsa87.keygen();
    kemSecret = recipient.secretKey; signingSecret = signer.secretKey;
    const ec = await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-384'},false,['sign','verify']);
    const publicKeys: LocalPublicKeys = { keyId:'',kemPublicKey:base64(recipient.publicKey),
      mlDsaPublicKey:base64(signer.publicKey),ecdsaPublicKey:base64(new Uint8Array(await crypto.subtle.exportKey('spki',ec.publicKey))) };
    publicKeys.keyId = await fingerprint(publicKeys);
    const encapsulated = kem.encapsulate(recipient.publicKey); shared = encapsulated.sharedSecret;
    const id = crypto.randomUUID();
    const meta: LocalHeader = {format:LOCAL_ARCHIVE_FORMAT,suite:LOCAL_ARCHIVE_SUITE,ownerId:1,
      recordId:id,revision:1,previousDigest:GENESIS,keyId:publicKeys.keyId,
      kemCiphertext:base64(encapsulated.cipherText),salt:base64(crypto.getRandomValues(new Uint8Array(32))),
      nonce:base64(crypto.getRandomValues(new Uint8Array(12)))};
    const aes = await contentKey(shared,meta); plaintext = utf8(JSON.stringify(document));
    const ciphertext = base64(new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:decode(meta.nonce,12),
      additionalData:utf8(JSON.stringify(header(meta))),tagLength:128},aes,plaintext)));
    const message = signed({...meta,ciphertext});
    const mlDsaSignature = base64(ml_dsa87.sign(message,signer.secretKey));
    const ecdsaSignature = base64(lowSEcdsa(new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-384'},ec.privateKey,message))));
    const envelope = canonicalEnvelope({...meta,ciphertext,mlDsaSignature,ecdsaSignature});
    const key: RecoveryKey = {format:'luqi.archive.local-key.v1',id,digest:await sha384(envelope),publicKeys,kemSecretKey:base64(recipient.secretKey)};
    recoveryPlain = utf8(JSON.stringify(key));
    const recoveryMeta = {format:RECOVERY_FORMAT,id,kdf:RECOVERY_KDF,salt:base64(crypto.getRandomValues(new Uint8Array(16))),
      nonce:base64(crypto.getRandomValues(new Uint8Array(12)))};
    const protect = await recoveryKey(passphrase,recoveryMeta.salt);
    const recoveryCiphertext = base64(new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:decode(recoveryMeta.nonce,12),
      additionalData:recoveryAad(recoveryMeta),tagLength:128},protect,recoveryPlain)));
    const recoveryFile = JSON.stringify({...recoveryMeta,ciphertext:recoveryCiphertext});
    const result = validatedBundle({id,envelope,recoveryFile});
    const restored = await openLocalArchive(envelope,recoveryFile,passphrase);
    if (restored.title !== document.title || restored.text !== document.text) archiveError();
    return result;
  } catch { return archiveError(); }
  finally {kemSecret?.fill(0);signingSecret?.fill(0);shared?.fill(0);recoveryPlain?.fill(0);plaintext?.fill(0);}
}
