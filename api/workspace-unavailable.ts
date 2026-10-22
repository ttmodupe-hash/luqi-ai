import { Hono } from "hono";

/** Fail closed until workspace actions have authenticated ownership, durable
 * storage and verified external integrations. Never return invented asset URLs,
 * booked meetings, critique records or agent-remediation outcomes.
 */
export const workspaceUnavailable = new Hono();
for (const prefix of ["/api/v1/workspace", "/workspace"]) {
  for (const action of ["upload-asset", "calendar/book", "submit-critique", "critiques"]) {
    workspaceUnavailable.all(`${prefix}/${action}`, (c) => {
      c.header("Cache-Control", "no-store");
      return c.json({
        status: "unavailable",
        code: "WORKSPACE_INTEGRATION_NOT_CONFIGURED",
        message: "This workspace feature is not yet connected to authenticated persistent storage and verified integrations.",
      }, 503);
    });
  }
}
