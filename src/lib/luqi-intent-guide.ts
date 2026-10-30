/** A local, source-truthful starting point; NOT AI inference or live travel search. */
import { detectDriverMode } from './driver-rights';
import { detectConsumerCategory } from './consumer-rights-guide';
import { detectEvidenceTopic } from './comparative-evidence';
import { detectOpportunityIntent } from './opportunity-sources';

import { detectMunicipalIntent,detectTownshipEconomyIntent } from './municipal-economy';
import { detectVisaEntryIntent } from './visa-entry-sources';import { detectTenderIntent } from './tender-sources';
import { detectSocialSupportIntent,socialSupportPathForInput } from './social-support-sources';
export const MAX_GUIDE_NEED_CHARS = 500;
export type GuideKind = 'driver' | 'consumer' | 'comparative' | 'opportunity' | 'tender' | 'municipal' | 'township' | 'visa' | 'social' | 'urgent' | 'booking' | 'travel' | 'language' | 'study' | 'create' | 'business' | 'rights' | 'general';
export type GuideStatus = 'local' | 'limited' | 'unavailable';
export interface GuideRecommendation {
  kind: GuideKind;
  title: string;
  detail: string;
  status: GuideStatus;
  statusLabel: string;
  nextQuestion: string;
  primaryPath: string | null;
  primaryLabel: string | null;
  caution: string;
  bookingPreview: boolean;
}

/** Honest, deterministic next steps. Not search results, a booking service or an AI plan. */
export const GUIDE_NEXT_STEPS: Record<GuideKind, readonly string[]> = {
  driver: [
    'Stop safely before reading or touching a phone; never ignore lawful traffic directions.',
    'Open the free South African driver-rights guide for source-linked steps and official reporting contacts.',
  ],
  opportunity: [
    'Choose your province and the type of jobs, internships, funding or learning opportunity you want to explore.',
    'Open the original dated agency or programme page and confirm requirements and deadlines before applying.',
  ],
  social: [
    'Choose SASSA social grants or UIF unemployment benefits without sharing personal identifiers with Luqi.',
    'Read the original agency guidance and use the current official portal or office for sensitive applications.',
    'Contact the government department about case status, appeals, deadlines or documents; Luqi cannot read a private claim.',
  ],
  municipal: [
    'Identify the correct municipality through the official national directory; do not infer responsibility from GPS alone.',
    'Read the current local by-law, tariff, service standard or application instructions for your question.',
    'Prepare a non-sensitive request checklist and contact the municipality through its official channel.',
  ],
  township: [
    'Choose your business activity and goal, including licensing, formalisation, skills, market access or funding.',
    'Check the relevant municipality’s trading rules and the precise official programme terms.',
    'Use Luqi to create a local checklist, then apply on the original issuer portal; never assume approval.',
  ],
  visa: [
    'Choose your passport nationality and destination without sharing passport numbers or personal documents.',
    'Check the original destination-government page for the correct category, purpose, port and dates.',
    'Apply only through the genuine government immigration service or embassy; Luqi cannot submit or approve visas.',
  ],
  tender: [
    'Find the exact government tender through its official procurement publisher and download its original documents and addenda.',
    'Use the Luqi Tender Desk to prepare a factual, editable response and highlight documents the issuer requires.',
    'Have an authorised applicant review eligibility, pricing, declarations, signatures and deadline, then submit through the official channel.',
  ],
  urgent: [
    'Use official emergency services or an appropriate local help point now.',
    'Do not rely on a booking screen or this experimental AI chat for an emergency.',
  ],
  booking: [
    'Write down your destination, dates, group size and maximum total budget.',
    'Ask the real provider for named property or experience details, dated availability and total fees.',
    'Review the cancellation policy and verify the provider’s payment channel before paying.',
  ],
  travel: [
    'Set your destination, travel window and priorities.',
    'Use the local budget calculator for your own figures; obtain actual prices from providers.',
    'Confirm current entry, safety and transport information with official sources.',
  ],
  language: [
    'Choose the country, language and real-world situation you are preparing for.',
    'Ask a local speaker or authoritative source to review sensitive translations.',
  ],
  study: [
    'Choose one topic and create a few questions from trusted material.',
    'Practise with Study Desk or explore a real browser experiment, then check your answers.',
  ],
  create: [
    'Define your audience and one clear message.',
    'Build six scenes in Content Studio, then inspect the silent export before sharing.',
  ],
  business: [
    'Describe the product or service and note the costs you actually know.',
    'Use Business Desk to draft a quote; review prices and tax before sending it.',
  ],
  rights: [
    'Read the dated primary sources linked in the free rights guide.',
    'For personal cases or deadlines, contact qualified help without sharing your details here.',
  ],
  consumer: [
    'Identify the issue and read three immediate consumer steps without entering private details.',
    'Check sector-specific source links and prepare a factual draft for your own review.',
  ],
  comparative: [
    'Choose a curated question about traditions, manuscripts or scientific evidence.',
    'Compare a tradition, measurable evidence, documentary history and interpretations.',
  ],
  general: [
    'State the outcome you want and one constraint that matters.',
    'Open a working local tool or choose to submit one question to the limited AI trial.',
  ],
};

export const GUIDE_EXAMPLES = [
  { label: 'Plan a visit', need: 'I am visiting South Africa. Help me plan my trip.' },
  { label: 'Find somewhere to stay', need: 'I want to book accommodation in Cape Town. What should I check?' },
  { label: 'Local culture', need: 'I want to understand local languages and customs before travelling.' },
  { label: 'Learn something', need: 'Help me prepare for my exam.' },
  { label: 'Create something', need: 'Help me turn my idea into a short visual story.' },
] as const;

const recommendations: Record<GuideKind, Omit<GuideRecommendation, 'kind'>> = {
  driver: {
    title: 'South African driver safety and traffic stop rights',
    detail: 'Read three immediate safety steps and source-linked explanations for officer identification, vehicle searches, fines, sobriety tests and reporting corruption. No account, AI request or incident upload occurs.',
    status: 'local', statusLabel: 'Free on-device guide',
    nextQuestion: 'When safely stopped, choose the relevant roadside situation in Luqi. Do not type while driving.',
    primaryPath: '/driver-rights', primaryLabel: 'Open driver rights guide',
    caution: 'General South African information, not dispatch or legal advice. Follow lawful instructions and seek help in genuine danger.',
    bookingPreview: false,
  },
  opportunity: {
    title: 'Find jobs, graduate opportunities, funding and learning',
    detail: 'Luqi Opportunity Compass offers free official South African source links, a nine-province map and a bounded read-only publisher check. It does not invent job offers, confirm individual vacancies or apply for users.',
    status: 'local', statusLabel: 'Free official-source directory',
    nextQuestion: 'Choose your province and the kind of opportunity. Verify the original advertisement, eligibility and closing date.',
    primaryPath: '/opportunities', primaryLabel: 'Open Luqi Opportunity Compass',
    caution: 'Publisher links are not live job offers or confirmed eligibility. Never pay someone privately for a government post.',
    bookingPreview: false,
  },
  social: {
    title: 'SASSA grants and UIF claims guidance',
    detail: 'Luqi provides free, manually reviewed SASSA and UIF public information, official application and appeals links and safer next steps. Personal eligibility, private claim status and payment dates cannot be checked here. New UIF employee claims use UIF Online, not legacy uFiling.',
    status:'local', statusLabel:'Free original-source public guide',
    nextQuestion:'Choose a SASSA grant or UIF benefit, then verify the current rules and application channel with the government agency.',
    primaryPath:'/social-support',primaryLabel:'Open SASSA and UIF guide',
    caution:'Do not enter identity numbers, OTPs, health records, bank details or case credentials into Luqi. We do not approve grants or file benefit claims.',
    bookingPreview:false,
  },
  municipal: {
    title: 'Find your municipality and official services',
    detail: 'Luqi provides a searchable original-government municipality directory, source-linked steps for water, billing, free basic services, business permits and local participation, plus an on-device checklist. It does not report faults, hold council accounts or confirm service status.',
    status:'local',statusLabel:'Free municipal information',
    nextQuestion:'Choose a municipality or province and a service category; confirm jurisdiction and the current local policy.',
    primaryPath:'/municipalities',primaryLabel:'Open municipal services',
    caution:'Municipalities determine actual service responsibilities, tariffs and permit rules. Do not enter private accounts, IDs or banking details into Luqi.',bookingPreview:false,
  },
  township: {
    title: 'Grow a township or rural business with source-linked help',
    detail: 'Use a free local action planner for spaza, food, beauty, trades, manufacturing, recycling or services, with municipal licensing, official DSBD/TREP programme sources and National Treasury tender links. A programme announcement is not an open grant or finance offer.',
    status:'local',statusLabel:'Free local business guidance',
    nextQuestion:'Choose your activity and the goal: registration, trading permit, verified funding, buyers or skills.',
    primaryPath:'/township-economy',primaryLabel:'Open township business support',
    caution:'Loan and blended-finance products may require repayment and proper licensing. Check the official programme window and never share private tax PINs or bank details.',bookingPreview:false,
  },
  visa: {
    title: 'Visa and entry guidance from African immigration authorities',
    detail: 'Luqi offers a free five-country guide for South Africa, Kenya, Nigeria, Egypt and Cameroon. Choose passport nationality, travel purpose and dates to see reviewed original government links and cautions. This is not a live government eligibility query or application.',
    status:'local',statusLabel:'Original-source immigration guidance',
    nextQuestion:'Which passport nationality, destination, travel purpose and travel dates apply? Enter no passport number or case information.',
    primaryPath:'/visa-entry',primaryLabel:'Open Visa & Entry Guide',
    caution:'Entry permissions and exemptions depend on passport, purpose, port and valid dates. Official authorities decide eligibility. Never put credentials, passport numbers or biometrics into Luqi.',
    bookingPreview:false,
  },
  tender: {
    title: 'Find public tenders and prepare an authorised bid with Luqi',
    detail: 'Luqi Tender Desk has reviewed official tender sources, a local bid-preparation worksheet and original-form assistance for seven supplier contact fields on one verified Treasury SBD 1 DOCX, with mandatory applicant approval. PDF/Excel inspection is limited and filling other originals is blocked until their mappings are verified. You review the exact files and addenda, enter accurate facts and prices, complete declarations and signatures, and submit through the issuer’s prescribed channel. Luqi does not access CSD accounts, sign declarations, fill issuer PDFs or submit bids on anyone’s behalf.',
    status:'local', statusLabel:'Free bidder-controlled preparation',
    nextQuestion:'Find the specific tender, download all original documents, and review mandatory conditions before preparing the human-controlled response.',
    primaryPath:'/tenders',primaryLabel:'Open Luqi Tender Desk',
    caution:'An advert may be withdrawn or changed. Only the procuring authority can accept a bid; no automated portal submission or credential-sharing is available.',
    bookingPreview:false,
  },
  urgent: {
    title: 'Your safety comes first',
    detail: 'For an immediate emergency, contact local emergency services or an official nearby help point. LUQI does not provide emergency dispatch, verified live alerts or guaranteed response times.',
    status: 'unavailable', statusLabel: 'No emergency dispatch',
    nextQuestion: 'Which country and situation are involved? For non-urgent planning, LUQI can help organise questions for an official source.',
    primaryPath: null, primaryLabel: null,
    caution: 'Do not rely on this app instead of emergency services.', bookingPreview: false,
  },
  booking: {
    title: 'Know exactly what you are booking',
    detail: 'LUQI can help prepare a booking brief, but it has no connected, verified live accommodation, flight, tour or transport inventory. No reservation, price or availability is being offered.',
    status: 'unavailable', statusLabel: 'Live booking not connected',
    nextQuestion: 'What are your destination, dates, group size, budget and accessibility needs? Check actual offers directly with the provider until LUQI has a verified booking partner.',
    primaryPath: '/omega-tasks', primaryLabel: 'Plan your own travel budget',
    caution: 'No property, photo, price, availability or cancellation policy is verified here. Nothing has been reserved or charged.',
    bookingPreview: true,
  },
  travel: {
    title: 'Let’s plan your journey through Africa',
    detail: 'Start with your destination, dates and what matters to you. LUQI currently offers a local travel-budget calculator and a limited text trial, not verified live visas, routes, weather, prices or travel alerts.',
    status: 'local', statusLabel: 'Local planning available',
    nextQuestion: 'Which country or city are you visiting, when, and what would make the trip special?',
    primaryPath: '/omega-tasks', primaryLabel: 'Open travel-budget planner',
    caution: 'Confirm entry rules, local safety, transport and opening hours with current official sources before acting.', bookingPreview: false,
  },
  language: {
    title: 'Learn how to connect respectfully',
    detail: 'You can ask LUQI’s separate limited AI text trial about language or cultural context. African-language answer quality and local customs have not been independently verified.',
    status: 'limited', statusLabel: 'Limited AI text trial',
    nextQuestion: 'Which language, country and situation do you want to prepare for?',
    primaryPath: '/ai-trial', primaryLabel: 'Open limited AI text trial',
    caution: 'Check translations and culturally sensitive advice with a trusted local speaker or source.', bookingPreview: false,
  },
  study: {
    title: 'Make learning more practical',
    detail: 'Build your own flashcards and study plan now. LUQI also has browser-based experiments and a separate limited AI text trial, subject to sign-in and provider availability.',
    status: 'local', statusLabel: 'Study tools available',
    nextQuestion: 'What are you studying, and what is the next thing you want to understand?',
    primaryPath: '/study-desk', primaryLabel: 'Open study desk',
    caution: 'No accredited exam results, certifications or guaranteed tutoring outcomes are promised.', bookingPreview: false,
  },
  create: {
    title: 'Turn your idea into a visual story',
    detail: 'Use the browser-local content studio for a six-scene, 90-second silent storyboard/animation with script and subtitles. Generative voice, long-form video and automatic social publishing are not connected.',
    status: 'local', statusLabel: 'Local creation available',
    nextQuestion: 'Who is your audience, and what should they understand or feel?',
    primaryPath: '/content-studio', primaryLabel: 'Open content studio',
    caution: 'Export and recording support depends on your browser and device.', bookingPreview: false,
  },
  business: {
    title: 'Put a practical idea to work',
    detail: 'Draft a quotation and calculate margins or break-even sales locally. LUQI cannot issue a tax invoice, process a customer payment or provide verified legal advice.',
    status: 'local', statusLabel: 'Business tools available',
    nextQuestion: 'What are you selling or planning, and which number or document would help first?',
    primaryPath: '/business-desk', primaryLabel: 'Open business desk',
    caution: 'Verify prices, tax and legal requirements with appropriate local professionals.', bookingPreview: false,
  },
  rights: {
    title: 'Understand asylum and refugee procedures',
    detail: 'LUQI has a free English, source-linked overview of South African asylum procedures, court decisions and official referrals. It does not decide legal status, accept applications or verify government appointment availability.',
    status: 'local', statusLabel: 'Source-linked guide available',
    nextQuestion: 'Are you looking for general procedure information or qualified legal help? Avoid sharing personal case details here.',
    primaryPath: '/rights-guide', primaryLabel: 'Open the rights guide',
    caution: 'The guide is not independently approved legal advice. Check original sources and urgent legal-help referrals.',
    bookingPreview: false,
  },
  consumer: {
    title: 'Understand your consumer options',
    detail: 'LUQI has a free browser-local consumer-rights guide with sector-specific official sources and an editable factual complaint draft. It does not determine liability or send a demand or complaint.',
    status: 'local', statusLabel: 'Local guide available',
    nextQuestion: 'Is this about a purchase, a bank, communications, credit or privacy? Remove account and identity details before using the guide.',
    primaryPath: '/consumer-rights', primaryLabel: 'Open the consumer guide',
    caution: 'General information only. Check jurisdiction, deadlines and original law with a qualified adviser for a disputed case.',
    bookingPreview: false,
  },
  comparative: {
    title: 'Compare faith, history and scientific evidence',
    detail: 'Luqi has seven local, dated studies with academic and institutional links. Compare physical evidence, textual history and interpretations without ranking religions or invoking paid AI.',
    status: 'local', statusLabel: 'Free source-linked study',
    nextQuestion: 'Which specific question would you like to examine? The curated sources are not live academic retrieval.',
    primaryPath: '/comparative-evidence', primaryLabel: 'Open comparative evidence guide',
    caution: 'Traditions and scholarly interpretations vary. Empirical methods do not establish metaphysical truth; check original sources for contested claims.',
    bookingPreview: false,
  },
  general: {
    title: 'Start with what matters to you',
    detail: 'LUQI can guide you to existing tools and offers a separate signed-in, consent-based AI text trial. It is not yet a fully integrated multi-turn, browsing or action-taking assistant.',
    status: 'limited', statusLabel: 'Guidance + limited AI',
    nextQuestion: 'Tell LUQI what you want to achieve, rather than which feature you think you need.',
    primaryPath: '/ai-trial', primaryLabel: 'Open limited AI text trial',
    caution: 'AI responses may be wrong and cannot confirm current travel, financial or medical facts.', bookingPreview: false,
  },
};
// Names help route a question; they are NOT country-specific facts, visas or feeds.
// Normalize diacritics and punctuation only in this browser-local classifier.
const AFRICAN_DESTINATION_NAMES = [
  'algeria','angola','benin','botswana','burkina faso','burundi','cabo verde',
  'cape verde','cameroon','central african republic','chad','comoros','congo',
  'democratic republic of the congo','dr congo','drc','cote d ivoire','ivory coast',
  'djibouti','egypt','equatorial guinea','eritrea','eswatini','ethiopia','gabon',
  'gambia','ghana','guinea','guinea bissau','kenya','lesotho','liberia','libya',
  'madagascar','malawi','mali','mauritania','mauritius','morocco','mozambique',
  'namibia','niger','nigeria','rwanda','sao tome and principe','senegal',
  'seychelles','sierra leone','somalia','south africa','south sudan','sudan',
  'tanzania','togo','tunisia','uganda','zambia','zimbabwe',
] as const;
function mentionsAfricanDestination(query: string): boolean {
  const normalized = ' ' + query.normalize('NFD').replace(/\p{M}/gu, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
  return AFRICAN_DESTINATION_NAMES.some(name => normalized.includes(' ' + name + ' '));
}

export function guideLuqiNeed(input: unknown): GuideRecommendation | null {
  if (typeof input !== 'string' || !input.trim() || input.length > MAX_GUIDE_NEED_CHARS) return null;
  const q = input.trim().toLowerCase();
  const kind: GuideKind =
    detectDriverMode(input) ? 'driver' :
    /\b(emergency|ambulance|police|fire emergency|in danger|urgent help|medical emergency)\b/u.test(q) ? 'urgent' :
    detectSocialSupportIntent(input) ? 'social' :
    detectVisaEntryIntent(input) ? 'visa' :
    detectTownshipEconomyIntent(input) ? 'township' :
    detectMunicipalIntent(input) ? 'municipal' :
    detectTenderIntent(input) ? 'tender' :
    detectOpportunityIntent(input) ? 'opportunity' :
    detectConsumerCategory(input) ? 'consumer' :
    detectEvidenceTopic(input) ? 'comparative' :
    (/\b(book|booking|reserve|reservation|hotel|accommodation|guesthouse|lodge|resort|airbnb|flight|tour ticket|safari ticket|stay overnight|place to stay|where to stay|where can i stay|where should i stay|stay in|stay near)\b/u.test(q)) ? 'booking' :
    /\b(asylum|refugee|refugees|refugee status|immigration|home affairs|asylum seeker|residence permit)\b/u.test(q) ? 'rights' :
    /\b(consumer rights|refund|warranty|defective|faulty goods|debit order|unfair cancellation|popia|debt review|retailer complaint|consumer complaint)\b/u.test(q) ? 'consumer' :
    /\b(translate|translation|language|languages|custom|customs|culture|cultural|sawubona|dumela|isizulu|setswana|sesotho|swahili|kiswahili|yoruba)\b/u.test(q) ? 'language' :
    /\b(study|learn|exam|university|student|homework|school|flashcard|revision|course|certification)\b/u.test(q) ? 'study' :
    /\b(create|story|video|animation|cartoon|film|script|content|design|creator)\b/u.test(q) ? 'create' :
    /\b(quotation|quote|profit|sell|sales|invoice|pricing|startup|company|business plan|business idea|business proposal)\b/u.test(q) ? 'business' :
    (/\b(travel|travelling|traveling|trip|tourist|tourism|visit|visiting|vacation|holiday|passport|visa|border|airport|itinerary|safari|transport|taxi|train|bus|shuttle|directions|route|commute|sightseeing|restaurant|dining|eat|attraction|experience|museum|beach|africa)\b/u.test(q) || mentionsAfricanDestination(q)) ? 'travel' :
    /\b(business|customer)\b/u.test(q) ? 'business' :
    'general';
  const target=kind==='social'?socialSupportPathForInput(input):null;
  return { kind, ...recommendations[kind], ...(target?{primaryPath:target,primaryLabel:target==='/uif'?'Open UIF support':'Open SASSA support'}:{}) };
}
