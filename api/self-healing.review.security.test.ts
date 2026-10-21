import { beforeEach, describe, expect, it, vi } from "vitest";

const fake = vi.hoisted(() => ({
  getPrivateDb: vi.fn(),
  createEvidenceProposal: vi.fn(),
  transitionEvidenceProposal: vi.fn(),
  readEvidenceProposalTrail: vi.fn(),
}));
vi.mock("./security/access", () => ({ getPrivateDb: fake.getPrivateDb }));
vi.mock("./services/agentProposalLedger", () => ({
  createEvidenceProposal: fake.createEvidenceProposal,
  transitionEvidenceProposal: fake.transitionEvidenceProposal,
  readEvidenceProposalTrail: fake.readEvidenceProposalTrail,
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
