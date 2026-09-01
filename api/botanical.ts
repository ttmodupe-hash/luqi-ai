import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";

export const botanicalRouter = createRouter({
  search: publicQuery.input(z.object({ query: z.string() })).query(() => ({ results: [] })),
  getById: publicQuery.input(z.object({ id: z.number() })).query(() => null),
  ask: publicQuery.input(z.object({ question: z.string() })).mutation(() => ({ answer: "" })),
  verify: publicQuery.input(z.object({ id: z.number() })).mutation(() => ({ verified: true })),
  byRegion: publicQuery.input(z.object({ region: z.string() })).query(() => []),
});
