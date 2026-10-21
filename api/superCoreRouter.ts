// =====================================================================
// SUPER-INTELLIGENCE CORE TRPC ROUTER
// =====================================================================

import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { proposeAgentImprovement, getAgentProposalTelemetry } from "./services/agentReview";
import { experientialEducationOrchestrator, type GradeTier } from "./services/experientialEducationOrchestrator";
import { afriLearnAdaptiveEngine } from "./services/afriLearnAdaptiveEngine";

export const superCoreRouter = createRouter({
  getTelemetry: adminQuery.query(() => getAgentProposalTelemetry(25)),

  runAutonomousRefinement: adminQuery
    .input(z.object({
      taskName: z.string().trim().min(1).max(150),
      taskDescription: z.string().trim().min(1).max(3000),
      assertions: z.string().trim().min(1).max(2000),
      maxCycles: z.number().int().min(1).max(5).default(3),
    }))
    .mutation(async ({ input, ctx }) => proposeAgentImprovement(input, ctx.user.id)),

  getHistoricalPatches: adminQuery.query(async () => {
    const review = await getAgentProposalTelemetry(15);
    return review.records;
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

