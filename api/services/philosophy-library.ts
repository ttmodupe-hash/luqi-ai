/**
 * Educational philosophical lenses are optional interpretive aids, not
 * religious directives or substitutes for factual evidence.
 */
export type PhilosophicalLens =
  | "ubuntu" | "maat" | "hatata" | "timbuktu" | "human-agency"
  | "confucian-cultivation" | "taoist-autonomy" | "scientific-inquiry";

export type PhilosophyEntry = {
  id: PhilosophicalLens;
  region: string;
  focus: string;
  teachingGuidance: string;
  historiographyNote: string;
};

export const PHILOSOPHY_LIBRARY: readonly PhilosophyEntry[] = [
  {
    id: "ubuntu", region: "Southern African philosophical traditions",
    focus: "Human dignity, relationships and mutual responsibility",
    teachingGuidance: "Encourage collaboration and community benefit while respecting individual autonomy.",
    historiographyNote: "Ubuntu has diverse interpretations and histories; do not treat it as a single universal African doctrine.",
  },
  {
    id: "maat", region: "Ancient Egyptian intellectual and religious traditions",
    focus: "Truth, justice, order and balance",
    teachingGuidance: "Explain evidence, fairness and uncertainty without invoking cosmic authority as scientific proof.",
    historiographyNote: "Avoid asserting disputed priority claims about the earliest philosophical texts.",
  },
  {
    id: "hatata", region: "Ethiopian philosophical traditions",
    focus: "Inquiry, critique and independent reasoning",
    teachingGuidance: "Invite learners to examine assumptions and evaluate evidence and counterarguments.",
    historiographyNote: "Attribution, textual history and interpretation of the Hatata literature have been debated.",
  },
  {
    id: "timbuktu", region: "West African scholarly traditions",
    focus: "Scholarship, manuscripts, debate and knowledge transmission",
    teachingGuidance: "Encourage source comparison, historical context and preservation of scholarly heritage.",
    historiographyNote: "Do not reduce diverse scholarly institutions and periods to one modern university analogy.",
  },
  {
    id: "human-agency", region: "African and global humanist traditions",
    focus: "Intellectual freedom and human decision-making",
    teachingGuidance: "Present alternatives and consequences; avoid manipulation or coercion.",
    historiographyNote: "Different anti-colonial thinkers disagreed on political and economic solutions.",
  },
  {
    id: "confucian-cultivation", region: "Chinese Confucian traditions",
    focus: "Self-discipline, reflection and learning through action",
    teachingGuidance: "Encourage deliberate practice and accountability without shaming learners.",
    historiographyNote: "Distinguish classical philosophical texts from modern exam systems.",
  },
  {
    id: "taoist-autonomy", region: "Chinese Daoist traditions",
    focus: "Naturalness, restraint and learner autonomy",
    teachingGuidance: "Avoid unnecessary verbosity and over-direction; answer directly when requested.",
    historiographyNote: "Daoist traditions are diverse and cannot be reduced to a single efficiency rule.",
  },
  {
    id: "scientific-inquiry", region: "Global and African scientific traditions",
    focus: "Testable claims, replication and error correction",
    teachingGuidance: "Distinguish empirical evidence from philosophical values and cultural interpretations.",
    historiographyNote: "Respect indigenous expertise while evaluating empirical claims with appropriate methods.",
  },
];

export function philosophyGuidance(lenses: readonly PhilosophicalLens[]): string {
  const selected = PHILOSOPHY_LIBRARY.filter((entry) => lenses.includes(entry.id));
  return selected.map((entry) =>
    entry.id + ": " + entry.teachingGuidance + " Context: " + entry.historiographyNote
  ).join("\n");
}
