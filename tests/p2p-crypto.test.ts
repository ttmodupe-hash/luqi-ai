import { webcrypto } from 'node:crypto';
import { beforeEach,afterEach,describe,it,expect,vi } from 'vitest';
import { sealMessage,openMessage,circleKey,newSecret,newSalt,vaultKey,encryptVault,decryptVault,encode64,decode64,saveEnvelope,readEnvelope,vaultOwner,P2P_STORAGE_KEY } from '../src/lib/p2p-crypto';
const id='a8175721-40df-4c7a-a928-de2c591b1583',room='a8175721-40df-4c7a-a928-de2c591b1584';
const meta={messageId:id,circleId:room,senderId:7,recipientId:8,timestamp:'2026-10-27T15:00:00.000Z'};
beforeEach(()=>vi.stubGlobal('crypto',webcrypto));afterEach(()=>vi.unstubAllGlobals());
describe('real browser cryptography, without provider calls',()=>{
 it('encrypts and decrypts Unicode, with a fresh 96-bit nonce for every message',async()=>{
  const key=await circleKey(newSecret(),room),text='Dumelang 🌍 Sawubona — private message';
  const a=await sealMessage(key,meta,text),b=await sealMessage(key,{...meta,messageId:crypto.randomUUID()},text);
  expect(await openMessage(key,a)).toBe(text);expect(a.iv).not.toBe(b.iv);expect(decode64(a.iv)).toHaveLength(12);
  expect(JSON.stringify(a)).not.toContain(text);expect(a.ciphertext).not.toBe(b.ciphertext);
 });
 it('rejects a changed sender, recipient, circle, timestamp, nonce, ciphertext or key',async()=>{
  const key=await circleKey(newSecret(),room),packet=await sealMessage(key,meta,'Secret evidence');
  for(const change of [{senderId:9},{recipientId:9},{circleId:crypto.randomUUID()},{timestamp:'2026-10-27T15:01:00.000Z'},
    {iv:encode64(new Uint8Array(12))},{ciphertext:packet.ciphertext.slice(0,-3)+'AAA'}])await expect(openMessage(key,{...packet,...change})).rejects.toThrow();
  await expect(openMessage(await circleKey(newSecret(),room),packet)).rejects.toThrow();
 });
 it('stores only an encrypted owner-scoped vault, including private keys, blocks, reports and text',async()=>{
  const salt=newSalt(),key=await vaultKey('Separate-Strong-Vault-Passphrase!',salt),owner=await vaultOwner('one@example.invalid');
  const payload={secret:newSecret(),text:'Private report and message',blocked:[42]};
  const envelope=await encryptVault(key,encode64(salt),owner,payload);
  expect(await decryptVault(key,owner,envelope)).toEqual(payload);
  const store=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>store.set(k,v)});
  saveEnvelope(owner,envelope);const raw=store.get(P2P_STORAGE_KEY)!;
  for(const secret of [payload.secret,payload.text,'one@example.invalid','Separate-Strong-Vault-Passphrase!'])expect(raw).not.toContain(secret);
  expect(readEnvelope(owner)).toEqual(envelope);expect(readEnvelope(await vaultOwner('two@example.invalid'))).toBeNull();
  await expect(decryptVault(key,await vaultOwner('two@example.invalid'),envelope)).rejects.toThrow();
  await expect(decryptVault(await vaultKey('Different-Strong-Vault-Passphrase!',salt),owner,envelope)).rejects.toThrow();
 },15000);
 it('refuses weak passphrases, malformed secrets and a plaintext legacy cache without replacing it',async()=>{
  await expect(vaultKey('weak',newSalt())).rejects.toThrow();await expect(circleKey('KHORO-STUDY-12',room)).rejects.toThrow();
  const set=vi.fn();vi.stubGlobal('localStorage',{getItem:()=>JSON.stringify([{text:'legacy plaintext'}]),setItem:set});
  expect(()=>readEnvelope('owner')).toThrow('Unreviewed');expect(set).not.toHaveBeenCalled();
 });
});
