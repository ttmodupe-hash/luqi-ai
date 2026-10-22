import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { healingPatches, agentReviewEvents, agentActivityLog, agentEvaluationEvidence } from "../../db/schema";
import { evaluateAgentImprovement, type CandidateEvaluation } from "./agentImprovementEvaluation";
import { getPrivateDb } from "../security/access";

const GENESIS = "0".repeat(64);
type ProposalAction = "proposed" | "review_requested" | "review_revoked" | "rejected";
type ProposalStatus = "proposed" | "approved_for_ci" | "review_revoked" | "rejected";
const TRANSITIONS: Record<Exclude<ProposalAction, "proposed">, { from: ProposalStatus; to: ProposalStatus }> = {
  review_requested: { from: "proposed", to: "approved_for_ci" },
  review_revoked: { from: "approved_for_ci", to: "review_revoked" },
  rejected: { from: "proposed", to: "rejected" },
};
const SHA256 = /^[a-f0-9]{64}$/;

type ProposalFields = {
  patchType?: string | null;
  errorLogId?: number | null;
  targetModule?: string | null;
  targetFile?: string | null;
  agentName?: string | null;
  description?: string | null;
  codeDiff?: string | null;
};

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Digest the inert proposal's CONTENT, not its declared verification state. */
export function proposalDigest(fields: ProposalFields): string {
  return sha256(JSON.stringify([
    fields.patchType ?? null,
    fields.errorLogId ?? null,
    fields.targetModule ?? null,
    fields.targetFile ?? null,
    fields.agentName ?? null,
    fields.description ?? null,
    fields.codeDiff ?? null,
  ]));
}

type EventFields = {
  patchId: number;
  actorUserId: number;
  action: string;
  previousStatus: string | null;
  nextStatus: string;
  proposalDigest: string;
  previousEventHash: string;
  reasonDigest: string;
};

export function calculateReviewEventHash(event: EventFields): string {
  return sha256(JSON.stringify([
    event.patchId, event.actorUserId, event.action,
    event.previousStatus, event.nextStatus, event.proposalDigest,
    event.previousEventHash, event.reasonDigest,
  ]));
}

function validActor(id: number): void {
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Verified administrator identity required." });
  }
}

function badLineage(): never {
  throw new TRPCError({
    code: "CONFLICT",
    message: "Proposal review history is missing, inconsistent or modified. Independent investigation required.",
  });
}

function validReason(value: string): string {
  const reason = typeof value === "string" ? value.trim() : "";
  if (reason.length < 12 || reason.length > 1000) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "A review rationale of 12–1000 characters is required." });
  }
  // Do not persist the reviewer's free-form text; only a comparison digest.
  return sha256(reason);
}

/** Fail closed BEFORE a paid AI call if the reviewed schema migration is absent.
 * A database or table outage must not consume tokens and then lose the proposal.
 */
export async function assertEvidenceLedgerReady(): Promise<void> {
  const db = await getPrivateDb();
  try {
    await db.select({ id: agentReviewEvents.id }).from(agentReviewEvents).limit(1);
  } catch {
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: "Private agent review storage is not ready. No AI analysis was started.",
    });
  }
}

/** Transactional creation: no proposal exists without a corresponding genesis event.
 * This records a proposed change only; does not execute code or dispatch CI.
 */
export async function createEvidenceProposal(input: ProposalFields & {
  actorUserId: number;
  patchType: "ai_refinement_proposal" | "ai_diagnosis" | "code_fix";
  description: string;
  logAgent?: boolean;
}): Promise<{ patchId: number; status: "proposed"; eventHash: string; deployed: false; ciVerified: false }> {
  validActor(input.actorUserId);
  if (!input.description?.trim() || input.description.length > 4000 ||
      (input.codeDiff?.length ?? 0) > 12000 ||
      (input.targetFile?.length ?? 0) > 500 ||
      (input.targetModule?.length ?? 0) > 255) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Proposal evidence is missing or too large." });
  }
  const db = await getPrivateDb();
  return db.transaction(async (tx: any) => {
    const fields = {
      errorLogId: input.errorLogId ?? null,
      patchType: input.patchType,
      targetModule: input.targetModule ?? null,
      targetFile: input.targetFile ?? null,
      agentName: input.agentName ?? null,
      description: input.description.trim(),
      codeDiff: input.codeDiff ?? null,
    };
    const [result] = await tx.insert(healingPatches).values({ ...fields, status: "proposed" });
    const patchId = Number(result?.insertId);
    if (!Number.isSafeInteger(patchId) || patchId < 1) throw new Error("Proposal insert did not return a valid ID.");
    const event: EventFields = {
      patchId,
      actorUserId: input.actorUserId,
      action: "proposed",
      previousStatus: null,
      nextStatus: "proposed",
      proposalDigest: proposalDigest(fields),
      previousEventHash: GENESIS,
      reasonDigest: GENESIS,
    };
    const eventHash = calculateReviewEventHash(event);
    await tx.insert(agentReviewEvents).values({ ...event, eventHash });
    if (input.logAgent) {
      await tx.insert(agentActivityLog).values({
        agentId: `admin:${input.actorUserId}`,
        agentName: input.agentName ?? "LUQI-Review-Agent",
        action: "prepare_reviewable_proposal",
        status: "proposed",
        outputData: {
          patchId, proposalDigest: event.proposalDigest,
          verifiedByCI: false, codeExecuted: false, deployed: false,
        },
      });
    }
    return { patchId, status: "proposed" as const, eventHash, deployed: false as const, ciVerified: false as const };
  });
}

function verifyEventChain(events: Array<EventFields & { eventHash: string }>): void {
  let previous = GENESIS;
  let state: string | null = null;
  for (const [index, event] of events.entries()) {
    if (!SHA256.test(event.eventHash) ||
        event.previousEventHash !== previous ||
        event.previousStatus !== state ||
        event.eventHash !== calculateReviewEventHash(event) ||
        (index === 0 && event.action !== "proposed") ||
        (index > 0 && event.action === "proposed")) badLineage();
    if (index > 0) {
      const rule = TRANSITIONS[event.action as Exclude<ProposalAction, "proposed">];
      if (!rule || rule.from !== state || rule.to !== event.nextStatus) badLineage();
    } else if (event.nextStatus !== "proposed") badLineage();
    state = event.nextStatus;
    previous = event.eventHash;
  }
}

export async function transitionEvidenceProposal(input: {
  patchId: number;
  actorUserId: number;
  action: Exclude<ProposalAction, "proposed">;
  reason: string;
}): Promise<{ changed: true; status: ProposalStatus; ciVerified: false; deployed: false }> {
  validActor(input.actorUserId);
  if (!Number.isSafeInteger(input.patchId) || input.patchId < 1) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid proposal identifier." });
  }
  const rule = TRANSITIONS[input.action];
  if (!rule) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid review action." });
  const reasonDigest = validReason(input.reason);
  const db = await getPrivateDb();
  return db.transaction(async (tx: any) => {
    // Locks proposal across application instances. A second concurrent reviewer
    // waits and then sees the newer state before attempting any mutation.
    const [patch] = await tx.select().from(healingPatches)
      .where(eq(healingPatches.id, input.patchId)).limit(1).for("update");
    if (!patch) throw new TRPCError({ code: "NOT_FOUND", message: "Proposal not found." });
    const events = await tx.select().from(agentReviewEvents)
      .where(eq(agentReviewEvents.patchId, input.patchId))
      .orderBy(agentReviewEvents.id);
    if (events.length === 0) badLineage(); // legacy entries are not auto-approved
    verifyEventChain(events);
    const genesis = events[0];
    const last = events[events.length - 1];
    if (genesis.actorUserId === input.actorUserId && input.action !== "review_revoked") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Independent administrator review required." });
    }
    if (last.nextStatus !== patch.status || patch.status !== rule.from ||
        events.some((e: any) => e.proposalDigest !== genesis.proposalDigest) ||
        proposalDigest(patch) !== genesis.proposalDigest) {
      badLineage();
    }

    const event: EventFields = {
      patchId: input.patchId,
      actorUserId: input.actorUserId,
      action: input.action,
      previousStatus: rule.from,
      nextStatus: rule.to,
      proposalDigest: genesis.proposalDigest,
      previousEventHash: last.eventHash,
      reasonDigest,
    };
    // Both changes commit or neither does; application approval never reports
    // that CI was actually submitted, passed, or that production was deployed.
    await tx.update(healingPatches).set({ status: rule.to })
      .where(eq(healingPatches.id, input.patchId));
    await tx.insert(agentReviewEvents).values({
      ...event, eventHash: calculateReviewEventHash(event),
    });
    return {
      changed: true as const,
      status: rule.to,
      ciVerified: false as const,
      deployed: false as const,
    };
  });
}

/** Read audit events and verify local chain against the current DB proposal.
 * All entry points must require validated administrator identity.
 */
export async function readEvidenceProposalTrail(patchId: number) {
  if (!Number.isSafeInteger(patchId) || patchId < 1) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid proposal identifier." });
  }
  const db = await getPrivateDb();
  const [patch] = await db.select().from(healingPatches)
    .where(eq(healingPatches.id, patchId)).limit(1);
  if (!patch) throw new TRPCError({ code: "NOT_FOUND", message: "Proposal not found." });
  const events = await db.select().from(agentReviewEvents)
    .where(eq(agentReviewEvents.patchId, patchId))
    .orderBy(agentReviewEvents.id);
  if (events.length === 0) return {
    patchId, status: patch.status, tracked: false, chainValid: false,
    events: [], warning: "Legacy proposal has no verifiable review event lineage.",
  };
  verifyEventChain(events);
  if (events.some(e => e.proposalDigest !== events[0].proposalDigest) ||
      proposalDigest(patch) !== events[0].proposalDigest ||
      patch.status !== events[events.length - 1].nextStatus) badLineage();
  return {
    patchId, status: patch.status, tracked: true, chainValid: true,
    events, warning: "Local checksum chain only; not an immutable externally anchored audit.",
  };
}


/**
 * Attach an evaluation summary to a *specific reviewed proposal*. All
 * measurements and claimed commit SHAs are UNTRUSTED, even if format-valid.
 *
 * Store no raw prompts, per-case inputs/outputs, personal data or vendor keys.
 * Only an authenticated independent CI attestor may later verify execution,
 * which is deliberately NOT implemented here.
 */
export async function submitAgentEvaluationEvidence(input: {
  actorUserId: number;
  patchId: number;
  report: CandidateEvaluation;
}): Promise<{
  evidenceId: number;
  heuristicReviewEligible: boolean;
  sourceAttested: false;
  ciAttested: false;
  releaseAuthorized: false;
  measurementDigest: string;
  duplicate: boolean;
  reasons: string[];
}> {
  validActor(input.actorUserId);
  if (!Number.isSafeInteger(input.patchId) || input.patchId < 1) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid agent proposal ID." });
  }
  const report = input.report;
  const verdict = evaluateAgentImprovement(report);
  // A failed actual benchmark (including regressions) is important and may
  // be recorded. Malformed or unverifiable *structure*, however, is rejected.
  if (!verdict.evidenceDigest || !/^[a-f0-9]{64}$/.test(verdict.evidenceDigest) ||
      !report || !Array.isArray(report.observations) ||
      report.observations.length < 120 || report.observations.length > 1000 ||
      !/^[a-f0-9]{64}$/.test(report.datasetSha256) ||
      !/^[a-f0-9]{40}$/.test(report.baselineRevision) ||
      !/^[a-f0-9]{40}$/.test(report.candidateRevision) ||
      report.baselineRevision === report.candidateRevision ||
      !/^[a-zA-Z0-9][a-zA-Z0-9_.-]{2,99}$/.test(report.suiteVersion) ||
      /seed|fixture|demo|placeholder/i.test(report.suiteVersion) ||
      (report.measurementMethod !== "offline_replay" &&
       report.measurementMethod !== "reviewed_human_scoring")) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Malformed or untraceable evaluation measurements." });
  }
  const summary = {
    suiteVersion: verdict.suiteVersion,
    observationCount: verdict.observationCount,
    candidateAccuracy: verdict.candidateAccuracy,
    baselineAccuracy: verdict.baselineAccuracy,
    baselineAvgCostMicroUsd: verdict.baselineAvgCostMicroUsd,
    candidateAvgCostMicroUsd: verdict.candidateAvgCostMicroUsd,
    baselineP95LatencyMs: verdict.baselineP95LatencyMs,
    candidateP95LatencyMs: verdict.candidateP95LatencyMs,
    perDimension: verdict.perDimension,
    reasons: verdict.reasons.slice(0, 30),
    measurementMethod: report.measurementMethod,
    warning: "Unattested submission; NOT an authenticated CI result or release approval.",
  };
  const db = await getPrivateDb();
  return db.transaction(async (tx: any) => {
    // Prevent revocation/submission races and concurrent duplicate entries.
    const [patch] = await tx.select().from(healingPatches)
      .where(eq(healingPatches.id, input.patchId)).limit(1).for("update");
    if (!patch) throw new TRPCError({ code: "NOT_FOUND", message: "Agent proposal does not exist." });
    const events = await tx.select().from(agentReviewEvents)
      .where(eq(agentReviewEvents.patchId, input.patchId))
      .orderBy(agentReviewEvents.id);
    if (!events.length) badLineage();
    verifyEventChain(events);
    const first = events[0];
    const last = events[events.length - 1];
    if (first.actorUserId === input.actorUserId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Independent evaluation submitter required." });
    }
    if (events.some((e: any) => e.proposalDigest !== first.proposalDigest) ||
        proposalDigest(patch) !== first.proposalDigest ||
        patch.status !== "approved_for_ci" || last.nextStatus !== "approved_for_ci") {
      badLineage();
    }
    const [existing] = await tx.select().from(agentEvaluationEvidence)
      .where(and(
        eq(agentEvaluationEvidence.patchId, input.patchId),
        eq(agentEvaluationEvidence.measurementDigest, verdict.evidenceDigest),
      )).limit(1);
    if (existing) {
      return {
        evidenceId: Number(existing.id),
        heuristicReviewEligible: !!existing.reviewEligible,
        sourceAttested: false as const,
        ciAttested: false as const,
        releaseAuthorized: false as const,
        measurementDigest: verdict.evidenceDigest,
        duplicate: true,
        reasons: (existing.summaryJson as { reasons?: string[] })?.reasons ?? [],
      };
    }
    const [insert] = await tx.insert(agentEvaluationEvidence).values({
      patchId: input.patchId,
      submittedByUserId: input.actorUserId,
      proposalDigest: first.proposalDigest,
      reviewEventHash: last.eventHash,
      measurementDigest: verdict.evidenceDigest,
      datasetDigest: report.datasetSha256,
      baselineRevision: report.baselineRevision,
      candidateRevision: report.candidateRevision,
      suiteVersion: report.suiteVersion,
      observationCount: verdict.observationCount,
      reviewEligible: verdict.reviewEligible,
      sourceAttested: false,
      releaseAuthorized: false,
      summaryJson: summary,
    });
    const evidenceId = Number(insert?.insertId);
    if (!Number.isSafeInteger(evidenceId) || evidenceId < 1) {
      throw new Error("Could not persist evaluation evidence.");
    }
    return {
      evidenceId,
      heuristicReviewEligible: verdict.reviewEligible,
      sourceAttested: false as const,
      ciAttested: false as const,
      releaseAuthorized: false as const,
      measurementDigest: verdict.evidenceDigest,
      duplicate: false,
      reasons: verdict.reasons,
    };
  });
}

/** Administrator-visible results remain marked as unverified assertions.
 * In particular this read method does not verify CI artifacts or Git signatures.
 */
export async function listAgentEvaluationEvidence(patchId: number) {
  if (!Number.isSafeInteger(patchId) || patchId < 1) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid agent proposal ID." });
  }
  const db = await getPrivateDb();
  const [patch] = await db.select({ id: healingPatches.id, status: healingPatches.status })
    .from(healingPatches).where(eq(healingPatches.id, patchId)).limit(1);
  if (!patch) throw new TRPCError({ code: "NOT_FOUND", message: "Agent proposal does not exist." });
  const entries = await db.select({
    id: agentEvaluationEvidence.id,
    submittedByUserId: agentEvaluationEvidence.submittedByUserId,
    measurementDigest: agentEvaluationEvidence.measurementDigest,
    proposalDigest: agentEvaluationEvidence.proposalDigest,
    reviewEventHash: agentEvaluationEvidence.reviewEventHash,
    suiteVersion: agentEvaluationEvidence.suiteVersion,
    observationCount: agentEvaluationEvidence.observationCount,
    reviewEligible: agentEvaluationEvidence.reviewEligible,
    sourceAttested: agentEvaluationEvidence.sourceAttested,
    releaseAuthorized: agentEvaluationEvidence.releaseAuthorized,
    summaryJson: agentEvaluationEvidence.summaryJson,
    createdAt: agentEvaluationEvidence.createdAt,
  }).from(agentEvaluationEvidence)
    .where(eq(agentEvaluationEvidence.patchId, patchId))
    .orderBy(desc(agentEvaluationEvidence.id)).limit(25);
  return {
    patchId,
    currentProposalStatus: patch.status,
    // No self-reported evidence is granted privileged operational semantics.
    sourceAttested: false as const,
    ciAttested: false as const,
    releaseAuthorized: false as const,
    evidence: entries.map(entry => ({
      id: entry.id,
      submittedByUserId: entry.submittedByUserId,
      measurementDigest: entry.measurementDigest,
      proposalDigest: entry.proposalDigest,
      reviewEventHash: entry.reviewEventHash,
      suiteVersion: entry.suiteVersion,
      observationCount: entry.observationCount,
      heuristicReviewEligible: entry.reviewEligible,
      sourceAttested: false as const,
      ciAttested: false as const,
      releaseAuthorized: false as const,
      summary: entry.summaryJson,
      createdAt: entry.createdAt,
    })),
    warning: "These are hash-linked, user-submitted measurements only. No independent CI or model evaluation has been verified.",
  };
}
