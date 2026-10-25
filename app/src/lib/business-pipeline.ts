/** LUQI Business Desk follow-up file v1.
 * Pure arithmetic and strict file validation; no server, account or storage.
 */
import { asZar, toCents } from './business-desk';

export type SalesStage = 'draft' | 'sent' | 'followup' | 'won' | 'lost';
export type SalesRecord = {
  id: string;
  alias: string;
  valueZar: string;
  stage: SalesStage;
  followUpDate: string | null;
};
export type SalesSummary = {
  openCount: number;
  wonCount: number;
  dueCount: number;
  openValueZar: string;
  wonValueZar: string;
};
export const MAX_SALES_RECORDS = 50;
export const MAX_SALES_FILE_BYTES = 32 * 1024;
const stages: readonly SalesStage[] = ['draft', 'sent', 'followup', 'won', 'lost'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const exactKeys = (input: object, keys: readonly string[]) => {
  const actual = Object.keys(input).sort();
  return actual.length === keys.length &&
    actual.every((name, index) => name === [...keys].sort()[index]);
};
const invalid = () => new Error('INVALID_PIPELINE_FILE');
const isOpen = (stage: SalesStage) => !['won', 'lost'].includes(stage);

export function validatePipelineDate(date: string): string {
  if (!/^(19|20)\d\d-\d\d-\d\d$/.test(date)) throw invalid();
  const [year, month, day] = date.split('-').map(Number);
  const value = Date.UTC(year, month - 1, day);
  if (!Number.isFinite(value) || new Date(value).toISOString().slice(0, 10) !== date) throw invalid();
  return date;
}
function validateRecord(raw: unknown): SalesRecord {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) ||
      !exactKeys(raw, ['id', 'alias', 'valueZar', 'stage', 'followUpDate']))
    throw invalid();
  const record = raw as Record<string, unknown>;
  if (typeof record.id !== 'string' || !uuid.test(record.id) ||
      typeof record.alias !== 'string' || record.alias.trim().length < 1 ||
      record.alias.length > 60 || /[\u0000-\u001f\u007f]/u.test(record.alias) ||
      typeof record.stage !== 'string' || !stages.includes(record.stage as SalesStage) ||
      (record.followUpDate !== null && typeof record.followUpDate !== 'string'))
    throw invalid();
  let valueZar: string;
  try { valueZar = asZar(toCents(record.valueZar as string)); }
  catch { throw invalid(); }
  if (valueZar !== record.valueZar) throw invalid();
  const followUpDate = record.followUpDate === null ? null :
    validatePipelineDate(record.followUpDate as string);
  // A closed opportunity cannot have a remaining future task.
  if (!isOpen(record.stage as SalesStage) && followUpDate !== null) throw invalid();
  return {
    id: record.id,
    alias: record.alias.trim(),
    valueZar,
    stage: record.stage as SalesStage,
    followUpDate,
  };
}

export function validateSalesRecords(input: unknown): SalesRecord[] {
  if (!Array.isArray(input) || input.length > MAX_SALES_RECORDS) throw invalid();
  const records = input.map(validateRecord);
  if (new Set(records.map(row => row.id)).size !== records.length) throw invalid();
  return records;
}

export function summarizeSales(records: SalesRecord[], today: string): SalesSummary {
  validatePipelineDate(today);
  const valid = validateSalesRecords(records);
  let open = 0n;
  let won = 0n;
  let openCount = 0;
  let wonCount = 0;
  let dueCount = 0;
  for (const record of valid) {
    const cents = toCents(record.valueZar);
    if (isOpen(record.stage)) {
      openCount++;
      open += cents;
      if (record.followUpDate && record.followUpDate <= today) dueCount++;
    } else if (record.stage === 'won') {
      wonCount++;
      won += cents;
    }
  }
  return {
    openCount, wonCount, dueCount,
    openValueZar: asZar(open), wonValueZar: asZar(won),
  };
}
export function serializeSalesFile(records: SalesRecord[]): string {
  return JSON.stringify({ format: 'luqi.sales-board.v1', records: validateSalesRecords(records) }, null, 2);
}
export function parseSalesFile(raw: string): SalesRecord[] {
  if (typeof raw !== 'string' || !raw.length ||
      new TextEncoder().encode(raw).length > MAX_SALES_FILE_BYTES) throw invalid();
  let decoded: unknown;
  try { decoded = JSON.parse(raw); }
  catch { throw invalid(); }
  if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded) ||
      !exactKeys(decoded, ['format', 'records'])) throw invalid();
  const archive = decoded as { format: unknown; records: unknown };
  if (archive.format !== 'luqi.sales-board.v1') throw invalid();
  return validateSalesRecords(archive.records);
}
