import crypto from "node:crypto";
import fs from "node:fs";
import mysql from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createEvidenceProposal,
  transitionEvidenceProposal,
  readEvidenceProposalTrail,
  calculateReviewEventHash,
  proposalDigest,
  submitAgentEvaluationEvidence,
  listAgentEvaluationEvidence,
} from "./agentProposalLedger";
import { EVAL_DIMENSIONS, type CandidateEvaluation } from "./agentImprovementEvaluation";

const integration = process.env.RUN_MYSQL_INTEGRATION === "1" ? describe : describe.skip;

// This suite changes schema and rows. It is allowed ONLY in the dedicated
// ephemeral localhost MySQL CI database, never a staging or production DB.
integration("agent proposal history in a real transactional MySQL database", () => {
  let connection: mysql.Connection;
  const inserted: number[] = [];

  beforeAll(async () => {
    if (process.env.CI !== "true" || !process.env.DATABASE_URL) {
      throw new Error("Agent review integration requires dedicated CI database");
    }
    const u = new URL(process.env.DATABASE_URL);
    if (u.hostname !== "127.0.0.1" || u.pathname !== "/luqi_integration") {
      throw new Error("Refusing to create review tables outside ephemeral CI MySQL");
    }
    connection = await mysql.createConnection(process.env.DATABASE_URL);
    await connection.query(`CREATE TABLE IF NOT EXISTS healing_patches (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      error_log_id INT NULL,
      patch_type VARCHAR(100),
      target_module VARCHAR(255),
      target_file VARCHAR(500),
      agent_name VARCHAR(255),
      description TEXT,
      code_diff TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ab_test_percent INT NULL,
      applied_at TIMESTAMP NULL,
      rolled_back_at TIMESTAMP NULL,
      rollback_reason TEXT NULL
    ) ENGINE=InnoDB`);
    await connection.query(`CREATE TABLE IF NOT EXISTS agent_activity_log (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      agent_id VARCHAR(255) NOT NULL,
      agent_name VARCHAR(255),
      action VARCHAR(255) NOT NULL,
      status VARCHAR(50) DEFAULT 'success',
      input_data JSON NULL,
      output_data JSON NULL,
      error_message TEXT NULL,
      duration_ms INT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`);
    const migration = fs.readFileSync("db/migrations/20261021_agent_review_events.sql", "utf8");
    await connection.query(migration);
    await connection.query(fs.readFileSync(
      "db/migrations/20261022_agent_evaluation_evidence.sql", "utf8"
    ));
  });

  afterAll(async () => {
    if (connection) {
      for (const id of inserted) {
        await connection.execute("DELETE FROM agent_evaluation_evidence WHERE patch_id = ?", [id]);
        await connection.execute("DELETE FROM agent_review_events WHERE patch_id = ?", [id]);
        await connection.execute("DELETE FROM healing_patches WHERE id = ?", [id]);
      }
      await connection.end();
    }
  });

  async function makeProposal() {
    const created = await createEvidenceProposal({
      actorUserId: 73501,
      patchType: "ai_refinement_proposal",
      description: `Review DB isolation ${crypto.randomUUID()}`,
      codeDiff: "// inert suggestion; never executed",
      targetModule: "review-ledger",
      agentName: "CI-Proposal-Agent",
      logAgent: true,
    });
    inserted.push(created.patchId);
    return created.patchId;
  }

  it("commits an inert proposal and one signed-by-identity event together", async () => {
    const id = await makeProposal();
    const trail = await readEvidenceProposalTrail(id);
    expect(trail.tracked).toBe(true);
    expect(trail.chainValid).toBe(true);
    expect(trail.status).toBe("proposed");
    expect(trail.events).toHaveLength(1);
    expect(trail.events[0].actorUserId).toBe(73501);
    expect(trail.events[0].action).toBe("proposed");
    expect(trail.events[0].eventHash).toMatch(/^[a-f0-9]{64}$/);
    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT * FROM healing_patches WHERE id = ?", [id]
    );
    expect(rows[0].status).toBe("proposed");
  });

  it("requires another authenticated admin and never claims CI or deployment", async () => {
    const id = await makeProposal();
    await expect(transitionEvidenceProposal({
      patchId: id, actorUserId: 73501, action: "review_requested",
      reason: "Independent review requested for CI",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const result = await transitionEvidenceProposal({
      patchId: id, actorUserId: 73502, action: "review_requested",
      reason: "Independent reviewer checked proposal rationale and tests",
    });
    expect(result).toEqual({
      changed: true, status: "approved_for_ci", ciVerified: false, deployed: false,
    });
    const trail = await readEvidenceProposalTrail(id);
    expect(trail.events).toHaveLength(2);
    expect(trail.events[1].actorUserId).toBe(73502);
    await expect(transitionEvidenceProposal({
      patchId: id, actorUserId: 73503, action: "review_requested",
      reason: "Duplicate review should not succeed",
    })).rejects.toMatchObject({ code: "CONFLICT" });
    const revoke = await transitionEvidenceProposal({
      patchId: id, actorUserId: 73502, action: "review_revoked",
      reason: "Staging negative case did not yet pass",
    });
    expect(revoke.status).toBe("review_revoked");
    expect((await readEvidenceProposalTrail(id)).events).toHaveLength(3);
  });

  it("serializes competing reviewers across instances", async () => {
    const id = await makeProposal();
    const attempts = await Promise.allSettled([
      transitionEvidenceProposal({ patchId: id, actorUserId: 73502,
        action: "review_requested", reason: "Reviewed by independent SRE one" }),
      transitionEvidenceProposal({ patchId: id, actorUserId: 73503,
        action: "review_requested", reason: "Reviewed by independent SRE two" }),
    ]);
    expect(attempts.filter(x => x.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter(x => x.status === "rejected")).toHaveLength(1);
    expect((await readEvidenceProposalTrail(id)).events).toHaveLength(2);
  });

  it("does not rewrite a proposal from a reviewer-submitted status or evidence", async () => {
    const id = await makeProposal();
    await connection.execute(
      "UPDATE healing_patches SET description = ? WHERE id = ?",
      ["Tampered text", id],
    );
    await expect(transitionEvidenceProposal({
      patchId: id, actorUserId: 73502, action: "rejected",
      reason: "Content has been modified without authorization",
    })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(readEvidenceProposalTrail(id)).rejects.toMatchObject({ code: "CONFLICT" });
    const [rows] = await connection.execute<mysql.RowDataPacket[]>(
      "SELECT COUNT(*) AS count FROM agent_review_events WHERE patch_id = ?", [id]
    );
    expect(Number(rows[0].count)).toBe(1);
  });

  it("fails safely for untracked legacy proposals", async () => {
    const [result] = await connection.execute<mysql.ResultSetHeader>(
      "INSERT INTO healing_patches (description, status) VALUES (?,?)",
      ["Legacy record has no review chain", "proposed"]
    );
    const id = result.insertId;
    inserted.push(id);
    expect((await readEvidenceProposalTrail(id)).tracked).toBe(false);
    await expect(transitionEvidenceProposal({
      patchId: id, actorUserId: 73502, action: "review_requested",
      reason: "Unsafe legacy migration must not be approved",
    })).rejects.toMatchObject({ code: "CONFLICT" });
  });
  function measuredReport(): CandidateEvaluation {
    return {
      suiteVersion: "african-language-heldout-v1",
      datasetSha256: "a".repeat(64),
      baselineRevision: "b".repeat(40),
      candidateRevision: "c".repeat(40),
      measurementMethod: "offline_replay",
      observations: EVAL_DIMENSIONS.flatMap(dimension =>
        Array.from({ length: 20 }, (_, i) => ({
          caseId: `${dimension}-${i}`,
          dimension,
          locale: dimension === "africanLanguageQuality"
            ? i % 2 ? "zu-ZA" : "xh-ZA" : "en-ZA",
          baseline: { passed: true, criticalSafetyFailure: false, latencyMs: 1000, costMicroUsd: 100 },
          candidate: { passed: true, criticalSafetyFailure: false, latencyMs: 800, costMicroUsd: 80 },
        }))
      ),
    };
  }

  it("binds review-only evaluation evidence to an independently reviewed proposal", async () => {
    const patchId = await makeProposal();
    await transitionEvidenceProposal({
      patchId, actorUserId: 73502, action: "review_requested",
      reason: "Independently reviewed plan and awaiting evaluation",
    });
    const evidence = await submitAgentEvaluationEvidence({
      actorUserId: 73503, patchId, report: measuredReport(),
    });
    expect(evidence).toMatchObject({
      heuristicReviewEligible: true, releaseAuthorized: false,
      ciAttested: false, sourceAttested: false, duplicate: false,
    });
    const listed = await listAgentEvaluationEvidence(patchId);
    expect(listed.evidence).toHaveLength(1);
    expect(listed.evidence[0].id).toBe(evidence.evidenceId);
    expect(listed.evidence[0].sourceAttested).toBe(false);
    expect(listed.evidence[0].releaseAuthorized).toBe(false);
    expect(listed.currentProposalStatus).toBe("approved_for_ci");
    expect(JSON.stringify(listed)).not.toContain("accuracy-0");
    const [dbRows] = await connection.execute<mysql.RowDataPacket[]>(
      "SELECT source_attested, release_authorized, measurement_digest FROM agent_evaluation_evidence WHERE patch_id = ?",
      [patchId],
    );
    expect(Number(dbRows[0].source_attested)).toBe(0);
    expect(Number(dbRows[0].release_authorized)).toBe(0);
    expect(dbRows[0].measurement_digest).toBe(evidence.measurementDigest);
  });

  it("deduplicates repeated measurements and refuses the proposal creator", async () => {
    const patchId = await makeProposal();
    await transitionEvidenceProposal({
      patchId, actorUserId: 73502, action: "review_requested",
      reason: "Independent administrator review requested",
    });
    const report = measuredReport();
    await expect(submitAgentEvaluationEvidence({
      patchId, actorUserId: 73501, report,
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const first = await submitAgentEvaluationEvidence({ patchId, actorUserId: 73503, report });
    const second = await submitAgentEvaluationEvidence({ patchId, actorUserId: 73503, report });
    expect(second.duplicate).toBe(true);
    expect(second.evidenceId).toBe(first.evidenceId);
    expect((await listAgentEvaluationEvidence(patchId)).evidence).toHaveLength(1);
  });

  it("stores failing measured regressions as blocked evidence, never green", async () => {
    const patchId = await makeProposal();
    await transitionEvidenceProposal({
      patchId, actorUserId: 73502, action: "review_requested",
      reason: "Independent review before negative scenario",
    });
    const report = measuredReport();
    report.observations.find(x => x.dimension === "safety")!.candidate = {
      passed: false, criticalSafetyFailure: true,
      latencyMs: 800, costMicroUsd: 70,
    };
    const result = await submitAgentEvaluationEvidence({ patchId, actorUserId: 73503, report });
    expect(result.heuristicReviewEligible).toBe(false);
    expect(result.reasons.join(" ")).toMatch(/safety|Critical/);
    expect(result.releaseAuthorized).toBe(false);
  });

  it("will not submit a measurement for unreviewed, revoked or manipulated proposals", async () => {
    const patchId = await makeProposal();
    await expect(submitAgentEvaluationEvidence({
      patchId, actorUserId: 73503, report: measuredReport(),
    })).rejects.toMatchObject({ code: "CONFLICT" });
    await transitionEvidenceProposal({
      patchId, actorUserId: 73502, action: "review_requested",
      reason: "Independent review checked the draft",
    });
    await transitionEvidenceProposal({
      patchId, actorUserId: 73502, action: "review_revoked",
      reason: "Validation not yet approved by CI",
    });
    await expect(submitAgentEvaluationEvidence({
      patchId, actorUserId: 73503, report: measuredReport(),
    })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("refuses malformed reports without inserting records or touching vendor APIs", async () => {
    const patchId = await makeProposal();
    await transitionEvidenceProposal({
      patchId, actorUserId: 73502, action: "review_requested",
      reason: "Independent review checked the proposal",
    });
    const report = measuredReport();
    report.observations[1].caseId = report.observations[0].caseId;
    await expect(submitAgentEvaluationEvidence({
      patchId, actorUserId: 73503, report,
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect((await listAgentEvaluationEvidence(patchId)).evidence).toHaveLength(0);
  });
});

describe("proposal evidence digests", () => {
  it("is stable for the same inert data, different when content changes", () => {
    const a = { patchType: "code_fix", description: "Review SQL" };
    expect(proposalDigest(a)).toBe(proposalDigest(a));
    expect(proposalDigest(a)).not.toBe(proposalDigest({ ...a, description: "Review shell" }));
  });

  it("binds actor, status, rationale hash, prior hash and proposal", () => {
    const e = {
      patchId: 42, actorUserId: 123, action: "review_requested" as const,
      previousStatus: "proposed", nextStatus: "approved_for_ci",
      proposalDigest: "0".repeat(64), previousEventHash: "1".repeat(64),
      reasonDigest: "2".repeat(64),
    };
    expect(calculateReviewEventHash(e)).toMatch(/^[a-f0-9]{64}$/);
    expect(calculateReviewEventHash(e))
      .not.toBe(calculateReviewEventHash({ ...e, actorUserId: 999 }));
  });
});
