import { z } from "zod";
import { createRouter, adminQuery } from "./middleware";
import { getPrivateDb } from "./security/access";
import { errorLogs, healingPatches, systemMetrics, agentActivityLog, benchmarkFeeds } from "../db/schema";
import { eq, desc, and, gte, sql, count } from "drizzle-orm";
import { orchestrateRequest, getOrchestratorStatus } from "./services/orchestrator";

export const selfHealingRouter = createRouter({
  logError: adminQuery
    .input(z.object({
      errorType: z.string(),
      severity: z.string(),
      message: z.string(),
      sourceModule: z.string(),
      sourceFile: z.string().optional(),
      stackTrace: z.string().optional(),
      metadata: z.record(z.string(), z.any()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getPrivateDb();
      const [result] = await db.insert(errorLogs).values({
        errorType: input.errorType,
        severity: input.severity,
        message: input.message,
        sourceModule: input.sourceModule,
        sourceFile: input.sourceFile ?? null,
        stackTrace: input.stackTrace ?? null,
        metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
      });
      return { id: Number(result.insertId), logged: true };
    }),

  recordMetric: adminQuery
    .input(z.object({
      metricType: z.string(),
      module: z.string(),
      value: z.number(),
      unit: z.string(),
      threshold: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getPrivateDb();
      await db.insert(systemMetrics).values({
        metricType: input.metricType,
        module: input.module,
        value: String(input.value),
        unit: input.unit,
        threshold: input.threshold !== undefined ? String(input.threshold) : null,
      });
      return { recorded: true };
    }),

  getRecentErrors: adminQuery
    .input(z.object({ limit: z.number().default(50), severity: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getPrivateDb();
      const conditions = input?.severity ? eq(errorLogs.severity, input.severity) : undefined;
      return db
        .select()
        .from(errorLogs)
        .where(conditions)
        .orderBy(desc(errorLogs.timestamp))
        .limit(input?.limit ?? 50);
    }),

  getErrorStats: adminQuery
    .input(z.object({ hours: z.number().default(24) }).optional())
    .query(async ({ input }) => {
      const db = await getPrivateDb();
      const since = new Date(Date.now() - (input?.hours ?? 24) * 60 * 60 * 1000);
      
      const total = await db
        .select({ count: count() })
        .from(errorLogs)
        .where(gte(errorLogs.timestamp, since))
        .then((r) => Number(r[0]?.count ?? 0));
      
      const critical = await db
        .select({ count: count() })
        .from(errorLogs)
        .where(and(gte(errorLogs.timestamp, since), eq(errorLogs.severity, "critical")))
        .then((r) => Number(r[0]?.count ?? 0));
      
      const warning = await db
        .select({ count: count() })
        .from(errorLogs)
        .where(and(gte(errorLogs.timestamp, since), eq(errorLogs.severity, "warning")))
        .then((r) => Number(r[0]?.count ?? 0));
      
      const resolved = await db
        .select({ count: count() })
        .from(errorLogs)
        .where(and(gte(errorLogs.timestamp, since), eq(errorLogs.resolved, true)))
        .then((r) => Number(r[0]?.count ?? 0));
      
      return { total, critical, warning, resolved };
    }),

  getRecentMetrics: adminQuery
    .input(z.object({ limit: z.number().default(100), module: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getPrivateDb();
      const conditions = input?.module ? eq(systemMetrics.module, input.module) : undefined;
      return db
        .select()
        .from(systemMetrics)
        .where(conditions)
        .orderBy(desc(systemMetrics.timestamp))
        .limit(input?.limit ?? 100);
    }),

  getMetricTrends: adminQuery
    .input(z.object({ metricType: z.string(), hours: z.number().default(24) }))
    .query(async ({ input }) => {
      const db = await getPrivateDb();
      const since = new Date(Date.now() - input.hours * 60 * 60 * 1000);
      return db
        .select()
        .from(systemMetrics)
        .where(and(eq(systemMetrics.metricType, input.metricType), gte(systemMetrics.timestamp, since)))
        .orderBy(systemMetrics.timestamp);
    }),

  getAgentActivity: adminQuery
    .input(z.object({ limit: z.number().default(100) }).optional())
    .query(async ({ input }) => {
      const db = await getPrivateDb();
      return db
        .select()
        .from(agentActivityLog)
        .orderBy(desc(agentActivityLog.timestamp))
        .limit(input?.limit ?? 100);
    }),

  runTelemetryScan: adminQuery.mutation(async () => {
    const db = await getPrivateDb();
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const recentErrors = await db
      .select({ count: count() })
      .from(errorLogs)
      .where(gte(errorLogs.timestamp, fiveMinAgo))
      .then((r) => Number(r[0]?.count ?? 0));
    
    const recentAnomalies = await db
      .select({ count: count() })
      .from(systemMetrics)
      .where(and(gte(systemMetrics.timestamp, fiveMinAgo), eq(systemMetrics.isAnomaly, true)))
      .then((r) => Number(r[0]?.count ?? 0));
    
    return { scanned: recentErrors + recentAnomalies, detected: recentErrors, anomalies: recentAnomalies };
  }),

  markErrorResolved: adminQuery
    .input(z.object({ errorId: z.number(), patchId: z.number().optional() }))
    .mutation(async ({ input }) => {
      const db = await getPrivateDb();
      await db
        .update(errorLogs)
        .set({ resolved: 1, resolvedAt: new Date(), patchId: input.patchId ?? null })
        .where(eq(errorLogs.id, input.errorId));
      return { resolved: true };
    }),

  analyzeAndProposePatch: adminQuery
    .input(z.object({ errorLogId: z.number(), useAI: z.boolean().default(true) }))
    .mutation(async ({ input }) => {
      const db = await getPrivateDb();
      const [error] = await db.select().from(errorLogs).where(eq(errorLogs.id, input.errorLogId)).limit(1);
      if (!error) return { patchId: null, proposed: false };

      // Create patch proposal
      const [result] = await db.insert(healingPatches).values({
        errorLogId: input.errorLogId,
        patchType: "code_fix",
        status: "pending",
        targetModule: error.sourceModule ?? "unknown",
        targetFile: error.sourceFile ?? null,
        description: `Patch for ${error.errorType}: ${error.message.substring(0, 100)}`,
        agentName: "HealingEngineer",
      });

      return { patchId: Number(result.insertId), proposed: true };
    }),

  // AI-driven root-cause diagnosis of a logged error — real analysis via
  // the orchestrator chain, stored as a patch proposal. Honest when no
  // provider is configured. Never fabricates a fix.
  aiDiagnoseError: adminQuery
    .input(z.object({ errorLogId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getPrivateDb();
      const [error] = await db.select().from(errorLogs).where(eq(errorLogs.id, input.errorLogId)).limit(1);
      if (!error) return { diagnosed: false, reason: "error_log_not_found" };

      const status = getOrchestratorStatus();
      if (status.demo) {
        return { diagnosed: false, reason: "no_ai_provider_configured", detail: "Add an AI provider key (e.g. KIMI_API_KEY) and diagnosis runs automatically." };
      }

      const result = await orchestrateRequest({
        query: `Diagnose this production error and propose a concrete fix:\n\nType: ${error.errorType}\nSeverity: ${error.severity}\nMessage: ${error.message}\nModule: ${error.sourceModule ?? "unknown"}\nFile: ${error.sourceFile ?? "unknown"}\nStack: ${(error.stackTrace ?? "none").slice(0, 2000)}\n\nRespond with: 1) root cause, 2) immediate mitigation, 3) permanent fix, 4) a user-safe explanation.`,
        systemPrompt: "You are a senior reliability engineer. Be precise, cite the failing code path, never invent fixes you cannot justify from the evidence provided.",
      });

      const [ins] = await db.insert(healingPatches).values({
        errorLogId: input.errorLogId,
        patchType: "ai_diagnosis",
        description: result.content.slice(0, 2000),
        status: "proposed",
        agentName: "AI-Diagnostician",
        targetModule: error.sourceModule ?? "unknown",
        targetFile: error.sourceFile ?? null,
      });

      return {
        diagnosed: true,
        patchId: Number(ins.insertId),
        provider: result.provider,
        model: result.model,
        analysis: result.content,
      };
    }),

  applyPatch: adminQuery
    .input(z.object({ patchId: z.number(), skipTests: z.boolean().default(false), abTestPercent: z.number().optional() }))
    .mutation(async ({ input }) => {
      const db = await getPrivateDb();
      await db
        .update(healingPatches)
        .set({ status: "approved_for_ci" })
        .where(eq(healingPatches.id, input.patchId));
      return { success: true, message: "Patch approved for external CI review. No code was modified or deployed." };
    }),

  rollbackPatch: adminQuery
    .input(z.object({ patchId: z.number(), reason: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getPrivateDb();
      await db
        .update(healingPatches)
        .set({ status: "review_revoked", rolledBackAt: new Date(), rollbackReason: input.reason })
        .where(eq(healingPatches.id, input.patchId));
      return { success: true, message: "Patch proposal revoked. No production rollback was executed." };
    }),

  promoteABTest: adminQuery
    .input(z.object({ patchId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getPrivateDb();
      await db
        .update(healingPatches)
        .set({ status: "promotion_requested", abTestPercent: 100 })
        .where(eq(healingPatches.id, input.patchId));
      return { success: true, message: "Promotion requested for CI review. No deployment was performed." };
    }),

  getPatches: adminQuery
    .input(z.object({ status: z.string().optional(), limit: z.number().default(50) }).optional())
    .query(async ({ input }) => {
      const db = await getPrivateDb();
      const conditions = input?.status ? eq(healingPatches.status, input.status) : undefined;
      return db
        .select()
        .from(healingPatches)
        .where(conditions)
        .orderBy(desc(healingPatches.createdAt))
        .limit(input?.limit ?? 50);
    }),

  getPatchStats: adminQuery
    .input(z.object({ hours: z.number().default(24) }).optional())
    .query(async ({ input }) => {
      const db = await getPrivateDb();
      const since = new Date(Date.now() - (input?.hours ?? 24) * 60 * 60 * 1000);
      
      const rows = await db
        .select({ status: healingPatches.status, count: count() })
        .from(healingPatches)
        .where(gte(healingPatches.createdAt, since))
        .groupBy(healingPatches.status);
      
      const total = rows.reduce((sum, r) => sum + Number(r.count), 0);
      const applied = rows.find((r) => r.status === "applied")?.count ?? 0;
      const failed = rows.find((r) => r.status === "failed")?.count ?? 0;
      const rolledBack = rows.find((r) => r.status === "rolled_back")?.count ?? 0;
      const pending = rows.find((r) => r.status === "pending")?.count ?? 0;
      
      return { total, applied: Number(applied), failed: Number(failed), rolledBack: Number(rolledBack), pending: Number(pending) };
    }),

  executePatch: adminQuery
    .input(z.object({ patchId: z.number() }))
    .mutation(async ({ input }) => {
      // Execute the patch (simulated)
      return { success: false, message: "Patch execution requires a separate approved CI release.", executionLog: "No patch executed." };
    }),

  runTests: adminQuery.mutation(async () => {
    return { success: false, testsPassed: 0, testsTotal: 0, message: "Tests must be verified in GitHub Actions." };
  }),

  runTypeCheck: adminQuery.mutation(async () => {
    return { success: false, errors: null, message: "Type checking must be verified in GitHub Actions." };
  }),

  predictFailures: adminQuery.query(async () => {
    return [];
  }),

  detectAnomalies: adminQuery
    .input(z.object({ metricType: z.string(), module: z.string(), hours: z.number().default(24) }))
    .query(async ({ input }) => {
      return { anomalies: [], mean: 0, stdDev: 0 };
    }),

  forecastErrorVolume: adminQuery.query(async () => {
    return { currentHourlyRate: 0, predictedNextHour: 0, predictedNext24h: 0, trend: "stable", confidence: 0 };
  }),

  analyzeTrend: adminQuery
    .input(z.object({ metricType: z.string(), module: z.string(), hours: z.number().default(6) }))
    .query(async ({ input }) => {
      return null;
    }),

  sendNotification: adminQuery
    .input(z.object({
      title: z.string(),
      body: z.string(),
      priority: z.string(),
      source: z.string(),
      channels: z.array(z.string()).default(["in_app"]),
    }))
    .mutation(async ({ input }) => {
      return { success: false, channels: [], message: "Notification delivery is not connected." };
    }),

  testNotification: adminQuery
    .input(z.object({ channel: z.string() }))
    .mutation(async ({ input }) => {
      return { success: false, channel: input.channel, message: "Notification test was not sent." };
    }),

  runSupervisorScan: adminQuery.query(async () => {
    return {
      timestamp: new Date(),
      overallStatus: "unverified",
      agents: [],
      systemIntegrity: { errorLogTable: false, patchTable: false, metricsTable: false, activityTable: false },
      recommendations: ["Connect verified monitoring and database health probes."],
    };
  }),

  attemptSelfRepair: adminQuery.mutation(async () => {
    return { attempted: 0, succeeded: 0, failed: 0, details: [] };
  }),

  checkAgentHealth: adminQuery.query(async () => {
    return [];
  }),

  ingestBenchmark: adminQuery
    .input(z.object({
      feedSource: z.string(),
      region: z.string(),
      frameworkKey: z.string().optional(),
      updateType: z.string(),
      payload: z.record(z.string(), z.any()),
    }))
    .mutation(async ({ input }) => {
      const db = await getPrivateDb();
      const [result] = await db.insert(benchmarkFeeds).values({
        feedSource: input.feedSource,
        region: input.region,
        frameworkKey: input.frameworkKey ?? null,
        updateType: input.updateType,
        payloadJson: JSON.stringify(input.payload),
      });
      return { id: Number(result.insertId), ingested: true };
    }),

  processPendingBenchmarks: adminQuery.mutation(async () => {
    return { processed: 0, succeeded: 0, failed: 0 };
  }),

  getBenchmarkFeeds: adminQuery
    .input(z.object({ status: z.string().optional(), limit: z.number().default(50) }).optional())
    .query(async ({ input }) => {
      const db = await getPrivateDb();
      const conditions = input?.status ? eq(benchmarkFeeds.processed, input.status === "processed") : undefined;
      return db
        .select()
        .from(benchmarkFeeds)
        .where(conditions)
        .orderBy(desc(benchmarkFeeds.timestamp))
        .limit(input?.limit ?? 50);
    }),

  getBenchmarkStats: adminQuery
    .input(z.object({ hours: z.number().default(168) }).optional())
    .query(async ({ input }) => {
      return { total: 0, processed: 0, pending: 0, failed: 0 };
    }),

  seedDemoBenchmarks: adminQuery.mutation(async () => {
    return { seeded: false, message: "No demonstration benchmarks were inserted." };
  }),

  runFullHealthCheck: adminQuery.mutation(async () => {
    return {
      telemetry: { scanned: 0, detected: 0, anomalies: 0 },
      benchmarks: { processed: 0, succeeded: 0, failed: 0 },
      predictions: [],
      supervisor: {
        timestamp: new Date(),
        overallStatus: "unverified",
        agents: [],
        systemIntegrity: { errorLogTable: false, patchTable: false, metricsTable: false, activityTable: false },
        recommendations: ["Connect verified monitoring and database health probes."],
      },
      summary: {
        errors24h: { total: 0, critical: 0, warning: 0, resolved: 0 },
        patches24h: { total: 0, applied: 0, failed: 0, rolledBack: 0, pending: 0 },
        benchmarks7d: { total: 0, processed: 0, pending: 0, failed: 0 },
      },
      durationMs: 0,
    };
  }),
});
