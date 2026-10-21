import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPrivateDb: vi.fn(),
  reserveAiRequest: vi.fn(),
  getOrchestratorStatus: vi.fn(),
  orchestrateRequest: vi.fn(),
  createEvidenceProposal: vi.fn(),
}));
vi.mock("./security/access", () => ({ getPrivateDb: mocks.getPrivateDb }));
vi.mock("./security/aiBudget", () => ({ reserveAiRequest: mocks.reserveAiRequest }));
vi.mock("./services/agentProposalLedger", () => ({
  createEvidenceProposal: mocks.createEvidenceProposal,
  transitionEvidenceProposal: vi.fn(),
  readEvidenceProposalTrail: vi.fn(),
}));
vi.mock("./services/orchestrator", () => ({
  getOrchestratorStatus: mocks.getOrchestratorStatus,
  orchestrateRequest: mocks.orchestrateRequest,
}));

import { selfHealingRouter } from "./self-healing";
import { TRPCError } from "@trpc/server";

const context = (role: string | null) => ({
  req: new Request("https://luqi-ai.com/api/trpc"),
  user: role === null ? null : { id: 42, email: "admin@example.test", name: null, role },
});
const admin = selfHealingRouter.createCaller(context("admin") as any);
const ordinary = selfHealingRouter.createCaller(context("user") as any);
const anonymous = selfHealingRouter.createCaller(context(null) as any);

function fakeDb(error: Record<string, unknown> | null = {
  id: 7, errorType: "api_error", severity: "warning",
  message: "authorization Bearer hidden-token password=hidden-password",
  sourceModule: "backend", sourceFile: "api/boot.ts",
  stackTrace: "SECRET_STACK_CONTENT",
}) {
  const inserts: Record<string, unknown>[] = [];
  const select = {
    from: () => select,
    where: () => select,
    limit: async () => error ? [error] : [],
  };
  return {
    inserts,
    select: () => select,
    insert: () => ({
      values: async (row: Record<string, unknown>) => {
        inserts.push(row);
        return [{ insertId: 101 }];
      },
    }),
  };
}

describe("admin AI diagnosis provider budgeting and evidence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOrchestratorStatus.mockReturnValue({ demo: false });
    mocks.reserveAiRequest.mockResolvedValue(undefined);
    mocks.createEvidenceProposal.mockResolvedValue({ patchId: 101 });
    mocks.orchestrateRequest.mockResolvedValue({
      content: "Hypothesis: retry failed, needs an independent staging test.",
      provider: "review-provider", model: "review-model",
    });
  });

  it("denies anonymous and regular users before touching the database or provider", async () => {
    await expect(anonymous.aiDiagnoseError({ errorLogId: 7 }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(ordinary.aiDiagnoseError({ errorLogId: 7 }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.getPrivateDb).not.toHaveBeenCalled();
    expect(mocks.orchestrateRequest).not.toHaveBeenCalled();
  });

  it("does not charge or hallucinate when no provider is configured", async () => {
    const db = fakeDb();
    mocks.getPrivateDb.mockResolvedValue(db);
    mocks.getOrchestratorStatus.mockReturnValue({ demo: true });
    const response = await admin.aiDiagnoseError({ errorLogId: 7 });
    expect(response.diagnosed).toBe(false);
    expect(mocks.reserveAiRequest).not.toHaveBeenCalled();
    expect(mocks.orchestrateRequest).not.toHaveBeenCalled();
    expect(db.inserts).toHaveLength(0);
  });

  it("never reserves or calls a paid provider for an unknown error", async () => {
    mocks.getPrivateDb.mockResolvedValue(fakeDb(null));
    const response = await admin.aiDiagnoseError({ errorLogId: 7 });
    expect(response.diagnosed).toBe(false);
    expect(mocks.reserveAiRequest).not.toHaveBeenCalled();
    expect(mocks.orchestrateRequest).not.toHaveBeenCalled();
  });

  it("must reserve both user and global allowance before any paid call", async () => {
    const db = fakeDb();
    mocks.getPrivateDb.mockResolvedValue(db);
    mocks.reserveAiRequest.mockRejectedValue(
      new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Global allowance exhausted" })
    );
    await expect(admin.aiDiagnoseError({ errorLogId: 7 })).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
    expect(mocks.reserveAiRequest).toHaveBeenCalledWith(42, "admin_error_diagnosis");
    expect(mocks.orchestrateRequest).not.toHaveBeenCalled();
    expect(db.inserts).toHaveLength(0);
  });

  it("stores only genuine bounded provider analysis, with no fake pass/deploy status", async () => {
    const db = fakeDb();
    mocks.getPrivateDb.mockResolvedValue(db);
    const result = await admin.aiDiagnoseError({ errorLogId: 7 });
    expect(mocks.reserveAiRequest).toHaveBeenCalledWith(42, "admin_error_diagnosis");
    expect(mocks.orchestrateRequest).toHaveBeenCalledTimes(1);
    const payload = mocks.orchestrateRequest.mock.calls[0][0];
    expect(payload.query).not.toContain("hidden-token");
    expect(payload.query).not.toContain("hidden-password");
    expect(payload.query).not.toContain("SECRET_STACK_CONTENT");
    expect(payload.systemPrompt).toContain("untrusted");
    expect(result).toMatchObject({ diagnosed: true, deployed: false, testsPassed: false });
    expect(db.inserts).toHaveLength(1);
    expect(db.inserts[0]).toMatchObject({ status: "proposed", patchType: "ai_diagnosis" });
  });

  it("does not store a diagnosis when the provider returns an empty result", async () => {
    const db = fakeDb();
    mocks.getPrivateDb.mockResolvedValue(db);
    mocks.orchestrateRequest.mockResolvedValue({ content: "", provider: "test", model: "test" });
    await expect(admin.aiDiagnoseError({ errorLogId: 7 })).rejects.toThrow("no usable analysis");
    expect(db.inserts).toHaveLength(0);
  });
});
