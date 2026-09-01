import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";

export const contentRouter = createRouter({
  getHealthTips: publicQuery.query(() => []),
  getAgricultureNews: publicQuery.query(() => []),
  getSportsNews: publicQuery.query(() => []),
  getBusinessTips: publicQuery.query(() => []),
  getGovernmentInfo: publicQuery.query(() => []),
  getTourismInfo: publicQuery.query(() => []),
});
