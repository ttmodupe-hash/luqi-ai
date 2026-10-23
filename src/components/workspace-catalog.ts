export const workspaceTools = [
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
    title: "Learning & media",
    category: "A wider learning toolkit",
    description:
      "AI tutoring, generated video and voice need further integration and review before they are available.",
    status: "Preview",
    ready: false,
    path: null,
    icon: "academy",
  },
  {
    id: "agents",
    title: "Omega agents",
    category: "Reliable help, carefully built",
    description:
      "Six adapters are being developed. Autonomous execution and self-improvement are not enabled in this workspace.",
    status: "In development",
    ready: false,
    path: null,
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
