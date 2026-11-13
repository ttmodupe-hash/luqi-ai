/** Opt-in edge/application decoy gate for code-reviewed staging wiring.
 * Standalone on purpose: not active until the main API entrypoint is reviewed.
 */
import type { MiddlewareHandler } from "hono";
import { classifyDecoyPath, recordSecuritySignal } from "./intrusionRadar";

export function intrusionDecoyMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const observation = classifyDecoyPath(c.req.path);
    if (!observation) return next();
    await recordSecuritySignal({ ...observation, method: c.req.method });
    c.header("Cache-Control", "no-store");
    c.header("X-Content-Type-Options", "nosniff");
    // No real/fake tokens and no privileged endpoint advertised.
    return c.text("Not found", 404);
  };
}
