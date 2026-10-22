import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
const directories: string[] = [];
afterEach(() => { for (const path of directories.splice(0)) rmSync(path, { recursive: true, force: true }); });
function audit(data: unknown) {
  const dir = mkdtempSync(join(tmpdir(), "luqi-audit-")); directories.push(dir);
  const path = join(dir, "report.json"); writeFileSync(path, JSON.stringify(data));
  return spawnSync(process.execPath, [resolve("scripts/report-runtime-audit.mjs"), path], {
    encoding: "utf8", env: { ...process.env, GITHUB_STEP_SUMMARY: "", LUQI_AUDIT_SCOPE: "all", LUQI_AUDIT_FAIL_ON_CRITICAL: "true" },
  });
}
const counts = { critical: 0, high: 0, moderate: 0, low: 0, info: 0, total: 0 };
describe("dependency audit gate", () => {
  it("accepts a complete clean report including development dependencies", () => {
    const result = audit({ metadata: { vulnerabilities: counts }, vulnerabilities: {} });
    expect(result.status).toBe(0); expect(result.stdout).toContain("including build and test tools");
  });
  it("fails on critical advisories", () => {
    const result = audit({ metadata: { vulnerabilities: { ...counts, critical: 1, total: 1 } }, vulnerabilities: { example: { severity: "critical", range: "<2", fixAvailable: true } } });
    expect(result.status).not.toBe(0); expect(result.stderr).toContain("Critical advisories remain");
  });
  it.each([{ error: { code: "ENETUNREACH" } }, { metadata: { vulnerabilities: { ...counts, critical: "0" } }, vulnerabilities: {} }])("fails closed when scan results cannot be verified %#", data => {
    expect(audit(data).status).not.toBe(0);
  });
});
