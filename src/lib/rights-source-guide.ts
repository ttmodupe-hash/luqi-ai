/**
 * LUQI Rights Guide, South Africa. Public educational source notes only.
 * This file contains no account identifiers, form submission, web requests or AI calls.
 * Source review is not a legal opinion or a professional language-quality review.
 */
export const RIGHTS_REVIEWED_ON = '2026-10-26';
export const RIGHTS_RECHECK_AFTER = '2026-11-02';

export type RightsSourceId =
  | 'unhcr-asylum' | 'government-service' | 'court-ruling'
  | 'government-transition' | 'unhcr-rights' | 'unhcr-legal-aid';

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
    id: 'government-transition',
    title: '11 October 2026 announcement: proposed asylum-registration changes',
    url: 'https://www.sanews.gov.za/index.php/south-africa/government-seek-court-guidance-asylum-ruling-introduce-registration-system',
    publisher: 'SAnews / South African Government',
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
    explanation: 'UNHCR explains how asylum applications are handled through Refugee Reception Offices. On 11 October 2026 government announced a proposed new intention-registration and appointment system, expected by 10 November. That announcement did not verify the system was operating. Check the latest official instructions before travelling, making a booking or sharing documents.',
    sources: ['unhcr-asylum', 'government-transition'],
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
    explanation: 'UNHCR distinguishes an asylum-seeker document (often called Section 22) from refugee recognition documentation (Section 24). Keep copies of official notices and your own documents safely. Check the expiry and conditions on the actual issued document; do not rely on generic validity periods.',
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
