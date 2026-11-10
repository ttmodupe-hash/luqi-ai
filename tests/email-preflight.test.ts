import { expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { emailPreflight, type EmailInput } from '../src/features/launch/email-preflight';
vi.stubGlobal('crypto',webcrypto);
const input=(records:string[],extra:Partial<EmailInput>={}):EmailInput=>({domain:'example.org',records:records.map(content=>({name:'example.org',content})),includeDomain:'_spf.provider.example',selector:'mail',keyType:'ed25519',publicKey:btoa(String.fromCharCode(...new Uint8Array(32).fill(3))),policy:'none',...extra});

it('scopes records to the domain, preserves the fail qualifier and inserts before all',async()=>{
 const result=await emailPreflight(input(['v=spf1 ip4:192.0.2.0/24 -all'],{records:[{name:'other.example',content:'v=spf1 include:other.example -all'},{name:'example.org',content:'v=spf1 ip4:192.0.2.0/24 -all'}]}));
 expect(result.afterSpf).toBe('v=spf1 ip4:192.0.2.0/24 include:_spf.provider.example -all');expect(result.minimumDnsTerms).toBe(1);
 expect(result.unresolved).toContain('_spf.provider.example');expect(result.warnings.join(' ')).toContain('not an RFC compliance verdict');
 expect(result.dkimRecord?.content).toContain('k=ed25519');expect(result.dmarcRecord?.content).toBe('v=DMARC1; p=none; adkim=r; aspf=r');
});
it('handles qualified includes idempotently and counts DNS-querying negative mechanisms',async()=>{
 expect((await emailPreflight(input(['v=spf1 +include:_spf.provider.example -all']))).spfAction).toBe('no-change');
 const negative=await emailPreflight(input(['v=spf1 -include:blocked.example a mx ~all']));expect(negative.minimumDnsTerms).toBe(4);expect(negative.afterSpf).toContain('include:_spf.provider.example ~all');
});
it('holds duplicate SPF, all-pass, redirects, quoted chunks, invalid IP and malformed DNS mechanisms',async()=>{
 for(const records of [
  ['v=spf1 -all','v=spf1 ~all'],['v=spf1 +all'],['v=spf1 all'],['v=spf1 redirect=old.example'],
  ['"v=spf1 include:old.example ~all"'],['v=spf1 ip4:999.1.1.1 -all'],['v=spf1 a//// ~all'],['v=spf1 -all include:late.example'],['v=spf1 include:%{d} -all'],
 ]){const result=await emailPreflight(input(records));expect(result.afterSpf).toBeNull();expect(result.issues.length).toBeGreaterThan(0);}
 const excessive=await emailPreflight(input(['v=spf1 '+Array.from({length:10},(_,i)=>'include:p'+i+'.example').join(' ')+' -all']));expect(excessive.minimumDnsTerms).toBe(11);expect(excessive.afterSpf).toBeNull();
});
it('checks real RSA SPKI structure without claiming signed-mail authentication',async()=>{
 const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const bytes=new Uint8Array(await crypto.subtle.exportKey('spki',pair.publicKey));const publicKey=btoa(String.fromCharCode(...bytes));
 const result=await emailPreflight(input(['v=spf1 -all'],{keyType:'rsa',publicKey}));expect(result.keyBits).toBe(2048);expect(result.dkimRecord).not.toBeNull();expect(result.warnings.join(' ')).toContain('signed mail were not verified');
 for(const key of ['-----BEGIN PRIVATE KEY----- secret','not base64','AAAA'])expect((await emailPreflight(input(['v=spf1 -all'],{keyType:'rsa',publicKey:key}))).dkimRecord).toBeNull();
});
