/** User-owned preparation only. Never imports eligibility, source dates or approvals. */
export const TOWNSHIP_PROJECT_FORMAT = 'luqi.township.workspace.v1' as const;
export const TOWNSHIP_PROJECT_MAX_BYTES = 65536;
export interface TownshipContext { sector: string; goal: string; province: string; municipality: string }
export interface WorkspaceItem { description: string; quantity: string; price: string }
export interface TownshipProject {
  format: typeof TOWNSHIP_PROJECT_FORMAT;
  context: TownshipContext;
  businessName: string;
  offering: string;
  notes: string;
  completedSteps: string[];
  customerName: string;
  reference: string;
  items: WorkspaceItem[];
  pricing: { selling: string; direct: string; fixed: string };
}
/** Returns today's authored preparation steps, or null for an invalid context. */
export type ContextReview = (context: TownshipContext) => readonly string[] | null;
const invalid = () => new Error('INVALID_TOWNSHIP_PROJECT');
function object(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).sort().join('|') === [...keys].sort().join('|');
}
function text(value: unknown, max: number, multiline = false): value is string {
  return typeof value === 'string' && value.length <= max &&
    !(multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u : /[\u0000-\u001f\u007f]/u).test(value);
}
export function townshipContextKey(context: TownshipContext): string {
  return JSON.stringify([context.sector, context.goal, context.province, context.municipality]);
}
export function newTownshipProject(context: TownshipContext): TownshipProject {
  return { format: TOWNSHIP_PROJECT_FORMAT, context: { ...context }, businessName: '', offering: '', notes: '',
    completedSteps: [], customerName: '', reference: 'Q-001',
    items: [{ description: '', quantity: '1', price: '' }], pricing: { selling: '', direct: '', fixed: '' } };
}
export function readTownshipProject(raw: string, reviewContext: ContextReview): TownshipProject {
  if (typeof raw !== 'string' || !raw || raw.length > TOWNSHIP_PROJECT_MAX_BYTES ||
      new TextEncoder().encode(raw).byteLength > TOWNSHIP_PROJECT_MAX_BYTES) throw invalid();
  let data: unknown;
  try { data = JSON.parse(raw); } catch { throw invalid(); }
  if (!object(data, ['format', 'context', 'businessName', 'offering', 'notes', 'completedSteps', 'customerName', 'reference', 'items', 'pricing']) ||
      data.format !== TOWNSHIP_PROJECT_FORMAT || !object(data.context, ['sector', 'goal', 'province', 'municipality'])) throw invalid();
  const c = data.context;
  if (!text(c.sector, 40) || !text(c.goal, 40) || !text(c.province, 8) || !text(c.municipality, 160)) throw invalid();
  const context: TownshipContext = { sector: c.sector, goal: c.goal, province: c.province, municipality: c.municipality };
  const steps = reviewContext(context);
  if (!steps || !text(data.businessName, 90) || !text(data.offering, 1000, true) || !text(data.notes, 4000, true) ||
      !text(data.customerName, 90) || !text(data.reference, 45) || !Array.isArray(data.completedSteps) ||
      data.completedSteps.length > steps.length || new Set(data.completedSteps).size !== data.completedSteps.length ||
      data.completedSteps.some(step => typeof step !== 'string' || !steps.includes(step)) ||
      !Array.isArray(data.items) || data.items.length < 1 || data.items.length > 12 ||
      !object(data.pricing, ['selling', 'direct', 'fixed'])) throw invalid();
  const items: WorkspaceItem[] = data.items.map(row => {
    if (!object(row, ['description', 'quantity', 'price']) || !text(row.description, 120) || !text(row.quantity, 4) || !text(row.price, 11)) throw invalid();
    return { description: row.description, quantity: row.quantity, price: row.price };
  });
  if (!text(data.pricing.selling, 11) || !text(data.pricing.direct, 11) || !text(data.pricing.fixed, 11)) throw invalid();
  // Only allowlisted user inputs survive. Partial inputs are retained; amounts are
  // validated and recalculated by business-desk helpers, never trusted from a file.
  return { format: TOWNSHIP_PROJECT_FORMAT, context, businessName: data.businessName, offering: data.offering,
    notes: data.notes, completedSteps: [...data.completedSteps] as string[], customerName: data.customerName,
    reference: data.reference, items,
    pricing: { selling: data.pricing.selling, direct: data.pricing.direct, fixed: data.pricing.fixed } };
}
export function writeTownshipProject(project: TownshipProject, reviewContext: ContextReview): string {
  return JSON.stringify(readTownshipProject(JSON.stringify(project), reviewContext), null, 2);
}
