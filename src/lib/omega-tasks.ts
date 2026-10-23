import { z } from "zod";

const taskId = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
const timestamp = z.string().max(40).refine(value => Number.isFinite(Date.parse(value)));
const currency = z.string().regex(/^[A-Z]{3}$/);
const amount = z.string().regex(/^(0|[1-9][0-9]{0,8})(\.[0-9]{1,2})?$/);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
});
const budgetPayload = z.object({ currency, amounts: z.array(amount).min(1).max(50) }).strict();
const inputDate = date.refine(value => /^(19|20)/.test(value));
const schedulePayload = z.object({
  odometerKm: z.number().int().min(0).max(10_000_000),
  lastServiceKm: z.number().int().min(0).max(10_000_000),
  lastServiceDate: inputDate, today: inputDate,
  intervalKm: z.number().int().min(1).max(1_000_000),
  intervalDays: z.number().int().min(1).max(3650),
}).strict().refine(p => p.lastServiceKm <= p.odometerKm && p.lastServiceDate <= p.today);
const budgetDraft = z.object({ handler: z.literal("travel.budget"), payload: budgetPayload }).strict();
const scheduleDraft = z.object({ handler: z.literal("vehicle.schedule"), payload: schedulePayload }).strict();
export const omegaDraftSchema = z.discriminatedUnion("handler", [budgetDraft, scheduleDraft]);
const key = z.string().regex(/^[A-Za-z0-9_-]{8,128}$/);
const submissionSchema = z.discriminatedUnion("handler", [
  budgetDraft.extend({ idempotencyKey: key }), scheduleDraft.extend({ idempotencyKey: key }),
]);
export type OmegaDraft = z.infer<typeof omegaDraftSchema>;
export type OmegaSubmission = z.infer<typeof submissionSchema>;
const base = {
  id: taskId, version: z.literal("web-v1"),
  state: z.enum(["pending", "approval_required", "retry_wait", "running", "completed", "failed", "reconciliation_required", "cancelled"]),
  attempts: z.number().int().min(0).max(3), maxAttempts: z.literal(3),
  error: z.enum(["HANDLER_FAILED", "HANDLER_INTERRUPTED", "WORKER_LEASE_EXPIRED"]).nullable(),
  nextRunAt: timestamp.nullable(), createdAt: timestamp, updatedAt: timestamp,
};
const taskSchema = z.discriminatedUnion("handler", [
  z.object({ ...base, handler: z.literal("travel.budget"),
    payload: budgetPayload,
    result: z.object({ total: z.string().regex(/^[0-9]{1,11}\.[0-9]{2}$/), currency,
      basis: z.literal("user_supplied"), notice: z.literal("Arithmetic from supplied amounts; no live prices or FX rates.") }).nullable(),
  }),
  z.object({ ...base, handler: z.literal("vehicle.schedule"),
    payload: schedulePayload,
    result: z.object({ kmRemaining: z.number().int().min(-10_000_000).max(1_000_000), serviceDueDate: date,
      overdueByKm: z.boolean(), overdueByDate: z.boolean(), needsService: z.boolean(),
      basis: z.literal("user_supplied"),
      notice: z.literal("Scheduling aid only; follow manufacturer instructions and a mechanic's advice.") }).nullable(),
  }),
]).superRefine((task, context) => {
  if ((task.state === "completed") !== (task.result !== null)) context.addIssue({ code: "custom", message: "Unconfirmed outcome" });
  if (task.handler === "travel.budget" && task.result && task.result.currency !== task.payload.currency)
    context.addIssue({ code: "custom", message: "Currency mismatch" });
});
const statusSchema = z.discriminatedUnion("intake", [
  z.object({ intake: z.literal("disabled"), execution: z.literal("disabled"), workerVerified: z.literal(false), handlers: z.array(z.never()).max(0) }),
  z.object({ intake: z.literal("configured"), storage: z.literal("connected"), execution: z.literal("operator_run_only"),
    workerVerified: z.literal(false), handlers: z.array(z.enum(["travel.budget", "vehicle.schedule"])).max(2), ownerTaskLimit: z.literal(100) }),
]);
export type OmegaTask = z.infer<typeof taskSchema>;
export type OmegaStatus = z.infer<typeof statusSchema>;
export class OmegaError extends Error {
  constructor(public status: number) { super("Omega request failed"); }
}
export const taskLabels: Record<OmegaTask["state"], string> = {
  pending: "Queued", approval_required: "Awaiting review", retry_wait: "Waiting to retry", running: "Running",
  completed: "Completed", failed: "Failed", reconciliation_required: "Needs review", cancelled: "Cancelled",
};
export function taskTitle(task: OmegaTask) { return task.handler === "travel.budget" ? "Travel budget" : "Vehicle service schedule"; }

// Same-origin, memory-only credentials. No polling, execution calls, automatic retries or provider access.
export function omegaClient(token: string, request: typeof fetch = fetch) {
  async function call<T>(path: string, schema: z.ZodType<T>, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await request(`/api/v1/omega/tasks${path}`, {
        method: body === undefined ? "GET" : "POST", cache: "no-store", credentials: "omit", redirect: "error", signal: controller.signal,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      if (!response.ok) throw new OmegaError(response.status);
      return schema.parse(await response.json());
    } finally { clearTimeout(timer); }
  }
  const one = (id: string, cancelled = false) => z.object({ task: taskSchema.refine(task => task.id === id && (!cancelled || task.state === "cancelled")) });
  return {
    status: () => call("/status", statusSchema),
    list: (before?: string) => call(`/?limit=20${before ? `&before=${taskId.parse(before)}` : ""}`, z.object({ tasks: z.array(taskSchema).max(20) })),
    get: (id: string) => call(`/${taskId.parse(id)}`, one(id)),
    cancel: (id: string) => call(`/${taskId.parse(id)}/cancel`, one(id, true), { confirm: true }),
    submit: (submitted: OmegaSubmission) => {
      const input = submissionSchema.parse(submitted);
      const saved = z.object({ created: z.boolean(), task: taskSchema }).superRefine((response, context) => {
        if (response.task.handler !== input.handler ||
            JSON.stringify(response.task.payload) !== JSON.stringify(input.payload) ||
            (response.created && (response.task.state !== "pending" || response.task.attempts !== 0))) {
          context.addIssue({ code: "custom", message: "Submission was not confirmed" });
        }
      });
      return call("", saved, input);
    },
  };
}
