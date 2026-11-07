/**
 * Luqi Capital Intelligence: source-bound programme REFERENCE matching.
 * No investor access, live call detection, approval prediction or submission.
 * All input remains local to this browser view and is never sent to an API.
 */
export type FundingType = 'SOVEREIGN_FUND' | 'DEVELOPMENT_FINANCE' | 'VENTURE_CAPITAL' | 'DECENTRALIZED_GRANT' | 'CROWDFUNDING' | 'SUPPORT_PROGRAMME';
export type ProjectMaturity = 'IDEA' | 'MVP' | 'PRODUCTION';
export type ProjectSector = 'TECH' | 'INDUSTRY' | 'OTHER';
export type ProjectPurpose = 'R_AND_D_SEED' | 'BUSINESS_GROWTH' | 'INDUSTRIAL_EXPANSION';
export type Registration = 'REGISTERED' | 'NOT_REGISTERED' | 'UNKNOWN';
export type Artifact = 'CONCEPT_NOTE' | 'PROTOTYPE_PROOF' | 'PITCH_DECK' | 'BUSINESS_PLAN' | 'FINANCIAL_PLAN' | 'REGISTRATION_PROOF';
export const ARTIFACT_LABELS: Readonly<Record<Artifact,string>> = Object.freeze({
  CONCEPT_NOTE:'Concept note document',
  PROTOTYPE_PROOF:'Proof of concept or prototype evidence',
  PITCH_DECK:'Pitch presentation',
  BUSINESS_PLAN:'Business plan',
  FINANCIAL_PLAN:'Financial projections',
  REGISTRATION_PROOF:'Company registration records',
});
export const CAPITAL_SOURCE_REVIEWED_ON = '2026-11-02';
export const CAPITAL_SOURCE_RECHECK_ON = '2026-12-02';
export type FundingScope = 'SOUTH_AFRICA' | 'PAN_AFRICA' | 'INTERNATIONAL';
export interface FundingPlatformSpec {
  readonly id:string;
  readonly name:string;
  readonly organisation:string;
  readonly scope:FundingScope;
  readonly type:FundingType;
  readonly sourceUrl:string;
  readonly applicationGuideUrl:string;
  readonly reviewedOn:string;
  readonly sourceStatus:'PROGRAMME_REFERENCE_ONLY';
  readonly focusSectors:readonly ProjectSector[];
  readonly suggestedArtifacts:readonly Artifact[];
  readonly selectionNotes:readonly string[];
  readonly conditions:Readonly<{
    minimumAge?:number;
    maximumAge?:number;
    excludesResearchSeed?:boolean;
    requiresRegisteredBusiness?:boolean;
  }>;
}
export interface CapitalProfile {
  readonly country:'ZA'|'AFRICA_OTHER'|'OTHER';
  readonly maturity:ProjectMaturity;
  readonly sector:ProjectSector;
  readonly purpose:ProjectPurpose;
  readonly registration:Registration;
  readonly age?:number;
  readonly availableArtifacts:readonly Artifact[];
}
export type MatchState = 'POTENTIAL_FIT_TO_EXPLORE' | 'CHECK_PUBLISHER_CRITERIA' | 'CURRENTLY_NOT_ALIGNED';
export interface FundingMatch {
  readonly programme:FundingPlatformSpec;
  readonly state:MatchState;
  /** Suggested-document completeness only. NEVER approval probability or eligibility. */
  readonly preparationPercent:number;
  readonly missingArtifacts:readonly Artifact[];
  readonly checks:readonly string[];
  readonly reviewExpired:boolean;
}
const ALLOWED_PUBLISHERS = new Set(['www.tia.org.za','www.idc.co.za','www.nyda.gov.za','www.undp.org','www.thegef.org']);
const ARTIFACTS = new Set<Artifact>(Object.keys(ARTIFACT_LABELS) as Artifact[]);
const TYPES = new Set<FundingType>(['SOVEREIGN_FUND','DEVELOPMENT_FINANCE','VENTURE_CAPITAL','DECENTRALIZED_GRANT','CROWDFUNDING','SUPPORT_PROGRAMME']);
const SECTORS = new Set<ProjectSector>(['TECH','INDUSTRY','OTHER']);
const STAGES = new Set<ProjectMaturity>(['IDEA','MVP','PRODUCTION']);
const PURPOSES = new Set<ProjectPurpose>(['R_AND_D_SEED','BUSINESS_GROWTH','INDUSTRIAL_EXPANSION']);
const REGISTRATIONS = new Set<Registration>(['REGISTERED','NOT_REGISTERED','UNKNOWN']);
const bad = () => new Error('INVALID_CAPITAL_PROFILE_OR_SOURCE');

/** Reject malformed/outside sources, clone nested data, and deep-freeze public specs. */
export function normalizeFundingPlatform(input:FundingPlatformSpec):FundingPlatformSpec {
  if (!input || typeof input !== 'object' ||
      typeof input.id !== 'string' || !/^[a-z0-9-]{2,64}$/.test(input.id) ||
      typeof input.name !== 'string' || input.name.trim().length < 3 ||
      input.name.length > 120 || typeof input.organisation !== 'string' ||
      input.organisation.length < 3 || input.organisation.length > 100 ||
      !['SOUTH_AFRICA','PAN_AFRICA','INTERNATIONAL'].includes(input.scope) ||
      !TYPES.has(input.type) || input.sourceStatus !== 'PROGRAMME_REFERENCE_ONLY' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(input.reviewedOn) ||
      !Array.isArray(input.focusSectors) || !input.focusSectors.length ||
      !input.focusSectors.every(s=>SECTORS.has(s)) ||
      !Array.isArray(input.suggestedArtifacts) ||
      !input.suggestedArtifacts.every(a=>ARTIFACTS.has(a)) ||
      !Array.isArray(input.selectionNotes) ||
      !input.selectionNotes.every(s=>typeof s === 'string' && s.length <= 400) ||
      !input.conditions || typeof input.conditions !== 'object') throw bad();
  for (const raw of [input.sourceUrl,input.applicationGuideUrl]) {
    if (typeof raw !== 'string') throw bad();
    let url:URL;
    try { url=new URL(raw); } catch { throw bad(); }
    if (url.protocol !== 'https:' || !ALLOWED_PUBLISHERS.has(url.hostname) ||
        url.username || url.password || url.port) throw bad();
  }
  const conditions={...input.conditions};
  if (conditions.minimumAge !== undefined && (!Number.isInteger(conditions.minimumAge) || conditions.minimumAge < 0)) throw bad();
  if (conditions.maximumAge !== undefined && (!Number.isInteger(conditions.maximumAge) || conditions.maximumAge > 120)) throw bad();
  if (conditions.minimumAge !== undefined && conditions.maximumAge !== undefined &&
      conditions.minimumAge > conditions.maximumAge) throw bad();
  if (conditions.excludesResearchSeed !== undefined && typeof conditions.excludesResearchSeed !== 'boolean') throw bad();
  if (conditions.requiresRegisteredBusiness !== undefined && typeof conditions.requiresRegisteredBusiness !== 'boolean') throw bad();
  // Project only known, validated contract keys. Never spread untrusted
  // extras or nested values into the supposedly immutable funding matrix.
  const safeConditions=Object.freeze({
    ...(conditions.minimumAge!==undefined?{minimumAge:conditions.minimumAge}:{}),
    ...(conditions.maximumAge!==undefined?{maximumAge:conditions.maximumAge}:{}),
    ...(conditions.excludesResearchSeed!==undefined?{excludesResearchSeed:conditions.excludesResearchSeed}:{}),
    ...(conditions.requiresRegisteredBusiness!==undefined?{requiresRegisteredBusiness:conditions.requiresRegisteredBusiness}:{}),
  });
  return Object.freeze({
    id:input.id,name:input.name.trim(),organisation:input.organisation.trim(),
    scope:input.scope,type:input.type,sourceUrl:input.sourceUrl,applicationGuideUrl:input.applicationGuideUrl,
    reviewedOn:input.reviewedOn,sourceStatus:'PROGRAMME_REFERENCE_ONLY' as const,
    focusSectors:Object.freeze([...input.focusSectors]),
    suggestedArtifacts:Object.freeze([...input.suggestedArtifacts]),
    selectionNotes:Object.freeze([...input.selectionNotes]),
    conditions:safeConditions,
  });
}
/** These are publisher PROGRAMME descriptions, never a claim of an OPEN round. */
export const CAPITAL_PROGRAMMES:readonly FundingPlatformSpec[] = Object.freeze([
  normalizeFundingPlatform({
    id:'tia-seed-fund',scope:'SOUTH_AFRICA',name:'TIA Seed Fund',organisation:'Technology Innovation Agency',
    type:'SOVEREIGN_FUND',sourceUrl:'https://www.tia.org.za/funding-instruments/',
    applicationGuideUrl:'https://www.tia.org.za/how-to-apply/',
    reviewedOn:CAPITAL_SOURCE_REVIEWED_ON,sourceStatus:'PROGRAMME_REFERENCE_ONLY',
    focusSectors:['TECH','INDUSTRY','OTHER'],
    suggestedArtifacts:['CONCEPT_NOTE','PROTOTYPE_PROOF','BUSINESS_PLAN'],
    selectionNotes:[
      'TIA describes seed support for advancing innovation and research outputs toward prototypes and commercialisation.',
      'TIA eligibility and proof-of-concept rules depend on the specific instrument and call.',
      'Verify the exact current call and documents in the official TIA gateway before making any application.',
    ],conditions:{},
  }),
  normalizeFundingPlatform({
    id:'idc-development-finance',scope:'SOUTH_AFRICA',name:'IDC Development Finance',organisation:'Industrial Development Corporation',
    type:'DEVELOPMENT_FINANCE',sourceUrl:'https://www.idc.co.za/faq/',
    applicationGuideUrl:'https://www.idc.co.za/funding-checklist/',
    reviewedOn:CAPITAL_SOURCE_REVIEWED_ON,sourceStatus:'PROGRAMME_REFERENCE_ONLY',
    focusSectors:['INDUSTRY','TECH'],
    suggestedArtifacts:['CONCEPT_NOTE','BUSINESS_PLAN','FINANCIAL_PLAN','REGISTRATION_PROOF'],
    selectionNotes:[
      'IDC generally expects a registered business, a business plan, commercial viability and developmental or employment impact.',
      'IDC development finance is not the same as a non-repayable grant; investigate financing and security terms.',
      'Confirm exact fund/instrument, application availability and borrower requirements with IDC.',
    ],conditions:{requiresRegisteredBusiness:true},
  }),
  normalizeFundingPlatform({
    id:'nyda-grant-programme',scope:'SOUTH_AFRICA',name:'NYDA Grant Programme',organisation:'National Youth Development Agency',
    type:'SOVEREIGN_FUND',sourceUrl:'https://www.nyda.gov.za/Products-Services/NYDA-Grant-Programme.html',
    applicationGuideUrl:'https://www.nyda.gov.za/Products-Services/NYDA-Grant-Programme.html',
    reviewedOn:CAPITAL_SOURCE_REVIEWED_ON,sourceStatus:'PROGRAMME_REFERENCE_ONLY',
    focusSectors:['TECH','INDUSTRY','OTHER'],
    suggestedArtifacts:['CONCEPT_NOTE','PITCH_DECK','BUSINESS_PLAN'],
    selectionNotes:[
      'The published programme is directed toward South African youth entrepreneurs aged 18–35; age-specific timing rules also apply.',
      'NYDA explicitly excludes research-and-development seed capital and some other funding purposes.',
      'Check citizenship/residency, turnover, credit, training and the actual application process with NYDA.',
    ],conditions:{minimumAge:18,maximumAge:35,excludesResearchSeed:true},
  }),
  normalizeFundingPlatform({
    id:'timbuktoo-creative-tech',name:'UNDP timbuktoo CreativeTech Launchpad',organisation:'United Nations Development Programme',
    scope:'PAN_AFRICA',type:'SUPPORT_PROGRAMME',
    sourceUrl:'https://www.undp.org/south-africa/press-releases/undp-launches-call-applications-creativetech-startups-join-timbuktoo-launchpad',
    applicationGuideUrl:'https://www.undp.org/south-africa/press-releases/undp-launches-call-applications-creativetech-startups-join-timbuktoo-launchpad',
    reviewedOn:'2026-11-03',sourceStatus:'PROGRAMME_REFERENCE_ONLY',
    focusSectors:['TECH','OTHER'],suggestedArtifacts:['CONCEPT_NOTE','PROTOTYPE_PROOF','PITCH_DECK'],
    selectionNotes:[
      'UNDP describes pan-African CreativeTech incubation, mentorship and investment-readiness support; it is NOT a guaranteed cash grant.',
      'Publisher describes Africa-based or Africa-market startups with a prototype/MVP and team; check the exact cohort and destination.',
      'The June 2026 notice describes rolling quarterly cohorts; availability has not been independently reverified today.',
    ],conditions:{},
  }),
  normalizeFundingPlatform({
    id:'timbuktoo-greentech',name:'UNDP timbuktoo GreenTech Launchpad',organisation:'United Nations Development Programme',
    scope:'PAN_AFRICA',type:'SUPPORT_PROGRAMME',
    sourceUrl:'https://www.undp.org/kenya/news/call-applications-join-timbuktoo-launchpad-greentech-startups',
    applicationGuideUrl:'https://www.undp.org/kenya/news/call-applications-join-timbuktoo-launchpad-greentech-startups',
    reviewedOn:'2026-11-03',sourceStatus:'PROGRAMME_REFERENCE_ONLY',
    focusSectors:['TECH','INDUSTRY','OTHER'],suggestedArtifacts:['CONCEPT_NOTE','PROTOTYPE_PROOF','PITCH_DECK'],
    selectionNotes:[
      'UNDP describes pan-African climate and sustainability incubation and investor-readiness connections, not an awarded grant.',
      'The programme targets startups based in Africa or serving African markets with an MVP/prototype and committed team.',
      'Check current cohort intake, language, country-specific conditions and the official application channel.',
    ],conditions:{},
  }),
  normalizeFundingPlatform({
    id:'gef-small-grants',name:'GEF Small Grants Programme',organisation:'Global Environment Facility',
    scope:'INTERNATIONAL',type:'SOVEREIGN_FUND',
    sourceUrl:'https://www.thegef.org/what-we-do/topics/gef-small-grants-program',
    applicationGuideUrl:'https://www.thegef.org/what-we-do/topics/gef-small-grants-program',
    reviewedOn:'2026-11-03',sourceStatus:'PROGRAMME_REFERENCE_ONLY',
    focusSectors:['OTHER','TECH','INDUSTRY'],suggestedArtifacts:['CONCEPT_NOTE','BUSINESS_PLAN'],
    selectionNotes:[
      'The global programme primarily supports eligible local civil-society and community-based organisations for environmental work; a normal startup is not automatically eligible.',
      'Country participation and national implementing arrangements vary; find the relevant country team and original programme instructions.',
      'The GEF CSO Challenge call shown on the source closed 15 September 2026. Do not treat that old call as open.',
    ],conditions:{},
  }),
]);
export function capitalReviewIsCurrent(now:Date=new Date()):boolean {
  return Number.isFinite(now.getTime()) &&
    now.getTime() <= Date.parse(CAPITAL_SOURCE_RECHECK_ON+'T23:59:59+02:00');
}
function validateProfile(profile:CapitalProfile):void {
  if (!profile || !['ZA','AFRICA_OTHER','OTHER'].includes(profile.country) ||
    !STAGES.has(profile.maturity) || !SECTORS.has(profile.sector) ||
    !PURPOSES.has(profile.purpose) || !REGISTRATIONS.has(profile.registration) ||
    (profile.age !== undefined && (!Number.isInteger(profile.age) || profile.age < 0 || profile.age > 120)) ||
    !Array.isArray(profile.availableArtifacts) ||
    profile.availableArtifacts.length > ARTIFACTS.size ||
    !profile.availableArtifacts.every(a=>ARTIFACTS.has(a))) throw bad();
}
export function matchCapitalProgrammes(profile:CapitalProfile,now:Date=new Date()):FundingMatch[] {
  validateProfile(profile);
  const present=new Set(profile.availableArtifacts), reviewExpired=!capitalReviewIsCurrent(now);
  return CAPITAL_PROGRAMMES.map(programme=>{
    const checks:string[]=[];
    let mismatch=false;
    if(programme.scope === 'SOUTH_AFRICA' && profile.country !== 'ZA') {
      mismatch=true;
      checks.push('This programme targets South African applicants; non-South-African eligibility has not been established.');
    }
    if(programme.scope === 'PAN_AFRICA' && profile.country === 'OTHER')
      checks.push('This initiative targets Africa-based or Africa-market teams; confirm whether your project qualifies.');
    if(programme.scope === 'INTERNATIONAL')
      checks.push('Country and applicant-organisation eligibility vary; consult the original publisher before applying.');
    if(programme.type === 'SUPPORT_PROGRAMME')
      checks.push('Incubation and investment readiness are not an award of cash funding.');
    if(!programme.focusSectors.includes(profile.sector))
      checks.push('Check whether the project sector fits this organisation’s published mandate.');
    if(programme.conditions.requiresRegisteredBusiness && profile.registration !== 'REGISTERED')
      checks.push('IDC expects a registered business; confirm registration before a real application.');
    if(programme.conditions.minimumAge !== undefined || programme.conditions.maximumAge !== undefined) {
      if(profile.age === undefined) checks.push('Confirm the founder age and the programme’s age/timing requirements.');
      else if((programme.conditions.minimumAge !== undefined && profile.age < programme.conditions.minimumAge) ||
              (programme.conditions.maximumAge !== undefined && profile.age > programme.conditions.maximumAge)) {
        mismatch=true;checks.push('The stated founder age falls outside NYDA’s published 18–35 range.');
      }
    }
    if(programme.conditions.excludesResearchSeed && profile.purpose === 'R_AND_D_SEED') {
      mismatch=true;checks.push('NYDA explicitly excludes research-and-development seed funding.');
    }
    if(programme.id === 'tia-seed-fund' && profile.maturity === 'IDEA')
      checks.push('TIA may require proven proof of concept; confirm the instrument’s technology readiness rules.');
    if(programme.id === 'idc-development-finance' && profile.maturity === 'IDEA')
      checks.push('IDC examines bankability, viability and owner contribution, which an idea alone may not demonstrate.');
    if(reviewExpired) checks.push('Source review is overdue: recheck the publisher before relying on any criteria.');
    const missingArtifacts=programme.suggestedArtifacts.filter(a=>!present.has(a));
    const preparationPercent=programme.suggestedArtifacts.length===0 ? 0 :
      Math.round((programme.suggestedArtifacts.length-missingArtifacts.length)*100/programme.suggestedArtifacts.length);
    return {programme,
      state:mismatch?'CURRENTLY_NOT_ALIGNED':checks.length?'CHECK_PUBLISHER_CRITERIA':'POTENTIAL_FIT_TO_EXPLORE',
      preparationPercent,missingArtifacts,checks,reviewExpired,
    } satisfies FundingMatch;
  }).sort((a,b)=>{
    const rank:Record<MatchState,number>={POTENTIAL_FIT_TO_EXPLORE:0,CHECK_PUBLISHER_CRITERIA:1,CURRENTLY_NOT_ALIGNED:2};
    return rank[a.state]-rank[b.state] || b.preparationPercent-a.preparationPercent || a.programme.id.localeCompare(b.programme.id);
  });
}
const clean = (s:string,max:number) => typeof s==='string'?s.replace(/[\r\n\t]+/g,' ').trim().slice(0,max):'';
export function buildCapitalPreparationDraft(match:FundingMatch,profile:CapitalProfile,
    projectName:string,projectSummary:string):string {
  validateProfile(profile);
  if(!CAPITAL_PROGRAMMES.includes(match.programme))throw bad();
  const missing=match.missingArtifacts.map(a=>'- '+ARTIFACT_LABELS[a]).join('\n') || '- None self-reported missing';
  return [
    'LUQI CAPITAL INTELLIGENCE — REVIEW DRAFT',
    'This is a preparation worksheet, NOT a verified grant application.',
    'No application has been submitted. No funding is promised.',
    'Project: '+(clean(projectName,80)||'Not specified'),
    'Project description: '+(clean(projectSummary,400)||'Not supplied'),
    'Project stage: '+profile.maturity+' | Sector: '+profile.sector+' | Intended use: '+profile.purpose,
    '',
    'Programme reference: '+match.programme.name,
    'Organisation: '+match.programme.organisation,
    'Geographic scope: '+match.programme.scope,
    'Programme support type: '+match.programme.type,
    'Official programme page: '+match.programme.sourceUrl,
    'Application guidance: '+match.programme.applicationGuideUrl,
    'Publisher review date: '+match.programme.reviewedOn,
    'CURRENT FUNDING WINDOW: NOT VERIFIED — check the current original call.',
    'Indicative fit: '+match.state+' (not an eligibility finding)',
    'Suggested preparation items — not a certified call checklist:',
    ...match.programme.suggestedArtifacts.map(a=>'- '+ARTIFACT_LABELS[a]),
    'Self-reported missing preparation items:',
    missing,
    'Checks to resolve:',
    ...(match.checks.length?match.checks.map(s=>'- '+s):['- Confirm the actual live call, deadlines and original requirements.']),
    '',
    'NEXT: Open the publisher’s current call and review its specific rules and official forms.',
    'Do not share identity documents, tax records or proprietary source code with Luqi in this tool.',
    'No data was uploaded or sent to the publisher by this worksheet.',
  ].join('\n');
}
