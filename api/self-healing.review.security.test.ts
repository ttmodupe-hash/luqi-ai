import { beforeEach, describe, expect, it, vi } from "vitest";

const fake = vi.hoisted(() => ({
  getPrivateDb: vi.fn(),
  createEvidenceProposal: vi.fn(),
  transitionEvidenceProposal: vi.fn(),
  readEvidenceProposalTrail: vi.fn(),
  submitAgentEvaluationEvidence: vi.fn(),
  listAgentEvaluationEvidence: vi.fn(),
}));
vi.mock("./security/access", () => ({ getPrivateDb: fake.getPrivateDb }));
vi.mock("./services/agentProposalLedger", () => ({
  createEvidenceProposal: fake.createEvidenceProposal,
  transitionEvidenceProposal: fake.transitionEvidenceProposal,
  readEvidenceProposalTrail: fake.readEvidenceProposalTrail,
  submitAgentEvaluationEvidence: fake.submitAgentEvaluationEvidence,
  listAgentEvaluationEvidence: fake.listAgentEvaluationEvidence,
}));

import { selfHealingRouter } from "./self-healing";

function caller(role: "admin" | "user" | null, id = 13) {
  return selfHealingRouter.createCaller({
    req: new Request("https://luqi-ai.com/api/trpc"),
    user: role === null ? null : {
      id, email: "reviewer@example.test", name: null, role,
    },
  } as any);
}

describe("review ledger routes only trust validated administrator context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fake.transitionEvidenceProposal.mockResolvedValue({
      changed: true, status: "approved_for_ci", ciVerified: false, deployed: false,
    });
    fake.submitAgentEvaluationEvidence.mockResolvedValue({
      evidenceId: 9, heuristicReviewEligible: true, sourceAttested: false,
      ciAttested: false, releaseAuthorized: false, reasons: [],
    });
    fake.listAgentEvaluationEvidence.mockResolvedValue({
      patchId: 99, evidence: [], sourceAttested: false,
      ciAttested: false, releaseAuthorized: false,
    });
    fake.readEvidenceProposalTrail.mockResolvedValue({
      patchId: 99, chainValid: true, tracked: true, status: "proposed", events: [],
    });
  });

  it("blocks anonymous and non-admin users before database or state change", async () => {
    const anon = caller(null);
    const ordinary = caller("user");
    await expect(anon.getProposalReviewTrail({ patchId: 99 }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(ordinary.getProposalReviewTrail({ patchId: 99 }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(ordinary.applyPatch({
      patchId: 99, skipTests: false, reason: "Please begin independent CI review",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(ordinary.rejectPatchProposal({
      patchId: 99, reason: "Review evidence does not match",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(fake.transitionEvidenceProposal).not.toHaveBeenCalled();
    expect(fake.readEvidenceProposalTrail).not.toHaveBeenCalled();
    expect(fake.getPrivateDb).not.toHaveBeenCalled();
  });

  it("requires administrator identity before accessing any measurement evidence", async () => {
    const anon = caller(null);
    const ordinary = caller("user");
    await expect(anon.listProposalEvaluationEvidence({ patchId: 99 }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(ordinary.listProposalEvaluationEvidence({ patchId: 99 }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(fake.listAgentEvaluationEvidence).not.toHaveBeenCalled();
  });

  it("binds submitted evaluation to authenticated administrator only", async () => {
    const report = {
      suiteVersion: "africa-heldout-1",
      datasetSha256: "a".repeat(64),
      baselineRevision: "b".repeat(40),
      candidateRevision: "c".repeat(40),
      measurementMethod: "offline_replay" as const,
      observations: Array.from({ length: 120 }, (_, i) => ({
        caseId: `eval-case-${i}`,
        dimension: ["accuracy", "safety", "africanLanguageQuality", "learnerAgency", "instructionBoundary", "calibration"][Math.floor(i / 20)] as
          "accuracy" | "safety" | "africanLanguageQuality" | "learnerAgency" | "instructionBoundary" | "calibration",
        locale: i >= 40 && i < 60 ? i % 2 ? "zu-ZA" : "xh-ZA" : "en-ZA",
        baseline: { passed: true, criticalSafetyFailure: false, latencyMs: 1000, costMicroUsd: 100 },
        candidate: { passed: true, criticalSafetyFailure: false, latencyMs: 800, costMicroUsd: 80 },
      })),
    };
    await expect(caller("user").submitProposalEvaluationEvidence({ patchId: 99, report }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller("admin", 63).submitProposalEvaluationEvidence({
      patchId: 99, report, actorUserId: 9999,
    } as any)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    const result = await caller("admin", 63).submitProposalEvaluationEvidence({
      patchId: 99, report,
    });
    expect(fake.submitAgentEvaluationEvidence).toHaveBeenCalledWith({
      actorUserId: 63, patchId: 99, report,
    });
    expect(result.releaseAuthorized).toBe(false);
    expect(result.ciAttested).toBe(false);
  });

  it("rejects oversized evidence before any database call", async () => {
    await expect(caller("admin").submitProposalEvaluationEvidence({
      patchId: 99,
      report: {
        suiteVersion: "heldout-v1", datasetSha256: "a".repeat(64),
        baselineRevision: "b".repeat(40), candidateRevision: "c".repeat(40),
        measurementMethod: "offline_replay",
        observations: [],
      },
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(fake.submitAgentEvaluationEvidence).not.toHaveBeenCalled();
  });

  it("uses admin identity from session, not caller-controlled actor fields", async () => {
    const admin = caller("admin", 13);
    const result = await admin.applyPatch({
      patchId: 99, reason: "Reviewed proposal carefully, awaiting isolated CI",
      skipTests: false,
      actorUserId: 5000,
    } as any);
    expect(fake.transitionEvidenceProposal).toHaveBeenCalledWith({
      patchId: 99, actorUserId: 13, action: "review_requested",
      reason: "Reviewed proposal carefully, awaiting isolated CI",
    });
    expect(result.testsPassed).toBe(false);
    expect(result.deployed).toBe(false);
  });

  it("rejects skipping tests, unauthorized state transitions and missing rationale", async () => {
    const admin = caller("admin");
    await expect(admin.applyPatch({ patchId: 1, skipTests: true, reason: "Bypass all tests" } as any))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(admin.rejectPatchProposal({ patchId: 1, reason: "short" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(fake.transitionEvidenceProposal).not.toHaveBeenCalled();
  });
});
