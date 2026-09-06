// =====================================================================
// TRADITIONAL MEDICINE SEEDER
// Populates botanical_entries with Southern African ethnobotanical
// knowledge on first boot. Idempotent: creates the table if missing,
// skips seeding when rows already exist, and never throws — a failed
// seed must never block server startup.
// =====================================================================

import mysql from "mysql2/promise";

interface SeedEntry {
  name: string;
  scientificName: string;
  category: string;
  description: string;
  traditionalUse: string;
  safetyNotes: string;
  region: string;
}

const SEED_ENTRIES: SeedEntry[] = [
  {
    name: "African Potato",
    scientificName: "Hypoxis hemerocallidea",
    category: "Immune Support",
    description:
      "A geophyte native to Southern Africa with a corm used for generations in Zulu, Sotho, and Xhosa traditional medicine. Contains hypoxoside, which converts to rooperol, a compound studied for anti-inflammatory and antioxidant activity.",
    traditionalUse:
      "Corm infusions and decoctions traditionally used for urinary tract infections, prostate conditions, immune weakness, and as a general tonic. Applied topically for burns and wounds.",
    safetyNotes:
      "May interact with antiretroviral medication and affect drug metabolism. Nausea possible at high doses. Not a substitute for medical treatment — consult a healthcare provider, especially for HIV-positive patients on ARVs.",
    region: "south_africa",
  },
  {
    name: "Sutherlandia (Cancer Bush)",
    scientificName: "Lessertia frutescens",
    category: "Adaptogen",
    description:
      "A leguminous shrub from the Western and Northern Cape, long used by Khoi and Nama healers. Contains L-canavanine, GABA, and pinitol. Traditionally regarded as a quality-of-life tonic.",
    traditionalUse:
      "Leaf teas traditionally taken for appetite loss, fever, diabetes support, stress, and as an adaptogen during chronic illness. Used topically for wounds and eye washes.",
    safetyNotes:
      "Do not combine with anticoagulants (warfarin) or during pregnancy — insufficient safety data. Dry mouth and mild gastrointestinal upset reported. Never replace prescribed oncology or chronic medication.",
    region: "south_africa",
  },
  {
    name: "Rooibos",
    scientificName: "Aspalathus linearis",
    category: "Antioxidant Tea",
    description:
      "A fynbos legume endemic to the Cederberg region of the Western Cape. Naturally caffeine-free and rich in aspalathin, a unique antioxidant. One of South Africa's most exported botanical products.",
    traditionalUse:
      "Infusions traditionally used for infant colic, allergies, digestive complaints, and skin conditions. Consumed daily as a general health beverage across South Africa.",
    safetyNotes:
      "Considered very safe with centuries of consumption. Extremely rare liver enzyme elevations reported in isolated case studies with excessive concentrated extracts. Normal tea consumption poses no known risk.",
    region: "south_africa",
  },
  {
    name: "Buchu",
    scientificName: "Agathosma betulina",
    category: "Urinary & Kidney",
    description:
      "An aromatic fynbos shrub used by Khoisan peoples for centuries, later adopted into 19th-century European pharmacopoeias. Leaves contain diosphenol and other volatile oils.",
    traditionalUse:
      "Leaf infusions traditionally used for urinary tract infections, kidney complaints, and digestive ailments. Leaves also applied as a traditional antiseptic and used in vinegar tinctures.",
    safetyNotes:
      "Avoid during pregnancy and breastfeeding — may stimulate the uterus. Do not use in cases of kidney inflammation without medical supervision. May increase bleeding risk before surgery.",
    region: "south_africa",
  },
  {
    name: "Devil's Claw",
    scientificName: "Harpagophytum procumbens",
    category: "Joint & Pain",
    description:
      "A desert-adapted plant of the Kalahari region (Namibia, Botswana, Northern Cape) with grappling-hook fruits. Secondary tubers contain harpagoside, studied extensively for musculoskeletal pain in European clinical trials.",
    traditionalUse:
      "Tuber decoctions traditionally used by San and Nama communities for joint pain, backache, fever, and digestive upset. Now a major export crop for herbal medicine.",
    safetyNotes:
      "Avoid with gastric or duodenal ulcers — stimulates stomach acid. May interact with blood thinners and heart medication (antiarrhythmics). Not recommended during pregnancy.",
    region: "southern_africa",
  },
  {
    name: "African Wormwood (Umhlonyane)",
    scientificName: "Artemisia afra",
    category: "Respiratory",
    description:
      "An aromatic herb from the highlands of Southern and East Africa, one of the most widely used medicinal plants on the continent. Distinct from European Artemisia annua. Contains camphor, thujone, and cineole.",
    traditionalUse:
      "Steam inhalations, teas, and poultices traditionally used for coughs, colds, sore throat, fever, and malaria symptoms. Widely used across Zulu, Xhosa, Sotho, and Kenyan communities.",
    safetyNotes:
      "Contains thujone — do not use at high doses or for prolonged periods. Not for use during pregnancy or by people with epilepsy. Traditional remedy for symptoms only; malaria requires immediate medical diagnosis and treatment.",
    region: "east_africa",
  },
  {
    name: "Marula",
    scientificName: "Sclerocarya birrea",
    category: "Nutrition & Skin",
    description:
      "An iconic savanna tree of sub-Saharan Africa. Fruit is exceptionally rich in vitamin C; kernels yield a stable cosmetic oil. Bark and leaves have documented traditional pharmacopoeia use.",
    traditionalUse:
      "Bark infusions traditionally used for digestive ailments, dysentery, and fever. Fruit eaten fresh and fermented; kernel oil applied to skin and hair for moisture and protection.",
    safetyNotes:
      "Fruit and oil are food-grade and safe. Bark preparations are potent — traditional use only in small amounts. Fermented marula products are alcoholic; moderate consumption.",
    region: "southern_africa",
  },
  {
    name: "Honeybush",
    scientificName: "Cyclopia intermedia",
    category: "Antioxidant Tea",
    description:
      "A fynbos shrub from the Eastern Cape mountains, harvested from wild and cultivated stands. Caffeine-free with a naturally sweet, honey-like flavour. Contains mangiferin and hesperidin.",
    traditionalUse:
      "Infusions traditionally used for coughs, respiratory complaints, and as a calming daily beverage. Increasingly studied for blood-sugar modulation and skin health.",
    safetyNotes:
      "Excellent safety profile with long consumption history. No significant interactions documented at normal tea-strength consumption. Suitable for children and pregnant women as a beverage.",
    region: "south_africa",
  },
];

function resolveConnectionConfig(): mysql.ConnectionOptions | null {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    return { uri: databaseUrl };
  }

  const host = process.env.DB_HOST;
  if (!host) {
    return null;
  }

  return {
    host,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "luqi_ai",
    port: parseInt(process.env.DB_PORT || "3306", 10),
  };
}

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS botanical_entries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  plant_name VARCHAR(255) NOT NULL,
  scientific_name VARCHAR(255),
  category VARCHAR(100),
  description TEXT,
  image_url VARCHAR(1000),
  care_instructions JSON,
  growing_conditions JSON,
  common_issues JSON,
  name VARCHAR(255),
  traditional_use TEXT,
  safety_notes TEXT,
  region VARCHAR(255),
  verified TINYINT(1) DEFAULT 0,
  verified_by VARCHAR(255),
  verification_notes TEXT,
  verified_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)`;

const INSERT_SQL = `
INSERT INTO botanical_entries
  (plant_name, scientific_name, category, description, name, traditional_use, safety_notes, region, verified)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`;

export async function seedTraditionalMedicine(): Promise<void> {
  const config = resolveConnectionConfig();

  if (!config) {
    console.log("[Seed] No database configuration found (DATABASE_URL or DB_HOST) — skipping traditional medicine seed");
    return;
  }

  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection(config);

    await connection.execute(CREATE_TABLE_SQL);

    const [rows] = await connection.query("SELECT COUNT(*) AS rowCount FROM botanical_entries");
    const existing = Number((rows as Array<{ rowCount: number }>)[0]?.rowCount ?? 0);

    if (existing > 0) {
      console.log(`[Seed] botanical_entries already contains ${existing} rows — skipping seed`);
      return;
    }

    for (const entry of SEED_ENTRIES) {
      await connection.execute(INSERT_SQL, [
        entry.name,
        entry.scientificName,
        entry.category,
        entry.description,
        entry.name,
        entry.traditionalUse,
        entry.safetyNotes,
        entry.region,
      ]);
    }

    console.log(`[Seed] Inserted ${SEED_ENTRIES.length} traditional medicine entries into botanical_entries`);
  } catch (error) {
    console.error("[Seed] Traditional medicine seed failed (non-fatal):", error);
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch {
        // Connection cleanup failure is non-fatal
      }
    }
  }
}
