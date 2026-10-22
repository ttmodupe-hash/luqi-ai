import { describe, it, expect } from "vitest";
import { isUnbudgetedAiRoute } from "../api/lib/legacyAiRoutes";

describe("budgeted pilot route isolation", () => {
  it("blocks historical text, search, media, extraction and multiagent providers", () => {
    for (const url of [
      "/api/v25/chat", "/api/v25/ai-brain/stream", "/api/v25/kb/ask",
      "/api/v25/media/image", "/api/v1/exam-tutor/chat",
      "/api/v1/consensus/execute", "/api/v1/experiential-lab",
      "/api/gemini/generate", "/api/gemini/video", "/api/khoro/chat",
      "/api/v1/studio/synthesize-asset", "/api/v1/sensing/draft-grant",
      "/v1/extract", "/api/v1/zta/langgraph/execute",
      "/api/v1/self-healing/pipeline/sandbox-exec",
    ]) {
      expect(isUnbudgetedAiRoute("POST", url)).toBe(true);
    }
  });
  it("allows only approved pilot through this gate, preserving normal routes", () => {
    for (const url of [
      "/api/v1/luqi-core", "/auth/login", "/auth/signup",
      "/api/v25/payments/balance", "/api/v25/kb/search",
      "/api/v1/workspace/calendar/book", "/v1/readiness",
      "/api/health", "/",
    ]) {
      expect(isUnbudgetedAiRoute("POST", url)).toBe(false);
    }
    expect(isUnbudgetedAiRoute("GET", "/api/v25/chat")).toBe(false);
    expect(isUnbudgetedAiRoute("POST", "/api/GEMINI/GENERATE/")).toBe(true);
  });
  it("prevents direct and batched tRPC agent calls without disabling ping", () => {
    for (const method of ["GET", "POST"]) {
      for (const path of [
        "/api/trpc/companion.chat", "/api/trpc/orchestrator.execute",
        "/api/trpc/botanical.analyze", "/api/trpc/voice.synthesize",
        "/api/trpc/selfHealing.runDiagnosis", "/api/trpc/video.generate",
        "/api/trpc/companion.chat,content.list",
        "/api/trpc/companion.chat%2Ccontent.list",
      ]) {
        expect(isUnbudgetedAiRoute(method, path)).toBe(true);
      }
      expect(isUnbudgetedAiRoute(method, "/api/trpc/ping")).toBe(false);
      expect(isUnbudgetedAiRoute(method, "/api/trpc/content.list")).toBe(false);
    }
  });

});
