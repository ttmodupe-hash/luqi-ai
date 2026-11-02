import {describe,it,expect} from 'vitest';
import {HISTORY_LESSONS,HISTORY_SOURCES,AFRICAN_HISTORY_REVIEW_DUE,historyIsCurrent,
 historyClaims,sourcesForClaims} from '../src/lib/african-history-evidence';
describe('African-history evidence contracts',()=>{
 it('makes each claim traceable to explicit source objects',()=>{
  expect(HISTORY_LESSONS).toHaveLength(4);
  expect(new Set(HISTORY_SOURCES.map(s=>s.id)).size).toBe(HISTORY_SOURCES.length);
  for(const s of HISTORY_SOURCES){
   expect(new URL(s.url).protocol).toBe('https:');
   expect(new URL(s.url).username).toBe('');
   expect(s.passage.length).toBeGreaterThan(10);
   expect(s.lastSubstantiveCheck).toBe('2026-11-02');
   expect(s.nextReviewDue).toBe(AFRICAN_HISTORY_REVIEW_DUE);
  }
  for(const lesson of HISTORY_LESSONS){
   expect(lesson.short.length).toBeGreaterThan(70);
   expect(sourcesForClaims(lesson.claims).length).toBeGreaterThan(0);
   for(const claim of lesson.claims){
    expect(claim.uncertainty.length).toBeGreaterThan(10);
    expect(sourcesForClaims([claim]).length).toBe(claim.sourceIds.length);
   }
  }
 });
 it('keeps religious reports distinct from archaeology and museum provenance',()=>{
  expect(HISTORY_LESSONS.find(x=>x.id==='aksum')?.claims.every(c=>c.status==='attributed-tradition')).toBe(true);
  expect(HISTORY_LESSONS.find(x=>x.id==='conversion')?.claims.every(c=>c.status==='scholarly-reconstruction')).toBe(true);
  expect(HISTORY_LESSONS.find(x=>x.id==='timbuktu')?.claims.every(c=>c.status==='catalogued-object')).toBe(true);
 });
 it('fails closed on an expired, invalid or future-inconsistent device clock',()=>{
  const first=HISTORY_LESSONS[0];
  expect(historyIsCurrent(new Date('2026-11-02T08:00:00+02:00'))).toBe(true);
  expect(historyIsCurrent(new Date('2027-02-02T23:59:59+02:00'))).toBe(true);
  expect(historyIsCurrent(new Date('2027-02-03T00:00:00+02:00'))).toBe(false);
  expect(historyIsCurrent(new Date('not-a-date'))).toBe(false);
  expect(historyClaims(first,new Date('not-a-date'))).toHaveLength(0);
  expect(historyClaims(first,new Date('2027-02-03T00:00:00+02:00'))).toHaveLength(0);
  expect(sourcesForClaims(first.claims).length).toBeGreaterThan(0);
 });
});
