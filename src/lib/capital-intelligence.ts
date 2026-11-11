/**
 * Luqi Capital Intelligence: source-bound programme REFERENCE matching.
 * No investor access, live call detection, approval prediction or submission.
 * All input remains local to this browser view and is never sent to an API.
 */
export type FundingType = 'SOVEREIGN_FUND' | 'DEVELOPMENT_FINANCE' | 'VENTURE_CAPITAL' | 'DECENTRALIZED_GRANT' | 'CROWDFUNDING' | 'GRANT' | 'INNOVATION_CHALLENGE' | 'SUPPORT_PROGRAMME';
export type FundingScope = 'SOUTH_AFRICA' | 'PAN_AFRICA' | 'GLOBAL';
export const FUNDING_SCOPE_LABELS:Readonly<Record<FundingScope,string>>=Object.freeze({
  SOUTH_AFRICA:'South Africa',PAN_AFRICA:'Across Africa',GLOBAL:'International',
});
export const FUNDING_TYPE_LABELS:Readonly<Record<FundingType,string>>=Object.freeze({
  SOVEREIGN_FUND:'Public funding',DEVELOPMENT_FINANCE:'Development finance',
  VENTURE_CAPITAL:'Venture capital',DECENTRALIZED_GRANT:'Decentralized grant',
  CROWDFUNDING:'Crowdfunding',GRANT:'Grant / seed support',INNOVATION_CHALLENGE:'Innovation challenge',SUPPORT_PROGRAMME:'Incubation / mentorship',
});
/** Project location only. Does not establish citizenship, residency or programme eligibility. */
export const AFRICAN_COUNTRIES = Object.freeze([
  ['DZ','Algeria'],
  ['AO','Angola'],
  ['BJ','Benin'],
  ['BW','Botswana'],
  ['BF','Burkina Faso'],
  ['BI','Burundi'],
  ['CV','Cabo Verde'],
  ['CM','Cameroon'],
  ['CF','Central African Republic'],
  ['TD','Chad'],
  ['KM','Comoros'],
  ['CG','Congo (Republic)'],
  ['CD','DR Congo'],
  ['CI','Côte d’Ivoire'],
  ['DJ','Djibouti'],
  ['EG','Egypt'],
  ['GQ','Equatorial Guinea'],
  ['ER','Eritrea'],
  ['SZ','Eswatini'],
  ['ET','Ethiopia'],
  ['GA','Gabon'],
  ['GM','Gambia'],
  ['GH','Ghana'],
  ['GN','Guinea'],
  ['GW','Guinea-Bissau'],
  ['KE','Kenya'],
  ['LS','Lesotho'],
  ['LR','Liberia'],
  ['LY','Libya'],
  ['MG','Madagascar'],
  ['MW','Malawi'],
  ['ML','Mali'],
  ['MR','Mauritania'],
  ['MU','Mauritius'],
  ['MA','Morocco'],
  ['MZ','Mozambique'],
  ['NA','Namibia'],
  ['NE','Niger'],
  ['NG','Nigeria'],
  ['RW','Rwanda'],
  ['ST','São Tomé and Príncipe'],
  ['SN','Senegal'],
  ['SC','Seychelles'],
  ['SL','Sierra Leone'],
  ['SO','Somalia'],
  ['ZA','South Africa'],
  ['SS','South Sudan'],
  ['SD','Sudan'],
  ['TZ','Tanzania'],
  ['TG','Togo'],
  ['TN','Tunisia'],
  ['UG','Uganda'],
  ['ZM','Zambia'],
  ['ZW','Zimbabwe'],
] as const);
export type AfricanCountryCode = typeof AFRICAN_COUNTRIES[number][0];
export type FundingCountry = AfricanCountryCode | 'OTHER';
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
export const CAPITAL_GLOBAL_SOURCES_REVIEWED_ON = '2026-11-03';
export const CAPITAL_SOURCE_RECHECK_ON = '2026-12-02';
export interface FundingPlatformSpec {
  readonly id:string;
  readonly name:string;
  readonly organisation:string;
  readonly type:FundingType;
  readonly scope:FundingScope;
  /** Original publisher's geographical scope; not a country-level eligibility certificate. */
  readonly scopeNote:string;
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
  readonly country:FundingCountry;
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
const ALLOWED_PUBLISHERS = new Set([
  'www.tia.org.za','www.idc.co.za','www.nyda.gov.za',
  'www.tonyelumelufoundation.org','www.aecfafrica.org','afawa.afdb.org',
  'www.globalinnovation.fund','solve.mit.edu','www.undp.org','sgp.undp.org',
]);
const AFRICAN_CODES = new Set<string>(AFRICAN_COUNTRIES.map(c=>c[0]));
const SCOPES = new Set<FundingScope>(['SOUTH_AFRICA','PAN_AFRICA','GLOBAL']);
const ARTIFACTS = new Set<Artifact>(Object.keys(ARTIFACT_LABELS) as Artifact[]);
const TYPES = new Set<FundingType>(['SOVEREIGN_FUND','DEVELOPMENT_FINANCE','VENTURE_CAPITAL','DECENTRALIZED_GRANT','CROWDFUNDING','GRANT','INNOVATION_CHALLENGE','SUPPORT_PROGRAMME']);
const SECTORS = new Set<ProjectSector>(['TECH','INDUSTRY','OTHER']);
const STAGES = new Set<ProjectMaturity>(['IDEA','MVP','PRODUCTION']);
const PURPOSES = new Set<ProjectPurpose>(['R_AND_D_SEED','BUSINESS_GROWTH','INDUSTRIAL_EXPANSION']);
const REGISTRATIONS = new Set<Registration>(['REGISTERED','NOT_REGISTERED','UNKNOWN']);
const bad = () => new Error('INVALID_CAPITAL_PROFILE_OR_SOURCE');
/** A provenance stamp must be a real Gregorian calendar day, not just YYYY-MM-DD-shaped. */
function validPublisherReviewDate(raw:unknown):raw is string {
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
  const timestamp=Date.parse(raw+'T00:00:00.000Z');
  // A future stamp cannot be evidence that a publisher was already reviewed. South Africa has fixed UTC+02:00.
  const todaySast=new Date(Date.now()+2*60*60*1000).toISOString().slice(0,10);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0,10)===raw && raw<=todaySast;
}

/** Reject malformed/outside sources, clone nested data, and deep-freeze public specs. */
export function normalizeFundingPlatform(input:FundingPlatformSpec):FundingPlatformSpec {
  if (!input || typeof input !== 'object' ||
      typeof input.id !== 'string' || !/^[a-z0-9-]{2,64}$/.test(input.id) ||
      typeof input.name !== 'string' || input.name.trim().length < 3 ||
      input.name.length > 120 || typeof input.organisation !== 'string' ||
      input.organisation.length < 3 || input.organisation.length > 100 ||
      !TYPES.has(input.type) || !SCOPES.has(input.scope) ||
      typeof input.scopeNote !== 'string' || !input.scopeNote.trim() ||
      input.scopeNote.length > 350 || input.sourceStatus !== 'PROGRAMME_REFERENCE_ONLY' ||
      !validPublisherReviewDate(input.reviewedOn) ||
      !Array.isArray(input.focusSectors) || !input.focusSectors.length ||
      !Array.from(input.focusSectors).every(s=>SECTORS.has(s)) ||
      !Array.isArray(input.suggestedArtifacts) ||
      (!Array.from(input.suggestedArtifacts).every(a=>ARTIFACTS.has(a)) ||
       new Set(input.suggestedArtifacts).size !== input.suggestedArtifacts.length) ||
      !Array.isArray(input.selectionNotes) ||
      !Array.from(input.selectionNotes).every(s=>typeof s === 'string' && s.length <= 400) ||
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
  // Array.from above visits sparse-array holes; Array.every alone would skip them
  // and could falsely count missing suggested documents as already prepared.
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
    type:input.type,scope:input.scope,scopeNote:input.scopeNote.trim(),
    sourceUrl:input.sourceUrl,applicationGuideUrl:input.applicationGuideUrl,
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
    id:'tia-seed-fund',name:'TIA Seed Fund',organisation:'Technology Innovation Agency',
    type:'SOVEREIGN_FUND',scope:'SOUTH_AFRICA',
    scopeNote:'South African innovation funding. Verify the specific instrument and any citizenship, residence or company rules.',
    sourceUrl:'https://www.tia.org.za/funding-instruments/',
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
    id:'idc-development-finance',name:'IDC Development Finance',organisation:'Industrial Development Corporation',
    type:'DEVELOPMENT_FINANCE',scope:'SOUTH_AFRICA',
    scopeNote:'South African industrial-development finance; not a non-repayable grant.',
    sourceUrl:'https://www.idc.co.za/faq/',
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
    id:'nyda-grant-programme',name:'NYDA Grant Programme',organisation:'National Youth Development Agency',
    type:'SOVEREIGN_FUND',scope:'SOUTH_AFRICA',
    scopeNote:'South African youth enterprise support with citizenship, age and other exclusions.',
    sourceUrl:'https://www.nyda.gov.za/Products-Services/NYDA-Grant-Programme.html',
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
    id:'tef-entrepreneurship',name:'Tony Elumelu Foundation Entrepreneurship Programme',
    organisation:'Tony Elumelu Foundation',type:'GRANT',scope:'PAN_AFRICA',
    scopeNote:'The 2026 publisher programme welcomes entrepreneurs from all 54 African countries; residency, business age and cohort-specific rules apply.',
    sourceUrl:'https://www.tonyelumelufoundation.org/tef-entrepreneurship-programme',
    applicationGuideUrl:'https://www.tonyelumelufoundation.org/tef-entrepreneurship-programme',
    reviewedOn:CAPITAL_GLOBAL_SOURCES_REVIEWED_ON,sourceStatus:'PROGRAMME_REFERENCE_ONLY',
    focusSectors:['TECH','INDUSTRY','OTHER'],
    suggestedArtifacts:['CONCEPT_NOTE','BUSINESS_PLAN','FINANCIAL_PLAN','PITCH_DECK'],
    selectionNotes:[
      'The 2026 official programme page describes business ideas or businesses up to five years old; an older FAQ contains conflicting business-age figures. Confirm the specific cohort.',
      'Applicants must meet residence, age and training requirements and have not benefited from an earlier TEF award.',
      'The 2026 published application round is past; do not assume applications are open today.',
    ],conditions:{minimumAge:18},
  }),
  normalizeFundingPlatform({
    id:'aecf-challenge-finance',name:'AECF Enterprise Challenge Finance',
    organisation:'Africa Enterprise Challenge Fund',type:'DEVELOPMENT_FINANCE',scope:'PAN_AFRICA',
    scopeNote:'Competition-based support for selected sub-Saharan African countries and sectors, not blanket eligibility in all African countries.',
    sourceUrl:'https://www.aecfafrica.org/approach/competitions/',
    applicationGuideUrl:'https://www.aecfafrica.org/im-looking-to/see-aecfs-funding-opportunities/',
    reviewedOn:CAPITAL_GLOBAL_SOURCES_REVIEWED_ON,sourceStatus:'PROGRAMME_REFERENCE_ONLY',
    focusSectors:['TECH','INDUSTRY','OTHER'],
    suggestedArtifacts:['CONCEPT_NOTE','BUSINESS_PLAN','FINANCIAL_PLAN'],
    selectionNotes:[
      'AECF finances commercially viable enterprises in agriculture, renewable energy, climate resilience and rural services.',
      'Individual competitions specify the exact country, eligible applicant, matching finance and deadline; some awards are repayable.',
      'AECF states it does not charge applicants during the application process.',
    ],conditions:{},
  }),
  normalizeFundingPlatform({
    id:'afawa-partner-finance',name:'AFAWA Partner Finance',
    organisation:'African Development Bank AFAWA',type:'DEVELOPMENT_FINANCE',scope:'PAN_AFRICA',
    scopeNote:'Access is through participating financial institutions for women-owned African SMEs; this is not a direct AfDB cash-grant application.',
    sourceUrl:'https://afawa.afdb.org/pillars/access-to-finance',
    applicationGuideUrl:'https://afawa.afdb.org/pillars/access-to-finance',
    reviewedOn:CAPITAL_GLOBAL_SOURCES_REVIEWED_ON,sourceStatus:'PROGRAMME_REFERENCE_ONLY',
    focusSectors:['TECH','INDUSTRY','OTHER'],
    suggestedArtifacts:['BUSINESS_PLAN','FINANCIAL_PLAN','REGISTRATION_PROOF'],
    selectionNotes:[
      'The African Development Bank describes partner-bank financing, risk sharing and guarantees for women-led enterprises.',
      'Find an actual participating lender, current geographic coverage, interest rates and terms before treating this as an accessible loan.',
      'No gender, financial or identity records are collected or inferred by Luqi.',
    ],conditions:{},
  }),
  normalizeFundingPlatform({
    id:'global-innovation-fund',name:'Global Innovation Fund',
    organisation:'Global Innovation Fund',type:'DEVELOPMENT_FINANCE',scope:'GLOBAL',
    scopeNote:'Organisations can be based anywhere, but their innovations must benefit people living in poverty in developing countries.',
    sourceUrl:'https://www.globalinnovation.fund/what-we-fund',
    applicationGuideUrl:'https://www.globalinnovation.fund/frequently-asked-questions',
    reviewedOn:CAPITAL_GLOBAL_SOURCES_REVIEWED_ON,sourceStatus:'PROGRAMME_REFERENCE_ONLY',
    focusSectors:['TECH','INDUSTRY','OTHER'],
    suggestedArtifacts:['CONCEPT_NOTE','PROTOTYPE_PROOF','BUSINESS_PLAN','FINANCIAL_PLAN'],
    selectionNotes:[
      'GIF states that for-profit, nonprofit, government and research organisations may apply; individual innovators should use an affiliated organisation.',
      'Impact on people in poverty in developing countries is central; applicant location alone does not confer eligibility.',
      'Investment instruments, round availability, due diligence and impact evidence must be checked with GIF.',
    ],conditions:{},
  }),
  normalizeFundingPlatform({
    id:'mit-solve-challenges',name:'MIT Solve Global Challenges',
    organisation:'MIT Solve',type:'INNOVATION_CHALLENGE',scope:'GLOBAL',
    scopeNote:'Global open-innovation challenges invite technology-based solutions worldwide; each challenge has its own deadline and prize rules.',
    sourceUrl:'https://solve.mit.edu/challenges',
    applicationGuideUrl:'https://solve.mit.edu/challenges',
    reviewedOn:CAPITAL_GLOBAL_SOURCES_REVIEWED_ON,sourceStatus:'PROGRAMME_REFERENCE_ONLY',
    focusSectors:['TECH','INDUSTRY','OTHER'],
    suggestedArtifacts:['CONCEPT_NOTE','PROTOTYPE_PROOF','PITCH_DECK'],
    selectionNotes:[
      'MIT Solve describes global challenge-based innovation competitions, not automatic venture investment or a guaranteed grant.',
      'The 2027 Global Economic Prosperity Challenge closed on 6 November 2026 at 12:00 EST (19:00 SAST); this is historical, not a live application window.',
      'MIT Solve Global Challenges generally require a functioning prototype or later; concept-stage ideas are reviewed only under the Indigenous Communities Fellowship, focused on Indigenous innovators and communities in the United States and Canada. This is not a general worldwide idea-stage exception; other criteria vary.',
    ],conditions:{},
  }),

  normalizeFundingPlatform({
    id:'timbuktoo-creativetech',name:'UNDP timbuktoo CreativeTech Launchpad',
    organisation:'United Nations Development Programme',type:'SUPPORT_PROGRAMME',scope:'PAN_AFRICA',
    scopeNote:'Incubation for Africa-based startups or teams targeting African creative markets; not a cash-grant award.',
    sourceUrl:'https://www.undp.org/south-africa/press-releases/undp-launches-call-applications-creativetech-startups-join-timbuktoo-launchpad',
    applicationGuideUrl:'https://www.undp.org/south-africa/press-releases/undp-launches-call-applications-creativetech-startups-join-timbuktoo-launchpad',
    reviewedOn:'2026-11-11',sourceStatus:'PROGRAMME_REFERENCE_ONLY',
    focusSectors:['TECH','OTHER'],suggestedArtifacts:['CONCEPT_NOTE','PROTOTYPE_PROOF','PITCH_DECK'],
    selectionNotes:[
      'UNDP describes incubation, mentorship and investment readiness, not a guaranteed cash award.',
      'UNDP requires a prototype/MVP, a committed founding team and a creative-economy technology solution.',
      'The 30 June 2026 notice mentions rolling quarterly cohorts. Confirm an actual current intake with UNDP.',
    ],conditions:{},
  }),
  normalizeFundingPlatform({
    id:'timbuktoo-greentech',name:'UNDP timbuktoo GreenTech Launchpad',
    organisation:'United Nations Development Programme',type:'SUPPORT_PROGRAMME',scope:'PAN_AFRICA',
    scopeNote:'Climate-tech incubation for African ventures or startups targeting African green markets, not cash-grant funding.',
    sourceUrl:'https://www.undp.org/kenya/news/call-applications-join-timbuktoo-launchpad-greentech-startups',
    applicationGuideUrl:'https://www.undp.org/kenya/news/call-applications-join-timbuktoo-launchpad-greentech-startups',
    reviewedOn:'2026-11-11',sourceStatus:'PROGRAMME_REFERENCE_ONLY',
    focusSectors:['TECH','INDUSTRY','OTHER'],suggestedArtifacts:['CONCEPT_NOTE','PROTOTYPE_PROOF','PITCH_DECK'],
    selectionNotes:[
      'UNDP describes climate and environmental startup incubation, mentorship and investment readiness, not an awarded grant.',
      'UNDP requires a prototype/MVP, a committed team and a clearly defined climate or environmental challenge.',
      'The 29 July 2026 notice describes rolling quarterly cohorts; verify actual current intake with UNDP.',
    ],conditions:{},
  }),
  normalizeFundingPlatform({
    id:'gef-small-grants',name:'GEF Small Grants Programme',
    organisation:'Global Environment Facility / GEF SGP',type:'GRANT',scope:'GLOBAL',
    scopeNote:'Community-based and civil-society environmental projects in participating country programmes; not general startup capital.',
    sourceUrl:'https://sgp.undp.org/',applicationGuideUrl:'https://sgp.undp.org/',
    reviewedOn:'2026-11-11',sourceStatus:'PROGRAMME_REFERENCE_ONLY',
    focusSectors:['TECH','INDUSTRY','OTHER'],suggestedArtifacts:['CONCEPT_NOTE','BUSINESS_PLAN'],
    selectionNotes:[
      'GEF SGP offers financial and technical support for community-driven environmental and sustainable-livelihood initiatives.',
      'An ordinary for-profit startup is not automatically eligible; check organisation, implementing agency and country conditions.',
      'Local proposal formats, participation and deadlines vary; Luqi has not verified any current national application window.',
    ],conditions:{},
  }),
]);
export function capitalReviewIsCurrent(now:Date=new Date()):boolean {
  return Number.isFinite(now.getTime()) &&
    now.getTime() <= Date.parse(CAPITAL_SOURCE_RECHECK_ON+'T23:59:59+02:00');
}
function validateProfile(profile:CapitalProfile):void {
  if (!profile || (profile.country !== 'OTHER' && !AFRICAN_CODES.has(profile.country)) ||
    !STAGES.has(profile.maturity) || !SECTORS.has(profile.sector) ||
    !PURPOSES.has(profile.purpose) || !REGISTRATIONS.has(profile.registration) ||
    (profile.age !== undefined && (!Number.isInteger(profile.age) || profile.age < 0 || profile.age > 120)) ||
    !Array.isArray(profile.availableArtifacts) ||
    profile.availableArtifacts.length > ARTIFACTS.size ||
    (!Array.from(profile.availableArtifacts).every(a=>ARTIFACTS.has(a)) ||
     new Set(profile.availableArtifacts).size !== profile.availableArtifacts.length)) throw bad();
}
export function matchCapitalProgrammes(profile:CapitalProfile,now:Date=new Date()):FundingMatch[] {
  validateProfile(profile);
  const present=new Set(profile.availableArtifacts), reviewExpired=!capitalReviewIsCurrent(now);
  return CAPITAL_PROGRAMMES.map(programme=>{
    const checks:string[]=[];
    let mismatch=false;
    if(programme.scope==='SOUTH_AFRICA' && profile.country!=='ZA') {
      mismatch=true;
      checks.push('This South African programme is not presented as available to projects outside South Africa; verify any cross-border exceptions with the publisher.');
    }
    if(programme.scope==='PAN_AFRICA' && profile.country==='OTHER') {
      if(programme.id.startsWith('timbuktoo-'))
        checks.push('UNDP may consider teams serving African markets; outside-Africa project location alone cannot establish eligibility.');
      else {
        mismatch=true;
        checks.push('This African programme does not publish a general route for projects based outside Africa.');
      }
    }
    if(programme.scope!=='SOUTH_AFRICA' && !mismatch)
      checks.push('Check the exact country, applicant residence, registration, instrument and call-specific restrictions with the publisher.');
    if(!programme.focusSectors.includes(profile.sector))
      checks.push('Check whether the project sector fits this organisation’s published mandate.');
    if(programme.conditions.requiresRegisteredBusiness && profile.registration !== 'REGISTERED')
      checks.push('IDC expects a registered business; confirm registration before a real application.');
    if(programme.conditions.minimumAge !== undefined || programme.conditions.maximumAge !== undefined) {
      if(profile.age === undefined) checks.push('Confirm founder age and the programme’s age and timing requirements.');
      else if((programme.conditions.minimumAge !== undefined && profile.age < programme.conditions.minimumAge) ||
              (programme.conditions.maximumAge !== undefined && profile.age > programme.conditions.maximumAge)) {
        mismatch=true;checks.push('The stated founder age falls outside '+programme.name+' published age rules.');
      }
    }
    if(programme.conditions.excludesResearchSeed && profile.purpose === 'R_AND_D_SEED') {
      mismatch=true;checks.push('NYDA explicitly excludes research-and-development seed funding.');
    }
    if(programme.id === 'tia-seed-fund' && profile.maturity === 'IDEA')
      checks.push('TIA may require proven proof of concept; confirm the instrument’s technology readiness rules.');
    if(programme.id === 'idc-development-finance' && profile.maturity === 'IDEA')
      checks.push('IDC examines bankability, viability and owner contribution, which an idea alone may not demonstrate.');
    if(programme.id === 'tef-entrepreneurship')
      checks.push('The published 2026 TEF Entrepreneurship Programme application window was 1 January to 1 March 2026 and has closed. This does not establish an open 2027 round; check the latest official TEF announcement before applying.');
    if(programme.id === 'mit-solve-challenges') {
      checks.push('The 2027 Global Economic Prosperity Challenge closed on 6 November 2026 at 12:00 EST (19:00 SAST); this past deadline does not establish any currently open challenge.');
      if(profile.maturity === 'IDEA')
        checks.push('MIT Solve Global Challenges generally require a functioning prototype. Concept-stage ideas are reviewed only under the Indigenous Communities Fellowship, which focuses on Indigenous innovators serving communities in the United States and Canada; it is not a worldwide exception for idea-stage projects. Check the Fellowship and selected challenge separately before applying.');
    }
    if(programme.id.startsWith('timbuktoo-')) {
      checks.push('UNDP timbuktoo offers incubation and investment readiness, NOT a guaranteed cash grant.');
      checks.push('Rolling quarterly cohorts were described in 2026 notices; verify actual current intake.');
      if(profile.maturity==='IDEA') {
        mismatch=true;
        checks.push('UNDP requires a working prototype or MVP and a committed team; an idea alone does not meet the published requirements.');
      }
    }
    if(programme.id==='gef-small-grants')
      checks.push('GEF SGP targets eligible community-based or civil-society environmental projects, not ordinary startup capital; verify national country programmes and local calls.');
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
/** Keep untrusted project text on ONE worksheet line and strip Unicode bidi overrides. */
const clean = (s:string,max:number) => typeof s==='string'
  ? s.replace(/[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u2028\u2029\u202a-\u202e\u2066-\u2069]/g,' ')
      .replace(/\s+/g,' ').trim().slice(0,max)
  : '';
/** Recompute from the current profile: callers must never certify their own fit or checklist. */
export function buildCapitalPreparationDraft(match:FundingMatch,profile:CapitalProfile,
    projectName:string,projectSummary:string,now:Date=new Date()):string {
  validateProfile(profile);
  if(!match || !CAPITAL_PROGRAMMES.includes(match.programme))throw bad();
  const verified=matchCapitalProgrammes(profile,now).find(m=>m.programme===match.programme);
  if(!verified)throw bad();
  const missing=verified.missingArtifacts.map(a=>'- '+ARTIFACT_LABELS[a]).join('\n') || '- None self-reported missing';
  return [
    'LUQI CAPITAL INTELLIGENCE — REVIEW DRAFT',
    'This is a preparation worksheet, NOT a verified grant application.',
    'No application has been submitted. No funding is promised.',
    'Project: '+(clean(projectName,80)||'Not specified'),
    'Project description: '+(clean(projectSummary,400)||'Not supplied'),
    'Project location: '+(AFRICAN_COUNTRIES.find(c=>c[0]===profile.country)?.[1]||'Outside Africa'),
    'Project stage: '+profile.maturity+' | Sector: '+profile.sector+' | Intended use: '+profile.purpose,
    '',
    'Programme reference: '+match.programme.name,
    'Organisation: '+match.programme.organisation,
    'Publisher geographic scope: '+FUNDING_SCOPE_LABELS[match.programme.scope],
    'Geographic restrictions: '+match.programme.scopeNote,
    'Official programme page: '+match.programme.sourceUrl,
    'Application guidance: '+match.programme.applicationGuideUrl,
    'Publisher review date: '+match.programme.reviewedOn,
    'CURRENT FUNDING WINDOW: NOT VERIFIED — check the current original call.',
    'Indicative fit: '+verified.state+' (not an eligibility finding)',
    'Suggested preparation items — not a certified call checklist:',
    ...match.programme.suggestedArtifacts.map(a=>'- '+ARTIFACT_LABELS[a]),
    'Self-reported missing preparation items:',
    missing,
    'Checks to resolve:',
    ...(verified.checks.length?verified.checks.map(s=>'- '+s):['- Confirm the actual live call, deadlines and original requirements.']),
    '',
    'NEXT: Open the publisher’s current call and review its specific rules and official forms.',
    'Do not share identity documents, tax records or proprietary source code with Luqi in this tool.',
    'No data was uploaded or sent to the publisher by this worksheet.',
  ].join('\n');
}
