import { describe, expect, it } from "vitest";
import { evaluateDeploymentGate, type EvaluationReport } from "./deployment-evaluation";

const report: EvaluationReport = {
  suiteVersion: "2026-10",
  sampleCount: 500,
  scores: {
    accuracy: 0.9, safety: 0.99, africanLanguageQuality: 0.9,
    learnerAgency: 0.9, instructionBoundary: 0.99, calibration: 0.9,
  },
  criticalSafetyFailures: 0,
  unresolvedRegressions: 0,
  reviewerApproved: true,
};

describe("deployment evaluation gate", () => {
  it("accepts an adequate reviewed report meeting provisional thresholds", () => {
    expect(evaluateDeploymentGate(report).passed).toBe(true);
  });
  it("rejects unresolved critical failures", () => {
    expect(evaluateDeploymentGate({ ...report, criticalSafetyFailures: 1 }).passed).toBe(false);
  });
  it("rejects missing human review and regressions", () => {
    expect(evaluateDeploymentGate({ ...report, reviewerApproved: false, unresolvedRegressions: 2 }).passed).toBe(false);
  });
  it("rejects inadequate samples or unmeasured language quality", () => {
    expect(evaluateDeploymentGate({ ...report, sampleCount: 5 }).passed).toBe(false);
    expect(evaluateDeploymentGate({ ...report, scores: { ...report.scores, africanLanguageQuality: NaN } }).passed).toBe(false);
  });
});
