/** Bounded static inspection only. Never imports, evaluates or runs input code. */
import { parse } from "@babel/parser";
import {
  checkedReviewInput,
  checkedReviewReport,
  type ReviewReport,
  type ReviewFinding,
  type ReviewRule,
} from "./review-contract";
type Node = {
  type: string;
  loc?: { start: { line: number; column: number } };
  [key: string]: unknown;
};
const isNode = (v: unknown): v is Node =>
  !!v && typeof v === "object" && typeof (v as Node).type === "string";
const name = (v: unknown): string =>
  isNode(v) && v.type === "Identifier" && typeof v.name === "string"
    ? v.name
    : isNode(v) && v.type === "StringLiteral" && typeof v.value === "string"
      ? v.value
      : "";
const credential =
  /(?:api_?key|secret|password|access_?token|auth_?token|credential|authorization)/i;
const sql = /\b(?:SELECT|INSERT|UPDATE|DELETE|DROP|WHERE)\b/i;
const longIdentifier = /(?:^|\D)(?:\d{13}|\d{15})(?!\d)/;
function concatenation(root: Node): boolean {
  const pending: unknown[] = [root];
  let text = "",
    dynamic = false,
    count = 0;
  while (pending.length) {
    if (++count > 1000) return false;
    const n = pending.pop();
    if (isNode(n) && n.type === "BinaryExpression" && n.operator === "+") {
      pending.push(n.right, n.left);
    } else if (isNode(n) && n.type === "StringLiteral") text += String(n.value);
    else dynamic = true;
  }
  return dynamic && sql.test(text);
}
export function reviewCode(input: unknown, language: unknown): ReviewReport {
  const { source, language: lang } = checkedReviewInput(input, language);
  const findings: ReviewFinding[] = [];
  const seen = new Set<string>();
  const add = (rule: ReviewRule, line: number, column = 1) => {
    const key = rule + "|" + line;
    if (!seen.has(key) && findings.length < 100) {
      seen.add(key);
      findings.push({
        rule,
        line,
        column,
        priority: [
          "sql-construction",
          "secret-literal",
          "dynamic-execution",
          "html-sink",
        ].includes(rule)
          ? "attention"
          : "review",
      });
    }
  };
  const base = {
    format: "luqi.devsecnet.review.v1" as const,
    language: lang,
    sourceCharacters: source.length,
    limited: true as const,
    codeExecuted: false as const,
  };
  if (lang === "javascript" || lang === "typescript") {
    let ast: unknown;
    try {
      ast = parse(source, {
        sourceType: "unambiguous",
        plugins: lang === "typescript" ? ["typescript", "jsx"] : ["jsx"],
        errorRecovery: false,
        attachComment: false,
        tokens: false,
      });
    } catch (error) {
      const e = error as { loc?: { line?: number } };
      return checkedReviewReport({
        ...base,
        method: "syntax-tree-patterns",
        status: "syntax-error",
        findings: [],
        syntaxLine: Number.isSafeInteger(e.loc?.line) ? e.loc!.line : 1,
      });
    }
    const stack: {
      value: unknown;
      parent: Node | null;
      loops: number;
      depth: number;
    }[] = [{ value: ast, parent: null, loops: 0, depth: 0 }];
    let visited = 0;
    while (stack.length) {
      const frame = stack.pop()!;
      if (!isNode(frame.value)) continue;
      const n = frame.value;
      if (++visited > 30_000 || frame.depth > 150)
        throw Error("REVIEW_STRUCTURE_LIMIT");
      const line = n.loc?.start.line ?? 1,
        column = (n.loc?.start.column ?? 0) + 1;
      if (
        n.type === "BinaryExpression" &&
        n.operator === "+" &&
        !(
          frame.parent?.type === "BinaryExpression" &&
          frame.parent.operator === "+"
        ) &&
        concatenation(n)
      )
        add("sql-construction", line, column);
      if (
        n.type === "TemplateLiteral" &&
        Array.isArray(n.expressions) &&
        n.expressions.length &&
        frame.parent?.type !== "TaggedTemplateExpression"
      ) {
        const text = (n.quasis as Node[])
          .map((q) => String((q.value as { raw?: string })?.raw ?? ""))
          .join("");
        if (sql.test(text)) add("sql-construction", line, column);
      }
      if (
        n.type === "VariableDeclarator" &&
        credential.test(name(n.id)) &&
        isNode(n.init) &&
        n.init.type === "StringLiteral" &&
        String(n.init.value).length >= 8
      )
        add("secret-literal", line, column);
      if (
        n.type === "ObjectProperty" &&
        credential.test(name(n.key)) &&
        isNode(n.value) &&
        n.value.type === "StringLiteral" &&
        String(n.value.value).length >= 8
      )
        add("secret-literal", line, column);
      if (
        (n.type === "CallExpression" && name(n.callee) === "eval") ||
        ((n.type === "NewExpression" || n.type === "CallExpression") &&
          name(n.callee) === "Function")
      )
        add("dynamic-execution", line, column);
      if (
        n.type === "AssignmentExpression" &&
        isNode(n.left) &&
        n.left.type === "MemberExpression" &&
        ["innerHTML", "outerHTML"].includes(name(n.left.property))
      )
        add("html-sink", line, column);
      if (
        n.type === "JSXAttribute" &&
        isNode(n.name) &&
        n.name.name === "dangerouslySetInnerHTML"
      )
        add("html-sink", line, column);
      if (
        (n.type === "StringLiteral" ||
          n.type === "NumericLiteral" ||
          n.type === "BigIntLiteral") &&
        longIdentifier.test(String(n.value))
      )
        add("identifier-literal", line, column);
      const loop = [
        "ForStatement",
        "ForOfStatement",
        "ForInStatement",
        "WhileStatement",
        "DoWhileStatement",
      ].includes(n.type);
      if (loop && frame.loops > 0) add("nested-loop", line, column);
      for (const [key, value] of Object.entries(n)) {
        if (
          [
            "loc",
            "start",
            "end",
            "extra",
            "comments",
            "leadingComments",
            "trailingComments",
            "innerComments",
            "errors",
            "tokens",
          ].includes(key)
        )
          continue;
        const push = (value: unknown) => {
          if (isNode(value))
            stack.push({
              value,
              parent: n,
              loops: frame.loops + (loop ? 1 : 0),
              depth: frame.depth + 1,
            });
        };
        if (Array.isArray(value))
          for (let i = value.length - 1; i >= 0; i--) push(value[i]);
        else push(value);
      }
    }
    findings.sort(
      (a, b) =>
        a.line - b.line || a.column - b.column || a.rule.localeCompare(b.rule),
    );
    return checkedReviewReport({
      ...base,
      method: "syntax-tree-patterns",
      status: "reviewed",
      findings,
      syntaxLine: null,
    });
  }
  source.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || /^(?:#|--|!|\/\/)/.test(trimmed)) return;
    const at = index + 1;
    if (credential.test(line) && /(?:=|:)\s*["'][^"'\r\n]{8,}["']/.test(line))
      add("secret-literal", at);
    if (longIdentifier.test(line)) add("identifier-literal", at);
    if (lang === "network") {
      if (/\btransport\s+input\b[^\r\n]*\btelnet\b/i.test(line))
        add("telnet", at);
      if (/\bospf\s+message-digest-key\b[^\r\n]*\bmd5\b/i.test(line))
        add("ospf-md5", at);
      if (/\b(?:md5|password|secret)\s+7\s+\S+/i.test(line))
        add("type7-key", at);
      if (/\bpermit\s+(?:ip|tcp|udp)\s+any\s+any\b/i.test(line))
        add("broad-acl", at);
    } else {
      if (
        sql.test(line) &&
        (/\+\s*[A-Za-z_]/.test(line) ||
          /f["'].*\{[^}]+\}/.test(line) ||
          /\$\{/.test(line))
      )
        add("sql-construction", at);
      if (
        /\b(?:eval|exec)\s*\(/.test(line) ||
        /\bshell\s*=\s*True\b/.test(line)
      )
        add("dynamic-execution", at);
    }
  });
  return checkedReviewReport({
    ...base,
    method: "text-patterns",
    status: "reviewed",
    findings,
    syntaxLine: null,
  });
}
