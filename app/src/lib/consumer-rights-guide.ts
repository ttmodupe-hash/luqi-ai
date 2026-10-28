/**
 * Public, browser-local, source-linked consumer complaint preparation.
 * Category routing is selected by the user, not inferred or AI-generated.
 * No network requests, accounts, private storage, legal verdicts or auto-sends.
 */
export const CONSUMER_GUIDE_REVIEWED_ON = '2026-10-26';
export const CONSUMER_GUIDE_RECHECK_AFTER = '2026-11-02';
export const MAX_CONSUMER_STORY_LENGTH = 1800;

export type DisputeType =
  | 'UNSURE'
  | 'DEFECTIVE_GOODS'
  | 'UNFAIR_CANCELLATION'
  | 'ONLINE_SCAM'
  | 'UNAUTHORIZED_DEBIT_ORDER'
  | 'POPIA_DATA_BREACH'
  | 'TELCO_BILLING_DISPUTE'
  | 'MASHONISA_ILLEGAL_LOAN'
  | 'DEBT_REVIEW_TRAP';

export type ConsumerSourceId =
  | 'consumer-act' | 'cgso' | 'ncc' | 'ncc-scope'
  | 'bank-ombud' | 'icasa' | 'credit-regulator' | 'information-regulator';

export interface ConsumerSource {
  id: ConsumerSourceId;
  name: string;
  publisher: string;
  url: string;
  reviewedOn: string;
}

export const CONSUMER_SOURCES: readonly ConsumerSource[] = [
  {
    id: 'consumer-act',
    name: 'Consumer Protection Act 68 of 2008 (text and amendments)',
    publisher: 'South African Government',
    url: 'https://www.gov.za/documents/consumer-protection-act',
    reviewedOn: CONSUMER_GUIDE_REVIEWED_ON,
  },
  {
    id: 'cgso',
    name: 'Consumer complaints and assistance',
    publisher: 'Consumer Goods and Services Ombud (CGSO)',
    url: 'https://www.cgso.org.za/consumer/',
    reviewedOn: CONSUMER_GUIDE_REVIEWED_ON,
  },
  {
    id: 'ncc',
    name: 'Lodging a Consumer Protection Act complaint',
    publisher: 'National Consumer Commission (NCC)',
    url: 'https://thencc.org.za/complaints/',
    reviewedOn: CONSUMER_GUIDE_REVIEWED_ON,
  },
  {
    id: 'ncc-scope',
    name: 'Consumer-complaint scope and specialist referrals',
    publisher: 'National Consumer Commission (NCC)',
    url: 'https://thencc.org.za/service-standards/',
    reviewedOn: CONSUMER_GUIDE_REVIEWED_ON,
  },
  {
    id: 'bank-ombud',
    name: 'Financial and banking complaint assistance',
    publisher: 'National Financial Ombud (NFO)',
    url: 'https://nfosa.co.za/',
    reviewedOn: CONSUMER_GUIDE_REVIEWED_ON,
  },
  {
    id: 'icasa',
    name: 'Communications service complaints portal',
    publisher: 'ICASA',
    url: 'https://www.icasa.org.za/pages/consumer-complaints',
    reviewedOn: CONSUMER_GUIDE_REVIEWED_ON,
  },
  {
    id: 'credit-regulator',
    name: 'Credit providers, debt counselling and consumer assistance',
    publisher: 'National Credit Regulator (NCR)',
    url: 'https://www.ncr.org.za/',
    reviewedOn: CONSUMER_GUIDE_REVIEWED_ON,
  },
  {
    id: 'information-regulator',
    name: 'POPIA privacy complaints and official contacts',
    publisher: 'Information Regulator (South Africa)',
    url: 'https://inforegulator.org.za/contact-us/',
    reviewedOn: CONSUMER_GUIDE_REVIEWED_ON,
  },
] as const;

interface IssueGuidance {
  title: string;
  explanation: string;
  questions: readonly string[];
  options: readonly string[];
  sourceIds: readonly ConsumerSourceId[];
}
export const CONSUMER_ISSUES: Readonly<Record<DisputeType, IssueGuidance>> = {
  UNSURE: {
    title: 'Find the right complaint channel',
    explanation: 'Different types of disputes use different laws and regulators. A retail complaint is not necessarily handled by the same body as a bank, employment, municipal or insurance matter. The facts and applicable jurisdiction need review.',
    questions: [
      'Was this about goods, services, credit, a bank, communications or personal information?',
      'What was agreed or advertised, and what evidence is available?',
      'Have you already complained to the supplier or service provider, and was a reference given?',
    ],
    options: [
      'Identify the correct sector and ask the supplier for a recorded response where safe.',
      'Check the NCC scope and referral guidance; a specialist regulator may be more appropriate.',
      'Seek qualified consumer or legal assistance for uncertainty about jurisdiction, deadlines or court proceedings.',
    ],
    sourceIds: ['ncc-scope', 'ncc'],
  },
  DEFECTIVE_GOODS: {
    title: 'Defective or unsafe goods',
    explanation: 'Sections 55 and 56 of the Consumer Protection Act describe quality requirements and possible repair, replacement or refund remedies for qualifying goods. The six-month return provision depends on delivery date, the defect and statutory conditions; it is not a guaranteed remedy for every purchase.',
    questions: [
      'When were the goods delivered, and what exactly failed or was unsafe?',
      'Was the item altered, used contrary to instructions, repaired or sold with a disclosed condition?',
      'What did the retailer offer, and what proof of purchase or defect can you retain?',
    ],
    options: [
      'Put the issue and preferred remedy to the supplier in writing and retain their reply.',
      'If unresolved, check whether CGSO or NCC can consider the complaint.',
      'For injuries, safety risks, refusal or a disputed statutory deadline, seek qualified advice promptly.',
    ],
    sourceIds: ['consumer-act', 'cgso', 'ncc'],
  },
  UNFAIR_CANCELLATION: {
    title: 'Cancellation charge or reservation dispute',
    explanation: 'The Consumer Protection Act contains rules on some advance reservations, cancellations and penalties, including Section 17. Whether they apply depends on the agreement, type of transaction and exceptions. A cancellation charge is not automatically unlawful.',
    questions: [
      'Was it an advance booking, a continuing contract, or another type of arrangement?',
      'What cancellation terms were disclosed and when was the cancellation made?',
      'Did the supplier provide a reason or calculation for its charge?',
    ],
    options: [
      'Ask the supplier for the cancellation terms and a written explanation of the amount charged.',
      'Consider an appropriate industry ombud or NCC route if the matter remains unresolved.',
      'Get advice before relying on a statutory cooling-off period or contractual deadline.',
    ],
    sourceIds: ['consumer-act', 'cgso', 'ncc'],
  },
  ONLINE_SCAM: {
    title: 'Undelivered online order or suspected scam',
    explanation: 'An undelivered online purchase may raise consumer-contract issues; intentional deception could require a separate fraud report. LUQI cannot determine whether a criminal offence occurred, whether a seller is legitimate, or whether a chargeback is available.',
    questions: [
      'Is the trader identifiable, and what delivery promise and evidence do you have?',
      'How did you pay, and have you reported any suspected fraudulent payment to your bank?',
      'Have you received an order reference, a response or a written refund decision?',
    ],
    options: [
      'If money may have been stolen, contact your bank promptly using its official fraud channels; consider reporting suspected crime to police.',
      'Preserve non-sensitive proof of purchase, delivery promises and correspondence.',
      'If the dispute is with an identifiable supplier, check CGSO or NCC complaint processes.',
    ],
    sourceIds: ['consumer-act', 'ncc', 'cgso', 'bank-ombud'],
  },
  UNAUTHORIZED_DEBIT_ORDER: {
    title: 'Disputed debit order or bank transaction',
    explanation: 'This is primarily a banking/payment dispute, not automatically a six-month goods-warranty case. A bank needs to establish the authorisation and review the transaction under the applicable mandate and dispute rules. Timing and eligibility vary.',
    questions: [
      'When did you notice the debit and what does the bank statement show?',
      'Does the bank have a valid mandate, and did you contact the bank immediately?',
      'What response or complaint reference did the bank provide?',
    ],
    options: [
      'Contact your bank urgently on an independently verified channel and ask about a dispute, reversal or fraud process.',
      'Keep the dispute reference and obtain the written decision.',
      'If unresolved, check the National Financial Ombud’s remit and process.',
    ],
    sourceIds: ['bank-ombud', 'ncc-scope'],
  },
  POPIA_DATA_BREACH: {
    title: 'Unwanted marketing or personal-information concern',
    explanation: 'The Protection of Personal Information Act regulates personal-information handling and some electronic direct marketing. Whether processing is unlawful depends on the circumstances, exemptions and evidence; a message alone does not prove a POPIA violation.',
    questions: [
      'Was this marketing, disclosure, an access request, or a different privacy concern?',
      'Did you object, opt out or ask the organisation for its privacy explanation?',
      'Have you preserved evidence without sharing another person’s private information?',
    ],
    options: [
      'Contact the organisation’s information officer or appropriate privacy contact if safe.',
      'Review the Information Regulator’s complaint instructions for POPIA concerns.',
      'Seek qualified help if sensitive data was exposed or there is immediate risk to you.',
    ],
    sourceIds: ['information-regulator'],
  },
  TELCO_BILLING_DISPUTE: {
    title: 'Cellular or internet-service billing',
    explanation: 'ICASA provides a consumer complaints route for regulated electronic communications services. A billing disagreement needs provider records and the relevant contract; a handset purchase may involve a different complaint channel.',
    questions: [
      'Is the problem a telecom service, network contract, subscription or device purchased separately?',
      'Have you complained directly to the provider and obtained a reference?',
      'What written bill, cancellation terms or communications support your concern?',
    ],
    options: [
      'First log a written complaint with your service provider and retain the reference.',
      'Check ICASA’s current consumer-complaint portal if the provider cannot resolve it.',
      'For separate retail-goods disputes, consider whether CGSO is the more appropriate forum.',
    ],
    sourceIds: ['icasa', 'cgso'],
  },
  MASHONISA_ILLEGAL_LOAN: {
    title: 'Concern about a lender or retained bank card',
    explanation: 'The National Credit Act and credit-regulator rules may be relevant to lending and debt practices. Registration, credit agreement validity and criminal liability cannot be determined from a brief story. Threats or withheld cards can require urgent human help.',
    questions: [
      'Do you feel threatened or unsafe, or has a card or identification document been retained?',
      'What does the agreement say and is the lender registered?',
      'Have you sought help from your bank or the National Credit Regulator?',
    ],
    options: [
      'If threatened, prioritise personal safety and contact police or an appropriate local emergency service; do not confront an unsafe lender.',
      'If a bank card or PIN is compromised, contact your bank using its official number.',
      'Ask the NCR or a qualified debt adviser to assess the facts and the lawful next step.',
    ],
    sourceIds: ['credit-regulator', 'bank-ombud'],
  },
  DEBT_REVIEW_TRAP: {
    title: 'Disputed debt counselling or debt-review listing',
    explanation: 'Debt counselling is regulated under the National Credit Act. Disputes about consent, a Form 16 application, an assessment or a court order need case-specific verification. LUQI cannot remove a credit-bureau listing or assert that a debt-review order is void.',
    questions: [
      'Did you knowingly apply for debt counselling, and what records were provided?',
      'Was a court order or restructuring proposal issued?',
      'Have you requested the counsellor’s authorisation and explanation in writing?',
    ],
    options: [
      'Ask for the relevant application and decision records; do not reveal passwords or complete ID numbers to LUQI.',
      'Contact the NCR about questionable debt-counselling conduct or registration.',
      'Seek qualified legal assistance before attempting to change a court-ordered debt-review status.',
    ],
    sourceIds: ['credit-regulator', 'ncc-scope'],
  },
};

export function consumerSourcesFor(type: DisputeType): ConsumerSource[] {
  return CONSUMER_ISSUES[type].sourceIds.map(id => {
    const source = CONSUMER_SOURCES.find(s => s.id === id);
    if (!source) throw new Error('Missing consumer guide source metadata');
    return source;
  });
}

export function consumerGuideIsCurrent(date: Date = new Date()): boolean {
  const t = date.getTime();
  return Number.isFinite(t) &&
    t >= Date.parse('2026-10-26T00:00:00+02:00') &&
    t <= Date.parse('2026-11-02T23:59:59+02:00');
}

export function prepareConsumerStory(type: DisputeType, story: unknown) {
  if (!Object.prototype.hasOwnProperty.call(CONSUMER_ISSUES, type) || typeof story !== 'string') return null;
  const safe = story.trim();
  if (safe.length < 10 || safe.length > MAX_CONSUMER_STORY_LENGTH) return null;
  return { category: type, userStory: safe, guide: CONSUMER_ISSUES[type] };
}

/** Unverified factual account: for the user's review, not a statutory demand. */
export function makeConsumerDraft(organisation: string, story: string): string {
  if (typeof story !== 'string' || story.trim().length < 10 ||
      story.length > MAX_CONSUMER_STORY_LENGTH) {
    throw new Error('Story is missing or too long');
  }
  const addressee = organisation.trim().slice(0, 100) || '[Supplier or service provider]';
  return [
    'Subject: Request for review of a consumer concern',
    '',
    'To: ' + addressee,
    '',
    'I would like to raise a concern and request a written response.',
    'My account of what happened (please verify against your records):',
    '',
    story.trim(),
    '',
    'Please provide a complaint reference, your understanding of the facts,',
    'and the available resolution or dispute process. I would like to discuss',
    '[insert the outcome you are requesting after reviewing your options].',
    '',
    'I will retain a copy of this correspondence and any reply.',
    '',
    'Kind regards,',
    '[Your name — add only when you are ready to send]',
  ].join('\n');
}

/** Three immediately useful local steps; never a verdict or complaint submission. */
export interface ConsumerQuickGuide { title: string; steps: readonly [string,string,string]; }
export const CONSUMER_QUICK: Readonly<Record<DisputeType, ConsumerQuickGuide>> = {
  UNSURE: { title:'Find the correct consumer help',
    steps:['Identify whether your issue involves goods, services, banking, communications, credit or privacy.',
      'Keep the supplier’s written terms, receipts and complaint reference without posting personal details here.',
      'Check the correct official regulator or ombud before assuming a refund or legal remedy.'] },
  DEFECTIVE_GOODS: { title:'Faulty goods — three first steps',
    steps:['Record when the item was delivered and what failed. Do not use an unsafe product.',
      'Write to the supplier with proof of purchase and ask what remedy and legal basis they propose.',
      'Review CPA sections 55–56 and relevant exceptions; seek CGSO or NCC guidance if unresolved.'] },
  UNFAIR_CANCELLATION: { title:'Cancellation fee — three first steps',
    steps:['Keep the actual booking or contract terms, cancellation date and communications.',
      'Request a written breakdown of the cancellation charge rather than assuming it is unlawful.',
      'Check whether the CPA or a specialist regulator applies, including exceptions and any time limit.'] },
  ONLINE_SCAM: { title:'Late online delivery or suspected scam — three first steps',
    steps:['Save the advertised delivery promise, order reference and courier updates without sharing private identifiers.',
      'Request a firm written delivery or refund response from the merchant using verified contact details.',
      'If a payment may be fraudulent, call your bank’s official fraud channel promptly; check CGSO or NCC if appropriate.'] },
  UNAUTHORIZED_DEBIT_ORDER: { title:'Disputed bank debit — three first steps',
    steps:['Contact your bank promptly using its official channel. Do not share your PIN or login with Luqi.',
      'Ask the bank for the mandate, dispute procedure, transaction reference and written decision.',
      'If unresolved, check the National Financial Ombud’s banking complaint scope and any applicable deadline.'] },
  POPIA_DATA_BREACH: { title:'Personal information concern — three first steps',
    steps:['Keep non-sensitive evidence of the marketing, disclosure or data handling that concerns you.',
      'Contact the organisation’s privacy or information officer when safe and request an explanation.',
      'Check the Information Regulator’s official POPIA complaints process; do not upload another person’s records.'] },
  TELCO_BILLING_DISPUTE: { title:'Mobile or internet billing — three first steps',
    steps:['Record the disputed provider bill, service and applicable contract terms.',
      'Report the dispute to the licensed service provider and request a reference number.',
      'Check ICASA’s consumer complaint procedure and referral conditions; device retail disputes may differ.'] },
  MASHONISA_ILLEGAL_LOAN: { title:'Lender or withheld bank card — three first steps',
    steps:['Prioritise safety if threatened. Contact the bank immediately if a card or PIN is compromised.',
      'Keep the agreement and verify the lender’s status without confronting an unsafe person.',
      'Contact the National Credit Regulator and seek qualified help; Luqi cannot determine criminal liability.'] },
  DEBT_REVIEW_TRAP: { title:'Debt-review concern — three first steps',
    steps:['Request the debt-counselling application, consent records and any existing court order.',
      'Check the counsellor with the National Credit Regulator and seek a written explanation.',
      'Obtain qualified advice before trying to alter a debt-review status or court order.'] },
};
/** Conservative recognition: ambiguous questions remain ordinary Chat, never auto-classified. */
export function detectConsumerCategory(value: unknown): DisputeType | null {
  if (typeof value !== 'string' || !value.trim() || value.length > 500) return null;
  const q = value.toLowerCase();
  if (/\b(debt review|debt counselling|debt counselor|debt counsellor)\b/u.test(q) &&
      /\b(trap|scam|without consent|wrong|problem|illegal|dispute|remove|fraud)\b/u.test(q)) return 'DEBT_REVIEW_TRAP';
  if (/\b(mashonisa|loan shark|illegal lender|withheld bank card)\b/u.test(q)) return 'MASHONISA_ILLEGAL_LOAN';
  if (/\b(debit order|bank debit|unauthori[sz]ed bank|unknown bank transaction|disputed bank transaction)\b/u.test(q)) return 'UNAUTHORIZED_DEBIT_ORDER';
  if (/\b(popia|personal information|data breach|unwanted marketing|privacy complaint)\b/u.test(q) &&
      /\b(complain|breach|leaked|misuse|spam|marketing|disclose|sold|unwanted|rights|problem)\b/u.test(q)) return 'POPIA_DATA_BREACH';
  if (/\b(mobile|cellular|telco|internet|vodacom|mtn|telkom|network)\b/u.test(q) &&
      /\b(bill|billing|charged|overcharge|contract dispute|unexpected charge|complaint)\b/u.test(q)) return 'TELCO_BILLING_DISPUTE';
  if (/\b(online order|online purchase|delivery|courier|parcel|package|merchant)\b/u.test(q) &&
      /\b(delayed|late|not arrived|undelivered|never arrived|missing|scam|fraud|refund|three times|wrong)\b/u.test(q)) return 'ONLINE_SCAM';
  if (/\b(cancellation|cancelled|canceling|cancelling|booking)\b/u.test(q) &&
      /\b(fee|penalty|unfair|refund|charge|refused|dispute)\b/u.test(q)) return 'UNFAIR_CANCELLATION';
  if (/\b(defective|faulty|broken|warranty|repair|replacement|refund)\b/u.test(q) &&
      /\b(goods|product|item|appliance|shop|store|seller|purchase|retailer|phone)\b/u.test(q)) return 'DEFECTIVE_GOODS';
  return null;
}
