// Flight recorder for administrator-reviewed agent checkpoints.
//
// This is an integrity-checked LOCAL filesystem journal, not an immutable,
// multi-instance distributed ledger. Persistent object storage / database
// migration and backup testing are separate production release requirements.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export interface GraphCheckpoint {
  checkpointId: string;
  threadId: string;
  step: number;
  nodeName: string;
  channelValues: Record<string, unknown>;
  toolCalls?: Array<{
    toolName: string;
    arguments: Record<string, unknown>;
    result: unknown;
    durationMs: number;
  }>;
  stateDiff?: Record<string, unknown>;
  version: number;
  hash: string;
  timestamp: string;
}

const CHECKPOINTS_DIR = path.resolve(
  process.env.LUQI_CHECKPOINTS_DIR || "./data/archive/checkpoints"
);
const MAX_THREAD_BYTES = 16 * 1024 * 1024;
const MAX_RECORD_BYTES = 256 * 1024;
const THREAD_RE = /^[a-zA-Z0-9_-]{1,100}$/;

function validateThreadId(threadId: string): void {
  if (typeof threadId !== "string" || !THREAD_RE.test(threadId)) {
    throw new Error("Invalid checkpoint thread identifier.");
  }
}

function ensureCheckpointsDir(): string {
  fs.mkdirSync(CHECKPOINTS_DIR, { recursive: true, mode: 0o700 });
  const stats = fs.lstatSync(CHECKPOINTS_DIR);
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new Error("Checkpoint storage directory is not a regular directory.");
  }
  return CHECKPOINTS_DIR;
}

function threadPath(threadId: string): string {
  validateThreadId(threadId);
  return path.join(ensureCheckpointsDir(), `${threadId}.jsonl`);
}

function calculateChecksum(data: unknown): string {
  // Keep the legacy 16-hex checksum format for genuine pre-existing records.
  // This is a tamper-evidence checksum, NOT a cryptographic signature.
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex").slice(0, 16);
}

function readVerifiedJournal(threadId: string): GraphCheckpoint[] {
  const filename = threadPath(threadId);
  let stat: fs.Stats;
  try {
    stat = fs.lstatSync(filename);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size === 0 ||
      stat.size > MAX_THREAD_BYTES) {
    throw new Error("Checkpoint journal integrity check failed.");
  }

  const fd = fs.openSync(filename, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  let data: string;
  try {
    const actual = fs.fstatSync(fd);
    if (!actual.isFile() || actual.size === 0 || actual.size > MAX_THREAD_BYTES) {
      throw new Error("Checkpoint journal integrity check failed.");
    }
    data = fs.readFileSync(fd, "utf8");
  } finally {
    fs.closeSync(fd);
  }

  if (!data.endsWith("\n")) throw new Error("Checkpoint journal is incomplete.");
  const lines = data.split("\n");
  lines.pop(); // exact trailing newline; internal empty lines indicate corruption
  const checkpoints: GraphCheckpoint[] = [];
  for (const line of lines) {
    if (!line || Buffer.byteLength(line, "utf8") > MAX_RECORD_BYTES) {
      throw new Error("Checkpoint journal contains an invalid record.");
    }
    let item: GraphCheckpoint;
    try {
      item = JSON.parse(line) as GraphCheckpoint;
    } catch {
      throw new Error("Checkpoint journal contains invalid JSON.");
    }
    if (!item || item.threadId !== threadId ||
        item.step !== checkpoints.length + 1 ||
        item.version !== 1 ||
        typeof item.nodeName !== "string" || !item.nodeName.trim() ||
        !item.channelValues || typeof item.channelValues !== "object" ||
        Array.isArray(item.channelValues) ||
        (item.toolCalls !== undefined && !Array.isArray(item.toolCalls)) ||
        typeof item.timestamp !== "string" ||
        !/^\d{4}-\d{2}-\d{2}T/.test(item.timestamp) ||
        typeof item.hash !== "string" || !/^[a-f0-9]{16}$/.test(item.hash)) {
      throw new Error("Checkpoint journal integrity check failed.");
    }
    const expectedHash = calculateChecksum({
      threadId: item.threadId,
      step: item.step,
      nodeName: item.nodeName,
      channelValues: item.channelValues,
      toolCalls: item.toolCalls ?? [],
      stateDiff: item.stateDiff,
      version: item.version,
      timestamp: item.timestamp,
    });
    if (item.hash !== expectedHash ||
        item.checkpointId !== `chk_${threadId}_step${item.step}_${item.hash.slice(0, 8)}`) {
      throw new Error("Checkpoint journal checksum mismatch.");
    }
    checkpoints.push(item);
  }
  return checkpoints;
}

/** Store only actual checkpoints, after durable append and checksum verification.
 * Errors propagate; callers must never claim an agent step was recorded if IO failed.
 */
export async function recordGraphCheckpoint(params: {
  threadId: string;
  nodeName: string;
  channelValues: Record<string, unknown>;
  toolCalls?: GraphCheckpoint["toolCalls"];
  stateDiff?: Record<string, unknown>;
}): Promise<GraphCheckpoint> {
  validateThreadId(params.threadId);
  if (typeof params.nodeName !== "string" ||
      params.nodeName.length < 1 || params.nodeName.length > 100 ||
      !params.channelValues || typeof params.channelValues !== "object" ||
      Array.isArray(params.channelValues)) {
    throw new Error("Invalid checkpoint content.");
  }

  // Disk is the source of truth, including when the process has restarted.
  const previous = readVerifiedJournal(params.threadId);
  const threadId = params.threadId;
  const step = previous.length + 1;
  const timestamp = new Date().toISOString();
  const checkpointData = {
    threadId,
    step,
    nodeName: params.nodeName,
    channelValues: params.channelValues,
    toolCalls: params.toolCalls || [],
    stateDiff: params.stateDiff,
    version: 1,
    timestamp,
  };
  const hash = calculateChecksum(checkpointData);
  const fullCheckpoint: GraphCheckpoint = {
    checkpointId: `chk_${threadId}_step${step}_${hash.slice(0, 8)}`,
    ...checkpointData,
    hash,
  };
  const line = JSON.stringify(fullCheckpoint) + "\n";
  if (Buffer.byteLength(line, "utf8") > MAX_RECORD_BYTES) {
    throw new Error("Checkpoint record exceeds the allowed size.");
  }
  const filename = threadPath(threadId);
  const existingBytes = fs.existsSync(filename) ? fs.lstatSync(filename).size : 0;
  if (existingBytes + Buffer.byteLength(line, "utf8") > MAX_THREAD_BYTES) {
    throw new Error("Checkpoint journal exceeds its allowed size.");
  }

  // O_NOFOLLOW prevents a pre-existing symlink from redirecting writes.
  const flags = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_APPEND |
    (fs.constants.O_NOFOLLOW ?? 0);
  const fd = fs.openSync(filename, flags, 0o600);
  try {
    fs.writeSync(fd, line);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  return fullCheckpoint;
}

/** Read the complete validated thread journal directly from disk. */
export async function getThreadCheckpoints(threadId: string): Promise<GraphCheckpoint[]> {
  return readVerifiedJournal(threadId);
}

/** Enumerate ACTUAL persisted threads; never fabricate demonstration activity. */
export async function listActiveThreads(limit = 50): Promise<
  Array<{
    threadId: string;
    totalSteps: number;
    lastNode: string;
    lastUpdated: string;
    toolCallsCount: number;
  }>
> {
  const dir = ensureCheckpointsDir();
  const summary: Array<{
    threadId: string;
    totalSteps: number;
    lastNode: string;
    lastUpdated: string;
    toolCallsCount: number;
  }> = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".jsonl")) continue;
    const threadId = entry.name.slice(0, -".jsonl".length);
    if (!THREAD_RE.test(threadId)) continue;
    const checkpoints = readVerifiedJournal(threadId);
    if (checkpoints.length === 0) continue;
    const last = checkpoints[checkpoints.length - 1];
    summary.push({
      threadId,
      totalSteps: checkpoints.length,
      lastNode: last.nodeName,
      lastUpdated: last.timestamp,
      toolCallsCount: checkpoints.reduce((count, item) =>
        count + (item.toolCalls?.length ?? 0), 0),
    });
  }
  const boundedLimit = Number.isSafeInteger(limit) ? Math.max(1, Math.min(limit, 100)) : 50;
  return summary.sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated))
    .slice(0, boundedLimit);
}
