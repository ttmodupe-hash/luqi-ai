export const workspaceTools = [
  {
    id: "civic-evidence", title: "Civic Evidence Desk", category: "Politics, voting and public accountability",
    description: "Understand source-linked public records, audits, budgets, Parliament and IEC voting information. Free reviewed explanations and optional signed-in AI clarification; not live party rankings or voting recommendations.",
    status: "Free evidence · optional signed-in AI", ready: true, path: "/chat?civic=1", icon: "status",
  },
  {
    id: "spatial-vision", title: "Spatial Vision & 3D Lab", category: "Inspect images and regions locally",
    description: "Process a photo on your device, explore illustrative 2.5D relief, mark serial labels locally, or request a signed-in, budgeted Gemini/OpenAI visual explanation. AI boxes are approximate, not verified masks.",
    status: "Local tools + limited signed-in AI pilot", ready: true, path: "/spatial-vision", icon: "academy",
  },
  {
    id: "visual-tutor", title: "Visual tutor", category: "Select a photo region and learn",
    description: "Crop a JPEG or PNG locally and ask for an explanation in your chosen language. Requires sign-in, per-image agreement and the shared AI allowance.",
    status: "Limited trial · sign-in required", ready: true, path: "/visual-tutor", icon: "academy",
  },
  {
    id: "ai-trial",
    title: "AI text trial",
    category: "Ask a question, with clear limits",
    description:
      "Sign in and give consent to try Gemini, with a separately limited OpenAI fallback. Availability is checked before sending; private notes are not sent automatically.",
    status: "Limited trial · sign-in required",
    ready: true,
    path: "/chat",
    icon: "status",
  },
  {
    id: "driver-rights", title: "Driver rights & traffic stops", category: "South African traffic stop law and roadside safety",
    description: "Free source-linked South African driver guidance: police ID, roadblocks, searches, fines and corruption reporting. Safe roadside quick-reference and legal review dates; no account or AI calls.",
    status: "Free · no account", ready: true, path: "/driver-rights", icon: "status",
  },
  {
    id: "consumer-rights", title: "Consumer rights & complaint help", category: "South African retail, banking and service disputes",
    description: "Free three-step guidance, official sector sources, local editable complaint drafts and a vehicle-finance balloon payment comparison with private text download. No account, paid AI or automatic filing.",
    status: "Free · no account", ready: true, path: "/consumer-rights", icon: "status",
  },
  {
    id: "comparative-evidence", title: "Faith, history & scientific evidence", category: "Comparative religion and scholarly verification",
    description: "Seven curated studies distinguishing faith narratives, scientific methods, manuscripts and historical interpretation, with source links and no religion rankings.",
    status: "Free · no account", ready: true, path: "/comparative-evidence", icon: "academy",
  },
  {
    id: "business-connect", title: "Business Connect · Local Profiles", category: "Business owners, service areas and reviewed publication",
    description: "Prepare a private owner profile, choose public contact fields and request publication review. Browse approved public business profiles without an account.",
    status: "Owner drafts and reviewed public directory", ready: true, path: "/businesses", icon: "business",
  },
  {
    id: "near-me", title: "Near me · Places & Local Support", category: "Province discovery, council contacts and map searches",
    description: "Choose a province, council, town or township for an external map search. No background tracking or invented distances.",
    status: "Free area discovery · optional location", ready: true, path: "/near-me", icon: "status",
  },
  {
    id: "opportunity-compass", title: "Opportunity Compass · Jobs & Funding", category: "South African youth government vacancies and grants",
    description: "Government jobs, graduate opportunities, bursaries, sponsorship and youth funding; nine-province map and publisher health checks. Verify openings with the agency.",
    status: "Free official sources · no account", ready: true, path: "/opportunities", icon: "business",
  },
  {
    id: "local-pulse", title: "Local Pulse · Radio & News", category: "South African talk stations and original newsrooms",
    description: "Official 702, CapeTalk, SAfm, Kaya 959, EWN and SABC links with region filters and source-linked questions. No rebroadcast, live headlines or paid AI.",
    status: "Free publisher links · no account", ready: true, path: "/local-pulse", icon: "status",
  },
  {
    id: "social-support", title: "SASSA & UIF Support", category: "South African social grants and unemployment benefits",
    description: "Official SASSA grants and UIF claims: applications, status, appeals and contacts. No private account access, IDs or paid AI.",
    status: "Free official-source guidance · no account", ready: true, path: "/social-support", icon: "status",
  },
  {
    id: "municipal-services", title: "Municipal Services · Find Your Council", category: "All nine South African provinces and local government",
    description: "Find a municipality for water, rates, indigent relief, business permits or local development; download a private checklist. No council account access, outage reporting or paid AI.",
    status: "Free original-source guidance · no account", ready: true, path: "/municipalities", icon: "status",
  },
  {
    id: "township-economy", title: "Township & Rural Business Support", category: "Small enterprise, spaza, market traders and informal economy",
    description: "Free local business action plans, municipal trade compliance, source-verified TREP and Spaza Fund starting points, and tender/market-readiness checklists. No guaranteed loan or automatic application.",
    status: "Free business planning · no account", ready: true, path: "/township-economy", icon: "business",
  },
  {
    id: "visa-entry", title: "Visa & Entry Guide · Africa", category: "Official travel and immigration entry information",
    description: "Source-linked South Africa, Kenya, Nigeria, Egypt and Cameroon visa/ETA guidance. Choose passport nationality, purpose and dates; no approval guarantees, personal documents, paid AI or live government integration.",
    status: "Five-country official-source guide · no account", ready: true, path: "/visa-entry", icon: "business",
  },
  {
    id: "tenders", title: "Tender Desk · Find & Prepare Bids", category: "South African government procurement and small business",
    description: "Official tender listings, a local bid worksheet and verified SBD 1 original-form assistance with applicant approvals. PDF/Excel inspection is limited; final completion and submission remain with you.",
    status: "Local preparation · no account", ready: true, path: "/tenders", icon: "business",
  },
  {
    id: "notes",
    title: "Private notes",
    category: "Your ideas, kept together",
    description:
      "Save conversation notes to your account. Review your history and delete a conversation when you choose.",
    status: "Sign-in required",
    ready: true,
    path: "/companion",
    icon: "notes",
  },
  {
    id: "physics",
    title: "Physics lab",
    category: "Learn by changing things",
    description:
      "Investigate simple, double and driven pendulum motion in the browser. Adjust conditions, watch graphs and collect lab observations.",
    status: "In-browser tool",
    ready: true,
    path: "/pendulum-lab",
    icon: "physics",
  },
  {
    id: "status",
    title: "Service status",
    category: "See what we can verify",
    description:
      "Check runtime and database readiness. AI availability is shown separately from service health.",
    status: "Read-only",
    ready: true,
    path: "/service-status",
    icon: "status",
  },
  {
    id: "languages",
    title: "African languages",
    category: "More voices, more possibility",
    description:
      "Choose a language preference in supported experiences while Luqi evaluates native-language teaching, translation quality and regional voices.",
    status: "In development",
    ready: false,
    path: null,
    icon: "languages",
  },
  {
    id: "academy",
    title: "Content studio",
    category: "Create, explain and learn",
    description:
      "Create a six-scene animation, edit your story and export video, script and subtitles. Record your own narration or add authorised music for supported browser exports.",
    status: "Local creation · no paid call",
    ready: true,
    path: "/content-studio",
    icon: "academy",
  },
  {
    id: "agents",
    title: "Luqi practical tools",
    category: "Travel and vehicle calculations",
    description:
      "Use Luqi's travel budget and vehicle service schedule calculators now, directly in your browser without an account or paid AI. The separate saved task queue and workers are not activated.",
    status: "Local · no account",
    ready: true,
    path: "/omega-tasks",
    icon: "agents",
  },
  {
    id: "business",
    title: "Business desk",
    category: "Quotes and pricing for small businesses",
    description:
      "Prepare a draft ZAR quotation for a customer, download its text, and estimate gross margin and break-even sales in your browser. No AI calls, tax invoices or payment processing.",
    status: "Local · no account",
    ready: true,
    path: "/business-desk",
    icon: "business",
  },
  {
    id: "study",
    title: "Study desk",
    category: "Self-paced flashcards and exam topic planning",
    description:
      "Create and review your own flashcards, plan topics before an exam, and download or import a bounded study deck. No AI calls, cloud storage or account required.",
    status: "Local · no account",
    ready: true,
    path: "/study-desk",
    icon: "study",
  },
  {
    id: "space-science", title: "Space & Science Hub", category: "South African astronomy",
    description: "SANSA, SARAO, MeerKAT and SKAO sources; radio wavelength, signal delay, practice and notes. No live feeds or paid AI.",
    status: "Free local learning", ready: true, path: "/space-science", icon: "physics",
  },
] as const;

// Normalize the fixed public catalog once, not once per word on each keystroke.
// This index never contains account data or requests information from a provider.
const searchableTools = workspaceTools.map((tool) => ({
  tool,
  text: `${tool.title} ${tool.category} ${tool.description} ${tool.status}`.toLowerCase(),
}));

export function findWorkspaceTools(
  query: string,
  filter: "all" | "ready" | "preview" = "all",
) {
  // Every literal word must match the same tool; order and whitespace do not matter.
  // Deduplicate words and use consistent casing across browser locales. No regex
  // is built from user input, and searching never changes availability or routes.
  const words = [...new Set(query.toLowerCase().trim().split(/\s+/u).filter(Boolean))];
  return searchableTools
    .filter(({ tool, text }) =>
      (filter === "all" || tool.ready === (filter === "ready")) &&
      words.every((word) => text.includes(word)),
    )
    .map(({ tool }) => tool);
}
