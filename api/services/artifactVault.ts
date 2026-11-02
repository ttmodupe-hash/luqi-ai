// =====================================================================
// LAYER 3: CUSTOM ARTIFACT VAULT & FILE STORAGE LAYER
// =====================================================================
// Permanently stores tangible generated artifacts (standardized Excel
// workbooks, quotation PDFs, simulation reports, animation cuts).
//
// Directory Structure:
//   <ARCHIVE_ROOT>/<YYYY-MM-DD>/<artifactId>_<filename>
//   <ARCHIVE_ROOT>/<YYYY-MM-DD>/<artifactId>_metadata.json
//
// Root Path:
//   Configurable via LUQI_ARCHIVE_PATH or ARCHIVE_DIR.
//   Defaults to ./data/archive/vault.
// =====================================================================

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export interface ArtifactMetadata {
  artifactId: string;
  fileName: string;
  fileType: "excel" | "pdf" | "json" | "video" | "audio" | "report";
  fileSizeBytes: number;
  sha256: string;
  dateFolder: string;
  filePath: string;
  metadataPath: string;
  taskOutput: {
    agentRole: string;
    taskName: string;
    crewId?: string;
    threadId?: string;
    modelUsed?: string;
    promptSummary?: string;
    executionDurationMs?: number;
    primaryKeysReconciled?: number;
    status: "verified" | "completed";
  };
  createdAt: string;
}

const VAULT_ROOT = path.resolve(
  process.env.LUQI_ARCHIVE_PATH || process.env.ARCHIVE_DIR || "./data/archive/vault"
);

function getTodayFolder(): { fullPath: string; dateStr: string } {
  const dateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const fullPath = path.join(VAULT_ROOT, dateStr);
  fs.mkdirSync(fullPath, { recursive: true });
  return { fullPath, dateStr };
}

// In-Memory index of archived items
const artifactRegistry: ArtifactMetadata[] = [];

function initSampleArtifacts() {
  if (artifactRegistry.length === 0) {
    const { fullPath, dateStr } = getTodayFolder();
    const artifactId = `art_${Date.now()}_excel01`;
    const sampleWorkbook = Buffer.from(
      "PK\x03\x04SampleStandardizedWorkbookWithSerialNumbersAndMultiTabReconciliation"
    );
    const fileName = "Consolidated_Equipment_Serials.xlsx";
    const filePath = path.join(fullPath, `${artifactId}_${fileName}`);
    const metadataPath = path.join(fullPath, `${artifactId}_metadata.json`);
    const sha256 = crypto.createHash("sha256").update(sampleWorkbook).digest("hex");

    const meta: ArtifactMetadata = {
      artifactId,
      fileName,
      fileType: "excel",
      fileSizeBytes: sampleWorkbook.length,
      sha256,
      dateFolder: dateStr,
      filePath,
      metadataPath,
      taskOutput: {
        agentRole: "Data Architect",
        taskName: "Multi-tab Excel Serial Number Reconciliation",
        crewId: "crew_finance_reconciliation",
        threadId: "sess_reconciliation_2026",
        modelUsed: "Gemini 3.1 Pro / GPT-4o",
        promptSummary: "Reconcile serial numbers across sheets A, B, and C with primary key standardization",
        executionDurationMs: 1420,
        primaryKeysReconciled: 418,
        status: "verified",
      },
      createdAt: new Date().toISOString(),
    };

    try {
      fs.writeFileSync(filePath, sampleWorkbook);
      fs.writeFileSync(metadataPath, JSON.stringify(meta, null, 2), "utf-8");
    } catch {
      // non-fatal
    }

    artifactRegistry.push(meta);
  }
}
initSampleArtifacts();

/**
 * Archives a file artifact alongside its paired JSON metadata file in the date-structured directory.
 */
export async function archiveArtifact(params: {
  fileName: string;
  fileType: ArtifactMetadata["fileType"];
  content: Buffer | string;
  taskOutput: ArtifactMetadata["taskOutput"];
}): Promise<ArtifactMetadata> {
  const { fullPath, dateStr } = getTodayFolder();
  const artifactId = `art_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`;
  const buffer = Buffer.isBuffer(params.content) ? params.content : Buffer.from(params.content, "utf-8");
  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

  const safeFileName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storedFileName = `${artifactId}_${safeFileName}`;
  const filePath = path.join(fullPath, storedFileName);
  const metadataPath = path.join(fullPath, `${artifactId}_metadata.json`);

  const metadata: ArtifactMetadata = {
    artifactId,
    fileName: safeFileName,
    fileType: params.fileType,
    fileSizeBytes: buffer.length,
    sha256,
    dateFolder: dateStr,
    filePath,
    metadataPath,
    taskOutput: params.taskOutput,
    createdAt: new Date().toISOString(),
  };

  try {
    fs.writeFileSync(filePath, buffer);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), "utf-8");
  } catch (err) {
    console.warn("[ArtifactVault] File write error:", err);
  }

  artifactRegistry.push(metadata);
  return metadata;
}

/**
 * Lists all archived artifacts grouped by date.
 */
export async function listArchivedArtifacts(params?: {
  fileType?: string;
  dateFolder?: string;
  limit?: number;
}): Promise<{
  artifacts: ArtifactMetadata[];
  totalCount: number;
  vaultRoot: string;
  dates: string[];
}> {
  let list = [...artifactRegistry];

  if (params?.fileType) {
    list = list.filter((a) => a.fileType === params.fileType);
  }

  if (params?.dateFolder) {
    list = list.filter((a) => a.dateFolder === params.dateFolder);
  }

  const limit = params?.limit ?? 50;
  const dates = Array.from(new Set(artifactRegistry.map((a) => a.dateFolder))).sort().reverse();

  return {
    artifacts: list.slice(-limit).reverse(),
    totalCount: artifactRegistry.length,
    vaultRoot: VAULT_ROOT,
    dates,
  };
}
