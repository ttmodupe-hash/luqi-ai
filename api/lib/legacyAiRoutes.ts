/** Explicit denylist for pre-budget AI endpoints.
 * Only individually reviewed budgeted entrypoints are permitted:
 * /api/v1/luqi-core (text), /api/v1/visual-tutor (one crop), and
 * /api/v1/spatial-vision (one crop, explicit provider). All require the same
 * authenticated daily-user and monthly-provider reservation ledger.
 * Never silently bypass the pilot gateway.
 * These routes may be restored individually after security/FinOps review.
 */
const legacyPaidPostPaths = new Set([
  "/api/v25/ai-brain/chat", "/api/v25/chat", "/api/v25/ai-brain/stream",
  "/api/v25/kb/ask", "/api/v25/insights/scan",
  "/api/v25/legal/analyze", "/api/v25/media/image",
  "/v1/extract", "/v1/animation/storyboard", "/api/v1/animation/storyboard",
  "/api/v1/jobs/submit", "/v1/jobs/submit",
  "/api/v1/sensing/draft-grant", "/api/v1/sensing/generate-api-wrapper",
  "/api/v1/sensing/agritech-predict", "/api/v1/cert-academy/coach",
  "/api/v1/consumer-rights", "/api/v1/universal-topic",
  "/api/v1/african-sovereignty", "/api/v1/experiential-lab",
  "/api/v1/simulation/generate", "/api/v1/intelligence/compile-asset",
  "/api/v1/intelligence/auto-scrape", "/api/v1/intelligence/evaluate-submission",
  "/api/v1/simulation/verify-terminal",
  "/api/v1/media/orchestrate", "/media/orchestrate",
  "/api/v1/media/compile-and-stream", "/media/compile-and-stream",
  "/api/v1/intelligence/self-optimize", "/intelligence/self-optimize",
  "/api/v1/consensus/execute", "/api/v1/edge-cache/query",
  "/api/v1/exam-tutor/chat", "/api/v1/exam-tutor/generate-question",
  "/api/khoro-legal", "/api/khoro/multimodal", "/api/khoro/chat",
  "/api/khoro/stream", "/api/v1/governance/generate-system-card",
  "/api/v1/governance/evaluator-benchmark", "/api/v1/studio/synthesize-asset",
  "/api/gemini/generate", "/api/gemini/image",
  "/api/gemini/video", "/api/gemini/audio",
  "/api/v1/sensing/run-scan", "/v1/sensing/run-scan",
  "/api/v1/sensing/dispatch-to-pipeline",
  "/api/v1/zta/langgraph/execute",
  "/api/v1/self-healing/pipeline/run",
  "/api/v1/self-healing/pipeline/sandbox-exec",
]);

// tRPC has independently callable paid-model/agent methods, including GET
// queries and batched requests. Until metered, disable those namespaces as
// a whole; do not disable ping or the low-risk information routers.
const unmeteredTrpcNamespaces = new Set([
  "companion", "orchestrator", "botanical", "selfhealing",
  "video", "voice", "labs", "adaptive", "grading", "guardian", "supercore",
]);

// No wildcard that accidentally disables user login, help or static content.
// This is a server-side protection; browser CORS alone cannot stop paid calls.
export function isUnbudgetedAiRoute(method: string, path: string): boolean {
  const verb = method.toUpperCase();
  const normalized = path.replace(/\/+$/, "").toLowerCase();
  if (normalized.startsWith("/api/trpc/")) {
    if (verb !== "GET" && verb !== "POST") return false;
    let raw = normalized.slice("/api/trpc/".length);
    try { raw = decodeURIComponent(raw); }
    catch { return true; } // Fail closed for ambiguous procedure paths.
    return raw.split(",").some((procedure) =>
      unmeteredTrpcNamespaces.has(procedure.split(".")[0]));
  }
  if (verb !== "POST") return false;
  return legacyPaidPostPaths.has(normalized);
}
