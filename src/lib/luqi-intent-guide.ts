/** A local, source-truthful starting point; NOT AI inference or live travel search. */
export const MAX_GUIDE_NEED_CHARS = 500;
export type GuideKind = 'urgent' | 'booking' | 'travel' | 'language' | 'study' | 'create' | 'business' | 'general';
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
export const GUIDE_EXAMPLES = [
  { label: 'Plan a visit', need: 'I am visiting South Africa. Help me plan my trip.' },
  { label: 'Find somewhere to stay', need: 'I want to book accommodation in Cape Town. What should I check?' },
  { label: 'Local culture', need: 'I want to understand local languages and customs before travelling.' },
  { label: 'Learn something', need: 'Help me prepare for my exam.' },
  { label: 'Create something', need: 'Help me turn my idea into a short visual story.' },
] as const;

const recommendations: Record<GuideKind, Omit<GuideRecommendation, 'kind'>> = {
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
    /\b(emergency|ambulance|police|fire emergency|in danger|urgent help|medical emergency)\b/u.test(q) ? 'urgent' :
    /\b(book|booking|reserve|reservation|hotel|accommodation|guesthouse|lodge|resort|airbnb|flight|tour ticket|safari ticket|stay overnight)\b/u.test(q) ? 'booking' :
    /\b(translate|translation|language|languages|custom|customs|culture|cultural|sawubona|dumela|isizulu|setswana|sesotho|swahili|kiswahili|yoruba)\b/u.test(q) ? 'language' :
    /\b(study|learn|exam|university|student|homework|school|flashcard|revision|course|certification)\b/u.test(q) ? 'study' :
    /\b(create|story|video|animation|cartoon|film|script|content|design|creator)\b/u.test(q) ? 'create' :
    /\b(quotation|quote|profit|sell|sales|invoice|pricing|startup|company|business plan|business idea|business proposal)\b/u.test(q) ? 'business' :
    (/\b(travel|travelling|traveling|trip|tourist|tourism|visit|visiting|vacation|holiday|passport|visa|border|airport|itinerary|safari|africa)\b/u.test(q) || mentionsAfricanDestination(q)) ? 'travel' :
    /\b(business|customer)\b/u.test(q) ? 'business' :
    'general';
  return { kind, ...recommendations[kind] };
}
