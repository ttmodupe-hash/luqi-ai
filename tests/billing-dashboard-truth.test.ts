import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { restCompat } from "../api/rest-compat";
import { ApiMonitorDashboard } from "../src/components/ApiMonitorDashboard";
import { ApiMonitorDashboard as AlternateDashboard } from "../app/src/components/ApiMonitorDashboard";

describe("unverified billing metrics", () => {
  it("returns unavailable without fabricated spend, provider charges or invoice dates", async () => {
    const response = await restCompat.request("/api/billing/dashboard");
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    expect(body).toMatchObject({ success: false, status: "unavailable", code: "BILLING_METRICS_UNAVAILABLE" });
    expect(body).not.toHaveProperty("totalAccumulatedSpendUsd");
    expect(body).not.toHaveProperty("breakdown");
    expect(body).not.toHaveProperty("billingCycleAnchorDate");
  });

  for (const [name, Dashboard] of [["root", ApiMonitorDashboard], ["alternate", AlternateDashboard]] as const) {
    it(`${name} dashboard shows an unavailable state without a fallback bill`, () => {
      const html = renderToStaticMarkup(createElement(Dashboard));
      expect(html).toContain("Actual spending unavailable");
      expect(html).toContain("do not represent provider charges");
      expect(html).not.toMatch(/\$\d/);
      expect(html).not.toContain("Invoice Sync");
    });
  }
});
