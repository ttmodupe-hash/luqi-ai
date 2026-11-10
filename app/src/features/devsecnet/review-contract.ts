/** Small UI/worker boundary. Source is never returned in a findings report. */
export const MAX_REVIEW_CHARS = 60_000;
export const MAX_REVIEW_BYTES = 120_000;
export const REVIEW_LANGUAGES = [
  "typescript",
  "javascript",
  "python",
  "sql",
  "network",
] as const;
export type ReviewLanguage = (typeof REVIEW_LANGUAGES)[number];
export type ReviewRule =
  | "sql-construction"
  | "secret-literal"
  | "dynamic-execution"
  | "html-sink"
  | "identifier-literal"
  | "nested-loop"
  | "telnet"
  | "ospf-md5"
  | "type7-key"
  | "broad-acl";
export interface ReviewFinding {
  rule: ReviewRule;
  line: number;
  column: number;
  priority: "review" | "attention";
}
export interface ReviewReport {
  format: "luqi.devsecnet.review.v1";
  language: ReviewLanguage;
  method: "syntax-tree-patterns" | "text-patterns";
  status: "reviewed" | "syntax-error";
  findings: ReviewFinding[];
  sourceCharacters: number;
  syntaxLine: number | null;
  limited: true;
  codeExecuted: false;
}
export const REVIEW_RULES: Record<
  ReviewRule,
  { title: string; detail: string; action: string }
> = {
  "sql-construction": {
    title: "SQL text combined with expressions",
    detail:
      "This construction may place data into SQL syntax. No data-flow or database execution was checked.",
    action:
      "Bind data values through the database driver. Keep table names and sort choices on an application-owned allowlist.",
  },
  "secret-literal": {
    title: "Possible credential literal",
    detail:
      "A credential-like field has a literal value. It might be a placeholder; the value is omitted from this report.",
    action:
      "Verify sensitivity. Keep real credentials outside source and rotate exposed credentials through their issuer.",
  },
  "dynamic-execution": {
    title: "Dynamic execution pattern",
    detail:
      "An eval/Function or shell-execution pattern needs review. This check does not establish that an attacker controls it.",
    action:
      "Prefer explicit, allowlisted operations and data parsing. Review trust boundaries before changing behavior.",
  },
  "html-sink": {
    title: "HTML insertion sink",
    detail:
      "HTML insertion can be unsafe when its input is untrusted. Sanitization and data flow have not been evaluated.",
    action:
      "Use textContent or normal React text rendering where possible; review deliberate HTML sanitization separately.",
  },
  "identifier-literal": {
    title: "Possible long identifier literal",
    detail:
      "A 13- or 15-digit literal needs privacy review. Its identity, meaning and legal status were not determined.",
    action:
      "Remove personal test data and use synthetic fixtures. Pseudonymization or hashing alone does not establish privacy compliance.",
  },
  "nested-loop": {
    title: "Nested iteration to examine",
    detail:
      "Nested loops were observed. Bounds, early exits and input dependence determine actual complexity.",
    action:
      "Measure the real workload and preserve duplicate/order semantics when considering a Set or Map.",
  },
  telnet: {
    title: "Telnet enabled in a transport rule",
    detail:
      "A Telnet transport pattern was found. Actual device exposure and access controls were not queried.",
    action:
      "Check firmware support and your management-access policy; plan and test any SSH-only change before applying it.",
  },
  "ospf-md5": {
    title: "OSPF MD5 configuration",
    detail:
      "This syntax names MD5, not SHA-256. Supported authentication depends on the device and software release.",
    action:
      "Review the exact vendor guide, key management and both neighbors before changing authentication.",
  },
  "type7-key": {
    title: "Cisco type 7 key notation",
    detail:
      "Type 7 is not a strong protection for a stored credential. No secret value is included in this result.",
    action:
      "Review supported stronger storage/authentication options and rotate any exposed real key through the operator.",
  },
  "broad-acl": {
    title: "Broad permit rule",
    detail:
      "An any-to-any permit needs context. ACL ordering, interface placement and surrounding rules were not evaluated.",
    action:
      "Review intended traffic and least privilege with the network administrator. Nothing is pushed to a device.",
  },
};
export function checkedReviewInput(
  source: unknown,
  language: unknown,
): { source: string; language: ReviewLanguage } {
  if (
    typeof source !== "string" ||
    !source.trim() ||
    source.length > MAX_REVIEW_CHARS ||
    new TextEncoder().encode(source).length > MAX_REVIEW_BYTES ||
    !REVIEW_LANGUAGES.includes(language as ReviewLanguage)
  )
    throw Error("INVALID_REVIEW_INPUT");
  return { source, language: language as ReviewLanguage };
}
export function checkedReviewReport(input: unknown): ReviewReport {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw Error("UNCONFIRMED_REVIEW");
  const v = input as ReviewReport;
  if (
    Object.keys(v).sort().join("|") !==
      [
        "format",
        "language",
        "method",
        "status",
        "findings",
        "sourceCharacters",
        "syntaxLine",
        "limited",
        "codeExecuted",
      ]
        .sort()
        .join("|") ||
    v.format !== "luqi.devsecnet.review.v1" ||
    !REVIEW_LANGUAGES.includes(v.language) ||
    v.method !==
      (v.language === "javascript" || v.language === "typescript"
        ? "syntax-tree-patterns"
        : "text-patterns") ||
    !["reviewed", "syntax-error"].includes(v.status) ||
    v.limited !== true ||
    v.codeExecuted !== false ||
    !Number.isInteger(v.sourceCharacters) ||
    v.sourceCharacters < 1 ||
    v.sourceCharacters > MAX_REVIEW_CHARS ||
    !Array.isArray(v.findings) ||
    v.findings.length > 100 ||
    (v.status === "syntax-error"
      ? v.method !== "syntax-tree-patterns" ||
        !Number.isInteger(v.syntaxLine) ||
        Number(v.syntaxLine) < 1 ||
        v.findings.length !== 0
      : v.syntaxLine !== null)
  )
    throw Error("UNCONFIRMED_REVIEW");
  for (const f of v.findings) {
    if (
      !f ||
      Object.keys(f).sort().join("|") !== "column|line|priority|rule" ||
      !Object.hasOwn(REVIEW_RULES, f.rule) ||
      !Number.isInteger(f.line) ||
      f.line < 1 ||
      !Number.isInteger(f.column) ||
      f.column < 1 ||
      !["attention", "review"].includes(f.priority)
    )
      throw Error("UNCONFIRMED_REVIEW");
  }
  return v;
}
