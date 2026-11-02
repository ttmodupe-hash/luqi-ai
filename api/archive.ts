import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";

// The legacy registry has no account ownership or durable reload contract.
// Do not import it: importing the old vault also wrote fabricated sample files.
// Preserve existing files untouched while access is unavailable.
function unavailable(): never {
  throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "TRPC_PROCEDURE_UNAVAILABLE" });
}
export const archiveRouter = createRouter({
  listThreads: publicQuery.query(unavailable),
  getThreadTimeline: publicQuery.query(unavailable),
  recordCheckpoint: publicQuery.mutation(unavailable),
  getCognitiveMemory: publicQuery.query(unavailable),
  storeCognitiveFact: publicQuery.mutation(unavailable),
  listArtifacts: publicQuery.query(unavailable),
  archiveArtifact: publicQuery.mutation(unavailable),
  getArchiveStatus: publicQuery.query(unavailable),
});
