export const workspaceTools = [
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
      "Explore pendulum motion. Adjust the simulation and watch how the movement changes.",
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
      "Language-quality evaluation and source-grounded knowledge are in development. Translated AI answers are not available here yet.",
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
      "Edit a six-scene story, explore a 3D pendulum and export a silent 90-second animation, script and subtitles locally.",
    status: "Local creation · no paid call",
    ready: true,
    path: "/content-studio",
    icon: "academy",
  },
  {
    id: "agents",
    title: "Omega tasks",
    category: "Travel and vehicle calculations",
    description:
      "Use Omega's travel budget and vehicle service schedule calculators now, directly in your browser without an account or paid AI. The separate saved task queue and workers are not activated.",
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
