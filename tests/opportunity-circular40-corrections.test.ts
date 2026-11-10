import {describe,it,expect} from 'vitest';
import {ZA_OPPORTUNITY_SOURCES,matchOpportunitySources,opportunitySourceReviewState} from '../src/lib/opportunity-sources';

const src=(id:string)=>ZA_OPPORTUNITY_SOURCES.find(x=>x.id===id)!;

describe('DPSA Circular 40 front-page correction',()=>{
 it('shows the original newly published issuer edition without calling it a live opening',()=>{
  const c=src('circular-40');
  expect(c.publishedOn).toBe('2026-11-06');
  expect(c.verifiedOn).toBe('2026-11-06');
  expect(c.reviewedOn).toBe('2026-11-06');
  expect(c.url).toBe('https://www.dpsa.gov.za/newsroom/psvc/circular-40-of-2026/');
  expect(new URL(c.url).protocol).toBe('https:');
  expect(c.deadline).toBeUndefined();
  expect(c.summary).toMatch(/do not establish that every advertised position is still open/);
  expect(c.evidenceSection).toMatch(/AMENDMENTS only/);
 });
 it('matches every withdrawn Correctional Services reference to the correction, not an invented open job',()=>{
  for(const ref of ['HO 2026/11/33','HO 2026/11/82','HO 2026/11/83','HO 2026/11/87','HO 2026/11/109']){
   expect(src('circular-40').notice).toContain(ref);
   expect(matchOpportunitySources('government','all',ref).map(s=>s.id)).toContain('circular-40');
  }
  for(const ref of ['GPW26/011','GPW26/012'])expect(matchOpportunitySources('government','all',ref).map(s=>s.id)).toContain('circular-40');
  expect(src('circular-40').notice).toContain('23 November 2026 at 16:00 SAST (walk-in) or 23:59 SAST (online)');
 });
 it('preserves older evidence dates and fails closed when the new narrow review expires',()=>{
  expect(src('circular-39').verifiedOn).toBe('2026-11-02');
  expect(src('circular-39').reviewDueOn).toBe('2026-11-06');
  expect(src('circular-38').reviewedOn).toBe('2026-10-28');
  expect(opportunitySourceReviewState(src('circular-40'),new Date('2026-11-06T15:00:00+02:00'))).toBe('reviewed');
  expect(opportunitySourceReviewState(src('circular-40'),new Date('2026-11-10T00:00:00+02:00'))).toBe('review-overdue');
  expect(opportunitySourceReviewState({...src('circular-40'),verifiedOn:undefined},new Date())).toBe('invalid');
 });
 it('keeps restricted/safe results and out-of-scope searches unchanged',()=>{
  expect(matchOpportunitySources('bursary','all','HO 2026/11/33')).toEqual([]);
  expect(matchOpportunitySources('government','entrepreneur','GPW26/011')).toEqual([]);
  expect(matchOpportunitySources('government','all','totally-unrelated-circular-value')).toEqual([]);
 });
});
