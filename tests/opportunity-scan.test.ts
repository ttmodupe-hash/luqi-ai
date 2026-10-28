import {describe,it,expect} from 'vitest';
import {SCOUT_TARGETS,scanOfficialOpportunitySources,opportunityWatch,clearOpportunityScoutCacheForTest} from '../api/opportunity-scan';
describe('safe official opportunity watcher',()=>{
 it('only reaches fixed official domains, cannot accept arbitrary URL or perform provider calls',async()=>{
  const urls:string[]=[];
  const mock=async(input:RequestInfo|URL,init?:RequestInit)=>{
   urls.push(String(input));expect(init?.redirect).toBe('error');expect(init?.credentials).toBe('omit');
   return new Response('<html>Public Service Vacancy Circular No. 38 of 2026</html>',{status:200,headers:{'content-type':'text/html'}});
  };
  const result=await scanOfficialOpportunitySources(mock as typeof fetch,new Date('2026-10-28T16:00:00+02:00'));
  expect(result.sources).toHaveLength(3);
  expect(urls).toEqual(SCOUT_TARGETS.map(x=>x.url));
  expect(result.scope).toBe('publisher-pages-only');
  expect(result.sources[0].publication).toBe('Public Service Vacancy Circular 38 of 2026');
  expect(result.sources.every(x=>x.status==='reachable')).toBe(true);
 });
 it('fails closed on redirects, large documents and failed upstream without claiming jobs',async()=>{
  const result=await scanOfficialOpportunitySources((async()=>{
    return new Response('<html>'+ 'x'.repeat(193000)+'</html>',{headers:{'content-type':'text/html'}});
  }) as typeof fetch,new Date('2026-10-28T16:00:00+02:00'));
  expect(result.sources.every(x=>x.status==='unavailable')).toBe(true);
  expect(JSON.stringify(result)).not.toMatch(/openings|vacancies found|jobs available/i);
 });
 it('exposes only a read-only route with no user-supplied arbitrary scan targets',async()=>{
  expect((await opportunityWatch.request('/private')).status).toBe(404);
  expect((await opportunityWatch.request('/',{method:'POST',body:'{}'})).status).toBe(404);
  clearOpportunityScoutCacheForTest();
 });
});
