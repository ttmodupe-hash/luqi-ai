import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {auditSeal,sealEvidence,eligibility} from '../api/services/sovereignP2P';
beforeEach(()=>vi.stubEnv('LUQI_P2P_REPORT_KEY',Buffer.alloc(32,29).toString('base64url')));afterEach(()=>vi.unstubAllEnvs());
it('binds report identity, reason, evidence, timestamp and previous link to a keyed audit seal',()=>{
 const r={id:crypto.randomUUID(),reporterId:7,offenderId:8,messageId:crypto.randomUUID(),reason:'HARASSMENT',timestamp:new Date().toISOString(),previousSeal:'0'.repeat(64),sealedEvidence:sealEvidence('Private selected excerpt')};
 const a=auditSeal(r);expect(auditSeal({...r,sealedEvidence:{tag:r.sealedEvidence.tag,ciphertext:r.sealedEvidence.ciphertext,iv:r.sealedEvidence.iv}})).toBe(a);expect(a).toMatch(/^[a-f0-9]{64}$/);expect(JSON.stringify(r)).not.toContain('Private selected excerpt');
 for(const change of [{id:crypto.randomUUID()},{reporterId:9},{offenderId:9},{reason:'FAKE_AGENT'},{previousSeal:'1'.repeat(64)},{sealedEvidence:sealEvidence('different')}])expect(auditSeal({...r,...change})).not.toBe(a);
 vi.stubEnv('LUQI_P2P_REPORT_KEY',Buffer.alloc(32,30).toString('base64url'));expect(auditSeal(r)).not.toBe(a);
});
it('never treats a normal account, a display name or a self-declared role input as verified age/cohort',()=>{
 expect(eligibility('user')).toBe('verification_needed');expect(eligibility('admin')).toBe('verification_needed');expect(eligibility('p2p_student:school-a')).toBe('verified_student');expect(eligibility('p2p_adult')).toBe('verified_adult');
});
it('fails closed without the dedicated report encryption key',()=>{vi.stubEnv('LUQI_P2P_REPORT_KEY','');expect(()=>sealEvidence('private')).toThrow('P2P_UNAVAILABLE')});
