import { describe, expect, it } from "vitest";
import { restCompat } from "../api/rest-compat";

describe("unimplemented support API is safely unavailable", () => {
  const paths = [
    "/api/v25/support",
    "/api/v25/support/tickets",
    "/api/v25/support/tickets/foreign-account",
    "/api/v25/support/tickets/foreign-account/respond",
    "/api/v25/support/faqs",
    "/api/v25/support/faqs/search",
    "/api/v25/support/dashboard",
    "/api/v25/support/unknown-future-route",
  ];

  it.each(paths)("refuses reads and writes without fabricating support records: %s", async path => {
    for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
      const response = await restCompat.request(path + "?account=someone-else@example.invalid", {
        method,
        headers: { "Content-Type": "application/json", Authorization: "Bearer invalid-token" },
        ...(method === "GET" ? {} : { body: JSON.stringify({ subject: "test", message: "test", priority: "critical" }) }),
      });
      expect(response.status, method + " " + path).toBe(503);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      const result = await response.json();
      expect(result).toMatchObject({
        success: false, status: "unavailable", code: "SUPPORT_TICKETING_UNAVAILABLE",
      });
      expect(result).not.toHaveProperty("ticket_id");
      expect(result).not.toHaveProperty("responses");
      expect(result).not.toHaveProperty("total_tickets");
    }
  });
});
