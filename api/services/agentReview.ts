import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { count, desc, eq } from "drizzle-orm";
import { healingPatches } from "../../db/schema";
import { getPrivateDb } from "../security/access";
import { reserveAiRequest } from "../security/aiBudget";
import { orchestrateRequest, getOrchestratorStatus } from "./orchestrator";
import { createEvidenceProposal } from "./agentProposalLedger";

const MAX_PROPOSAL_LENGTH = 12000;

/** A proposal is NOT a tested or applied code patch. */
export type AgentProposalInput = {
  taskName: string;
  taskDescription: string;
  assertions: string;
  maxCycles: number;
};

export function formatAgentReviewPrompt(input: AgentProposalInput): string {
  return [
    "Prepare a reviewable software-change proposal for LUQI AI.",
    "You cannot execute code, run tests, access secrets, or deploy.",
    "Return: risk assessment, root cause hypothesis, proposed minimal changes,",
    "verification plan with negative/security tests, human review, and rollback plan.",
    "If repository files or test evidence are missing, state that clearly.",
    "Never claim that a code patch has been applied or tested.",
    `Task: ${input.taskName}`,
    `Goal: ${input.taskDescription}`,
    `Required verification assertions: ${input.assertions}`,
    `Maximum planned review cycles: ${input.maxCycles}`,
  ].join("\n");
}

export async function proposeAgentImprovement(input: AgentProposalInput, userId: number) {
  const db = await getPrivateDb();
  const status = getOrchestratorStatus();
  if (status.demo) {
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: "No real AI provider is configured for agent diagnosis.",
    });
  }
  await reserveAiRequest(userId, "superCore.reviewableImprovementProposal");
  const start = Date.now();
  const result = await orchestrateRequest({
    query: formatAgentReviewPrompt(input),
    systemPrompt: "You are a code reviewer. Output suggestions only. Never claim to have executed a command, passed tests, or applied a patch.",
    throwOnProviderFailure: true,
  });
  const suggestion = result.content?.trim();
  if (!suggestion || suggestion.length > MAX_PROPOSAL_LENGTH ||
      result.provider === "demo" || result.model === "demo") {
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: "A real, bounded reviewable proposal was not returned by the model.",
    });
  }

  // The proposed code remains inert: persist its creation AND provenance
  // together in one database transaction. Missing migration fails closed.
  const created = await createEvidenceProposal({
    actorUserId: userId,
    patchType: "ai_refinement_proposal",
    targetModule: "super-core",
    agentName: "LUQI-Review-Agent",
    description: `${input.taskName}: ${input.taskDescription}`.slice(0, 1800),
    codeDiff: suggestion,
    logAgent: true,
  });
  const patchId = created.patchId;

  const durationMs = Date.now() - start;
  const telemetry = {
    id: `proposal-${patchId}`,
    taskHash: createHash("sha256").update(input.taskName + input.taskDescription).digest("hex").slice(0, 16),
    taskName: input.taskName,
    executionTimeMs: durationMs,
    attemptsBeforeSuccess: 0,
    rootCauseAnalysis: "Unverified model-generated hypothesis; CI and code review still required.",
    optimizedPromptDelta: "No automatic prompt or code changes were applied.",
    status: "PENDING_REVIEW" as const,
    timestamp: new Date().toISOString(),
    activeModel: result.model ?? result.provider,
    codeSnippet: suggestion.slice(0, 200),
  };
  return {
    activeCode: suggestion,
    telemetry,
    logs: [
      `[Review] Proposal #${patchId} saved to the persistent database.`,
      "[Security] No generated code ran on the application server.",
      "[Verification] Not tested. A reviewed PR and isolated CI are required.",
      "[Release] Production changes require explicit approval.",
    ],
    circuitPath: [String(result.provider), "persistent-proposal", "human-review", "isolated-ci"],
    patchId,
    applied: false,
    verified: false,
  };
}

export async function getAgentProposalTelemetry(limit = 25) {
  const db = await getPrivateDb();
  const proposals = await db.select({
    id: healingPatches.id,
    status: healingPatches.status,
    description: healingPatches.description,
    codeDiff: healingPatches.codeDiff,
    createdAt: healingPatches.createdAt,
    agentName: healingPatches.agentName,
  }).from(healingPatches)
    .where(eq(healingPatches.patchType, "ai_refinement_proposal"))
    .orderBy(desc(healingPatches.createdAt))
    .limit(Math.max(1, Math.min(limit, 50)));

  const [totals] = await db.select({ total: count() }).from(healingPatches)
    .where(eq(healingPatches.patchType, "ai_refinement_proposal"));
  const records = proposals.map((p) => ({
    id: `proposal-${p.id}`,
    taskHash: String(p.id),
    taskName: (p.description ?? "Review proposal").slice(0, 180),
    executionTimeMs: 0,
    attemptsBeforeSuccess: 0,
    rootCauseAnalysis: "AI proposal, not verified execution",
    optimizedPromptDelta: "Pending CI and human review",
    status: p.status === "proposed" ? "PENDING_REVIEW" : "REVIEW_STATE",
    timestamp: p.createdAt?.toISOString() ?? "",
    activeModel: p.agentName ?? "LUQI-Review-Agent",
    codeSnippet: p.codeDiff?.slice(0, 200) ?? "",
  }));

  return {
    summary: {
      totalExecutions: 0, // proposals must never be counted as actual executions
      averageLatencyMs: 0,
      averageAttempts: 0,
      failedCycles: 0,
      successRatePercent: 0,
    },
    proposalCount: Number(totals?.total ?? 0),
    records,
    evidence: "Persistent proposals only. No sandbox code executed and no test pass inferred.",
  };
}
