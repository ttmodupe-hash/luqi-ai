import {describe,it,expect} from 'vitest';
import {TOWNSHIP_GOALS,TOWNSHIP_SECTORS,TOWNSHIP_OFFICIAL_SOURCES,
 buildTownshipActionPlan,townshipActionPlanText,isTownshipReviewFresh} from '../src/lib/township-economy';
describe('township economy and rural microenterprise original-source support',()=>{
 it('does not conflate programme announcement with an open grant or funding approval',()=>{
  const trep=TOWNSHIP_OFFICIAL_SOURCES.find(x=>x.id==='trep-2026')!;
  expect(trep.kind).toBe('funding-announcement');
  expect(trep.status).toBe('confirm-current-window');
  expect(trep.summary).toMatch(/up to R3 million/);
  expect(trep.summary).toMatch(/5% interest/);
  expect(trep.summary).toMatch(/NOT establish that applications are currently open/);
  const spaza=TOWNSHIP_OFFICIAL_SOURCES.find(x=>x.id==='spaza-fund')!;
  expect(spaza.summary).toMatch(/not assume an open application round/i);
  expect(spaza.summary).toMatch(/not.*licensing/i);
 });
 it('holds only official HTTPS link sources and distinct support types',()=>{
  const hosts=new Set(['www.dsbd.gov.za','www.gov.za','www.cipc.co.za','www.etenders.gov.za','www.nyda.gov.za']);
  expect(TOWNSHIP_OFFICIAL_SOURCES.length).toBeGreaterThanOrEqual(8);
  for(const s of TOWNSHIP_OFFICIAL_SOURCES){
   const u=new URL(s.url);
   expect(u.protocol).toBe('https:');expect(hosts.has(u.hostname)).toBe(true);
   expect(u.username+u.password+u.hash).toBe('');
  }
  expect(TOWNSHIP_SECTORS).toHaveLength(8);
  expect(TOWNSHIP_GOALS).toHaveLength(5);
 });
 it('creates a relevant device-local checklist without ID or financial account data',()=>{
  expect(buildTownshipActionPlan('food','licence','City of Tshwane Metropolitan Municipality').join(' '))
   .toMatch(/Certificate of Acceptability/);
  expect(buildTownshipActionPlan('trade','market').join(' ')).toMatch(/approved pitches/);
  expect(buildTownshipActionPlan('spaza','funding').join(' ')).toMatch(/repayable loans/);
  expect(buildTownshipActionPlan('artisan','register').join(' ')).toMatch(/industry registration/);
  const result=townshipActionPlanText('spaza','funding','City of Ekurhuleni');
  expect(result).toMatch(/City of Ekurhuleni/);
  expect(result).toMatch(/not a funding award or a licence/i);
  expect(result).toContain('https://www.dsbd.gov.za/');
  expect(result).not.toMatch(/we have submitted|guaranteed approval/i);
 });
 it('expires static source review independently of the daily owner monitor',()=>{
  expect(isTownshipReviewFresh(new Date('2026-11-02T12:00:00+02:00'))).toBe(true);
  expect(isTownshipReviewFresh(new Date('2026-11-06T00:00:00+02:00'))).toBe(false);
 });
});
