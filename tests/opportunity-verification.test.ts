import {describe,it,expect} from 'vitest';
import {ZA_OPPORTUNITY_SOURCES} from '../src/lib/opportunity-sources';
import {answerOpportunityQuestion,guideForOpportunity,isVerificationGuideCurrent,MAX_SOURCE_QUESTION,VERIFICATION_GUIDE_RECHECK_AFTER} from '../src/lib/opportunity-verification';
describe('Luqi reviewed verification guidance without invented application decisions',()=>{
 it('shows 4 verification checks and official steps for every reviewed source',()=>{
   for(const entry of ZA_OPPORTUNITY_SOURCES){
     const guide=guideForOpportunity(entry);
     expect(guide.sourceId).toBe(entry.id);expect(guide.officialUrl).toBe(entry.url);
     expect(guide.verify).toHaveLength(4);
     expect(guide.applicationSteps).toHaveLength(4);
     expect(guide.redFlags).toHaveLength(3);
     expect(guide.eligibility).toMatch(/Check|Read/);
   }
 });
 it('government guidance uses current Z83, post reference, advertising department not DPSA',()=>{
   const answer=answerOpportunityQuestion('circular-38','How do I apply?');
   expect(answer?.answer).toMatch(/latest official public service vacancy circular/);
   expect(answer?.answer).toMatch(/Z83/);
   expect(answer?.answer).toMatch(/advertising department, not DPSA/);
   expect(answer?.originalSource.url).toContain('dpsa.gov.za');
 });
 it('explains the specific NSFAS 2027 date without treating it as confirmed open',()=>{
   expect(answerOpportunityQuestion('nsfas-2027','Is it still open?')?.answer).toMatch(/2026-10-31/);
   expect(answerOpportunityQuestion('nsfas-2027','Is it still open?')?.answer).toMatch(/not proof the portal is accepting/);
   expect(answerOpportunityQuestion('nsfas-2027','What documents do I need?')?.answer).toMatch(/myNSFAS/);
 });
 it('keeps general directory and funding dates uncertain',()=>{
   const ans=answerOpportunityQuestion('youth-business','When is the deadline?');
   expect(ans?.answer).toMatch(/not verified a closing date/);
   expect(ans?.sourceCheckRequired).toBe(true);
   expect(ans?.answer).not.toMatch(/currently open|guaranteed eligible/);
 });
 it('disallows unknown sources, unbounded text and stale guidance',()=>{
   expect(answerOpportunityQuestion('fake','how to apply')).toBeNull();
   expect(answerOpportunityQuestion('nyda','x'.repeat(MAX_SOURCE_QUESTION+1))).toBeNull();
   expect(answerOpportunityQuestion('nyda',{text:'What is the deadline'})).toBeNull();
   expect(VERIFICATION_GUIDE_RECHECK_AFTER).toBe('2026-11-28');
   expect(isVerificationGuideCurrent(new Date('2026-11-29T00:00:00+02:00'))).toBe(false);
   expect(answerOpportunityQuestion('nyda','How do I apply?',new Date('2026-11-29T00:00:00+02:00'))).toBeNull();
 });
});
