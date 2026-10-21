/**
 * Reviewed educational adaptation of OMEGA Super AI's TVET skill registry
 * (core/skill_engine.py). No OMEGA identity, memory, finance or certificate
 * systems are imported. Self-reported skills are never "verified".
 */
const TRADE_REGISTRY = {
  electrician: {
    title: "Electrician",
    skills: ["AC Theory", "Three-Phase Systems", "SANS 10142 Wiring", "Earth Leakage Protection", "Motor Control"],
    projects: {
      "SANS 10142 Wiring": "Under an accredited assessor, prepare and document a distribution-board safety and inspection plan. Do not perform live electrical installation without proper supervision.",
      "Three-Phase Systems": "In an approved electrical training lab, document a star-delta motor starter design and commissioning checklist.",
    },
  },
  fitter_and_turner: {
    title: "Fitter and Turner",
    skills: ["Lathe Operations", "Milling", "Engineering Drawing", "Metrology", "Hydraulics"],
    projects: { "Lathe Operations": "With trained supervision and machine guarding, record shaft dimensions and tolerances in a metrology log." },
  },
  plumber: {
    title: "Plumber",
    skills: ["Drainage Design", "Geyser Installation", "SANS 10252", "Brazing", "Rainwater Harvesting"],
    projects: { "Geyser Installation": "Create a documented installation plan for assessor review, including pressure and safety-device requirements. Do not work on pressurised systems without authorised supervision." },
  },
  bricklayer: {
    title: "Bricklayer",
    skills: ["Mortar Mixes", "Setting Out", "SANS 10400", "Plastering", "Arches and Lintels"],
    projects: { "Setting Out": "Prepare an annotated layout for a training-scale structure; obtain an assessor's structural and safety review." },
  },
  solar_technician: {
    title: "Solar Technician",
    skills: ["PV Array Design", "Inverters", "Battery Storage", "Net Metering", "SANS 10142"],
    projects: { "PV Array Design": "Prepare a paper design for a 5 kW residential PV array, with load assumptions, inverter selection and documented electrical protection for assessor review." },
  },
  software_dev: {
    title: "Software Developer",
    skills: ["Python", "SQL", "Git", "APIs", "Docker"],
    projects: {
      Docker: "Containerize a small, non-privileged learning API and document the build.",
      SQL: "Design and query a normalised school-record schema using fictional records only.",
    },
  },
  data_analyst: {
    title: "Data Analyst",
    skills: ["SQL", "Spreadsheets", "Statistics", "Visualization", "Python"],
    projects: {},
  },
} as const;

export type Trade = keyof typeof TRADE_REGISTRY;
export const tradeIds = Object.keys(TRADE_REGISTRY) as Trade[];

export const tradeNotice =
  "This is a versioned, educational skill-gap checklist adapted from OMEGA Super AI, not live job-market intelligence, a competence assessment, an accredited qualification, or a certificate. Skills are self-reported. Seek an accredited TVET provider and practical assessor for formal recognition.";

export function listTrades() {
  return tradeIds.map((id) => ({
    id, title: TRADE_REGISTRY[id].title,
    skillCount: TRADE_REGISTRY[id].skills.length,
  }));
}

export function getTradeSkills(trade: Trade) {
  const spec = TRADE_REGISTRY[trade];
  return {
    id: trade, title: spec.title,
    skills: [...spec.skills],
    source: "https://github.com/ttmodupe-hash/omega-super-ai/blob/main/core/skill_engine.py",
    note: tradeNotice,
  };
}

export function analyzeSelfReportedSkills(trade: Trade, selectedSkills: string[]) {
  const spec = TRADE_REGISTRY[trade];
  const unique = new Set(selectedSkills.map((x) => x.toLocaleLowerCase("en").trim()));
  const known = new Set((spec.skills as readonly string[]).map((x) => x.toLocaleLowerCase("en")));
  // Unknown skill names cannot inflate a readiness indicator.
  const recognised = [...unique].filter((skill) => known.has(skill));
  const missing = spec.skills.filter((skill) => !unique.has(skill.toLocaleLowerCase("en")));
  const percentage = Math.round(1000 * recognised.length / spec.skills.length) / 10;
  const projects = spec.projects as Record<string, string>;
  return {
    trade, title: spec.title,
    selfReportedSkills: recognised.length,
    requiredSkills: spec.skills.length,
    checklistCompletionPercent: percentage,
    missingSkills: missing,
    practicePlan: missing.map((skill) => ({
      skill,
      exercise: projects[skill] ?? "Prepare a documented practice task with an approved instructor or assessor.",
    })),
    assessmentStatus: "self_reported_not_verified" as const,
    note: tradeNotice,
  };
}
