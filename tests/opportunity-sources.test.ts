import {describe,it,expect} from 'vitest';
import {ZA_OPPORTUNITY_SOURCES,PROVINCES,COUNTRY_ANCHORS,CATEGORIES,deadlineState,matchOpportunitySources,detectOpportunityIntent} from '../src/lib/opportunity-sources';
describe('free South African opportunity source registry',()=>{
 it('keeps official sources grounded without invented job availability',()=>{
   expect(ZA_OPPORTUNITY_SOURCES.length).toBeGreaterThanOrEqual(12);
   const ids=new Set(),hosts=new Set(['www.gov.za','www.dpsa.gov.za','www.labour.gov.za','www.nyda.gov.za','sayouth.datafree.co','www.nrf.ac.za','www.nsfas.org.za','www.education.gov.za','www.dsbd.gov.za','www.nac.org.za']);
   for(const s of ZA_OPPORTUNITY_SOURCES){
     expect(ids.has(s.id)).toBe(false);ids.add(s.id);
     const u=new URL(s.url);expect(u.protocol).toBe('https:');expect(hosts.has(u.hostname)).toBe(true);
     expect(u.username+u.password).toBe('');expect(s.reviewedOn).toBe('2026-10-28');
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
