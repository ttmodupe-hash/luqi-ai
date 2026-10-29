import {describe,it,expect} from 'vitest';
import {VISA_DESTINATIONS,PASSPORT_NATIONALITIES,VISA_SOURCES_REVIEWED_ON,
 evaluateVisaEntry,detectVisaEntryIntent,isVisaReviewFresh,type VisaQuery} from '../src/lib/visa-entry-sources';
const travel=(overrides:Partial<VisaQuery>={}):VisaQuery=>({
 destination:'KE',passportNationality:'South Africa',purpose:'tourism',arrival:'air',
 arrivalDate:'2026-12-15',stayDays:14,...overrides
});
const during=new Date('2026-10-29T10:00:00+02:00');
describe('original-government visa source guide',()=>{
 it('has 54 distinct African nationality choices and five source-labelled destinations',()=>{
  expect(PASSPORT_NATIONALITIES).toHaveLength(54);
  expect(new Set(PASSPORT_NATIONALITIES).size).toBe(54);
  expect(PASSPORT_NATIONALITIES).toContain('South Africa');
  expect(VISA_DESTINATIONS.map(x=>x.id)).toEqual(['ZA','KE','NG','EG','CM']);
  expect(VISA_SOURCES_REVIEWED_ON).toBe('2026-10-29');
  const hosts=new Set(['eta.dha.gov.za','www.gov.za','www.dha.gov.za','etakenya.go.ke',
    'immigration.gov.ng','www.visa2egypt.gov.eg','www.diplocam.cm',
    'www.evisacam.cm','mintoul.gov.cm']);
  for(const d of VISA_DESTINATIONS){
   expect(d.sourceLinks.length).toBeGreaterThanOrEqual(2);
   for(const link of d.sourceLinks){
    const u=new URL(link.url);
    expect(u.protocol).toBe('https:');expect(hosts.has(u.hostname)).toBe(true);
    expect(u.username+u.password+u.hash).toBe('');
    expect(link.reviewedOn).toBe(VISA_SOURCES_REVIEWED_ON);
   }
  }
 });
 it('provides cautious Kenya and Egypt nationality examples, never approves a visa or entry',()=>{
  const ken=evaluateVisaEntry(travel(),during);
  expect(ken.label).toBe('dated-official-example');
  expect(ken.explanation).toMatch(/South Africa.*90 days/);
  expect(ken.summary).toMatch(/no visa or border status was retrieved/i);
  expect(ken.warnings.join(' ')).toMatch(/Entry is never guaranteed/i);
  expect(evaluateVisaEntry(travel({stayDays:91}),during).label).toBe('source-review-only');
  expect(evaluateVisaEntry(travel({purpose:'work'}),during).label).toBe('source-review-only');
  const egypt=evaluateVisaEntry(travel({destination:'EG'}),during);
  expect(egypt.explanation).toMatch(/may apply for an eVisa/);
  expect(egypt.explanation).toMatch(/not a visa-free claim/i);
 });
 it('refuses ETA permission for employment and port-based extrapolation',()=>{
  const za=evaluateVisaEntry(travel({destination:'ZA',passportNationality:'Nigeria',purpose:'work',arrival:'land'}),during);
  expect(za.explanation).toMatch(/cannot work/);
  expect(za.warnings.join(' ')).toMatch(/land or sea arrivals/);
  expect(za.sources[0].url).toBe('https://eta.dha.gov.za/');
 });
 it('expires detailed nationality examples rather than pretending to check real-time rules',()=>{
  const late=new Date('2026-11-10T10:00:00+02:00');
  expect(isVisaReviewFresh(during)).toBe(true);
  expect(isVisaReviewFresh(late)).toBe(false);
  const result=evaluateVisaEntry(travel(),late);
  expect(result.label).toBe('review-expired');
  expect(result.explanation).not.toMatch(/South Africa among nationalities in the published eTA-exemption/);
  expect(result.warnings.join(' ')).toMatch(/source review expired/);
 });
 it('does not infer nationality, submit forms, or interpret visa-card payments as travel visas',()=>{
  const none=evaluateVisaEntry(travel({passportNationality:'other'}),during);
  expect(none.label).toBe('source-review-only');
  expect(none.warnings.join(' ')).toMatch(/Select the actual passport nationality/);
  expect(detectVisaEntryIntent('I need a visa to Kenya')).toBe(true);
  expect(detectVisaEntryIntent('What is an ETA application for South Africa?')).toBe(true);
  expect(detectVisaEntryIntent('Pay by Visa card')).toBe(false);
  expect(detectVisaEntryIntent('Plan a holiday budget')).toBe(false);
  expect(detectVisaEntryIntent('x'.repeat(501))).toBe(false);
  expect(Object.keys(travel()).sort()).toEqual(['arrival','arrivalDate','destination','passportNationality','purpose','stayDays']);
 });
});
