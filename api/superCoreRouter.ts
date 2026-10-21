// =====================================================================
// SUPER-INTELLIGENCE CORE TRPC ROUTER
// =====================================================================

import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { superIntelligenceCore } from "./services/superIntelligenceCore";
import { experientialEducationOrchestrator, type GradeTier } from "./services/experientialEducationOrchestrator";
import { afriLearnAdaptiveEngine } from "./services/afriLearnAdaptiveEngine";

export const superCoreRouter = createRouter({
  getTelemetry: adminQuery.query(async () => {
    const summary = superIntelligenceCore.getSummary();
    const records = superIntelligenceCore.getRecords(25);
    return {
      summary,
      records,
    };
  }),

  runAutonomousRefinement: adminQuery
    .input(
      z.object({
        taskName: z.string().min(1),
        taskDescription: z.string().min(1),
        assertions: z.string().min(1),
        maxCycles: z.number().min(1).max(5).default(3),
      })
    )
    .mutation(async ({ input }) => {
      const result = await superIntelligenceCore.executeAutonomousLoop(
        input.taskName,
        input.taskDescription,
        input.assertions,
        input.maxCycles
      );
      return result;
    }),

  getHistoricalPatches: adminQuery.query(async () => {
    const records = superIntelligenceCore.getRecords(15);
    return records.filter((r) => r.attemptsBeforeSuccess > 1 || r.optimizedPromptDelta.length > 15);
  }),

  // ─── Experiential Super-Intelligence Education ───
  listEducationalModules: publicQuery.query(async () => {
    return experientialEducationOrchestrator.listModules();
  }),

  getEducationalModule: publicQuery
    .input(z.object({ conceptHash: z.string() }))
    .query(async ({ input }) => {
      return experientialEducationOrchestrator.getModule(input.conceptHash);
    }),

  compileEducationalSimulation: adminQuery
    .input(
      z.object({
        conceptName: z.string().min(1),
        theoreticalText: z.string().min(1),
        gradeTier: z.enum(["PRE_SCHOOL", "PRIMARY", "HIGH_SCHOOL", "HIGHER_LEARNING"]),
        verificationSuite: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      return experientialEducationOrchestrator.generateInteractiveSimulation(
        input.conceptName,
        input.theoreticalText,
        input.gradeTier as GradeTier,
        input.verificationSuite
      );
    }),

  getEducationalTelemetry: adminQuery.query(async () => {
    return experientialEducationOrchestrator.getTelemetry();
  }),

  // ─── AfriLearn Adaptive Bandwidth Pipeline ───
  compileAdaptiveLesson: adminQuery
    .input(
      z.object({
        conceptTheory: z.string().min(1),
        kbpsDownloadSpeed: z.number().default(300),
        conceptName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return afriLearnAdaptiveEngine.compileAdaptiveLesson(
        input.conceptTheory,
        input.kbpsDownloadSpeed,
        input.conceptName
      );
    }),
});

