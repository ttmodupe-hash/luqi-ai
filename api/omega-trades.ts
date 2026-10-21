import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import {
  analyzeSelfReportedSkills, getTradeSkills, listTrades, tradeIds,
} from "./services/omegaTrades";

export const omegaTradesRouter = createRouter({
  list: publicQuery.query(() => listTrades()),
  skills: publicQuery
    .input(z.object({ trade: z.enum(tradeIds as [string, ...string[]]) }))
    .query(({ input }) => getTradeSkills(input.trade as Parameters<typeof getTradeSkills>[0])),
  gap: publicQuery
    .input(z.object({
      trade: z.enum(tradeIds as [string, ...string[]]),
      selectedSkills: z.array(z.string().trim().min(1).max(100)).max(30),
    }))
    .query(({ input }) => analyzeSelfReportedSkills(
      input.trade as Parameters<typeof analyzeSelfReportedSkills>[0],
      input.selectedSkills!,
    )),
});
