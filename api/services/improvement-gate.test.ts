import { describe, expect, it } from "vitest";
import { evaluateImprovementProposal, type ImprovementProposal } from "./improvement-gate";

const approved: ImprovementProposal = {
  id: "proposal-001",
  kind: "bug_fix",
  description: "Correct a verified issue",
  evidenceLinks: ["https://github.com/example/repo/actions/runs/1"],
  testsPassed: true,
  securityReviewed: true,
  independentEvaluationPassed: true,
  rollbackDocumented: true,
  humanApproved: true,
  estimatedMonthlyCostMinor: 100,
  monthlyBudgetRemainingMinor: 500,
};

describe("self-improvement promotion gate", () => {
  it("accepts a fully evidenced and approved proposal", () => {
    expect(evaluateImprovementProposal(approved).eligibleForControlledPromotion).toBe(true);
  });
  it("blocks unreviewed AI proposals", () => {
    const result = evaluateImprovementProposal({
      ...approved, securityReviewed: false, humanApproved: false,
    });
    expect(result.eligibleForControlledPromotion).toBe(false);
    expect(result.reasons).toContain("Human approval is required");
  });
  it("blocks over-budget improvements", () => {
    expect(evaluateImprovementProposal({
      ...approved, estimatedMonthlyCostMinor: 501,
    }).eligibleForControlledPromotion).toBe(false);
  });
  it("blocks missing evidence and rollback plans", () => {
    expect(evaluateImprovementProposal({
      ...approved, evidenceLinks: [], rollbackDocumented: false,
    }).eligibleForControlledPromotion).toBe(false);
  });
});
