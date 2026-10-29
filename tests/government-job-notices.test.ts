import {describe,it,expect} from 'vitest';
import{VERIFIED_GOVERNMENT_ADVERTS,assessGovernmentJobStatus,matchGovernmentAdverts,isJobNoticeReviewFresh}from '../src/lib/government-job-notices';
describe('source-backed individual South African government adverts',()=>{
it('carries unique exact references, primary HTTPS job URLs, source review dates, and actual provinces',()=>{
 const refs=new Set<string>();const ids=new Set<string>();
 const allowed=new Set(['www.labour.gov.za','www.cogta.gov.za','www.kouga.gov.za','www.mpg.gov.za']);
 expect(VERIFIED_GOVERNMENT_ADVERTS.length).toBeGreaterThanOrEqual(10);
 for(const j of VERIFIED_GOVERNMENT_ADVERTS){
   expect(ids.has(j.id)).toBe(false);ids.add(j.id);
   expect(refs.has(j.reference)).toBe(false);refs.add(j.reference);
   expect(allowed.has(new URL(j.sourceUrl).hostname)).toBe(true);
   expect(new URL(j.sourceUrl).protocol).toBe('https:');
   expect(j.reviewedOn).toBe('2026-10-29');
   expect(j.requirements.length).toBeGreaterThan(42);
   expect((j.annualSalaryZar!==undefined&&j.annualSalaryZar>0)!==(j.monthlyPayZar!==undefined&&j.monthlyPayZar>0)).toBe(true);
   expect(j.closingDate).toMatch(/^2026-(10|11)-\d\d$/);
 }
});
it('never calls a dated advert OPEN and hides a withdrawn position even when deadline is future',()=>{
 const withdrawn=VERIFIED_GOVERNMENT_ADVERTS.find(x=>x.reference==='HR4/4/1/13')!;
 const future=new Date('2026-10-29T09:00:00+02:00');
 expect(assessGovernmentJobStatus(withdrawn,future)).toBe('withdrawn');
 expect(withdrawn.withdrawnEvidenceUrl).toContain('withdrawal');
 expect(matchGovernmentAdverts({province:'EC',level:'all',includeHistory:false,query:'',now:future}).every(x=>x.id!==withdrawn.id)).toBe(true);
 expect(matchGovernmentAdverts({province:'EC',level:'all',includeHistory:true,query:'',now:future}).some(x=>x.id===withdrawn.id)).toBe(true);
});
it('respects physical and online deadlines without inventing eligibility or locations',()=>{
 const j=VERIFIED_GOVERNMENT_ADVERTS.find(x=>x.id==='labour-gp-carletonville-clerk')!;
 expect(assessGovernmentJobStatus(j,new Date('2026-11-06T16:01:00+02:00'))).toBe('published-check-original');
 expect(assessGovernmentJobStatus(j,new Date('2026-11-07T00:00:00+02:00'))).toBe('deadline-passed');
 expect(matchGovernmentAdverts({province:'GP',level:'grade12',query:'clerk',includeHistory:false,now:new Date('2026-10-29T10:00:00+02:00')}).map(x=>x.id)).toContain(j.id);
 const ict=VERIFIED_GOVERNMENT_ADVERTS.find(x=>x.id==='labour-mp-ict')!;
 expect(ict.city).toBeNull();
 expect(ict.centre).toContain('Mpumalanga');
});
it('expires stored review freshness without treating last scrape as open',()=>{
 const j=VERIFIED_GOVERNMENT_ADVERTS[0];
 expect(isJobNoticeReviewFresh(j,new Date('2026-10-29T09:00:00+02:00'))).toBe(true);
 expect(isJobNoticeReviewFresh(j,new Date('2026-11-03T09:00:00+02:00'))).toBe(false);
 expect(assessGovernmentJobStatus(j,new Date('2027-01-01T09:00:00+02:00'))).toBe('deadline-passed');
});

it('carries official learnership and municipal internship in the correct provinces and handles expiry',()=>{
 const kouga=VERIFIED_GOVERNMENT_ADVERTS.find(x=>x.reference==='263/2026')!;
 const learn=VERIFIED_GOVERNMENT_ADVERTS.find(x=>x.reference==='DCSSL/05/2026')!;
 const ies=VERIFIED_GOVERNMENT_ADVERTS.find(x=>x.reference==='HR4/4/4/08/04')!;
 expect(kouga.province).toBe('EC');expect(kouga.monthlyPayZar).toBe(10000);
 expect(learn.province).toBe('MP');expect(learn.monthlyPayZar).toBe(5000);
 expect(ies.province).toBe('GP');expect(ies.annualSalaryZar).toBe(280278);
 expect(kouga.publishedOn).toBe('2026-10-28');
 expect(assessGovernmentJobStatus(kouga,new Date('2026-11-06T12:01:00+02:00'))).toBe('deadline-passed');
 expect(assessGovernmentJobStatus(learn,new Date('2026-10-31T00:00:00+02:00'))).toBe('deadline-passed');
 expect(matchGovernmentAdverts({province:'MP',level:'grade12',query:'DCSSL',includeHistory:false,now:new Date('2026-10-29T12:00:00+02:00')}).map(x=>x.reference)).toContain('DCSSL/05/2026');
});
});
