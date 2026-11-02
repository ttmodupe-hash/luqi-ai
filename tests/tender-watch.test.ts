import {describe,it,expect} from'vitest';
import{TENDER_MONITOR_TARGETS,probeTenderTarget,scanCuratedTenders,tenderWatch,clearTenderMonitorForTests}from'../api/tender-watch';
const first=TENDER_MONITOR_TARGETS.find(x=>x.id==='ekurhuleni-ps-f-02')!;
describe('Luqi read-only tender publisher watcher',()=>{
it('never takes arbitrary URLs or applicants and verifies only reference/date text',async()=>{
 const calls:string[]=[];
 const fetcher=async(url:RequestInfo|URL,init?:RequestInit)=>{
  calls.push(String(url));expect(init?.credentials).toBe('omit');expect(init?.redirect).toBe('error');
  return new Response('<html>Bid Number PS-F 02-2027 Closing Date 05 November 2026</html>',{headers:{'content-type':'text/html'}});
 };
 const result=await probeTenderTarget(first,fetcher as typeof fetch,new Date('2026-10-29T09:00:00+02:00'));
 expect(result.state).toBe('reference-visible');expect(result.note).toBe('not_live_bid_availability');
 expect(calls).toEqual([first.url]);
});
it('does not infer active tenders from missing references or working listings',async()=>{
 const result=await probeTenderTarget(TENDER_MONITOR_TARGETS.find(x=>x.id==='dsbd-msme-market-access')!,
  (async()=>new Response('<html>Listing available</html>',{headers:{'content-type':'text/html'}})) as typeof fetch);
 expect(result.state).toBe('listing-only');
 expect(JSON.stringify(result)).not.toMatch(/active tender|accepted for bidding/i);
});
it('fails closed for oversized pages and missing deadlines',async()=>{
 const r=await probeTenderTarget(first,(async()=>new Response('x'.repeat(193000),{headers:{'content-type':'text/html'}})) as typeof fetch);
 expect(r.state).toBe('publisher-unavailable');
 const s=await probeTenderTarget(first,(async()=>new Response('<html>PS-F 02-2027</html>',{headers:{'content-type':'text/html'}})) as typeof fetch);
 expect(s.state).toBe('content-unconfirmed');
});
it('returns fixed-sized snapshots and rejects query-parameter scanning requests',async()=>{
 const result=await scanCuratedTenders((async()=>new Response('<html>Not indexed</html>',{headers:{'content-type':'text/html'}})) as typeof fetch,new Date('2026-10-29T09:00:00+02:00'));
 expect(result.notices).toHaveLength(TENDER_MONITOR_TARGETS.length);
 expect(result.scope).toBe('fixed_official_tender_pages');
 expect((await tenderWatch.request('/?url=https://attacker.invalid')).status).toBe(400);
 expect((await tenderWatch.request('/',{method:'POST'})).status).toBe(404);
 clearTenderMonitorForTests();
});
});
