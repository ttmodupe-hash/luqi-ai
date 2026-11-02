#!/usr/bin/env node
// Report the requested dependency scope; optionally block critical advisories.
import { readFileSync, appendFileSync } from "node:fs";
const path = process.argv[2];
if (!path) throw new Error("Usage: node scripts/report-runtime-audit.mjs <npm-audit.json>");
let report;
try { report = JSON.parse(readFileSync(path, "utf8")); }
catch { throw new Error("npm audit did not produce readable JSON; scan is NOT verified"); }
if (!report.metadata?.vulnerabilities || typeof report.vulnerabilities !== "object") {
  throw new Error("npm audit returned incomplete data; scan is NOT verified");
}
const stats = report.metadata.vulnerabilities;
for (const severity of ["critical", "high", "moderate", "low", "info", "total"]) {
  if (!Number.isSafeInteger(stats[severity]) || stats[severity] < 0) {
    throw new Error("npm audit returned invalid counts; scan is NOT verified");
  }
}
const full = process.env.LUQI_AUDIT_SCOPE === "all";
const scope = full ? "all dependencies (including build and test tools)" : "production dependencies";
const severities = { critical: 4, high: 3, moderate: 2, low: 1, info: 0 };
const findings = Object.entries(report.vulnerabilities).map(([name, value]) => ({
  name,
  severity: value.severity || "unknown",
  direct: Boolean(value.isDirect),
  range: String(value.range ?? "unknown"),
  fixAvailable: value.fixAvailable === false ? "none advised" :
    value.fixAvailable === true ? "available" : "requires review",
})).sort((a,b) => (severities[b.severity] ?? -1) - (severities[a.severity] ?? -1) ||
  Number(b.direct) - Number(a.direct) || a.name.localeCompare(b.name));

console.log(`LUQI npm dependency advisory baseline: ${scope}`);
console.log(`critical=${stats.critical} high=${stats.high} moderate=${stats.moderate} low=${stats.low}`);
for (const item of findings) {
  console.log(`${item.severity.padEnd(8)} ${item.direct ? "direct" : "transitive"} ${item.name} ${item.range} fix=${item.fixAvailable}`);
}
const markdown = [
  `## Vulnerability report: ${scope}`,
  `Generated from npm audit ${full ? "--include=dev" : "--omit=dev"}. This is not evidence that exploitation occurred.`,
  `**Critical:** ${stats.critical} · **High:** ${stats.high} · **Moderate:** ${stats.moderate} · **Low:** ${stats.low}`,
  "",
  "| Severity | Dependency | Direct? | Vulnerable range | Proposed fix |",
  "|---|---|---|---|---|",
  ...findings.map(x=>`| ${x.severity} | \`${x.name.replace(/\|/g, "")}\` | ${x.direct ? "Yes" : "No"} | \`${x.range.replace(/\|/g, "")}\` | ${x.fixAvailable} |`),
  "",
  "A successful report means the audit executed; it does not mean the dependencies are safe.",
  "Do not run npm audit fix --force without dependency tests and production Docker verification.",
  ""
].join("\n");
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
if (process.env.LUQI_AUDIT_FAIL_ON_CRITICAL === "true" && Number(stats.critical) > 0) {
  throw new Error("Critical advisories remain unremediated");
}

if (process.env.LUQI_AUDIT_FAIL_ON_HIGH === "true" && (stats.high > 0 || stats.critical > 0)) {
  throw new Error("High or critical advisories remain unremediated");
}
