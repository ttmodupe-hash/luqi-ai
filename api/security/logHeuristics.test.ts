import { describe, expect, it } from "vitest";
import { inspectLogIndicators } from "./logHeuristics";

describe("security log heuristics never claim to execute defensive controls", () => {
  it("flags suspicious strings but does not invent successful blocking", () => {
    const report = inspectLogIndicators("SELECT * FROM users WHERE x='1' OR '1'='1'");
    expect(report.vulnerability_detected).toBe(true);
    expect(report.findings.some((item) => item.id === "suspected_sql_injection")).toBe(true);
    expect(report.blockedRequest).toBe(false);
    expect(report.remediationStatus).toBe("not_applied");
    expect(report.remediation_patch_code).toBeNull();
  });

  it("never interprets an empty scan as proof the service is safe", () => {
    const report = inspectLogIndicators("GET /home 200");
    expect(report.vulnerability_detected).toBe(false);
    expect(report.protectedAccountsVerified).toBe(false);
    expect(report.note).toContain("does not establish");
  });

  it("bounds potentially sensitive log submissions", () => {
    expect(() => inspectLogIndicators("")).toThrow();
    expect(() => inspectLogIndicators("a".repeat(20_001))).toThrow();
  });
});
