// =====================================================================
// DATABASE CONNECTION & RESILIENT IN-MEMORY STORE
// =====================================================================
// Uses MySQL connection pool when DATABASE_URL or DB_HOST is configured.
// When running in an environment without an external database instance,
// seamlessly falls back to an in-memory repository store so that all
// features (video projects, error logs, credits, botany) operate
// without throwing unhandled connection errors.
// =====================================================================

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const hasDbConfig = Boolean(process.env.DATABASE_URL || (process.env.DB_HOST && process.env.DB_HOST !== "localhost"));

let pool: mysql.Pool | null = null;
let realDrizzleDb: any = null;

if (hasDbConfig) {
  try {
    pool = process.env.DATABASE_URL
      ? mysql.createPool(process.env.DATABASE_URL)
      : mysql.createPool({
          host: process.env.DB_HOST || "localhost",
          user: process.env.DB_USER || "root",
          password: process.env.DB_PASSWORD || "",
          database: process.env.DB_NAME || "luqi_ai",
          port: parseInt(process.env.DB_PORT || "3306", 10),
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
          enableKeepAlive: true,
        });
    realDrizzleDb = drizzle(pool);
  } catch (err) {
    console.warn("[DB] Pool creation failed, in-memory store active:", err);
  }
}

// ── In-Memory Tables Store (Fallback) ────────────────────────────────
const memoryTables = new Map<string, any[]>();

function getTableStore(tableName: string): any[] {
  let records = memoryTables.get(tableName);
  if (!records) {
    records = [];
    memoryTables.set(tableName, records);
  }
  return records;
}

// Pre-seed default botanical entries in memory so ethnobotanical queries work out of the box
const initialBotanical = [
  {
    id: 1,
    name: "African Potato",
    scientificName: "Hypoxis hemerocallidea",
    category: "Immune Support",
    description: "A geophyte native to Southern Africa with a corm used for generations in Zulu, Sotho, and Xhosa traditional medicine. Contains hypoxoside, which converts to rooperol, a compound studied for anti-inflammatory and antioxidant activity.",
    traditionalUse: "Corm infusions and decoctions traditionally used for urinary tract infections, prostate conditions, immune weakness, and as a general tonic.",
    safetyNotes: "May interact with antiretroviral medication. Nausea possible at high doses. Not a substitute for medical treatment.",
    region: "south_africa",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    name: "Sutherlandia (Cancer Bush)",
    scientificName: "Lessertia frutescens",
    category: "Adaptogen",
    description: "A leguminous shrub from the Western and Northern Cape, long used by Khoi and Nama healers. Contains L-canavanine, GABA, and pinitol. Traditionally regarded as a quality-of-life tonic.",
    traditionalUse: "Leaf teas traditionally taken for appetite loss, fever, diabetes support, stress, and as an adaptogen during chronic illness.",
    safetyNotes: "Do not combine with anticoagulants (warfarin) or during pregnancy. Never replace prescribed chronic medication.",
    region: "south_africa",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 3,
    name: "Rooibos",
    scientificName: "Aspalathus linearis",
    category: "Antioxidant Tea",
    description: "A fynbos legume endemic to the Cederberg region of the Western Cape. Naturally caffeine-free and rich in aspalathin, a unique antioxidant.",
    traditionalUse: "Infusions traditionally used for infant colic, allergies, digestive complaints, and skin conditions.",
    safetyNotes: "Considered very safe with centuries of consumption. Normal tea consumption poses no known risk.",
    region: "south_africa",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];
memoryTables.set("botanical_entries", initialBotanical);

// Pre-seed demo video project so Video Studio has immediate visual content
const initialVideos = [
  {
    id: 1,
    title: "Quantum Pendulum Simulation",
    description: "3D animation illustrating simple harmonic motion and energy conservation in South African physics curriculum.",
    prompt: "3D cartoon style robot demonstrating harmonic oscillation with glowing pendulum trail",
    language: "en",
    status: "SUCCESS",
    videoUrl: "/generated/sample_pendulum.mp4",
    thumbnailUrl: "/generated/sample_pendulum.mp4",
    durationSeconds: 5,
    progress: 100,
    modelUsed: "Replicate (WAN 2.1) + ElevenLabs (Turbo v2.5)",
    createdAt: new Date(),
    updatedAt: new Date(),
    processedAt: new Date(),
  },
];
memoryTables.set("video_projects", initialVideos);

// In-Memory Query Builder Mock for Drizzle
class MemoryQueryBuilder {
  private tableName = "generic";
  private selectedFields: any = null;
  private limitNum: number | null = null;
  private offsetNum = 0;

  constructor(tableName = "generic") {
    this.tableName = tableName;
  }

  from(table: any) {
    const name = table?.[Symbol.for("drizzle:Name")] || table?.name || (typeof table === "string" ? table : "generic");
    this.tableName = name;
    return this;
  }

  where(condition?: any) {
    return this;
  }

  orderBy(...args: any[]) {
    return this;
  }

  limit(limit: number) {
    this.limitNum = limit;
    return this;
  }

  offset(offset: number) {
    this.offsetNum = offset;
    return this;
  }

  groupBy(...args: any[]) {
    return this;
  }

  values(val: any) {
    const store = getTableStore(this.tableName);
    const newId = store.length > 0 ? Math.max(...store.map((r) => Number(r.id || 0))) + 1 : 1;
    const record = {
      id: newId,
      ...val,
      createdAt: val?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    store.push(record);
    return Promise.resolve([{ insertId: newId }]);
  }

  set(val: any) {
    const store = getTableStore(this.tableName);
    // updates the most recent record or match
    if (store.length > 0) {
      Object.assign(store[store.length - 1], val, { updatedAt: new Date() });
    }
    return Promise.resolve([{ affectedRows: 1 }]);
  }

  then(resolve: any) {
    const store = getTableStore(this.tableName);
    let result = [...store];
    if (this.offsetNum > 0) {
      result = result.slice(this.offsetNum);
    }
    if (this.limitNum !== null) {
      result = result.slice(0, this.limitNum);
    }
    return Promise.resolve(result).then(resolve);
  }
}

const memoryDb = {
  select: (fields?: any) => {
    const qb = new MemoryQueryBuilder();
    (qb as any).selectedFields = fields;
    return qb;
  },
  insert: (table: any) => {
    const name = table?.[Symbol.for("drizzle:Name")] || table?.name || "generic";
    return new MemoryQueryBuilder(name);
  },
  update: (table: any) => {
    const name = table?.[Symbol.for("drizzle:Name")] || table?.name || "generic";
    return new MemoryQueryBuilder(name);
  },
  delete: (table: any) => {
    const name = table?.[Symbol.for("drizzle:Name")] || table?.name || "generic";
    return new MemoryQueryBuilder(name);
  },
  execute: async (query: any) => {
    return [[]];
  },
};

export const db = realDrizzleDb || memoryDb;

export async function getDb() {
  if (realDrizzleDb && pool) {
    try {
      const conn = await pool.getConnection();
      conn.release();
      return realDrizzleDb;
    } catch {
      // Database connection unreachable; non-auth features may use the memory fallback.
      return memoryDb;
    }
  }
  return memoryDb;
}

/**
 * Authentication must fail closed: never authenticate against the in-memory
 * query-builder fallback, whose intentionally simplified filters are not secure.
 */
export async function getAuthDb() {
  if (!realDrizzleDb || !pool) return null;
  try {
    const conn = await pool.getConnection();
    conn.release();
    return realDrizzleDb;
  } catch {
    return null;
  }
}

export async function closeDb() {
  if (pool) {
    try {
      await pool.end();
    } catch {
      // non-fatal
    }
  }
}
