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
import { offlineRouter } from "./offline";
import { adaptiveRouter } from "./adaptive";
import { guardianRouter } from "./guardian";
import { gradingRouter } from "./grading";
import { voiceRouter } from "./voice";
import { collaborationRouter } from "./collaboration";
import { certificatesRouter } from "./certificates";
import { tutorAvatarRouter } from "./tutor-avatar";
import { marketplaceRouter } from "./marketplace";
import { hardwareRouter } from "./hardware";
import { analyticsRouter } from "./analytics";
import { governmentRouter } from "./government";
import { peerTutoringRouter } from "./peer-tutoring";
import { wellnessRouter } from "./wellness";
import { arVrRouter } from "./ar-vr";
import { ussdRouter } from "./ussd";
import { whatsappRouter } from "./whatsapp";
import { paymentsRouter } from "./payments";
import { loadSheddingRouter } from "./load-shedding";
import { villagesRouter } from "./villages";
import { oralTraditionRouter } from "./oral-tradition";
import { localUnitsRouter } from "./local-units";
import { elderKnowledgeRouter } from "./elder-knowledge";
import { heroAvatarsRouter } from "./hero-avatars";
import { textLabsRouter } from "./text-labs";
import { cattleBlockchainRouter } from "./cattle-blockchain";
import { farmingCalendarRouter } from "./farming-calendar";
import { communityVerificationRouter } from "./community-verification";
import { motherTongueRouter } from "./mother-tongue";

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
  offline: offlineRouter,
  adaptive: adaptiveRouter,
  guardian: guardianRouter,
  grading: gradingRouter,
  voice: voiceRouter,
  collaboration: collaborationRouter,
  certificates: certificatesRouter,
  tutorAvatar: tutorAvatarRouter,
  marketplace: marketplaceRouter,
  hardware: hardwareRouter,
  analytics: analyticsRouter,
  government: governmentRouter,
  peerTutoring: peerTutoringRouter,
  wellness: wellnessRouter,
  arVr: arVrRouter,
  ussd: ussdRouter,
  whatsapp: whatsappRouter,
  payments: paymentsRouter,
  loadShedding: loadSheddingRouter,
  villages: villagesRouter,
  oralTradition: oralTraditionRouter,
  localUnits: localUnitsRouter,
  elderKnowledge: elderKnowledgeRouter,
  heroAvatars: heroAvatarsRouter,
  textLabs: textLabsRouter,
  cattleBlockchain: cattleBlockchainRouter,
  farmingCalendar: farmingCalendarRouter,
  communityVerification: communityVerificationRouter,
  motherTongue: motherTongueRouter,
});

export type AppRouter = typeof appRouter;
