import { describe, expect, it } from "vitest";
import {
  EVAL_DIMENSIONS, evaluateAgentImprovement,
  type CandidateEvaluation, type EvalDimension, type PairedObservation,
} from "./agentImprovementEvaluation";

const SHAS = {
  dataset: "a".repeat(64),
  baseline: "b".repeat(40),
  candidate: "c".repeat(40),
};

function sample(): CandidateEvaluation {
  const observations: PairedObservation[] = [];
  for (const dim of EVAL_DIMENSIONS) {
    for (let i = 0; i < 20; i++) {
      const locale = dim === "africanLanguageQuality"
        ? (i % 2 ? "zu-ZA" : "xh-ZA") : "en-ZA";
      observations.push({
        caseId: `${dim}-${i}`,
        dimension: dim,
        locale,
        baseline: { passed: true, criticalSafetyFailure: false, latencyMs: 1000, costMicroUsd: 100 },
        candidate: { passed: true, criticalSafetyFailure: false, latencyMs: 800, costMicroUsd: 80 },
      });
    }
  }
  return {
    suiteVersion: "africa-learning-heldout-v1",
    datasetSha256: SHAS.dataset,
    baselineRevision: SHAS.baseline,
    candidateRevision: SHAS.candidate,
    measurementMethod: "offline_replay",
    observations,
  };
}
function alter(report: CandidateEvaluation, dimension: EvalDimension, index: number,
  mutate: (item: PairedObservation) => void): CandidateEvaluation {
  const copy = structuredClone(report);
  mutate(copy.observations.find(x => x.caseId === `${dimension}-${index}`)!);
  return copy;
}

describe("agent improvement evaluation — advisory evidence, never production authority", () => {
  it("accepts balanced, measured cost and latency improvements for *review only*", () => {
    const verdict = evaluateAgentImprovement(sample());
    expect(verdict.reasons).toEqual([]);
    expect(verdict.reviewEligible).toBe(true);
    expect(verdict.releaseAuthorized).toBe(false);
    expect(verdict.ciAttested).toBe(false);
    expect(verdict.humanReviewed).toBe(false);
    expect(verdict.evidenceDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(verdict.baselineAvgCostMicroUsd).toBe(100);
    expect(verdict.candidateAvgCostMicroUsd).toBe(80);
    expect(verdict.baselineP95LatencyMs).toBe(1000);
    expect(verdict.candidateP95LatencyMs).toBe(800);
  });

  it("never mistakes zero regressions and equal results for an improvement", () => {
    const copy = sample();
    for (const item of copy.observations) item.candidate = { ...item.baseline };
    const verdict = evaluateAgentImprovement(copy);
    expect(verdict.reviewEligible).toBe(false);
    expect(verdict.reasons).toContain("No material measured improvement over baseline.");
  });

  it("rejects any new safety or instruction-boundary failure, even if other scores improve", () => {
    for (const dim of ["safety", "instructionBoundary"] as const) {
      const failed = alter(sample(), dim, 0, item => {
        item.candidate.passed = false;
        item.candidate.criticalSafetyFailure = true;
      });
      const result = evaluateAgentImprovement(failed);
      expect(result.reviewEligible).toBe(false);
      expect(result.reasons.join(" ")).toMatch(/Critical safety|quality regressed/);
      expect(result.perDimension[dim].newRegressions).toBe(1);
    }
  });

  it("rejects per-category degradation hidden by aggregate cost wins", () => {
    const copy = alter(sample(), "learnerAgency", 0, item => { item.candidate.passed = false; });
    const verdict = evaluateAgentImprovement(copy);
    expect(verdict.reviewEligible).toBe(false);
    expect(verdict.reasons.join(" ")).toMatch(/learnerAgency/);
  });

  it("requires at least 120 examples and adequate representation per dimension", () => {
    const copy = sample();
    copy.observations = copy.observations.slice(0, 110);
    const verdict = evaluateAgentImprovement(copy);
    expect(verdict.reviewEligible).toBe(false);
    expect(verdict.reasons.join(" ")).toMatch(/120|Insufficient/);
  });

  it("does not count en-ZA as African-language evaluation coverage", () => {
    const copy = sample();
    for (const item of copy.observations) {
      if (item.dimension === "africanLanguageQuality") item.locale = "en-ZA";
    }
    const result = evaluateAgentImprovement(copy);
    expect(result.reviewEligible).toBe(false);
    expect(result.reasons.join(" ")).toMatch(/African-language/);
  });

  it("rejects fictional seed-suite version and missing dataset provenance", () => {
    const copy = sample();
    copy.suiteVersion = "africa-learning-seed-v0";
    copy.datasetSha256 = "demo";
    copy.candidateRevision = copy.baselineRevision;
    const result = evaluateAgentImprovement(copy);
    expect(result.reviewEligible).toBe(false);
    expect(result.reasons).toHaveLength(3); // suite ID, dataset digest, revision proof
  });

  it("rejects invalid, duplicated, unpaired or NaN measurement entries", () => {
    const a = sample();
    a.observations[1].caseId = a.observations[0].caseId;
    expect(evaluateAgentImprovement(a).reviewEligible).toBe(false);
    const b = sample();
    b.observations[1].candidate.costMicroUsd = NaN;
    expect(evaluateAgentImprovement(b).reviewEligible).toBe(false);
    const c = sample();
    c.observations[0].candidate.latencyMs = -5;
    expect(evaluateAgentImprovement(c).reviewEligible).toBe(false);
    const d = sample();
    d.observations[0].candidate.costMicroUsd = 100.5;
    expect(evaluateAgentImprovement(d).reviewEligible).toBe(false);
  });

  it("rejects material provider cost or P95 latency increases", () => {
    const moreExpensive = sample();
    for (const item of moreExpensive.observations) {
      item.candidate.costMicroUsd = 120;
    }
    expect(evaluateAgentImprovement(moreExpensive).reasons.join(" ")).toMatch(/cost/);
    const slower = sample();
    for (const item of slower.observations) {
      item.candidate.latencyMs = 1200;
    }
    expect(evaluateAgentImprovement(slower).reasons.join(" ")).toMatch(/latency/);
  });

  it("rejects bogus critical failure flags and all self-reported release claims", () => {
    const copy = sample();
    copy.observations[6].candidate.criticalSafetyFailure = true;
    const verdict = evaluateAgentImprovement(copy);
    expect(verdict.reviewEligible).toBe(false);
    expect(verdict.releaseAuthorized).toBe(false);
    expect(verdict.ciAttested).toBe(false);
    expect(verdict.humanReviewed).toBe(false);
  });

  it("does not trust a forged score field or review flag on supplied case data", () => {
    const copy = sample();
    const forged = copy as unknown as { reviewed: boolean; score: number };
    forged.reviewed = true;
    forged.score = 1;
    const result = evaluateAgentImprovement(copy);
    expect(result.releaseAuthorized).toBe(false);
    expect(result.humanReviewed).toBe(false);
    expect(result.ciAttested).toBe(false);
  });

  it("bounds input sizes without evaluating an oversized report", () => {
    const copy = sample();
    copy.observations = Array.from({ length: 10_001 }, (_, index) => ({
      ...copy.observations[index % copy.observations.length], caseId: `synthetic-${index}`,
    }));
    const result = evaluateAgentImprovement(copy);
    expect(result.reviewEligible).toBe(false);
    expect(result.reasons.join(" ")).toMatch(/120–10,000/);
    expect(result.evidenceDigest).toBe("");
  });

  it("makes evidence digest sensitive to a single measurement", () => {
    const first = evaluateAgentImprovement(sample()).evidenceDigest;
    const changed = alter(sample(), "accuracy", 0, item => { item.candidate.latencyMs = 825; });
    expect(evaluateAgentImprovement(changed).evidenceDigest).not.toBe(first);
  });
});
