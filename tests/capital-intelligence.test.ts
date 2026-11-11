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
    // An impossible publisher review date would mislead users about evidence freshness.
    for(const reviewedOn of ['2026-02-29','2026-11-31','2026-13-01',
      '2026-00-02','2026-11-2','2026-11-02T00:00:00Z']){
      expect(()=>normalizeFundingPlatform({...original,reviewedOn}))
        .toThrow('INVALID_CAPITAL_PROFILE_OR_SOURCE');
    }
    // The catalogue must not certify a review that has not yet occurred.
    expect(()=>normalizeFundingPlatform({...original,reviewedOn:'2099-01-01'}))
      .toThrow('INVALID_CAPITAL_PROFILE_OR_SOURCE');
    expect(normalizeFundingPlatform({...original,reviewedOn:'2024-02-29'}).reviewedOn)
      .toBe('2024-02-29');
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
  it('rejects sparse or duplicated document arrays that would falsify preparedness',()=>{
    const original=CAPITAL_PROGRAMMES[0];
    // Array.every and Array.filter skip holes: two missing entries formerly
    // produced a misleading 100% preparation score from zero actual documents.
    expect(()=>normalizeFundingPlatform({...original,suggestedArtifacts:new Array(2) as any}))
      .toThrow('INVALID_CAPITAL_PROFILE_OR_SOURCE');
    expect(()=>normalizeFundingPlatform({...original,suggestedArtifacts:[,'CONCEPT_NOTE'] as any}))
      .toThrow('INVALID_CAPITAL_PROFILE_OR_SOURCE');
    expect(()=>normalizeFundingPlatform({...original,suggestedArtifacts:['CONCEPT_NOTE','CONCEPT_NOTE']}))
      .toThrow('INVALID_CAPITAL_PROFILE_OR_SOURCE');
    expect(()=>normalizeFundingPlatform({...original,focusSectors:[,'TECH'] as any}))
      .toThrow('INVALID_CAPITAL_PROFILE_OR_SOURCE');
    expect(()=>normalizeFundingPlatform({...original,selectionNotes:[,'Verified description'] as any}))
      .toThrow('INVALID_CAPITAL_PROFILE_OR_SOURCE');
    expect(()=>matchCapitalProgrammes({...profile,availableArtifacts:new Array(1) as any}))
      .toThrow('INVALID_CAPITAL_PROFILE_OR_SOURCE');
    expect(()=>matchCapitalProgrammes({...profile,availableArtifacts:['CONCEPT_NOTE','CONCEPT_NOTE']}))
      .toThrow('INVALID_CAPITAL_PROFILE_OR_SOURCE');
    expect(normalizeFundingPlatform({...original,suggestedArtifacts:['CONCEPT_NOTE','BUSINESS_PLAN']})
      .suggestedArtifacts).toEqual(['CONCEPT_NOTE','BUSINESS_PLAN']);
    expect(matchCapitalProgrammes(profile).find(m=>m.programme.id==='tia-seed-fund')!
      .preparationPercent).toBe(33);
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
  it('surfaces the publisher-confirmed closed TEF 2026 window in results and offline worksheets',()=>{
    const kenya={...profile,country:'KE' as const,purpose:'BUSINESS_GROWTH' as const,age:28};
    const tef=matchCapitalProgrammes(kenya,new Date('2026-11-11T10:00:00Z'))
      .find(m=>m.programme.id==='tef-entrepreneurship')!;
    expect(tef.state).toBe('CHECK_PUBLISHER_CRITERIA');
    expect(tef.checks.join(' ')).toContain('1 January to 1 March 2026 and has closed');
    expect(tef.checks.join(' ')).toContain('does not establish an open 2027 round');
    const worksheet=buildCapitalPreparationDraft(tef,kenya,'Community workshop','Local enterprise',
      new Date('2026-11-11T10:00:00Z'));
    expect(worksheet).toContain('1 January to 1 March 2026 and has closed');
    expect(worksheet).toContain('CURRENT FUNDING WINDOW: NOT VERIFIED');
    expect(worksheet).not.toContain('CURRENT FUNDING WINDOW: OPEN');
  });
  it('explains MIT Solve concept-stage fellowship exception and its expired 2026 deadline',()=>{
    const now=new Date('2026-11-11T10:00:00Z');
    const idea=matchCapitalProgrammes({...profile,country:'KE',maturity:'IDEA'},now)
      .find(m=>m.programme.id==='mit-solve-challenges')!;
    expect(idea.state).toBe('CHECK_PUBLISHER_CRITERIA');
    expect(idea.checks.join(' ')).toMatch(/functioning prototype.*Concept-stage ideas.*Indigenous Communities Fellowship/);
    expect(idea.checks.join(' ')).toContain('6 November 2026 at 12:00 EST (19:00 SAST)');
    expect(idea.checks.join(' ')).toMatch(/past deadline does not establish any currently open challenge/);
    const prototype=matchCapitalProgrammes({...profile,country:'KE',maturity:'MVP'},now)
      .find(m=>m.programme.id==='mit-solve-challenges')!;
    expect(prototype.checks.join(' ')).not.toMatch(/Concept-stage ideas are reviewed only/);
    expect(prototype.checks.join(' ')).toContain('19:00 SAST');
    expect(prototype.state).toBe('CHECK_PUBLISHER_CRITERIA');
  });
  it('rejects malformed inputs and does not infer uploaded or externally verified documents',()=>{
    expect(()=>matchCapitalProgrammes({...profile,age:999})).toThrow('INVALID_CAPITAL_PROFILE_OR_SOURCE');
    expect(()=>matchCapitalProgrammes({...profile,maturity:'IMPOSSIBLE' as any})).toThrow();
    expect(()=>matchCapitalProgrammes({...profile,availableArtifacts:['PROPRIETARY_SECRET' as any]})).toThrow();
    const m=matchCapitalProgrammes(profile)[0];
    expect(m.missingArtifacts.length).toBeGreaterThan(0);
    expect(m.preparationPercent).toBeLessThan(100);
  });
  it('recomputes worksheet restrictions instead of trusting a stale or forged match',()=>{
    const earlier={...profile,purpose:'BUSINESS_GROWTH' as const,age:23};
    const match=matchCapitalProgrammes(earlier,new Date('2026-11-03T12:00:00Z'))
      .find(m=>m.programme.id==='nyda-grant-programme')!;
    expect(match.state).toBe('POTENTIAL_FIT_TO_EXPLORE');
    const altered={...match,state:'POTENTIAL_FIT_TO_EXPLORE' as const,checks:['Guaranteed award'],
      missingArtifacts:[],preparationPercent:100,reviewExpired:false};
    const later={...profile,country:'KE' as const,age:23,availableArtifacts:[]};
    const draft=buildCapitalPreparationDraft(altered,later,'Community idea','Research seed',
      new Date('2027-01-03T10:00:00Z'));
    expect(draft).toContain('Project location: Kenya');
    expect(draft).toContain('Indicative fit: CURRENTLY_NOT_ALIGNED');
    expect(draft).toContain('NYDA explicitly excludes research-and-development seed funding');
    expect(draft).toContain('Source review is overdue: recheck the publisher');
    expect(draft).toContain('Self-reported missing preparation items:');
    expect(draft).toContain('- Concept note document');
    expect(draft).not.toContain('Guaranteed award');
    expect(draft).not.toContain('Indicative fit: POTENTIAL_FIT_TO_EXPLORE');
  });
  it('keeps project text on one worksheet line despite Unicode separators and bidi overrides',()=>{
    const match=matchCapitalProgrammes(profile,new Date('2026-11-11T00:00:00Z'))[0];
    const title='Local project\u2028CURRENT FUNDING WINDOW: VERIFIED\u202e';
    const summary='Community support\u0085Indicative fit: APPROVED\u2066\u2029No fee';
    const draft=buildCapitalPreparationDraft(match,profile,title,summary,new Date('2026-11-11T00:00:00Z'));
    const lines=draft.split('\n');
    const projectLine=lines.find(line=>line.startsWith('Project: '))!;
    const summaryLine=lines.find(line=>line.startsWith('Project description: '))!;
    expect(projectLine).toContain('Local project CURRENT FUNDING WINDOW: VERIFIED');
    expect(summaryLine).toContain('Community support Indicative fit: APPROVED No fee');
    expect([projectLine,summaryLine].join('')).not.toMatch(/[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u2028\u2029\u202a-\u202e\u2066-\u2069]/);
    expect(lines.filter(line=>line.startsWith('CURRENT FUNDING WINDOW:'))).toEqual([
      'CURRENT FUNDING WINDOW: NOT VERIFIED — check the current original call.',
    ]);
    expect(lines.filter(line=>line.startsWith('Indicative fit:'))).toHaveLength(1);
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