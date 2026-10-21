export interface CompetencyEvidence {
  prediction: string;
  reflection: string;
  resultCalculated: boolean;
  parameterChanged: boolean;
}

export interface CompetencyFeedback {
  score: number;
  maximumScore: 4;
  criteria: { id: string; met: boolean; guidance: string }[];
  status: "incomplete" | "practice-complete";
}

/** Transparent practice rubric. Not a credential or proof of conceptual mastery. */
export function evaluatePracticeEvidence(evidence: CompetencyEvidence): CompetencyFeedback {
  const criteria = [
    { id: "prediction", met: evidence.prediction.trim().length >= 20, guidance: "Write a reasoned prediction of at least 20 characters." },
    { id: "investigation", met: evidence.parameterChanged, guidance: "Change at least one experimental parameter." },
    { id: "calculation", met: evidence.resultCalculated, guidance: "Calculate a valid reference result." },
    { id: "reflection", met: evidence.reflection.trim().length >= 30, guidance: "Explain your findings in at least 30 characters." },
  ];
  const score = criteria.filter(item => item.met).length;
  return { score, maximumScore: 4, criteria, status: score === 4 ? "practice-complete" : "incomplete" };
}
