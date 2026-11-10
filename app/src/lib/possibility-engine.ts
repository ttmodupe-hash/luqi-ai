export type PossibilityTrack =
  | 'learn'
  | 'build'
  | 'business'
  | 'work'
  | 'create'
  | 'community'
  | 'travel'
  | 'general';

export interface PossibilityStep {
  stage: string;
  title: string;
  detail: string;
  path: string;
}

export interface PossibilityPlan {
  track: PossibilityTrack;
  label: string;
  affirmation: string;
  outcome: string;
  steps: readonly PossibilityStep[];
}

const plans: Record<PossibilityTrack, Omit<PossibilityPlan, 'track'>> = {
  learn: {
    label: 'LEARN · PRACTISE · PROVE · APPLY',
    affirmation: 'Yes. You can build the knowledge and proof step by step.',
    outcome: 'Turn a learning goal into practical study, hands-on practice, evidence of skill and real opportunity discovery.',
    steps: [
      { stage: '01 · Learn', title: 'Build the foundation', detail: 'Use certification and study tools to understand the concepts before chasing the badge.', path: '/cert-academy' },
      { stage: '02 · Practise', title: 'Work inside a real lab', detail: 'Move from reading into browser-based experiments and simulations.', path: '/lab-simulator' },
      { stage: '03 · Prove', title: 'Create evidence of skill', detail: 'Use DevSecNet Studio to turn what you know into structured technical work and reviewable outputs.', path: '/devsecnet' },
      { stage: '04 · Apply', title: 'Find the next opening', detail: 'Explore source-linked jobs, internships, bursaries and programmes without invented vacancies.', path: '/opportunities' },
    ],
  },
  build: {
    label: 'IDEA · DESIGN · BUILD · RELEASE',
    affirmation: 'Yes. Start small, test it, improve it and ship what works.',
    outcome: 'Turn an idea into a defined product, working technical experiments and a release path without pretending unfinished work is production-ready.',
    steps: [
      { stage: '01 · Define', title: 'Shape the product', detail: 'Turn the idea into requirements, backlog, risks, architecture and measurable outcomes.', path: '/devsecnet' },
      { stage: '02 · Explore', title: 'Prototype visually', detail: 'Use Spatial Vision and local visual tools to make complex ideas easier to inspect and understand.', path: '/spatial-vision' },
      { stage: '03 · Review', title: 'Challenge the work', detail: 'Use Luqi Chat as a review partner for questions, trade-offs and explanations before release.', path: '/chat' },
      { stage: '04 · Release', title: 'Verify before shipping', detail: 'Use Launch Control for release evidence, health checks and bounded operational review.', path: '/launch-control' },
    ],
  },
  business: {
    label: 'IDEA · NUMBERS · MARKET · OPPORTUNITY',
    affirmation: 'Yes. Turn the idea into numbers, documents, customers and opportunity.',
    outcome: 'Move from “I have an idea” to a practical local business plan, usable pricing, market access and procurement readiness.',
    steps: [
      { stage: '01 · Plan', title: 'Make the business concrete', detail: 'Choose the activity, compliance needs, market and first actions for a township or rural business.', path: '/township-economy' },
      { stage: '02 · Price', title: 'Know your numbers', detail: 'Draft quotations, check gross margin and understand break-even before selling.', path: '/business-desk' },
      { stage: '03 · Sell', title: 'Become discoverable', detail: 'Prepare a reviewed public business profile and choose what contact information is actually public.', path: '/business-connect' },
      { stage: '04 · Compete', title: 'Prepare for tenders', detail: 'Find official procurement notices and prepare bidder-controlled responses without fake submissions.', path: '/tenders' },
    ],
  },
  work: {
    label: 'TARGET · SKILL · EVIDENCE · OPPORTUNITY',
    affirmation: 'Yes. Build evidence of skill and put it in front of real opportunities.',
    outcome: 'Connect career direction to skill-building, practical evidence and source-linked openings.',
    steps: [
      { stage: '01 · Target', title: 'See what is available', detail: 'Explore official jobs, internships, bursaries and youth programmes by province and category.', path: '/opportunities' },
      { stage: '02 · Skill', title: 'Close the learning gap', detail: 'Use certification tracks and exam preparation to focus on the knowledge the role requires.', path: '/cert-academy' },
      { stage: '03 · Practise', title: 'Build confidence through repetition', detail: 'Create your own revision material and practise before interviews or exams.', path: '/study-desk' },
      { stage: '04 · Connect', title: 'Build a professional footprint', detail: 'Use Luqi business and collaboration surfaces to make useful work easier to discover and share.', path: '/business-connect' },
    ],
  },
  create: {
    label: 'IMAGINE · MAKE · EXPLAIN · SHARE',
    affirmation: 'Yes. Make the first version visible, then keep improving it.',
    outcome: 'Turn an idea into something people can see, understand and respond to using low-cost local creation tools.',
    steps: [
      { stage: '01 · Imagine', title: 'Define the message', detail: 'Start with the audience, purpose and one thing people should understand or feel.', path: '/chat' },
      { stage: '02 · Make', title: 'Build the visual story', detail: 'Create scenes, scripts, subtitles and browser-local animation in Content Studio.', path: '/content-studio' },
      { stage: '03 · Explore', title: 'Make ideas spatial', detail: 'Use Spatial Vision to inspect images and visualise learning concepts with motion.', path: '/spatial-vision' },
      { stage: '04 · Improve', title: 'Review the product', detail: 'Use DevSecNet Studio to challenge usability, design and implementation assumptions.', path: '/devsecnet' },
    ],
  },
  community: {
    label: 'UNDERSTAND · FIND · PREPARE · ACT',
    affirmation: 'Yes. Find the right source, understand the process and act with confidence.',
    outcome: 'Reduce the confusion between people and public services by connecting questions to official sources and practical next steps.',
    steps: [
      { stage: '01 · Find', title: 'Find the right municipality', detail: 'Identify the correct council and service route instead of guessing from location.', path: '/municipalities' },
      { stage: '02 · Support', title: 'Understand social support', detail: 'Use reviewed SASSA and UIF guidance without exposing private claim information.', path: '/social-support' },
      { stage: '03 · Rights', title: 'Know your options', detail: 'Use source-linked consumer guidance and prepare factual drafts under your control.', path: '/consumer-rights' },
      { stage: '04 · Ask', title: 'Clarify the next step', detail: 'Use Luqi to organise questions and explanations while keeping official decisions with the responsible authority.', path: '/ask' },
    ],
  },
  travel: {
    label: 'PLAN · VERIFY · MOVE · DISCOVER',
    affirmation: 'Yes. Plan it carefully, verify what matters and move with confidence.',
    outcome: 'Bring journey planning, entry guidance, local discovery and practical budgeting into one path.',
    steps: [
      { stage: '01 · Plan', title: 'Build the journey', detail: 'Use Luqi-Drive for destinations, saved places, route context and practical trip planning.', path: '/drive' },
      { stage: '02 · Verify', title: 'Check entry requirements', detail: 'Use original immigration sources before relying on assumptions about visas or entry.', path: '/visa-entry' },
      { stage: '03 · Discover', title: 'Find places and local support', detail: 'Explore nearby categories and local services without background tracking.', path: '/near-me' },
      { stage: '04 · Budget', title: 'Know what the trip may cost', detail: 'Use your own figures to calculate travel and vehicle costs locally.', path: '/omega-tasks' },
    ],
  },
  general: {
    label: 'GOAL · PATH · ACTION · PROGRESS',
    affirmation: 'Yes. Start with the outcome; LUQI will help you find the next real step.',
    outcome: 'Turn a broad ambition into a practical starting point, then connect it to learning, tools and opportunities already inside Luqi.',
    steps: [
      { stage: '01 · Clarify', title: 'Name the outcome', detail: 'Use Luqi to turn a broad ambition into a concrete problem you can work on.', path: '/ask' },
      { stage: '02 · Explore', title: 'See what Luqi can already do', detail: 'Browse working local tools instead of guessing which feature might help.', path: '/start' },
      { stage: '03 · Build', title: 'Practise or create something', detail: 'Choose a lab, study tool, business tool or creation surface and produce a real output.', path: '/lab-simulator' },
      { stage: '04 · Move', title: 'Look for the next opening', detail: 'Connect the progress you made to source-linked opportunities.', path: '/opportunities' },
    ],
  },
};

function normalize(input: string) {
  return input.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export function identifyPossibilityTrack(input: string): PossibilityTrack {
  const q = normalize(input);
  if (/\b(job|career|work|employment|internship|graduate|vacancy|bursary|scholarship|learnership|apprentice)\b/u.test(q)) return 'work';
  if (/\b(spaza|salon|business|startup|company|customer|sell|sales|profit|quotation|quote|tender|rfq|shop|enterprise)\b/u.test(q)) return 'business';
  if (/\b(travel|trip|drive|visa|passport|holiday|tour|tourism|route|transport|visit|visiting)\b/u.test(q)) return 'travel';
  if (/\b(video|animation|cartoon|story|creator|content|design|film|script|art|artist|music)\b/u.test(q)) return 'create';
  if (/\b(sassa|uif|municipal|municipality|pothole|water|rates|grant|consumer|refund|rights|community service)\b/u.test(q)) return 'community';
  if (/\b(exam|study|learn|school|matric|university|student|ccna|ccnp|itil|aws|azure|cloud|certification|network engineer|cybersecurity)\b/u.test(q)) return 'learn';
  if (/\b(build|app|website|software|code|coding|developer|engineer|automation|ai product|platform|system|prototype)\b/u.test(q)) return 'build';
  return 'general';
}

export function getPossibilityPlan(input: string): PossibilityPlan | null {
  const goal = input.trim();
  if (!goal || goal.length > 500) return null;
  const track = identifyPossibilityTrack(goal);
  return { track, ...plans[track] };
}
