export const workspaceTools = [
  {
    id: "ai-trial",
    title: "AI text trial",
    category: "Ask a question, with clear limits",
    description:
      "Sign in and give consent to try Gemini, with a separately limited OpenAI fallback. Availability is checked before sending; private notes are not sent automatically.",
    status: "Limited trial · sign-in required",
    ready: true,
    path: "/ai-trial",
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
    category: "Reliable help, carefully built",
    description:
      "Review saved task status and calculation results after signing in. Intake may be disabled; worker activity is not verified by this dashboard.",
    status: "Dashboard · sign-in required",
    ready: true,
    path: "/omega-tasks",
    icon: "agents",
  },
] as const;
export function findWorkspaceTools(
  query: string,
  filter: "all" | "ready" | "preview" = "all",
) {
  const term = query.trim().toLocaleLowerCase();
  return workspaceTools.filter(
    (tool) =>
      (filter === "all" || tool.ready === (filter === "ready")) &&
      `${tool.title} ${tool.category} ${tool.description} ${tool.status}`
        .toLocaleLowerCase()
        .includes(term),
  );
}
