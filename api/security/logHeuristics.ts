/**
 * Cheap deterministic indicators for admin-submitted log excerpts.
 * These patterns are NOT a web application firewall, intrusion detector,
 * proof that an exploit succeeded, or evidence of applied remediation.
 */
export function inspectLogIndicators(raw: string) {
  if (!raw || raw.length > 20_000) {
    throw new Error("A log excerpt of 1–20,000 characters is required.");
  }
  const upper = raw.toUpperCase();
  const findings = [
    { id: "suspected_sql_injection", label: "Potential SQL-injection string",
      hit: /\bOR\s+['"]?1['"]?\s*=\s*['"]?1['"]?|UNION\s+SELECT/i.test(raw) },
    { id: "suspected_script_payload", label: "Potential script-injection string",
      hit: /<\s*script\b|javascript\s*:|document\.cookie/i.test(raw) },
    { id: "suspected_shell_payload", label: "Potential shell command string",
      hit: /\brm\s+-rf\b|\bcurl\s+[^\n]*\|\s*(sh|bash)\b/i.test(raw) },
    { id: "suspected_sensitive_data", label: "Potential sensitive-data disclosure",
      hit: /PRIVATE KEY|AUTHORIZATION:\s*BEARER|PASSWORD\s*=/i.test(raw) },
  ].filter((finding) => finding.hit).map(({ id, label }) => ({ id, label }));
  return {
    analysisType: "keyword_heuristics_only" as const,
    vulnerability_detected: findings.length > 0,
    findings,
    remediationStatus: "not_applied" as const,
    remediation_patch_code: null,
    blockedRequest: false,
    protectedAccountsVerified: false,
    note: findings.length
      ? "Indicators require review with real traffic, service logs and authorization checks. No patch was automatically applied."
      : "No matching keyword indicators. This does not establish that the traffic or service is safe.",
  };
}
