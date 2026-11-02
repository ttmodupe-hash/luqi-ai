import {describe,it,expect} from 'vitest';
import {MUNICIPALITIES,MUNICIPAL_DIRECTORY_URL,MUNICIPAL_SERVICES,PROVINCE_NAMES,
 filterMunicipalities,detectMunicipalIntent,detectTownshipEconomyIntent,isMunicipalReviewFresh} from '../src/lib/municipal-economy';
describe('official municipal directory and bounded local-service guidance',()=>{
 it('includes nine provinces and the names visible in the official 29 Oct directory, not fabricated locations',()=>{
  expect(Object.keys(PROVINCE_NAMES)).toHaveLength(9);
  // 255 names in gov.za directory, plus two independently confirmed in original government notices.
  expect(MUNICIPALITIES).toHaveLength(257);
  expect(MUNICIPALITIES.filter(m=>m.type==='metropolitan')).toHaveLength(8);
  const set=new Set<string>();
  for(const m of MUNICIPALITIES){
   const key=m.province+'|'+m.name;
   expect(set.has(key)).toBe(false);set.add(key);
   expect(m.name.length).toBeGreaterThan(7);
   expect(m.directoryUrl).toBe(MUNICIPAL_DIRECTORY_URL);
   expect(new URL(m.directoryUrl).hostname).toBe('www.gov.za');
  }
  expect(MUNICIPALITIES.some(m=>m.province==='GP'&&m.name==='City of Tshwane Metropolitan Municipality')).toBe(true);
  expect(MUNICIPALITIES.some(m=>m.province==='MP'&&m.name==='Thembisile Hani Local Municipality')).toBe(true);
  expect(MUNICIPALITIES.some(m=>m.province==='WC'&&m.name==='City of Cape Town Metropolitan Municipality')).toBe(true);
  for(const ref of ['Collins Chabane Local Municipality','JB Marks Local Municipality']){
    const entry=MUNICIPALITIES.find(m=>m.name===ref)!;
    expect(entry.type).toBe('local');
    expect(entry.supplementaryEvidenceUrl?.startsWith('https://www.gov.za/')).toBe(true);
  }
 });
 it('filters by selected source-listed province and leaves GPS or user identity out of matches',()=>{
  expect(filterMunicipalities('GP','Tshwane').map(m=>m.name)).toEqual(['City of Tshwane Metropolitan Municipality']);
  expect(filterMunicipalities('EC','Kouga').some(m=>m.name==='Kouga Local Municipality')).toBe(true);
  expect(filterMunicipalities('GP','').every(m=>m.province==='GP')).toBe(true);
  expect(filterMunicipalities(null,'Emalahleni').length).toBe(2);
  expect(filterMunicipalities(null,'',1000).length).toBe(257);
  expect(filterMunicipalities(null,'anything that does not exist').length).toBe(0);
 });
 it('covers service delivery, indigent, local permits, IDP and municipal tenders with official source links',()=>{
  expect(MUNICIPAL_SERVICES).toHaveLength(8);
  const ids=new Set<string>();
  for(const service of MUNICIPAL_SERVICES){
   expect(ids.has(service.id)).toBe(false);ids.add(service.id);
   expect(service.steps.length).toBeGreaterThanOrEqual(3);
   const host=new URL(service.url).hostname;
   expect(['www.gov.za','www.cogta.gov.za','www.etenders.gov.za']).toContain(host);
   expect(service.steps.join(' ')).not.toMatch(/\bwe (?:will|have) submit\b|\bguaranteed approval\b|\balready approved\b/i);
  }
 });
 it('handles strong municipal versus township business intent without hijacking ordinary requests',()=>{
  expect(detectMunicipalIntent('Help me with my municipal bill')).toBe(true);
  expect(detectMunicipalIntent('My pothole must be repaired')).toBe(true);
  expect(detectTownshipEconomyIntent('I have a spaza shop needing support')).toBe(true);
  expect(detectTownshipEconomyIntent('Explain township economy support')).toBe(true);
  expect(detectMunicipalIntent('Help me learn CCNA')).toBe(false);
  expect(detectTownshipEconomyIntent('Show me movies')).toBe(false);
  expect(detectTownshipEconomyIntent('x'.repeat(501))).toBe(false);
  expect(isMunicipalReviewFresh(new Date('2026-11-02T12:00:00+02:00'))).toBe(true);
  expect(isMunicipalReviewFresh(new Date('2026-11-13T00:00:00+02:00'))).toBe(false);
 });
});
