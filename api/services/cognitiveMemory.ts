// =====================================================================
// LAYER 2: COGNITIVE ARCHIVING (CrewAI Unified Memory System)
// =====================================================================
// Tracks knowledge and deduced facts over time across three tiers:
//   1. Short-Term Memory (current session context & task outputs)
//   2. Long-Term Memory (generalized facts & business rules)
//   3. Entity Memory (knowledge graph of discrete entities & attributes)
//
// Persistent Storage:
//   Controlled via CREWAI_STORAGE_DIR (default: ./data/crewai_memory).
//   Analyzes task outputs in background to extract and index facts.
// =====================================================================

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
  type: string; // e.g. "Worksheet", "Company", "TaxForm", "LabFormula", "SerialPattern"
  attributes: Record<string, unknown>;
  relations: Array<{ relation: string; targetEntityId: string }>;
  lastSeen: string;
}

const MEMORY_DIR = path.resolve(process.env.CREWAI_STORAGE_DIR || "./data/crewai_memory");

function ensureMemoryDir(): string {
  fs.mkdirSync(MEMORY_DIR, { recursive: true });
  return MEMORY_DIR;
}

// In-Memory store
const cognitiveFacts: CognitiveFact[] = [];
const entityStore = new Map<string, EntityRecord>();

// Pre-seed baseline cognitive facts
function initBaselineFacts() {
  if (cognitiveFacts.length === 0) {
    cognitiveFacts.push(
      {
        id: "fact_001",
        category: "long_term",
        subject: "South African VAT Standard Rate",
        predicate: "is_fixed_at",
        object: "15%",
        context: "South African Revenue Service (SARS) Value-Added Tax regulation",
        confidence: 1.0,
        sourceTask: "Tax Compliance Policy Verification",
        agentRole: "Financial Governance Specialist",
        timestamp: new Date().toISOString(),
      },
      {
        id: "fact_002",
        category: "entity",
        subject: "Excel Serial Number Reconciliation Rule",
        predicate: "requires_primary_key_standardization",
        object: "Uppercase trimmed alphanumeric matching",
        context: "Data Architect workbook consolidation rule",
        confidence: 0.98,
        sourceTask: "Multi-tab Excel Reconciliation Task",
        agentRole: "Data Architect",
        timestamp: new Date().toISOString(),
      },
      {
        id: "fact_003",
        category: "long_term",
        subject: "Generative Video Margin Protector",
        predicate: "enforces_rate_of",
        object: "10 Luqi Credits per second ($0.50/s) vs $0.25 API cost",
        context: "Luqi AI subscription sustainability architecture",
        confidence: 1.0,
        sourceTask: "Commercial Pricing Guard Validation",
        agentRole: "System Architect",
        timestamp: new Date().toISOString(),
      }
    );

    entityStore.set("entity_sars", {
      entityId: "entity_sars",
      name: "South African Revenue Service",
      type: "TaxAuthority",
      attributes: { portal: "eFiling", country: "South Africa", standard_vat: 0.15 },
      relations: [],
      lastSeen: new Date().toISOString(),
    });

    entityStore.set("entity_excel_pipeline", {
      entityId: "entity_excel_pipeline",
      name: "Standardized Workbook Generator",
      type: "DataPipeline",
      attributes: { engine: "openpyxl / pandas", archive_format: "XLSX + JSON Metadata" },
      relations: [],
      lastSeen: new Date().toISOString(),
    });
  }
}
initBaselineFacts();

/**
 * Extracts and stores a new cognitive fact deduced by an agent or CrewAI task.
 */
export async function storeCognitiveFact(fact: Omit<CognitiveFact, "id" | "timestamp">): Promise<CognitiveFact> {
  const dir = ensureMemoryDir();
  const id = `fact_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`;
  const timestamp = new Date().toISOString();

  const fullFact: CognitiveFact = {
    id,
    ...fact,
    timestamp,
  };

  cognitiveFacts.push(fullFact);

  // If entity fact, index into entityStore
  if (fact.category === "entity") {
    const entityKey = fact.subject.toLowerCase().replace(/\s+/g, "_");
    const existingEntity = entityStore.get(entityKey);
    if (existingEntity) {
      existingEntity.attributes[fact.predicate] = fact.object;
      existingEntity.lastSeen = timestamp;
    } else {
      entityStore.set(entityKey, {
        entityId: entityKey,
        name: fact.subject,
        type: "ExtractedConcept",
        attributes: { [fact.predicate]: fact.object },
        relations: [],
        lastSeen: timestamp,
      });
    }
  }

  // Persist to unified memory file
  try {
    const memoryFilePath = path.join(dir, "unified_memory.json");
    fs.writeFileSync(memoryFilePath, JSON.stringify(cognitiveFacts, null, 2), "utf-8");
  } catch (err) {
    console.warn("[CognitiveMemory] Persist error:", err);
  }

  return fullFact;
}

/**
 * Queries the unified memory system across all 3 tiers.
 */
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
  ensureMemoryDir();
  let filtered = [...cognitiveFacts];

  if (params?.category) {
    filtered = filtered.filter((f) => f.category === params.category);
  }

  if (params?.searchQuery) {
    const q = params.searchQuery.toLowerCase();
    filtered = filtered.filter(
      (f) =>
        f.subject.toLowerCase().includes(q) ||
        f.predicate.toLowerCase().includes(q) ||
        f.object.toLowerCase().includes(q) ||
        (f.context && f.context.toLowerCase().includes(q))
    );
  }

  const limit = params?.limit ?? 50;
  return {
    facts: filtered.slice(-limit).reverse(),
    entities: Array.from(entityStore.values()),
    totalFacts: cognitiveFacts.length,
    storageDir: MEMORY_DIR,
  };
}
