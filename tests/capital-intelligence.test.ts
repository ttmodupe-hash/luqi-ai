import {describe,it,expect} from 'vitest';
import {ARTIFACT_LABELS,AFRICAN_COUNTRIES,CAPITAL_PROGRAMMES,capitalReviewIsCurrent,
  normalizeFundingPlatform,matchCapitalProgrammes,buildCapitalPreparationDraft,
  type CapitalProfile} from '../src/lib/capital-intelligence';

const profile:CapitalProfile={
  country:'ZA',maturity:'MVP',sector:'TECH',purpose:'R_AND_D_SEED',
  registration:'UNKNOWN',age:27,availableArtifacts:['CONCEPT_NOTE'],
};
describe('Capital Intelligence: explainable, evidence-bound local preparation',()=>{
  it('locks every known source to an official HTTPS publisher and never invents a current round',()=>{
    expect(CAPITAL_PROGRAMMES).toHaveLength(8);
    expect(new Set(CAPITAL_PROGRAMMES.map(p=>p.id)).size).toBe(CAPITAL_PROGRAMMES.length);
    const hosts=new Set(['www.tia.org.za','www.idc.co.za','www.nyda.gov.za',
      'www.tonyelumelufoundation.org','www.aecfafrica.org','afawa.afdb.org',
      'www.globalinnovation.fund','solve.mit.edu']);
    expect(AFRICAN_COUNTRIES).toHaveLength(54);
    expect(new Set(AFRICAN_COUNTRIES.map(c=>c[0])).size).toBe(54);
    for(const programme of CAPITAL_PROGRAMMES){
      expect(programme.sourceStatus).toBe('PROGRAMME_REFERENCE_ONLY');
      expect(hosts.has(new URL(programme.sourceUrl).hostname)).toBe(true);
      expect(new URL(programme.sourceUrl).protocol).toBe('https:');
      expect(programme.reviewedOn).toBe(
        programme.scope==='SOUTH_AFRICA'?'2026-11-02':'2026-11-03');
      expect(['SOUTH_AFRICA','PAN_AFRICA','GLOBAL']).toContain(programme.scope);
      expect(programme.scopeNote.length).toBeGreaterThan(10);
      expect(Object.isFrozen(programme)).toBe(true);
      expect(Object.isFrozen(programme.conditions)).toBe(true);
      expect(Object.isFrozen(programme.suggestedArtifacts)).toBe(true);
      expect(Object.isFrozen(programme.focusSectors)).toBe(true);
      expect(Object.isFrozen(programme.selectionNotes)).toBe(true);
      expect(JSON.stringify(programme)).not.toMatch(/"OPEN"|"closingDate"|"capitalCap"|"eligibility_match"/);
    }
    expect(Object.keys(ARTIFACT_LABELS)).toHaveLength(6);
  });
  it('fails closed on untrusted, malformed or credential-bearing publisher specs',()=>{
    const original=CAPITAL_PROGRAMMES[0];
    expect(()=>normalizeFundingPlatform({...original,sourceUrl:'https://www.tia.org.za.evil.example/'})).toThrow();
    expect(()=>normalizeFundingPlatform({...original,sourceUrl:'http://www.tia.org.za/'})).toThrow();
    expect(()=>normalizeFundingPlatform({...original,sourceUrl:'https://user:secret@www.tia.org.za/'})).toThrow();
    expect(()=>normalizeFundingPlatform({...original,conditions:{minimumAge:40,maximumAge:18}})).toThrow();
    expect(()=>normalizeFundingPlatform({...original,focusSectors:['UNVERIFIED' as any]})).toThrow();
    expect(()=>normalizeFundingPlatform({...original,suggestedArtifacts:['TAX_ID' as any]})).toThrow();
    expect(()=>normalizeFundingPlatform({...original,id:'__proto__'})).toThrow();
    expect(()=>normalizeFundingPlatform({...original,scope:'ANYWHERE' as any})).toThrow();
    expect(()=>normalizeFundingPlatform({...original,scopeNote:''})).toThrow();
    const withExtras=normalizeFundingPlatform({
      ...original,unreviewedPayload:{mutableSecret:'do not expose'},
      conditions:{...original.conditions,arbitraryRule:{credential:'no'}},
    } as any);
    expect(Object.prototype.hasOwnProperty.call(withExtras,'unreviewedPayload')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(withExtras.conditions,'arbitraryRule')).toBe(false);
    expect(Object.isFrozen(withExtras.conditions)).toBe(true);
  });
  it('ranks documented programme fit first, never by the largest advertised grant amount',()=>{
    const matches=matchCapitalProgrammes(profile,new Date('2026-11-02T10:00:00Z'));
    expect(matches).toHaveLength(8);
    const tia=matches.find(m=>m.programme.id==='tia-seed-fund')!;
    const idc=matches.find(m=>m.programme.id==='idc-development-finance')!;
    const nyda=matches.find(m=>m.programme.id==='nyda-grant-programme')!;
    expect(tia.state).toBe('POTENTIAL_FIT_TO_EXPLORE');
    expect(tia.preparationPercent).toBe(33);
    expect(idc.state).toBe('CHECK_PUBLISHER_CRITERIA');
    expect(nyda.state).toBe('CURRENTLY_NOT_ALIGNED');
    expect(nyda.checks.join(' ')).toMatch(/excludes research-and-development seed funding/);
    expect(matches[0].programme.id).toBe('tia-seed-fund');
    expect(matches.at(-1)!.programme.id).toBe('nyda-grant-programme');
  });
  it('does not label unknown age or unregistered firm as eligible',()=>{
    const matches=matchCapitalProgrammes({...profile,purpose:'BUSINESS_GROWTH',age:undefined,registration:'NOT_REGISTERED'});
    expect(matches.find(m=>m.programme.id==='nyda-grant-programme')!.state).toBe('CHECK_PUBLISHER_CRITERIA');
    expect(matches.find(m=>m.programme.id==='idc-development-finance')!.checks.join(' ')).toMatch(/registered business/);
  });
  it('rules out age-incompatible NYDA profiles but not unrelated potential TIA',()=>{
    for(const age of [17,36,71]){
      const matches=matchCapitalProgrammes({...profile,purpose:'BUSINESS_GROWTH',age});
      expect(matches.find(m=>m.programme.id==='nyda-grant-programme')!.state).toBe('CURRENTLY_NOT_ALIGNED');
      expect(matches.find(m=>m.programme.id==='tia-seed-fund')!.state).not.toBe('CURRENTLY_NOT_ALIGNED');
    }
  });
  it('handles country uncertainty, stale evidence and invalid timestamps without fake open status',()=>{
    const d=new Date('2027-01-12T10:00:00Z');
    expect(capitalReviewIsCurrent(new Date('2026-11-02T10:00:00Z'))).toBe(true);
    expect(capitalReviewIsCurrent(d)).toBe(false);
    expect(capitalReviewIsCurrent(new Date('invalid'))).toBe(false);
    const matches=matchCapitalProgrammes({...profile,country:'OTHER'},d);
    expect(matches.every(m=>m.reviewExpired)).toBe(true);
    expect(matches.every(m=>m.state!=='POTENTIAL_FIT_TO_EXPLORE')).toBe(true);
    expect(matches.every(m=>m.checks.some(x=>/source review is overdue/i.test(x)))).toBe(true);
    expect(matches.filter(m=>m.programme.scope==='SOUTH_AFRICA')
      .every(m=>m.state==='CURRENTLY_NOT_ALIGNED')).toBe(true);
    expect(matches.filter(m=>m.programme.scope==='GLOBAL')
      .every(m=>m.state==='CHECK_PUBLISHER_CRITERIA')).toBe(true);
  });
  it('serves Africa and global funding references without labelling cross-border eligibility confirmed',()=>{
    const kenya=matchCapitalProgrammes({...profile,country:'KE',purpose:'BUSINESS_GROWTH',age:28},
      new Date('2026-11-03T10:00:00Z'));
    expect(kenya.find(m=>m.programme.id==='tef-entrepreneurship')!.state).toBe('CHECK_PUBLISHER_CRITERIA');
    expect(kenya.find(m=>m.programme.id==='aecf-challenge-finance')!.state).toBe('CHECK_PUBLISHER_CRITERIA');
    expect(kenya.find(m=>m.programme.id==='mit-solve-challenges')!.state).toBe('CHECK_PUBLISHER_CRITERIA');
    expect(kenya.filter(m=>m.programme.scope==='SOUTH_AFRICA')
      .every(m=>m.state==='CURRENTLY_NOT_ALIGNED')).toBe(true);
    const global=matchCapitalProgrammes({...profile,country:'OTHER'},
      new Date('2026-11-03T10:00:00Z'));
    expect(global.find(m=>m.programme.id==='tef-entrepreneurship')!.state).toBe('CURRENTLY_NOT_ALIGNED');
    expect(global.find(m=>m.programme.id==='global-innovation-fund')!.state).toBe('CHECK_PUBLISHER_CRITERIA');
    expect(()=>matchCapitalProgrammes({...profile,country:'NOT_A_COUNTRY' as any})).toThrow();
    const tef=kenya.find(m=>m.programme.id==='tef-entrepreneurship')!;
    const draft=buildCapitalPreparationDraft(tef,{...profile,country:'KE'},'Cross-border idea','Education');
    expect(draft).toContain('Project location: Kenya');
    expect(draft).toContain('Across Africa');
    expect(draft).toContain('CURRENT FUNDING WINDOW: NOT VERIFIED');
  });
  it('rejects malformed inputs and does not infer uploaded or externally verified documents',()=>{
    expect(()=>matchCapitalProgrammes({...profile,age:999})).toThrow('INVALID_CAPITAL_PROFILE_OR_SOURCE');
    expect(()=>matchCapitalProgrammes({...profile,maturity:'IMPOSSIBLE' as any})).toThrow();
    expect(()=>matchCapitalProgrammes({...profile,availableArtifacts:['PROPRIETARY_SECRET' as any]})).toThrow();
    const m=matchCapitalProgrammes(profile)[0];
    expect(m.missingArtifacts.length).toBeGreaterThan(0);
    expect(m.preparationPercent).toBeLessThan(100);
  });
  it('generates an owner-reviewed, non-submitted plain text pack with source evidence',()=>{
    const m=matchCapitalProgrammes(profile)[0];
    const draft=buildCapitalPreparationDraft(m,profile,'Local AI project','A local language learning tool');
    expect(draft).toContain('LUQI CAPITAL INTELLIGENCE');
    expect(draft).toContain('No application has been submitted');
    expect(draft).toContain('CURRENT FUNDING WINDOW: NOT VERIFIED');
    expect(draft).toContain(m.programme.sourceUrl);
    expect(draft).toContain('Self-reported missing preparation items');
    expect(draft).not.toMatch(/Congratulations|Approved funding|Guaranteed award/);
    expect(()=>buildCapitalPreparationDraft({...m,programme:{...m.programme,id:'fake'}},profile,'x','y')).toThrow();
  });
});