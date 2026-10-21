// =====================================================================
// ARCHIVE TRPC ROUTER — Flight Recorder, Cognitive Memory & Artifact Vault
// =====================================================================

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, adminQuery } from "./middleware";
import {
  listActiveThreads,
  getThreadCheckpoints,
  recordGraphCheckpoint,
} from "./services/flightRecorder";
import {
  queryCognitiveMemory,
  storeCognitiveFact,
} from "./services/cognitiveMemory";
import {
  listArchivedArtifacts,
  archiveArtifact,
} from "./services/artifactVault";

export const archiveRouter = createRouter({
  // ── 1. Orchestration Flight Recorder (LangGraph Checkpointers) ───
  listThreads: adminQuery
    .input(z.object({ limit: z.number().default(50) }).optional())
    .query(async ({ input }) => {
      return listActiveThreads(input?.limit ?? 50);
    }),

  getThreadTimeline: adminQuery
    .input(z.object({ threadId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/) }))
    .query(async ({ input }) => {
      return getThreadCheckpoints(input.threadId);
    }),

  recordCheckpoint: adminQuery
    .input(
      z.object({
        threadId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
        nodeName: z.string().min(1).max(100),
        channelValues: z.record(z.string(), z.any()),
        toolCalls: z
          .array(
            z.object({
              toolName: z.string(),
              arguments: z.record(z.string(), z.any()),
              result: z.any(),
              durationMs: z.number(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      return recordGraphCheckpoint({
        threadId: input.threadId,
        nodeName: input.nodeName,
        channelValues: input.channelValues,
        toolCalls: input.toolCalls?.map((call) => ({
          toolName: call.toolName,
          arguments: call.arguments,
          result: call.result,
          durationMs: call.durationMs,
        })),
      });
    }),

  // ── 2. Cognitive Archiving (CrewAI Unified Memory) ───────────────
  getCognitiveMemory: adminQuery
    .input(
      z
        .object({
          category: z.enum(["short_term", "long_term", "entity"]).optional(),
          searchQuery: z.string().optional(),
          limit: z.number().default(50),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return queryCognitiveMemory(input);
    }),

  storeCognitiveFact: adminQuery
    .input(
      z.object({
        category: z.enum(["short_term", "long_term", "entity"]),
        subject: z.string(),
        predicate: z.string(),
        object: z.string(),
        context: z.string().optional(),
        confidence: z.number().min(0).max(1).default(1.0),
        sourceTask: z.string(),
        agentRole: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return storeCognitiveFact({
        category: input.category,
        subject: input.subject,
        predicate: input.predicate,
        object: input.object,
        context: input.context,
        confidence: input.confidence ?? 1,
        sourceTask: input.sourceTask,
        agentRole: input.agentRole,
      });
    }),

  // ── 3. Custom Artifact Vault (Files & Paired JSON Metadata) ──────
  listArtifacts: adminQuery
    .input(
      z
        .object({
          fileType: z.string().optional(),
          dateFolder: z.string().optional(),
          limit: z.number().default(50),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return listArchivedArtifacts(input);
    }),

  archiveArtifact: adminQuery
    .input(
      z.object({
        fileName: z.string().min(1).max(255),
        fileType: z.enum(["excel", "pdf", "json", "video", "audio", "report"]),
        contentBase64: z.string().max(7000000).optional(),
        contentText: z.string().max(1000000).optional(),
        taskOutput: z.object({
          agentRole: z.string(),
          taskName: z.string(),
          crewId: z.string().optional(),
          threadId: z.string().optional(),
          modelUsed: z.string().optional(),
          promptSummary: z.string().optional(),
          executionDurationMs: z.number().optional(),
          primaryKeysReconciled: z.number().optional(),
          status: z.enum(["verified", "completed"]).default("verified"),
        }),
      }).refine((value) => Number(value.contentBase64 !== undefined) + Number(value.contentText !== undefined) === 1, {
        message: "Supply exactly one of contentBase64 or contentText.",
      })
    )
    .mutation(async ({ input }) => {
      if (input.contentBase64 !== undefined && (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input.contentBase64))) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid base64 artifact content." });
      }
      const buffer = input.contentBase64 !== undefined
        ? Buffer.from(input.contentBase64, "base64")
        : Buffer.from(input.contentText!, "utf-8");
      if (buffer.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Artifact content cannot be empty." });
      }

      return archiveArtifact({
        fileName: input.fileName,
        fileType: input.fileType,
        content: buffer,
        taskOutput: {
          agentRole: input.taskOutput.agentRole,
          taskName: input.taskOutput.taskName,
          crewId: input.taskOutput.crewId,
          threadId: input.taskOutput.threadId,
          modelUsed: input.taskOutput.modelUsed,
          promptSummary: input.taskOutput.promptSummary,
          executionDurationMs: input.taskOutput.executionDurationMs,
          primaryKeysReconciled: input.taskOutput.primaryKeysReconciled,
          status: input.taskOutput.status ?? "verified",
        },
      });
    }),

  // ── Archival System Status & Volume Statistics ───────────────────
  getArchiveStatus: adminQuery.query(async () => {
    const threads = await listActiveThreads(100);
    const cognitive = await queryCognitiveMemory({ limit: 100 });
    const artifacts = await listArchivedArtifacts({ limit: 100 });

    return {
      flightRecorder: {
        totalThreads: threads.length,
        totalSteps: threads.reduce((acc, t) => acc + t.totalSteps, 0),
        storagePath: "./data/archive/checkpoints",
      },
      cognitiveMemory: {
        totalFacts: cognitive.totalFacts,
        entitiesCount: cognitive.entities.length,
        storagePath: cognitive.storageDir,
      },
      artifactVault: {
        totalArtifacts: artifacts.totalCount,
        datesAvailable: artifacts.dates,
        vaultRoot: artifacts.vaultRoot,
      },
    };
  }),
});
