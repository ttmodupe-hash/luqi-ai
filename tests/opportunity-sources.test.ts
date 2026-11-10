import {describe,it,expect} from 'vitest';
import {ZA_OPPORTUNITY_SOURCES,PROVINCES,COUNTRY_ANCHORS,CATEGORIES,deadlineState,matchOpportunitySources,detectOpportunityIntent,opportunitySourceReviewState} from '../src/lib/opportunity-sources';
describe('free South African opportunity source registry',()=>{
 it('keeps official sources grounded without invented job availability',()=>{
   expect(ZA_OPPORTUNITY_SOURCES.length).toBeGreaterThanOrEqual(12);
   const ids=new Set(),hosts=new Set(['www.gov.za','www.dpsa.gov.za','www.labour.gov.za','www.nyda.gov.za','sayouth.datafree.co','www.nrf.ac.za','www.nsfas.org.za','www.education.gov.za','www.dsbd.gov.za','www.nac.org.za']);
   for(const s of ZA_OPPORTUNITY_SOURCES){
     expect(ids.has(s.id)).toBe(false);ids.add(s.id);
     const u=new URL(s.url);expect(u.protocol).toBe('https:');expect(hosts.has(u.hostname)).toBe(true);
     expect(u.username+u.password).toBe('');expect(s.reviewedOn).toBe(s.id==='circular-40'?'2026-11-06':s.id==='circular-39'?'2026-11-02':'2026-10-28');
   }
 });
 it('uses nine province choices, seven categories and only five country anchors',()=>{
   expect(PROVINCES).toHaveLength(9);expect(CATEGORIES).toHaveLength(7);expect(COUNTRY_ANCHORS).toHaveLength(5);
   expect(COUNTRY_ANCHORS.filter(s=>s.id!=='ZA').every(s=>/not yet verified/.test(s.status))).toBe(true);
 });
 it('does not advertise an expired funding notice as open',()=>{
   expect(deadlineState('2026-10-31',new Date('2026-10-28T10:00:00+02:00'))).toBe('check-current');
   expect(deadlineState('2026-10-31',new Date('2026-11-01T00:00:00+02:00'))).toBe('deadline-passed');
   expect(deadlineState(undefined,new Date())).toBe('no-deadline');
 });
 it('does not infer eligibility, identity or geographic vacancies from filters',()=>{
   expect(matchOpportunitySources('bursary','all','').some(s=>s.id==='nsfas-2027')).toBe(true);
   expect(matchOpportunitySources('all','entrepreneur','').some(s=>s.id==='youth-business')).toBe(true);
   expect(matchOpportunitySources('government','all','circular').length).toBeGreaterThan(0);
 });
});

it('routes official youth opportunity discovery but not generic study or legal queries',()=>{
  expect(detectOpportunityIntent('Luqi find government jobs in Gauteng')).toBe(true);
  expect(detectOpportunityIntent('graduate opportunities after university')).toBe(true);
  expect(detectOpportunityIntent('sponsorship opportunities for young artists')).toBe(true);
  expect(detectOpportunityIntent('I need to prepare for my maths exam')).toBe(false);
  expect(detectOpportunityIntent('Help me write a CV')).toBe(false);
  expect(detectOpportunityIntent('x'.repeat(501))).toBe(false);
});

it('takes real source verification questions into guided Luqi opportunity help',()=>{
  expect(detectOpportunityIntent('Luqi how do I apply for a government job?')).toBe(true);
  expect(detectOpportunityIntent('Which Z83 documents are required for a government vacancy?')).toBe(true);
  expect(detectOpportunityIntent('NSFAS application closing date and guidelines')).toBe(true);
  expect(detectOpportunityIntent('I am studying the history of the Z83 form')).toBe(false);
  expect(detectOpportunityIntent('Help me draft a general CV')).toBe(false);
});

it('records Circular 39 as an issuer page, not a live position or review of every post',()=>{
 const newEdition=ZA_OPPORTUNITY_SOURCES.find(s=>s.id==='circular-39')!;
 const oldEdition=ZA_OPPORTUNITY_SOURCES.find(s=>s.id==='circular-38')!;
 expect(newEdition.publishedOn).toBe('2026-10-30');
 expect(newEdition.url).toBe('https://www.dpsa.gov.za/newsroom/psvc/circular-39-of-2026/');
 expect(newEdition.deadline).toBeUndefined();
 expect(newEdition.summary).toMatch(/check the later amendments/);
 expect(oldEdition.notice).toMatch(/Circulars 39 and 40/);
 expect(opportunitySourceReviewState(newEdition,new Date('2026-11-02T07:00:00+02:00'))).toBe('reviewed');
 expect(opportunitySourceReviewState(newEdition,new Date('2026-11-07T00:00:00+02:00'))).toBe('review-overdue');
 expect(opportunitySourceReviewState(oldEdition,new Date())).toBe('not-scheduled');
 expect(opportunitySourceReviewState({...newEdition,reviewDueOn:'2026-02-30'},new Date())).toBe('invalid');
 expect(opportunitySourceReviewState(newEdition,new Date('invalid'))).toBe('invalid');
});


it('routes withdrawn DPSA references to the dated correction with expired-evidence caution',()=>{
 const current=ZA_OPPORTUNITY_SOURCES.find(s=>s.id==='circular-40');
 expect(current?.url).toBe('https://www.dpsa.gov.za/newsroom/psvc/circular-40-of-2026/');
 expect(current?.deadline).toBeUndefined();
 for(const reference of ['HO 2026/11/33','HO 2026/11/109','GPW26/012']){
  const hits=matchOpportunitySources('government','all',reference);
  expect(hits.map(s=>s.id)).toContain('circular-40');
  expect(hits.every(s=>s.category==='government')).toBe(true);
 }
 expect(matchOpportunitySources('bursary','all','HO 2026/11/33')).toEqual([]);
 expect(opportunitySourceReviewState(current!,new Date('2026-11-10T10:00:00+02:00'))).toBe('review-overdue');
 expect(ZA_OPPORTUNITY_SOURCES.find(s=>s.id==='circular-39')?.verifiedOn).toBe('2026-11-02');
});
