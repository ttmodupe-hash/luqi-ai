/**
 * KHORO continental guidance data.
 * Five CURATED country anchors and an AU-wide learning view, NOT five AU RECs
 * or legal coverage of every African country. No live government, location,
 * tax, payment, translation, booking or eligibility integration.
 * Sources reviewed 2026-10-26; links are for independent verification.
 */
export const AFRICAN_REGION_CODES = [
  'SADC_ZA', 'EAC_KE', 'ECOWAS_NG', 'NORTH_EG', 'CENTRAL_CM', 'PAN_AFRICAN_AU',
] as const;
export type AfricanRegionCode = typeof AFRICAN_REGION_CODES[number];

export const AU_EIGHT_RECS = [
  'Arab Maghreb Union (UMA)', 'Common Market for Eastern and Southern Africa (COMESA)',
  'Community of Sahel-Saharan States (CEN-SAD)', 'East African Community (EAC)',
  'Economic Community of Central African States (ECCAS)',
  'Economic Community of West African States (ECOWAS)',
  'Intergovernmental Authority on Development (IGAD)',
  'Southern African Development Community (SADC)',
] as const;

export interface SovereignLink { label: string; url: string; }
export interface RegionalSovereignProfile {
  code: AfricanRegionCode;
  country: string;
  title: string;
  flag: string;
  currency: string;
  regionContext: string;
  govPortals: readonly SovereignLink[];
  legalTopics: readonly string[];
  educationAndExamBoards: readonly string[];
  languageExamples: readonly string[];
  crossBorderChecks: readonly string[];
}

export const REVIEWED_ON = '2026-10-26';
export const CONTINENTAL_LINKS: readonly SovereignLink[] = [
  { label: 'African Union: eight regional economic communities', url: 'https://au.int/en/recs' },
  { label: 'AfCFTA rules-of-origin explainer (SA trade department)', url: 'https://www.thedtic.gov.za/sectors-and-services-2/1-4-2-trade-and-export/afcfta-2/' },
  { label: 'PAPSS: how cross-border payments work', url: 'https://papss.com/how-it-works/' },
  { label: 'PAPSS: participating institution requirements', url: 'https://papss.com/get-connected/' },
];

const commonCrossBorder = [
  'Check whether the importing country and product have an applicable AfCFTA tariff schedule and satisfy rules of origin; no automatic duty-free promise.',
  'Check export/import permits, customs classification, standards, taxes and buyer requirements with both authorities.',
  'Ask YOUR bank or PSP whether it participates in PAPSS for the specific corridor, currencies, fees and settlement; LUQI cannot initiate a transfer.',
] as const;

export const AFRICAN_REGIONAL_PROFILES: Readonly<Record<AfricanRegionCode, RegionalSovereignProfile>> = {
  SADC_ZA: {
    code: 'SADC_ZA', country: 'South Africa', title: 'South Africa · Southern Africa',
    flag: '🇿🇦', currency: 'ZAR', regionContext: 'Southern Africa; SADC is one of eight AU-recognised RECs',
    govPortals: [
      { label: 'CIPC BizPortal: company services', url: 'https://www.bizportal.gov.za/' },
      { label: 'South African Revenue Service (SARS)', url: 'https://www.sars.gov.za/' },
      { label: 'South African Government: legislation and services', url: 'https://www.gov.za/' },
    ],
    legalTopics: ['Consumer Protection Act (CPA)', 'National Credit Act (NCA)', 'Protection of Personal Information Act (POPIA)'],
    educationAndExamBoards: ['DBE National Senior Certificate (NSC)', 'IEB (independent assessment)'],
    languageExamples: ['isiZulu', 'isiXhosa', 'Sesotho', 'Setswana', 'Sepedi', 'Sepitori (urban variety; review required)', 'English'],
    crossBorderChecks: commonCrossBorder,
  },
  EAC_KE: {
    code: 'EAC_KE', country: 'Kenya', title: 'Kenya · East Africa',
    flag: '🇰🇪', currency: 'KES', regionContext: 'East Africa; the EAC is one of eight AU-recognised RECs',
    govPortals: [
      { label: 'Kenya eCitizen government services', url: 'https://www.ecitizen.go.ke/' },
      { label: 'Kenya Revenue Authority (KRA) iTax', url: 'https://itax.kra.go.ke/KRA-Portal/' },
      { label: 'Kenya Revenue Authority public tax guidance', url: 'https://www.kra.go.ke/' },
    ],
    legalTopics: ['Kenya Consumer Protection Act', 'Kenya Data Protection Act', 'Central Bank of Kenya financial regulations (verify applicability)'],
    educationAndExamBoards: ['KNEC (examination council)', 'KCSE and current curriculum changes (verify with KNEC)'],
    languageExamples: ['Kiswahili', 'English', 'Kikuyu', 'Luo', 'Luhya (independent review required)'],
    crossBorderChecks: commonCrossBorder,
  },
  ECOWAS_NG: {
    code: 'ECOWAS_NG', country: 'Nigeria', title: 'Nigeria · West Africa',
    flag: '🇳🇬', currency: 'NGN', regionContext: 'West Africa; check current ECOWAS membership and corridor rules',
    govPortals: [
      { label: 'Corporate Affairs Commission (CAC)', url: 'https://www.cac.gov.ng/' },
      { label: 'Federal Ministry of Finance: 2025 tax-law transition', url: 'https://finance.gov.ng/ministry/federal-government-issues-transition-guidelines-for-tax-acts-2025/' },
      { label: 'Nigeria Tax Ombud: current tax authorities', url: 'https://taxombud.gov.ng/about-us/stakeholders/' },
    ],
    legalTopics: ['Federal Competition and Consumer Protection Act', 'Nigeria Data Protection Act', 'Nigeria Tax Acts 2025 effective 2026 (verify current rules)'],
    educationAndExamBoards: ['WAEC / WASSCE', 'NECO', 'JAMB (check current official notice)'],
    languageExamples: ['Yorùbá', 'Igbo', 'Hausa', 'Nigerian Pidgin', 'English'],
    crossBorderChecks: commonCrossBorder,
  },
  NORTH_EG: {
    code: 'NORTH_EG', country: 'Egypt', title: 'Egypt · North Africa',
    flag: '🇪🇬', currency: 'EGP', regionContext: 'North Africa; the Arab Maghreb Union and COMESA are distinct AU-recognised RECs',
    govPortals: [
      { label: 'Egyptian Tax Authority', url: 'https://www.eta.gov.eg/' },
      { label: 'Egyptian Tax Authority online portal', url: 'https://portal.eta.gov.eg/en/home' },
    ],
    legalTopics: ['Egyptian consumer-protection law', 'Egyptian personal-data protection legislation (verify current implementation)'],
    educationAndExamBoards: ['Thanaweya Amma and Egyptian school assessment (verify the current ministry rules)'],
    languageExamples: ['Egyptian Arabic', 'Modern Standard Arabic', 'English'],
    crossBorderChecks: commonCrossBorder,
  },
  CENTRAL_CM: {
    code: 'CENTRAL_CM', country: 'Cameroon', title: 'Cameroon · Central Africa',
    flag: '🇨🇲', currency: 'XAF', regionContext: 'Central Africa; ECCAS and CEMAC are different organisations',
    govPortals: [
      { label: 'Cameroon government services portal', url: 'https://servicepublic.gov.cm/en/' },
      { label: 'Cameroon Ministry of Finance (MINFI)', url: 'https://minfi.gov.cm/' },
    ],
    legalTopics: ['Cameroon national consumer protections (check primary national law)', 'OHADA business law where applicable; not a general consumer code'],
    educationAndExamBoards: ['Cameroon GCE Board', 'Office du Baccalauréat (verify board)'],
    languageExamples: ['French', 'English', 'Ewondo', 'Fulfulde', 'Cameroon Pidgin (quality review required)'],
    crossBorderChecks: commonCrossBorder,
  },
  PAN_AFRICAN_AU: {
    code: 'PAN_AFRICAN_AU', country: 'No country selected', title: 'African Union · continental overview',
    flag: '🌍', currency: 'Country-specific (no continent-wide currency)', regionContext: 'Eight AU-recognised RECs; memberships can overlap',
    govPortals: CONTINENTAL_LINKS,
    legalTopics: ['National law and trade eligibility must be confirmed for each origin and destination; no single continent-wide consumer code'],
    educationAndExamBoards: ['Country-specific examination boards; no AU-wide exam certification'],
    languageExamples: ['African languages are diverse; user or native-speaker review is essential', 'No general translation capability certified'],
    crossBorderChecks: commonCrossBorder,
  },
};

export function isAfricanRegionCode(value: unknown): value is AfricanRegionCode {
  return typeof value === 'string' && (AFRICAN_REGION_CODES as readonly string[]).includes(value);
}

/**
 * Device TIMEZONE is not geolocation, citizenship, residence or legal jurisdiction.
 * Only show a clearly labeled hint for a few distinctive zones, never auto-select
 * the governing law. Johannesburg time is shared beyond South Africa: no hint.
 */
export function suggestRegionFromTimezone(timezone: unknown): AfricanRegionCode | null {
  if (typeof timezone !== 'string') return null;
  const hints: Readonly<Record<string, AfricanRegionCode>> = {
    'Africa/Nairobi': 'EAC_KE', 'Africa/Lagos': 'ECOWAS_NG',
    'Africa/Cairo': 'NORTH_EG', 'Africa/Douala': 'CENTRAL_CM',
  };
  return hints[timezone] ?? null;
}

export function getKhoroCriticalThinkingSteps(problemKind: 'business' | 'trade' | 'study' | 'rights' | 'general'): readonly string[] {
  const lenses = {
    business: 'Map revenues, actual costs, unit margins and the limiting constraint before deciding.',
    trade: 'Identify the actual product, HS classification, country of origin and destination before claiming any preference.',
    study: 'State the concept and assumptions, work one verifiable example, then challenge the result.',
    rights: 'Identify the legal jurisdiction, dated official source, facts and exceptions before forming a conclusion.',
    general: 'Separate facts, assumptions, missing evidence and the decision you can control.',
  } as const;
  return [
    'First principles: ' + lenses[problemKind],
    'Evidence check: which official, dated source or measured number supports this answer?',
    'Continental connection: is there a genuine African supplier, customer or collaboration opportunity? Verify corridor rules first.',
    'Socratic question: which one assumption would most change your next decision if it proved wrong?',
  ];
}

/** System instructions for the EXISTING authenticated budgeted gateway ONLY.
 * Country context may be included only after explicit opt-in. This is not a source
 * of verified live laws, 54-country coverage or certified indigenous translations.
 */
export function buildKhoroContinentalSystemPrompt(code: AfricanRegionCode, languagePreference = 'auto'): string {
  const profile = AFRICAN_REGIONAL_PROFILES[code];
  const lang = profile.languageExamples.includes(languagePreference) ? languagePreference : 'user-requested language (unverified)';
  const sources = profile.govPortals.map(p => p.url).join(' ; ');
  return [
    'You are LUQI-AI / KHORO, a thoughtful educational assistant. Apply critical thinking and cultural specificity.',
    'The user explicitly selected a COUNTRY/VIEW, not their verified physical location, citizenship, or applicable law.',
    'Selected view: ' + profile.country + '. Region context: ' + profile.regionContext + '. Currency context: ' + profile.currency + '.',
    'Language preference: ' + lang + '. Do not claim proficiency or authoritative translation without independent evaluation.',
    'Reason: distinguish root causes from surface symptoms, assumptions from evidence, and compute numbers transparently when possible.',
    'When asked about African intellectual history, attribute arguments to their authors, distinguish evidence from interpretation and disputed claims, and avoid racial essentialism, unsupported mental-health cures or invented citations.',
    'For legal, tax, credit, medical, exams or current travel matters, do not assert specific applicability, court rulings or live facts without verified sources. Say when information is unverified and suggest checking primary official text.',
    'Curated starting points (not fetched or checked during this AI request): ' + sources + '. Never fabricate citations.',
    'For African trade: AfCFTA does NOT make all goods tariff free; eligibility depends on tariff schedules, origin rules, permits and corridor. PAPSS is NOT available at every bank or for every route. Never claim a transfer was made.',
    'Never pretend you accessed government accounts, verified a grant, booked travel, processed a payment, filed a case or contacted a third party. The pilot has no browsing, tools or external-action integration.',
    'End complex strategic explanations with a single practical question testing an assumption, not a mandatory question for emergencies.',
    'Do not request government ID, account credentials, bank data, secret keys or private health case notes. Respect the user and avoid pan-African stereotyping.',
  ].join('\n');
}

/** Opt-in educational reading paths, not clinical treatment or a single official
 * history of Africa. These titles are starting points for checking primary works.
 * Nothing here authorizes a provider call, and no user profile is inferred. */
export const PAN_AFRICAN_STUDY_PATHWAYS = [
  {
    id: 'welsing',
    title: 'Frances Cress Welsing and the nine areas of activity',
    description: 'Examine her account of social institutions, colorism and structural racism, and assess its claims critically.',
    primaryReading: 'Frances Cress Welsing, The Isis Papers: The Keys to the Colors',
    evidenceNote: 'Her psychological and racial theories are contested and must not be presented as established clinical science or a cure.',
    starterPrompt: 'Explain Frances Cress Welsing\'s nine areas of human activity as her own framework. Distinguish her arguments from independently established evidence, discuss major criticisms, avoid racial generalisations or claims of psychological cures, and give one constructive example for education or community wellbeing.',
  },
  {
    id: 'diop',
    title: 'Cheikh Anta Diop and African historical scholarship',
    description: 'Explore African antiquity, Egyptology, linguistics, archaeology and how historical claims are tested.',
    primaryReading: 'Cheikh Anta Diop, The African Origin of Civilization: Myth or Reality',
    evidenceNote: 'Distinguish Diop\'s influential arguments, archaeological findings and ongoing scholarly disagreements. Avoid universal origin claims.',
    starterPrompt: 'Introduce Cheikh Anta Diop\'s contributions to African history and Egyptology. Explain the types of archaeological, linguistic and historical evidence used, which interpretations remain debated, and how a learner can evaluate sources independently.',
  },
  {
    id: 'wilson',
    title: 'Amos N. Wilson and economic self-reliance',
    description: 'Study institutional capacity, cooperative ownership, practical budgeting and locally rooted enterprise.',
    primaryReading: 'Amos N. Wilson, Blueprint for Black Power',
    evidenceNote: 'Treat Wilson\'s political-economic programme as a perspective, not a proven financial return or instruction to exclude others.',
    starterPrompt: 'Explain Amos N. Wilson\'s arguments about economic and institutional independence. Compare them with other development approaches and give a practical, inclusive example of budgeting, cooperative governance and risk controls for a small African business.',
  },
] as const;

export type PanAfricanStudyId = typeof PAN_AFRICAN_STUDY_PATHWAYS[number]['id'];
export function getPanAfricanStudyPrompt(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return PAN_AFRICAN_STUDY_PATHWAYS.find(path => path.id === value)?.starterPrompt ?? null;
}
