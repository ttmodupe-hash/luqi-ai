import {describe,it,expect} from 'vitest';
import {TENDER_OFFICIAL_SOURCES,CURATED_TENDER_NOTICES,filterTenders,tenderStatus,tenderReviewFresh,detectTenderIntent}from '../src/lib/tender-sources';
describe('Luqi sourced tender discovery',()=>{
it('links only to original approved government sources with dated evidence',()=>{
 const hosts=new Set(['www.etenders.gov.za','www.gov.za','www.tshwane.gov.za','www.ekurhuleni.gov.za','www.gcis.gov.za','www.dsbd.gov.za','www.csd.gov.za','ocpo.treasury.gov.za']);
 const ids=new Set<string>();
 for(const source of TENDER_OFFICIAL_SOURCES){const u=new URL(source.url);
   expect(u.protocol).toBe('https:');expect(hosts.has(u.hostname)).toBe(true);}
 for(const v of CURATED_TENDER_NOTICES){
   expect(ids.has(v.id)).toBe(false);ids.add(v.id);
   expect(hosts.has(new URL(v.officialUrl).hostname)).toBe(true);
   expect(v.sourceReviewedOn).toBe('2026-10-29');
   expect(v.deadlineDate).toMatch(/^2026-/);
   expect(v.deadlineTimeSast).toMatch(/^\d\d:\d\d$/);
 }
 expect(CURATED_TENDER_NOTICES.length).toBeGreaterThanOrEqual(7);
});
it('never calls a notice OPEN, filters passed deadlines and flags past compulsory briefings',()=>{
 const at=new Date('2026-10-29T09:00:00+02:00');
 const mandatory=CURATED_TENDER_NOTICES.find(x=>x.id==='tshwane-gpm04')!;
 expect(tenderStatus(mandatory,at)).toBe('mandatory-briefing-review');
 const result=filterTenders({province:'GP',query:'',includeHistory:false,now:at});
 expect(result.some(x=>x.id===mandatory.id)).toBe(false);
 expect(filterTenders({province:'GP',query:'',includeHistory:true,now:at}).some(x=>x.id===mandatory.id)).toBe(true);
 expect(tenderStatus(CURATED_TENDER_NOTICES[0],new Date('2026-11-03T00:00:00+02:00'))).toBe('past-deadline');
});
it('limits matches to provincial/local evidence without inventing exact tender numbers',()=>{
 const dsbd=CURATED_TENDER_NOTICES.find(x=>x.id==='dsbd-msme-market-access')!;
 expect(dsbd.reference).toBeNull();
 const result=filterTenders({province:'GP',query:'bond arranger',includeHistory:false,now:new Date('2026-10-29T09:00:00+02:00')});
 expect(result.map(x=>x.reference)).toEqual(['PS-F 02-2027']);
 expect(tenderReviewFresh(dsbd,new Date('2026-11-04T10:00:00+02:00'))).toBe(false);
});
it('detects tender intents without routing generic writing/study or job questions',()=>{
 expect(detectTenderIntent('Find tenders in Gauteng')).toBe(true);
 expect(detectTenderIntent('Help complete SBD 4 bid documents')).toBe(true);
 expect(detectTenderIntent('Help me write my CV')).toBe(false);
 expect(detectTenderIntent('Find government jobs for youth')).toBe(false);
 expect(detectTenderIntent('x'.repeat(501))).toBe(false);
});
});
