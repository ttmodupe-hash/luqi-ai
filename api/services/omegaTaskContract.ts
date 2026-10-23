/** Deliberately small, non-billable allowlist shared with omega_ai.web_tasks.
 * No arbitrary handler names, personal text, external sources or code execution.
 */
import { z } from 'zod';

export const OMEGA_VERSION = 'web-v1';
export const OMEGA_OWNER_TASK_LIMIT = 100;
export const omegaId = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
export const omegaKey = z.string().regex(/^[A-Za-z0-9_-]{8,128}$/);
const amount = z.string().regex(/^(0|[1-9][0-9]{0,8})(\.[0-9]{1,2})?$/);
const calendarDate = z.string().regex(/^(19|20)[0-9]{2}-[0-9]{2}-[0-9]{2}$/).refine(value => {
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
});
const budget = z.object({ currency: z.string().regex(/^[A-Z]{3}$/),
  amounts: z.array(amount).min(1).max(50) }).strict();
const schedule = z.object({
  odometerKm: z.number().int().min(0).max(10_000_000),
  lastServiceKm: z.number().int().min(0).max(10_000_000),
  lastServiceDate: calendarDate, today: calendarDate,
  intervalKm: z.number().int().min(1).max(1_000_000),
  intervalDays: z.number().int().min(1).max(3650),
}).strict().refine(p => p.lastServiceKm <= p.odometerKm && p.lastServiceDate <= p.today);

export const omegaSubmission = z.discriminatedUnion('handler', [
  z.object({ handler: z.literal('travel.budget'), payload: budget, idempotencyKey: omegaKey }).strict(),
  z.object({ handler: z.literal('vehicle.schedule'), payload: schedule, idempotencyKey: omegaKey }).strict(),
]);
export type OmegaSubmission = z.infer<typeof omegaSubmission>;
export const OMEGA_HANDLERS = ['travel.budget', 'vehicle.schedule'] as const;
export const omegaState = z.enum(['pending', 'approval_required', 'retry_wait', 'running',
  'completed', 'failed', 'reconciliation_required', 'cancelled']);
const resultByHandler = {
  'travel.budget': z.object({ total: z.string().regex(/^[0-9]{1,11}\.[0-9]{2}$/),
    currency: z.string().regex(/^[A-Z]{3}$/), basis: z.literal('user_supplied'),
    notice: z.literal('Arithmetic from supplied amounts; no live prices or FX rates.') }).strict(),
  'vehicle.schedule': z.object({ kmRemaining: z.number().int(), serviceDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    overdueByKm: z.boolean(), overdueByDate: z.boolean(), needsService: z.boolean(),
    basis: z.literal('user_supplied'),
    notice: z.literal('Scheduling aid only; follow manufacturer instructions and a mechanic\'s advice.') }).strict(),
};
export function validateOmegaResult(handler: OmegaSubmission['handler'], result: unknown) {
  return resultByHandler[handler].parse(result);
}
export function omegaOwner(userId: number): string {
  if (!Number.isSafeInteger(userId) || userId <= 0) throw new Error('Invalid authenticated identity');
  return `luqi-user:${userId}`;
}
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
