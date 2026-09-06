import fs from "node:fs";
import path from "node:path";
import { build } from "esbuild";

const rootDir = process.cwd();
const errors = [];

// ── 1. REQUIRED SCHEMA EXPORTS ───────────────────────────────────────
const REQUIRED_TABLES = [
  "companionPersonalities", "companionConversations", "companionMessages",
  "companionMemories", "videoProjects", "videoJobs", "botanicalEntries",
  "knowledgeArticles", "contentItems",
  "errorLogs", "healingPatches", "systemMetrics", "agentActivityLog",
  "benchmarkFeeds", "healingEvents",
  "studentProfiles", "adaptiveHistory", "labReports", "guardianLinks",
  "progressAlerts", "offlineSyncQueue", "voiceCommands",
  "users", "sessions", "analyticsEvents", "pageViews", "notifications",
  "labs", "experiments", "predictions", "abTests", "abTestResults",
];

const schemaPath = path.join(rootDir, "db", "schema.ts");
if (!fs.existsSync(schemaPath)) {
  errors.push("CRITICAL: db/schema.ts missing from root directory.");
} else {
  const schemaContent = fs.readFileSync(schemaPath, "utf-8");
  for (const table of REQUIRED_TABLES) {
    if (!schemaContent.includes(`export const ${table}`)) {
      errors.push(`SCHEMA ERROR: missing required export '${table}' in db/schema.ts`);
    }
  }
  if (/pgTable|pg-core/.test(schemaContent)) {
    errors.push("SCHEMA ERROR: db/schema.ts contains PostgreSQL dialect (pgTable/pg-core) — this project uses MySQL (mysqlTable/mysql-core).");
  }
}

// ── 2. REQUIRED SERVICE EXPORTS ──────────────────────────────────────
const REQUIRED_SERPER = ["searchWeb", "searchNews", "formatSearchContext", "searchImages", "searchVideos"];
const serperPath = path.join(rootDir, "api", "services", "serper.ts");
if (!fs.existsSync(serperPath)) {
  errors.push("CRITICAL: api/services/serper.ts missing.");
} else {
  const serperContent = fs.readFileSync(serperPath, "utf-8");
  for (const fn of REQUIRED_SERPER) {
    if (!serperContent.includes(`export async function ${fn}`) &&
        !serperContent.includes(`export function ${fn}`) &&
        !serperContent.includes(`export const ${fn}`)) {
      errors.push(`SERVICE ERROR: missing required export '${fn}' in api/services/serper.ts`);
    }
  }
}

// ── 3-5. FULL IMPORT-GRAPH RECONCILIATION ────────────────────────────
const IMPORT_RE = /import\s+(?:type\s+)?(?:[\w$]+\s*,?\s*(?:\{([^}]*)\})?\s*(?:\*\s*as\s+[\w$]+)?\s*)?from\s*["']([^"']+)["']/g;
const DYN_RE = /import\(\s*["']([^"']+)["']\s*\)/g;
const EXPORT_RE = /export\s+(?:async\s+)?(?:function|const|let|class|interface|type|enum)\s+([\w$]+)/g;
const NODE_BUILTINS = new Set(["fs", "path", "url", "module", "crypto", "os", "http", "https",
  "stream", "util", "events", "buffer", "process", "child_process", "net", "tls", "zlib",
  "querystring", "assert", "node:fs", "node:path", "node:url"]);

const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf-8"));
const allDeps = new Set([...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})]);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!["node_modules", "dist", ".git", "android", "ios", "electron"].includes(e.name)) walk(p, out);
    } else if (/\.(ts|tsx|js|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
}

function getExports(file) {
  const src = fs.readFileSync(file, "utf8");
  const names = new Set();
  for (const m of src.matchAll(EXPORT_RE)) names.add(m[1]);
  for (const m of src.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(",")) {
      const n = part.trim().split(/\s+as\s+/).pop().trim();
      if (n) names.add(n);
    }
  }
  if (/export\s+default/.test(src)) names.add("default");
  return names;
}

function resolveLocal(spec, fromFile, srcRoot) {
  let base;
  if (spec.startsWith("@/")) base = path.join(srcRoot, spec.slice(2));
  else base = path.resolve(path.dirname(fromFile), spec);
  for (const c of [base, base + ".ts", base + ".tsx", base + ".js", base + ".mjs", base + ".d.ts",
    path.join(base, "index.ts"), path.join(base, "index.tsx")]) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

let scanned = 0;
function scanFile(file, srcRoot) {
  scanned++;
  const rel = path.relative(rootDir, file);
  const src = fs.readFileSync(file, "utf8");
  const checks = [];
  for (const m of src.matchAll(IMPORT_RE)) checks.push({ spec: m[2], named: m[1] });
  for (const m of src.matchAll(DYN_RE)) checks.push({ spec: m[1], named: null, dynamic: true });

  for (const { spec, named, dynamic } of checks) {
    if (!spec.startsWith(".") && !spec.startsWith("@/")) {
      const pkgName = spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];
      if (!allDeps.has(pkgName) && !NODE_BUILTINS.has(pkgName)) {
        errors.push(`PACKAGE ERROR: '${spec}' imported in ${rel} but '${pkgName}' is not in package.json`);
      }
      continue;
    }
    const target = resolveLocal(spec, file, srcRoot);
    if (!target) {
      errors.push(`RESOLUTION ERROR: cannot resolve '${spec}'${dynamic ? " (dynamic import)" : ""} in ${rel}`);
      continue;
    }
    if (named) {
      const targetExports = getExports(target);
      for (let part of named.split(",")) {
        part = part.trim().replace(/^type\s+/, "");
        if (!part) continue;
        const imported = part.split(/\s+as\s+/)[0].trim();
        if (!targetExports.has(imported)) {
          errors.push(`EXPORT ERROR: '${imported}' imported from '${spec}' in ${rel} — ${path.relative(rootDir, target)} does not export it`);
        }
      }
    }
  }
}

const srcRoot = path.join(rootDir, "src");
for (const f of walk(path.join(rootDir, "api"))) scanFile(f, srcRoot);
for (const f of walk(path.join(rootDir, "db"))) scanFile(f, srcRoot);
for (const f of walk(path.join(rootDir, "scripts"))) scanFile(f, srcRoot);
for (const f of walk(srcRoot)) scanFile(f, srcRoot);

// ── 6. ESBUILD DRY-RUN (write: false — no artifacts) ─────────────────
try {
  await build({
    entryPoints: [path.join(rootDir, "api", "boot.ts")],
    bundle: true,
    write: false,
    platform: "node",
    format: "esm",
    logLevel: "silent",
  });
} catch (e) {
  errors.push(`BUNDLER ERROR: esbuild dry-run failed:\n${e.message}`);
}

// ── VERDICT ──────────────────────────────────────────────────────────
if (errors.length > 0) {
  console.error(`\n❌ BUILD INTEGRITY CHECK FAILED — ${errors.length} error(s) across ${scanned} scanned files:`);
  for (const err of errors) console.error(`  - ${err}`);
  process.exit(1);
}
console.log(`✅ Build Integrity Check Passed: ${scanned} files scanned, ${REQUIRED_TABLES.length} schema tables, ${REQUIRED_SERPER.length} service functions, esbuild dry-run clean.`);
