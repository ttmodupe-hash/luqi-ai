import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import {
  archiveKinds, getOmegaArchiveDetail, listOmegaArchive, omegaArchiveOverview,
} from "./services/omegaKnowledge";

/**
 * Read-only OMEGA archives, integrated natively with LUQI's existing tRPC
 * contract. No Python sidecar, no user data migration, no model API key.
 */
export const omegaKnowledgeRouter = createRouter({
  overview: publicQuery.query(() => omegaArchiveOverview()),

  list: publicQuery
    .input(z.object({
      archive: z.enum(archiveKinds).optional(),
      topic: z.string().trim().min(1).max(100).optional(),
      query: z.string().trim().max(160).optional(),
      limit: z.number().int().min(1).max(50).default(20),
      offset: z.number().int().min(0).max(300).default(0),
      timeline: z.boolean().default(false),
    }).optional())
    .query(({ input }) => listOmegaArchive(input ?? {})),

  detail: publicQuery
    .input(z.object({
      archive: z.enum(archiveKinds),
      id: z.string().trim().min(1).max(100).regex(/^[a-z0-9-]+$/),
    }))
    .query(({ input }) => {
      const entry = getOmegaArchiveDetail(input.archive, input.id);
      if (!entry) throw new TRPCError({
        code: "NOT_FOUND",
        message: "No curated educational entry matches this reference.",
      });
      return entry;
    }),
});
