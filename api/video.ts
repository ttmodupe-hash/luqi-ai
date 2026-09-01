import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";

export const videoRouter = createRouter({
  create: publicQuery.input(z.object({ title: z.string(), prompt: z.string() })).mutation(() => ({ id: 1, created: true })),
  list: publicQuery.query(() => []),
  get: publicQuery.input(z.object({ id: z.number() })).query(() => null),
  update: publicQuery.input(z.object({ id: z.number(), title: z.string().optional() })).mutation(() => ({ updated: true })),
  delete: publicQuery.input(z.object({ id: z.number() })).mutation(() => ({ deleted: true })),
  startProcessing: publicQuery.input(z.object({ id: z.number() })).mutation(() => ({ status: "PROCESSING" })),
  updateProgress: publicQuery.input(z.object({ id: z.number(), progress: z.number() })).mutation(() => ({ progress: 0 })),
  markSuccess: publicQuery.input(z.object({ id: z.number(), videoUrl: z.string() })).mutation(() => ({ status: "SUCCESS" })),
  markFailed: publicQuery.input(z.object({ id: z.number(), errorMessage: z.string() })).mutation(() => ({ status: "FAILED" })),
  stats: publicQuery.query(() => ({ total: 0, byStatus: [], byLanguage: [] })),
  generate: publicQuery.input(z.object({ prompt: z.string(), title: z.string() })).mutation(() => ({ projectId: 1, status: "SUCCESS", aiContent: "", model: "" })),
});
