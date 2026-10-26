/**
 * LUQI Rights Guide, South Africa. Public educational source notes only.
 * This file contains no account identifiers, form submission, web requests or AI calls.
 * Source review is not a legal opinion or a professional language-quality review.
 */
export const RIGHTS_REVIEWED_ON = '2026-10-26';
export const RIGHTS_RECHECK_AFTER = '2026-11-02';

export type RightsSourceId =
  | 'unhcr-asylum' | 'government-service' | 'court-ruling'
  | 'government-withdrawal' | 'government-transition' | 'unhcr-rights' | 'unhcr-legal-aid';

export interface RightsSource {
  id: RightsSourceId;
  title: string;
  url: string;
  publisher: string;
  reviewedOn: string;
}

export const RIGHTS_SOURCES: readonly RightsSource[] = [
  {
    id: 'unhcr-asylum',
    title: 'Asylum and refugee status: procedure, interviews and decisions',
    url: 'https://help.unhcr.org/southafrica/topics/asylum/',
    publisher: 'UNHCR South Africa',
    reviewedOn: RIGHTS_REVIEWED_ON,
  },
  {
    id: 'government-service',
    title: 'Asylum-seeker and refugee documents',
    url: 'https://www.gov.za/services/services-foreign-nationals/temporary-residence/asylum-seeker-and-refugee-permits',
    publisher: 'South African Government',
    reviewedOn: RIGHTS_REVIEWED_ON,
  },
  {
    id: 'court-ruling',
    title: 'Scalabrini Centre v Minister of Home Affairs, Constitutional Court, 7 July 2026',
    url: 'https://www.concourt.org.za/index.php/judgement/650-scalabrini-centre-of-cape-town-and-another-v-minister-of-home-affairs-and-others-cct126-25',
    publisher: 'Constitutional Court of South Africa',
    reviewedOn: RIGHTS_REVIEWED_ON,
  },
  {
    id: 'government-withdrawal',
    title: '9 October 2026: Home Affairs withdraws earlier asylum intake directive',
    url: 'https://www.gov.za/news/media-statements/home-affairs-director-general-withdraws-asylum-directive-09-oct-2026',
    publisher: 'South African Government / Department of Home Affairs',
    reviewedOn: RIGHTS_REVIEWED_ON,
  },
  {
    id: 'government-transition',
    title: '11 October 2026 official briefing: proposed asylum-registration changes',
    url: 'https://www.gov.za/news/media-statements/inter-ministerial-committee-migration-outlines-legal-response-constitutional',
    publisher: 'South African Government / Inter-Ministerial Committee',
    reviewedOn: RIGHTS_REVIEWED_ON,
  },
  {
    id: 'unhcr-rights',
    title: 'Rights and legal protection, including detention',
    url: 'https://help.unhcr.org/southafrica/rights-legal-protection/',
    publisher: 'UNHCR South Africa',
    reviewedOn: RIGHTS_REVIEWED_ON,
  },
  {
    id: 'unhcr-legal-aid',
    title: 'Legal assistance and recognised referral organisations',
    url: 'https://help.unhcr.org/southafrica/topics/legal-assistance/',
    publisher: 'UNHCR South Africa',
    reviewedOn: RIGHTS_REVIEWED_ON,
  },
] as const;

export type RightsTopic = 'starting' | 'interview' | 'documents' | 'decision' | 'urgent';
export interface RightsInformation {
  id: string;
  topic: RightsTopic;
  title: string;
  explanation: string;
  sources: readonly RightsSourceId[];
}

export const RIGHTS_TOPICS: readonly { id: RightsTopic; label: string }[] = [
  { id: 'starting', label: 'Starting an application' },
  { id: 'interview', label: 'Interview and interpreter' },
  { id: 'documents', label: 'Your documents' },
  { id: 'decision', label: 'Decisions and appeals' },
  { id: 'urgent', label: 'Urgent legal support' },
];

export const RIGHTS_INFORMATION: readonly RightsInformation[] = [
  {
    id: 'begin',
    topic: 'starting',
    title: 'Find the current official application route',
    explanation: 'UNHCR’s general guide describes Refugee Reception Office applications. On 9 October 2026 Home Affairs withdrew an earlier operational directive. On 11 October government announced a proposed phased intention-registration and appointment system expected by 10 November 2026. Neither announcement establishes that the new platform is operating. Check current official instructions or seek recognised legal assistance before travelling or making arrangements.',
    sources: ['unhcr-asylum', 'government-withdrawal', 'government-transition'],
  },
  {
    id: 'court',
    topic: 'starting',
    title: 'A 2026 court decision concerns access, not automatic approval',
    explanation: 'On 7 July 2026 the Constitutional Court confirmed that certain procedural exclusions under the Refugees Act were invalid. The decision does not automatically grant refugee status to an applicant. If entry or reporting rules affect your situation, seek qualified legal help.',
    sources: ['court-ruling', 'government-transition'],
  },
  {
    id: 'interpreter',
    topic: 'interview',
    title: 'Ask for an interpreter if needed',
    explanation: 'UNHCR says an asylum applicant who does not speak or understand English may request an interpreter during the refugee-status interview. Ask officials to explain anything you do not understand, and speak truthfully. LUQI does not supply a legally certified interpreter.',
    sources: ['unhcr-asylum'],
  },
  {
    id: 'documents',
    topic: 'documents',
    title: 'Understand Section 22 and Section 24',
    explanation: 'UNHCR distinguishes an asylum-seeker document (often called Section 22) from refugee recognition documentation (Section 24). Public government and UNHCR pages disagree on generic Section 24 document validity periods; do not infer the expiry of your own document from either summary. Keep official notices securely and confirm the terms on your issued document with Home Affairs or qualified legal assistance.',
    sources: ['unhcr-asylum', 'government-service'],
  },
  {
    id: 'appeals',
    topic: 'decision',
    title: 'A refusal or appeal may need urgent professional action',
    explanation: 'If you receive a refusal, request and preserve the written decision, and contact a qualified legal-assistance organisation promptly. The correct procedure and deadline depend on the type and circumstances of the decision. LUQI does not calculate your deadline or prepare an official appeal.',
    sources: ['unhcr-asylum', 'unhcr-legal-aid'],
  },
  {
    id: 'detention',
    topic: 'urgent',
    title: 'Detention, removal threats or immediate deadlines',
    explanation: 'If you are detained, threatened with deportation or facing an immediate legal deadline, seek qualified legal help promptly. UNHCR lists rights-and-protection information and legal-assistance partners. LUQI cannot intervene in a case or guarantee an outcome.',
    sources: ['unhcr-rights', 'unhcr-legal-aid'],
  },
];

export interface RightsLanguage {
  code: string;
  name: string;
  sourceLinkedTextAvailable: boolean;
}
export const RIGHTS_LANGUAGES: readonly RightsLanguage[] = [
  { code: 'en', name: 'English (source-linked explanation)', sourceLinkedTextAvailable: true },
  { code: 'sepitori', name: 'Sepitori — native-speaker review needed', sourceLinkedTextAvailable: false },
  { code: 'nso', name: 'Sepedi — review needed', sourceLinkedTextAvailable: false },
  { code: 'tn', name: 'Setswana — review needed', sourceLinkedTextAvailable: false },
  { code: 'st', name: 'Sesotho — review needed', sourceLinkedTextAvailable: false },
  { code: 'zu', name: 'isiZulu — review needed', sourceLinkedTextAvailable: false },
  { code: 'xh', name: 'isiXhosa — review needed', sourceLinkedTextAvailable: false },
  { code: 'ts', name: 'itsonga — review needed', sourceLinkedTextAvailable: false },
  { code: 've', name: 'Tshivenda — review needed', sourceLinkedTextAvailable: false },
  { code: 'ss', name: 'siSwati — review needed', sourceLinkedTextAvailable: false },
  { code: 'sn', name: 'Shona — review needed', sourceLinkedTextAvailable: false },
  { code: 'sw', name: 'Kiswahili — review needed', sourceLinkedTextAvailable: false },
  { code: 'so', name: 'Somali — review needed', sourceLinkedTextAvailable: false },
  { code: 'am', name: 'Amharic — review needed', sourceLinkedTextAvailable: false },
  { code: 'fr', name: 'French — review needed', sourceLinkedTextAvailable: false },
  { code: 'pt', name: 'Portuguese — review needed', sourceLinkedTextAvailable: false },
] as const;

export function legalInformationIsCurrent(now: Date = new Date()): boolean {
  const time = now.getTime();
  return Number.isFinite(time) && time >= Date.parse('2026-10-26T00:00:00+02:00')
    && time <= Date.parse('2026-11-02T23:59:59+02:00');
}

export function rightsLanguageHasSourceLinkedText(code: string): boolean {
  return RIGHTS_LANGUAGES.some(language => language.code === code && language.sourceLinkedTextAvailable);
}

export function rightsSourcesFor(item: RightsInformation): RightsSource[] {
  return item.sources.map(id => {
    const source = RIGHTS_SOURCES.find(entry => entry.id === id);
    if (!source) throw new Error('Rights guide source metadata missing');
    return source;
  });
}
