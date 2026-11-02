import { describe, expect, it } from "vitest";
import { workspaceUnavailable } from "../api/workspace-unavailable";

describe("workspace integration availability", () => {
  for (const prefix of ["/api/v1/workspace", "/workspace"]) {
    for (const action of ["upload-asset", "calendar/book", "submit-critique", "critiques"]) {
      it(`does not fabricate results or accept caller identities: ${prefix}/${action}`, async () => {
        for (const method of ["GET", "POST", "PUT", "DELETE"]) {
          const response = await workspaceUnavailable.request(`${prefix}/${action}`, {
            method,
            ...(method === "GET" ? {} : {
              headers: { "Content-Type": "application/json", Authorization: "Bearer forged" },
              body: JSON.stringify({ user_id: "another-user", attendees: ["victim"], title: "book this" }),
            }),
          });
          expect(response.status).toBe(503);
          expect(response.headers.get("Cache-Control")).toBe("no-store");
          const body = await response.json();
          expect(body.code).toBe("WORKSPACE_INTEGRATION_NOT_CONFIGURED");
          expect(body.status).toBe("unavailable");
          for (const field of ["success", "appointment", "asset_url", "record", "agent_remediation_status"]) {
            expect(body).not.toHaveProperty(field);
          }
        }
      });
    }
  }
  it("does not capture unrelated account or health routes", async () => {
    for (const path of ["/auth/login", "/v1/health"]) {
      expect((await workspaceUnavailable.request(path)).status).toBe(404);
    }
  });
});
