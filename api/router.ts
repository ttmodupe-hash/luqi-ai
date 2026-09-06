import { createRouter, publicQuery } from "./middleware";
import { companionRouter } from "./companion";
import { searchRouter } from "./search";
import { knowledgeRouter } from "./knowledge";
import { contentRouter } from "./content";
import { botanicalRouter } from "./botanical";
import { orchestratorRouter } from "./orchestrator";
import { labsRouter } from "./labs";
import { selfHealingRouter } from "./self-healing";
import { videoRouter } from "./video";
import { adaptiveRouter } from "./adaptive";
import { gradingRouter } from "./grading";
import { guardianRouter } from "./guardian";
import { offlineRouter } from "./offline";
import { voiceRouter } from "./voice";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  companion: companionRouter,
  search: searchRouter,
  knowledge: knowledgeRouter,
  content: contentRouter,
  botanical: botanicalRouter,
  orchestrator: orchestratorRouter,
  labs: labsRouter,
  selfHealing: selfHealingRouter,
  video: videoRouter,
  adaptive: adaptiveRouter,
  grading: gradingRouter,
  guardian: guardianRouter,
  offline: offlineRouter,
  voice: voiceRouter,
});

export type AppRouter = typeof appRouter;
