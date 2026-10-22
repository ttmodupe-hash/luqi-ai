// Administrative cognitive-memory journal.
//
// Filesystem persistence here is local to one deployment volume. It is NOT
// safe to use as a distributed multi-instance data store or as verified truth.
// Production requires private durable DB/storage, backup/restore and per-user
// ownership boundaries before this content can inform user-facing decisions.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export interface CognitiveFact {
  id: string;
  category: "short_term" | "long_term" | "entity";
  subject: string;
  predicate: string;
  object: string;
  context?: string;
  confidence: number;
  sourceTask: string;
  agentRole: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface EntityRecord {
  entityId: string;
  name: string;
  type: string;
  attributes: Record<string, unknown>;
  relations: Array<{ relation: string; targetEntityId: string }>;
  lastSeen: string;
}

const MEMORY_DIR = path.resolve(process.env.CREWAI_STORAGE_DIR || "./data/crewai_memory");
const FACTS_FILE = path.join(MEMORY_DIR, "unified_memory.json");
const MAX_MEMORY_BYTES = 12 * 1024 * 1024;
const CATEGORIES = new Set(["short_term", "long_term", "entity"]);
const PROP_RE = /^[a-zA-Z0-9_.-]{1,120}$/;

function ensureMemoryDir(): string {
  fs.mkdirSync(MEMORY_DIR, { recursive: true, mode: 0o700 });
  const info = fs.lstatSync(MEMORY_DIR);
  if (!info.isDirectory() || info.isSymbolicLink()) {
    throw new Error("Cognitive memory location is not a regular directory.");
  }
  return MEMORY_DIR;
}

function readStoredFacts(): CognitiveFact[] {
  ensureMemoryDir();
  let fileStats: fs.Stats;
  try {
    fileStats = fs.lstatSync(FACTS_FILE);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  if (!fileStats.isFile() || fileStats.isSymbolicLink() ||
      fileStats.size > MAX_MEMORY_BYTES) {
    throw new Error("Cognitive memory integrity check failed.");
  }
  const fd = fs.openSync(FACTS_FILE, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  let raw: string;
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile() || stat.size > MAX_MEMORY_BYTES) {
      throw new Error("Cognitive memory integrity check failed.");
    }
    raw = fs.readFileSync(fd, "utf8");
  } finally {
    fs.closeSync(fd);
  }
  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch { throw new Error("Cognitive memory contains invalid JSON."); }
  if (!Array.isArray(parsed) || parsed.length > 10_000) {
    throw new Error("Cognitive memory integrity check failed.");
  }
  const seen = new Set<string>();
  for (const item of parsed) {
    const fact = item as CognitiveFact;
    if (!fact || typeof fact !== "object" ||
        typeof fact.id !== "string" || !/^fact_[a-zA-Z0-9_-]+$/.test(fact.id) ||
        seen.has(fact.id) ||
        !CATEGORIES.has(fact.category) ||
        typeof fact.subject !== "string" || !fact.subject.trim() ||
        typeof fact.predicate !== "string" || !PROP_RE.test(fact.predicate) ||
        ["__proto__", "prototype", "constructor"].includes(fact.predicate) ||
        typeof fact.object !== "string" ||
        !Number.isFinite(fact.confidence) || fact.confidence < 0 || fact.confidence > 1 ||
        typeof fact.sourceTask !== "string" || typeof fact.agentRole !== "string" ||
        typeof fact.timestamp !== "string") {
      throw new Error("Cognitive memory record integrity check failed.");
    }
    seen.add(fact.id);
  }
  return parsed as CognitiveFact[];
}

function buildEntities(facts: CognitiveFact[]): EntityRecord[] {
  const entities = new Map<string, EntityRecord>();
  for (const fact of facts) {
    if (fact.category !== "entity") continue;
    const entityId = fact.subject.toLowerCase().replace(/\s+/g, "_").slice(0, 160);
    let entity = entities.get(entityId);
    if (!entity) {
      entity = {
        entityId,
        name: fact.subject,
        type: "ExtractedConcept",
        attributes: Object.create(null) as Record<string, unknown>,
        relations: [],
        lastSeen: fact.timestamp,
      };
      entities.set(entityId, entity);
    }
    entity.attributes[fact.predicate] = fact.object;
    entity.lastSeen = fact.timestamp;
  }
  return [...entities.values()];
}

/** Store exactly what was recorded; never pre-seed fabricated tax or pricing facts. */
export async function storeCognitiveFact(
  fact: Omit<CognitiveFact, "id" | "timestamp">
): Promise<CognitiveFact> {
  if (!CATEGORIES.has(fact.category) ||
      typeof fact.subject !== "string" || !fact.subject.trim() ||
      typeof fact.predicate !== "string" || !PROP_RE.test(fact.predicate) ||
      ["__proto__", "constructor", "prototype"].includes(fact.predicate) ||
      typeof fact.object !== "string" ||
      !Number.isFinite(fact.confidence) || fact.confidence < 0 || fact.confidence > 1 ||
      typeof fact.sourceTask !== "string" || typeof fact.agentRole !== "string") {
    throw new Error("Invalid cognitive memory fact.");
  }
  const facts = readStoredFacts();
  const fullFact: CognitiveFact = {
    id: `fact_${Date.now()}_${crypto.randomUUID().slice(0, 12)}`,
    ...fact,
    timestamp: new Date().toISOString(),
  };
  facts.push(fullFact);
  if (facts.length > 10_000) {
    throw new Error("Cognitive memory has reached its local storage limit.");
  }
  const serialized = JSON.stringify(facts, null, 2);
  if (Buffer.byteLength(serialized, "utf8") > MAX_MEMORY_BYTES) {
    throw new Error("Cognitive memory has reached its local storage limit.");
  }

  // Write, fsync and rename before acknowledging the new fact. A failed write
  // must not be reported as successfully stored.
  const stagingFile = path.join(ensureMemoryDir(), `.unified_${crypto.randomUUID()}.tmp`);
  let renamed = false;
  try {
    const fd = fs.openSync(stagingFile, fs.constants.O_WRONLY |
      fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW ?? 0), 0o600);
    try {
      fs.writeFileSync(fd, serialized, "utf8");
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(stagingFile, FACTS_FILE);
    renamed = true;
  } finally {
    if (!renamed) {
      try { fs.unlinkSync(stagingFile); } catch { /* no partial file to clean */ }
    }
  }
  return fullFact;
}

/** Load persisted facts and derive entities from those same records every time. */
export async function queryCognitiveMemory(params?: {
  category?: "short_term" | "long_term" | "entity";
  searchQuery?: string;
  limit?: number;
}): Promise<{
  facts: CognitiveFact[];
  entities: EntityRecord[];
  totalFacts: number;
  storageDir: string;
}> {
  const facts = readStoredFacts();
  let filtered = facts;
  if (params?.category) {
    filtered = filtered.filter((fact) => fact.category === params.category);
  }
  if (params?.searchQuery) {
    const q = params.searchQuery.toLowerCase().slice(0, 500);
    filtered = filtered.filter((fact) =>
      fact.subject.toLowerCase().includes(q) ||
      fact.predicate.toLowerCase().includes(q) ||
      fact.object.toLowerCase().includes(q) ||
      (fact.context?.toLowerCase().includes(q) ?? false)
    );
  }
  const limit = params?.limit !== undefined && Number.isSafeInteger(params.limit)
    ? Math.max(1, Math.min(params.limit, 100)) : 50;
  return {
    facts: filtered.slice(-limit).reverse(),
    entities: buildEntities(facts),
    totalFacts: facts.length,
    storageDir: MEMORY_DIR,
  };
}
