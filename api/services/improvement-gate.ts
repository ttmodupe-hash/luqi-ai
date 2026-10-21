/**
 * Self-improvement proposal gate. This module never executes code, deploys
 * releases, or treats an AI-generated assertion as independent verification.
 */
export type ImprovementProposal = {
  id: string;
  kind: "bug_fix" | "security" | "performance" | "learning_quality" | "cost";
  description: string;
  evidenceLinks: string[];
  testsPassed: boolean;
  securityReviewed: boolean;
  independentEvaluationPassed: boolean;
  rollbackDocumented: boolean;
  humanApproved: boolean;
  estimatedMonthlyCostMinor: number;
  monthlyBudgetRemainingMinor: number;
};

export type ImprovementDecision = {
  eligibleForControlledPromotion: boolean;
  reasons: string[];
};

export function evaluateImprovementProposal(proposal: ImprovementProposal): ImprovementDecision {
  const reasons: string[] = [];
  if (!proposal.id.trim() || !proposal.description.trim()) {
    reasons.push("Proposal identity and description are required");
  }
  if (!proposal.evidenceLinks.length || proposal.evidenceLinks.some((link) => !/^https:\/\//.test(link))) {
    reasons.push("Verifiable HTTPS evidence links are required");
  }
  if (!proposal.testsPassed) reasons.push("Automated tests have not passed");
  if (!proposal.securityReviewed) reasons.push("Security review is required");
  if (!proposal.independentEvaluationPassed) reasons.push("Independent evaluation is required");
  if (!proposal.rollbackDocumented) reasons.push("Rollback procedure is required");
  if (!proposal.humanApproved) reasons.push("Human approval is required");
  if (!Number.isSafeInteger(proposal.estimatedMonthlyCostMinor) ||
      !Number.isSafeInteger(proposal.monthlyBudgetRemainingMinor) ||
      proposal.estimatedMonthlyCostMinor < 0 ||
      proposal.monthlyBudgetRemainingMinor < 0 ||
      proposal.estimatedMonthlyCostMinor > proposal.monthlyBudgetRemainingMinor) {
    reasons.push("Improvement exceeds available cost budget or has invalid cost data");
  }
  return { eligibleForControlledPromotion: reasons.length === 0, reasons };
}
