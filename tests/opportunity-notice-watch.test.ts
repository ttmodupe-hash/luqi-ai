import {describe,it,expect} from 'vitest';
import {VERIFIED_GOVERNMENT_ADVERTS} from '../src/lib/government-job-notices';
import{probeIndividualAdvert,scanIndividualAdverts,verifiedDateVariants}from'../api/services/opportunityNoticeWatcher';
const job=VERIFIED_GOVERNMENT_ADVERTS.find(x=>x.reference==='HR4/4/4/09/47')!;
describe('bounded official individual-post source checks',()=>{
 it('only checks curated official sources and verifies BOTH reference and deadline text',async()=>{
  const calls:string[]=[];
  const fetcher=async(input:RequestInfo|URL,init?:RequestInit)=>{
   calls.push(String(input));
   expect(init?.redirect).toBe('error');expect(init?.credentials).toBe('omit');
   return new Response('<html><h1>Administrative Clerk</h1>REF NO: HR4/4/4/09/47<br>CLOSING DATE: 06 November 2026</html>',{
     headers:{'content-type':'text/html'}
   });
  };
  const got=await probeIndividualAdvert(job,fetcher as typeof fetch,new Date('2026-10-29T07:00:00Z'));
  expect(got.state).toBe('reference-and-deadline-found');
  expect(got.note).toBe('text_evidence_only_not_live_availability');
  expect(calls).toEqual([job.sourceUrl]);
 });
 it('fails closed when reference or date is missing or source is too large',async()=>{
  const missing=await probeIndividualAdvert(job,(async()=>new Response('<html>06 November 2026</html>',{headers:{'content-type':'text/html'}})) as typeof fetch);
  expect(missing.state).toBe('content-unconfirmed');
  const large=await probeIndividualAdvert(job,(async()=>new Response('x'.repeat(257000),{headers:{'content-type':'text/html'}})) as typeof fetch);
  expect(large.state).toBe('publisher-unavailable');
 });
 it('withdrawn jobs never produce actionable source status or make an HTTP request',async()=>{
  const calls:string[]=[];
  const result=await scanIndividualAdverts((async(url:RequestInfo|URL)=>{
   calls.push(String(url));
   return new Response('<html>HR4/4/4/09/47 06 November 2026</html>',{headers:{'content-type':'text/html'}});
  }) as typeof fetch,new Date('2026-10-29T07:00:00Z'));
  expect(result.checks.length).toBe(VERIFIED_GOVERNMENT_ADVERTS.length);
  expect(result.checks.find(x=>x.reference==='HR4/4/1/13')?.state).toBe('withdrawn');
  expect(calls).not.toContain(VERIFIED_GOVERNMENT_ADVERTS.find(j=>j.reference==='HR4/4/1/13')?.sourceUrl);
  expect(result.scope).toBe('fixed_official_individual_adverts_only');
 });
 it('detects source timeout and enforces safe status, not fictitious job opening',async()=>{
  const r=await probeIndividualAdvert(job,(async()=>{throw Error('host unavailable');}) as typeof fetch);
  expect(r.state).toBe('publisher-unavailable');
  expect(JSON.stringify(r)).not.toMatch(/applications open|eligible|job is open/i);
  expect(verifiedDateVariants('2026-11-06')).toContain('06November2026');
 });

 it('matches a municipality date abbreviated as Nov without declaring recruitment live',async()=>{
  const kouga=VERIFIED_GOVERNMENT_ADVERTS.find(x=>x.reference==='263/2026')!;
  const r=await probeIndividualAdvert(kouga,(async()=>new Response(
    '<html>KOUGA MUNICIPALITY NOTICE NO. 263/2026. Closing Date: 06 Nov 2026</html>',
    {headers:{'content-type':'text/html'}})) as typeof fetch);
  expect(r.state).toBe('reference-and-deadline-found');
  expect(r.note).toBe('text_evidence_only_not_live_availability');
  expect(verifiedDateVariants('2026-11-06')).toContain('06Nov2026');
 });
 it('does not promote a learnership directory date to a verified full advert',async()=>{
  const learning=VERIFIED_GOVERNMENT_ADVERTS.find(x=>x.reference==='DCSSL/05/2026')!;
  const r=await probeIndividualAdvert(learning,(async()=>new Response(
   '<html>Traffic Learnership in Department of Community Safety. Closing date: 30 October, 2026. Download advert.</html>',
   {headers:{'content-type':'text/html'}})) as typeof fetch);
  expect(r.state).toBe('content-unconfirmed');
 });
});
