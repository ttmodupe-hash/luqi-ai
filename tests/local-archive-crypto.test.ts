import { beforeAll, describe, expect, it } from 'vitest';
import { webcrypto } from 'node:crypto';
import { createLocalArchive, openLocalArchive } from '../src/features/archive/archive-crypto';
import { decode, GENESIS, MAX_ARCHIVE_BYTES, MAX_RECOVERY_BYTES, validateDocument,
  validatedBundle, type LocalArchiveBundle, type RecoveryKey } from '../src/features/archive/archive-contract';
import { openPqcArchive } from '../api/security/pqcArchive';

const passphrase = 'Synthetic archive recovery phrase for tests 2026';
const document = { title: 'Synthetic supplier notes',text:'Only fixture data.\nExact Unicode: Mzansi 🇿🇦 — 𝄞 <script>not executed</script>' };
let bundle:LocalArchiveBundle;
beforeAll(async()=>{bundle=await createLocalArchive(document,passphrase);});
async function recoveryPayload(value:LocalArchiveBundle):Promise<RecoveryKey>{
  const file=JSON.parse(value.recoveryFile);
  const material=await webcrypto.subtle.importKey('raw',new TextEncoder().encode(passphrase),'PBKDF2',false,['deriveKey']);
  const key=await webcrypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt:decode(file.salt,16),iterations:310000},
    material,{name:'AES-GCM',length:256},false,['decrypt']);
  const aad=new TextEncoder().encode(JSON.stringify(['LUQI-ARCHIVE-RECOVERY-v1',file.format,file.id,file.kdf,JSON.parse(value.envelope).suite]));
  return JSON.parse(new TextDecoder().decode(await webcrypto.subtle.decrypt({name:'AES-GCM',iv:decode(file.nonce,12),
    additionalData:aad,tagLength:128},key,decode(file.ciphertext,17,10000))));
}
function flip(value:string){const bytes=Buffer.from(value,'base64');bytes[0]^=1;return bytes.toString('base64');}

describe('local archive with separately encrypted recovery custody',()=>{
  it('round-trips exact user text with no clear document, keys or passphrase in either download',async()=>{
    expect(await openLocalArchive(bundle.envelope,bundle.recoveryFile,passphrase)).toEqual(document);
    expect(validatedBundle(bundle)).toEqual(bundle);
    for(const raw of [bundle.envelope,bundle.recoveryFile]){
      expect(raw).not.toContain(document.title);expect(raw).not.toContain(document.text);expect(raw).not.toContain(passphrase);
      expect(raw).not.toContain('kemSecretKey');expect(raw).not.toContain('mlDsaSecretKey');
    }
    expect(Buffer.byteLength(bundle.envelope)).toBeLessThan(MAX_ARCHIVE_BYTES);
    expect(Buffer.byteLength(bundle.recoveryFile)).toBeLessThan(MAX_RECOVERY_BYTES);
  });
  it('interoperates with the separate native Node archive implementation using the external recovery anchor',async()=>{
    const key=await recoveryPayload(bundle);
    const raw=openPqcArchive(bundle.envelope,{ownerId:1,recordId:bundle.id,revision:1,previousDigest:GENESIS},
      {status:'active',publicKeys:key.publicKeys},decode(key.kemSecretKey,32),key.digest);
    expect(JSON.parse(raw.toString('utf8'))).toEqual(document);
    expect(Object.keys(key)).toEqual(['format','id','digest','publicKeys','kemSecretKey']);
    expect(key).not.toHaveProperty('mlDsaSecretKey');expect(key).not.toHaveProperty('ecdsaPrivateKey');
  });
  it('uses independent keys, IDs, nonces and salts for repeated copies',async()=>{
    const next=await createLocalArchive(document,passphrase);
    expect(next.id).not.toBe(bundle.id);expect(next.envelope).not.toBe(bundle.envelope);
    expect(next.recoveryFile).not.toBe(bundle.recoveryFile);
    const a=JSON.parse(next.envelope),b=JSON.parse(bundle.envelope);
    for(const name of ['keyId','kemCiphertext','salt','nonce','ciphertext'])expect(a[name]).not.toBe(b[name]);
    await expect(openLocalArchive(bundle.envelope,next.recoveryFile,passphrase)).rejects.toThrow('LOCAL_ARCHIVE_UNAVAILABLE');
  });
  it('refuses a wrong passphrase and both damaged recovery and damaged archive',async()=>{
    await expect(openLocalArchive(bundle.envelope,bundle.recoveryFile,'A different long passphrase')).rejects.toThrow('LOCAL_ARCHIVE_UNAVAILABLE');
    const recovery=JSON.parse(bundle.recoveryFile);
    for(const name of ['salt','nonce','ciphertext']){
      await expect(openLocalArchive(bundle.envelope,JSON.stringify({...recovery,[name]:flip(recovery[name])}),passphrase)).rejects.toThrow('LOCAL_ARCHIVE_UNAVAILABLE');
    }
    const envelope=JSON.parse(bundle.envelope);
    for(const name of ['kemCiphertext','salt','nonce','ciphertext','mlDsaSignature','ecdsaSignature']){
      await expect(openLocalArchive(JSON.stringify({...envelope,[name]:flip(envelope[name])}),bundle.recoveryFile,passphrase)).rejects.toThrow('LOCAL_ARCHIVE_UNAVAILABLE');
    }
  });
  it('rejects malformed, duplicate, downgraded, noncanonical and oversized files',async()=>{
    for(const raw of ['',null,{},'not json',bundle.envelope+' ',
      '{"format":"duplicate",'+bundle.envelope.slice(1),'x'.repeat(MAX_ARCHIVE_BYTES+1)]){
      await expect(openLocalArchive(raw,bundle.recoveryFile,passphrase)).rejects.toThrow('LOCAL_ARCHIVE_UNAVAILABLE');
    }
    const recovery=JSON.parse(bundle.recoveryFile),value=JSON.parse(bundle.envelope);
    for(const patch of [{kdf:'PBKDF2-1'},{format:'unknown'},{extra:'secret'},{ciphertext:'AB=='}])
      await expect(openLocalArchive(bundle.envelope,JSON.stringify({...recovery,...patch}),passphrase)).rejects.toThrow('LOCAL_ARCHIVE_UNAVAILABLE');
    for(const patch of [{suite:'AES-ONLY'},{ownerId:2},{revision:2},{publicKey:'attacker'}])
      await expect(openLocalArchive(JSON.stringify({...value,...patch}),bundle.recoveryFile,passphrase)).rejects.toThrow('LOCAL_ARCHIVE_UNAVAILABLE');
    await expect(openLocalArchive(bundle.envelope,'x'.repeat(MAX_RECOVERY_BYTES+1),passphrase)).rejects.toThrow('LOCAL_ARCHIVE_UNAVAILABLE');
  });
  it('enforces plaintext byte bounds, strict fields and exact passphrase semantics',async()=>{
    for(const input of [{title:'',text:'x'},{title:'a',text:''},{title:'a'.repeat(121),text:'x'},
      {title:'a',text:'日'.repeat(9000)},{title:'a',text:'x',extra:'not allowed'}])
      expect(()=>validateDocument(input)).toThrow('LOCAL_ARCHIVE_UNAVAILABLE');
    for(const secret of ['short','x'.repeat(129)])
      await expect(createLocalArchive(document,secret)).rejects.toThrow('LOCAL_ARCHIVE_UNAVAILABLE');
    const spaceSecret='  Exact passphrase spaces matter  ';
    const value=await createLocalArchive(document,spaceSecret);
    await expect(openLocalArchive(value.envelope,value.recoveryFile,spaceSecret.trim())).rejects.toThrow('LOCAL_ARCHIVE_UNAVAILABLE');
    expect(await openLocalArchive(value.envelope,value.recoveryFile,spaceSecret)).toEqual(document);
    const full={title:'Boundary',text:'a'.repeat(20000)};
    const large=await createLocalArchive(full,passphrase);
    expect(await openLocalArchive(large.envelope,large.recoveryFile,passphrase)).toEqual(full);
  });
});
