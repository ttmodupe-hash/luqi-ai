// =====================================================================// SELF-HEALING MULTI-AGENT METACOGNITION — tRPC ROUTER// =====================================================================

import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import {
  logError,
  recordMetric,
  getRecentErrors,
  getErrorStats,
  getRecentMetrics,
  getMetricTrends,
  getAgentActivity,
  runTelemetryScan,
  markErrorResolved,
} from "./services/self-healing/telemetry";
import {
  analyzeAndProposePatch,
  applyPatch,
  rollbackPatch,
  getPatches,
  getPatchStats,
  promoteABTest,
} from "./services/self-healing/healer";
import {
  ingestBenchmark,
  processPendingBenchmarks,
  getBenchmarkFeeds,
  getBenchmarkStats,
  seedDemoBenchmarks,
} from "./services/self-healing/upgrader";
import {
  predictFailures,
  detectAnomalies,
  forecastErrorVolume,
  analyzeTrend,
} from "./services/self-healing/predictive";
import {
  sendNotification,
} from "./services/self-healing/notifications";
import {
  runSupervisorScan,
  attemptSelfRepair,
  checkAgentHealth,
} from "./services/self-healing/supervisor";
import {
  executePatch,
  runTestSuite,
  runTypeCheck,
} from "./services/self-healing/code-executor";

export const selfHealingRouter = createRouter({
  // ── TELEMETRY ─────────────────────────────────────────────────────

  logError: publicQuery
    .input(
      z.object({
        errorType: z.enum([
          "DATA_COMPATIBILITY_GAP",
          "API_FAILURE",
          "CALCULATION_ERROR",
          "PERFORMANCE_DEGRADATION",
          "SAFETY_VIOLATION",
          "TRANSLATION_MISSING",
          "NETWORK_TIMEOUT",
          "DATABASE_ERROR",
        ]),
        severity: z.enum(["critical", "warning", "info"]),
        message: z.string(),
        sourceModule: z.string(),
        sourceFile: z.string().optional(),
        stackTrace: z.string().optional(),
        metadata: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await logError(input);
      return { id, logged: true };
    }),

  recordMetric: publicQuery
    .input(
      z.object({
        metricType: z.string(),
        module: z.string(),
        value: z.number(),
        unit: z.string(),
        threshold: z.number().optional(),
        metadata: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      await recordMetric(input);
      return { recorded: true };
    }),

  getRecentErrors: publicQuery
    .input(z.object({ limit: z.number().default(50), severity: z.string().optional() }).optional())
    .query(async ({ input }) => {
      return getRecentErrors(input?.limit ?? 50, input?.severity as any);
    }),

  getErrorStats: publicQuery
    .input(z.object({ hours: z.number().default(24) }).optional())
    .query(async ({ input }) => {
      return getErrorStats(input?.hours ?? 24);
    }),

  getRecentMetrics: publicQuery
    .input(z.object({ limit: z.number().default(100), module: z.string().optional() }).optional())
    .query(async ({ input }) => {
      return getRecentMetrics(input?.limit ?? 100, input?.module);
    }),

  getMetricTrends: publicQuery
    .input(z.object({ metricType: z.string(), hours: z.number().default(24) }))
    .query(async ({ input }) => {
      return getMetricTrends(input.metricType, input.hours);
    }),

  getAgentActivity: publicQuery
    .input(z.object({ limit: z.number().default(100) }).optional())
    .query(async ({ input }) => {
      return getAgentActivity(input?.limit ?? 100);
    }),

  runTelemetryScan: publicQuery.mutation(async () => {
    return runTelemetryScan();
  }),

  markErrorResolved: publicQuery
    .input(z.object({ errorId: z.number(), patchId: z.number().optional() }))
    .mutation(async ({ input }) => {
      await markErrorResolved(input.errorId, input.patchId);
      return { resolved: true };
    }),

  // ── HEALER ────────────────────────────────────────────────────────

  analyzeAndProposePatch: publicQuery
    .input(z.object({ errorLogId: z.number(), useAI: z.boolean().default(true) }))
    .mutation(async ({ input }) => {
      const patchId = await analyzeAndProposePatch(input.errorLogId, input.useAI);
      return { patchId, proposed: patchId !== null };
    }),

  applyPatch: publicQuery
    .input(
      z.object({
        patchId: z.number(),
        skipTests: z.boolean().default(false),
        abTestPercent: z.number().min(1).max(100).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return applyPatch(input.patchId, { skipTests: input.skipTests, abTestPercent: input.abTestPercent });
    }),

  rollbackPatch: publicQuery
    .input(z.object({ patchId: z.number(), reason: z.string() }))
    .mutation(async ({ input }) => {
      return rollbackPatch(input.patchId, input.reason);
    }),

  promoteABTest: publicQuery
    .input(z.object({ patchId: z.number() }))
    .mutation(async ({ input }) => {
      return promoteABTest(input.patchId);
    }),

  getPatches: publicQuery
    .input(z.object({ status: z.string().optional(), limit: z.number().default(50) }).optional())
    .query(async ({ input }) => {
      return getPatches(input?.status as any, input?.limit ?? 50);
    }),

  getPatchStats: publicQuery
    .input(z.object({ hours: z.number().default(24) }).optional())
    .query(async ({ input }) => {
      return getPatchStats(input?.hours ?? 24);
    }),

  // ── CODE EXECUTION ────────────────────────────────────────────────

  executePatch: publicQuery
    .input(z.object({ patchId: z.number() }))
    .mutation(async ({ input }) => {
      return executePatch(input.patchId);
    }),

  runTests: publicQuery
    .input(z.object({ pattern: z.string().optional() }).optional())
    .mutation(async ({ input }) => {
      return runTestSuite(input?.pattern);
    }),

  runTypeCheck: publicQuery.mutation(async () => {
    return runTypeCheck();
  }),

  // ── PREDICTIVE ANALYTICS ──────────────────────────────────────────

  predictFailures: publicQuery
    .input(z.object({ module: z.string().optional() }).optional())
    .query(async ({ input }) => {
      return predictFailures(input?.module);
    }),

  detectAnomalies: publicQuery
    .input(z.object({ metricType: z.string(), module: z.string(), hours: z.number().default(24) }))
    .query(async ({ input }) => {
      return detectAnomalies(input.metricType, input.module, input.hours);
    }),

  forecastErrorVolume: publicQuery
    .input(z.object({ hours: z.number().default(24) }).optional())
    .query(async ({ input }) => {
      return forecastErrorVolume(input?.hours ?? 24);
    }),

  analyzeTrend: publicQuery
    .input(z.object({ metricType: z.string(), module: z.string(), hours: z.number().default(6) }))
    .query(async ({ input }) => {
      return analyzeTrend(input.metricType, input.module, input.hours);
    }),

  // ── NOTIFICATIONS ─────────────────────────────────────────────────

  sendNotification: publicQuery
    .input(
      z.object({
        title: z.string(),
        body: z.string(),
        priority: z.enum(["critical", "high", "medium", "low"]),
        source: z.string(),
        channels: z.array(z.enum(["webhook", "email", "slack", "discord", "in_app"])).default(["in_app"]),
        metadata: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return sendNotification(input, input.channels);
    }),

  testNotification: publicQuery
    .input(z.object({ channel: z.enum(["webhook", "email", "slack", "discord"]) }))
    .mutation(async ({ input }) => {
      return sendNotification(
        {
          title: "Test Notification",
          body: "This is a test from LUQI Self-Healing system.",
          priority: "low",
          source: "SelfHealingDashboard",
        },
        [input.channel]
      );
    }),

  // ── SUPERVISOR ────────────────────────────────────────────────────

  runSupervisorScan: publicQuery.query(async () => {
    return runSupervisorScan();
  }),

  attemptSelfRepair: publicQuery.mutation(async () => {
    return attemptSelfRepair();
  }),

  checkAgentHealth: publicQuery.query(async () => {
    return checkAgentHealth();
  }),

  // ── UPGRADER ──────────────────────────────────────────────────────

  ingestBenchmark: publicQuery
    .input(
      z.object({
        feedSource: z.string(),
        region: z.string(),
        frameworkKey: z.string().optional(),
        updateType: z.enum(["new_framework", "curriculum_update", "lab_expansion", "language_addition", "safety_update"]),
        payload: z.record(z.string(), z.any()),
      })
    )
    .mutation(async ({ input }) => {
      const id = await ingestBenchmark(input as any);
      return { id, ingested: true };
    }),

  processPendingBenchmarks: publicQuery
    .input(z.object({ limit: z.number().default(10) }).optional())
    .mutation(async ({ input }) => {
      return processPendingBenchmarks(input?.limit ?? 10);
    }),

  getBenchmarkFeeds: publicQuery
    .input(z.object({ status: z.enum(["pending", "processed", "failed"]).optional(), limit: z.number().default(50) }).optional())
    .query(async ({ input }) => {
      return getBenchmarkFeeds(input?.status, input?.limit ?? 50);
    }),

  getBenchmarkStats: publicQuery
    .input(z.object({ hours: z.number().default(168) }).optional())
    .query(async ({ input }) => {
      return getBenchmarkStats(input?.hours ?? 168);
    }),

  seedDemoBenchmarks: publicQuery.mutation(async () => {
    await seedDemoBenchmarks();
    return { seeded: true };
  }),

  // ── ORCHESTRATOR ──────────────────────────────────────────────────

  runFullHealthCheck: publicQuery.mutation(async () => {
    const start = Date.now();

    // 1. Telemetry scan
    const telemetry = await runTelemetryScan();

    // 2. Process any pending benchmarks
    const benchmarks = await processPendingBenchmarks(5);

    // 3. Get predictions
    const predictions = await predictFailures();

    // 4. Supervisor scan
    const supervisor = await runSupervisorScan();

    // 5. Get current stats
    const errors = await getErrorStats(24);
    const patches = await getPatchStats(24);
    const feeds = await getBenchmarkStats(168);

    return {
      telemetry,
      benchmarks,
      predictions,
      supervisor,
      summary: {
        errors24h: errors,
        patches24h: patches,
        benchmarks7d: feeds,
      },
      durationMs: Date.now() - start,
    };
  }),
});
