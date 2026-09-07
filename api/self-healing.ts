import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { errorLogs, healingPatches, systemMetrics, agentActivityLog, benchmarkFeeds } from "../db/schema";
import { eq, desc, and, gte, sql, count } from "drizzle-orm";
import { orchestrateRequest, getOrchestratorStatus } from "./services/orchestrator";

export const selfHealingRouter = createRouter({
  logError: publicQuery
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
      const db = await getDb();
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

  recordMetric: publicQuery
    .input(z.object({
      metricType: z.string(),
      module: z.string(),
      value: z.number(),
      unit: z.string(),
      threshold: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.insert(systemMetrics).values({
        metricType: input.metricType,
        module: input.module,
        value: String(input.value),
        unit: input.unit,
        threshold: input.threshold !== undefined ? String(input.threshold) : null,
      });
      return { recorded: true };
    }),

  getRecentErrors: publicQuery
    .input(z.object({ limit: z.number().default(50), severity: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      const conditions = input?.severity ? eq(errorLogs.severity, input.severity) : undefined;
      return db
        .select()
        .from(errorLogs)
        .where(conditions)
        .orderBy(desc(errorLogs.timestamp))
        .limit(input?.limit ?? 50);
    }),

  getErrorStats: publicQuery
    .input(z.object({ hours: z.number().default(24) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
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
        .where(and(gte(errorLogs.timestamp, since), eq(errorLogs.resolved, 1)))
        .then((r) => Number(r[0]?.count ?? 0));
      
      return { total, critical, warning, resolved };
    }),

  getRecentMetrics: publicQuery
    .input(z.object({ limit: z.number().default(100), module: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      const conditions = input?.module ? eq(systemMetrics.module, input.module) : undefined;
      return db
        .select()
        .from(systemMetrics)
        .where(conditions)
        .orderBy(desc(systemMetrics.timestamp))
        .limit(input?.limit ?? 100);
    }),

  getMetricTrends: publicQuery
    .input(z.object({ metricType: z.string(), hours: z.number().default(24) }))
    .query(async ({ input }) => {
      const db = await getDb();
      const since = new Date(Date.now() - input.hours * 60 * 60 * 1000);
      return db
        .select()
        .from(systemMetrics)
        .where(and(eq(systemMetrics.metricType, input.metricType), gte(systemMetrics.timestamp, since)))
        .orderBy(systemMetrics.timestamp);
    }),

  getAgentActivity: publicQuery
    .input(z.object({ limit: z.number().default(100) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      return db
        .select()
        .from(agentActivityLog)
        .orderBy(desc(agentActivityLog.timestamp))
        .limit(input?.limit ?? 100);
    }),

  runTelemetryScan: publicQuery.mutation(async () => {
    const db = await getDb();
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const recentErrors = await db
      .select({ count: count() })
      .from(errorLogs)
      .where(gte(errorLogs.timestamp, fiveMinAgo))
      .then((r) => Number(r[0]?.count ?? 0));
    
    const recentAnomalies = await db
      .select({ count: count() })
      .from(systemMetrics)
      .where(and(gte(systemMetrics.timestamp, fiveMinAgo), eq(systemMetrics.isAnomaly, 1)))
      .then((r) => Number(r[0]?.count ?? 0));
    
    return { scanned: recentErrors + recentAnomalies, detected: recentErrors, anomalies: recentAnomalies };
  }),

  markErrorResolved: publicQuery
    .input(z.object({ errorId: z.number(), patchId: z.number().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db
        .update(errorLogs)
        .set({ resolved: 1, resolvedAt: new Date(), patchId: input.patchId ?? null })
        .where(eq(errorLogs.id, input.errorId));
      return { resolved: true };
    }),

  analyzeAndProposePatch: publicQuery
    .input(z.object({ errorLogId: z.number(), useAI: z.boolean().default(true) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
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
  aiDiagnoseError: publicQuery
    .input(z.object({ errorLogId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
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

  applyPatch: publicQuery
    .input(z.object({ patchId: z.number(), skipTests: z.boolean().default(false), abTestPercent: z.number().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db
        .update(healingPatches)
        .set({ status: "applied", appliedAt: new Date() })
        .where(eq(healingPatches.id, input.patchId));
      return { success: true, message: "Patch applied" };
    }),
