import { z } from "zod";

export const DRAFT_CONTRACT = "luqi-unit-economics-v1";
export const MAX_DRAFT_CHARS = 14000;
export const DRAFT_LIMITS = {
  guestHeapBytes: 8 * 1024 * 1024,
  stackBytes: 256 * 1024,
  caseMs: 150,
  wallMs: 12000,
} as const;
export const draftSource = z
  .string()
  .min(1)
  .max(MAX_DRAFT_CHARS)
  .refine((s) => s.trim().length > 0);
export const CONTRACT_TEXT = `Write a pure synchronous JavaScript function named solve(input). No imports, exports, host APIs or asynchronous work.
Input: {priceCents, costCents, fixedCents, units}. All four must be numbers, safe integers, >=0 and <=1000000; otherwise throw. Values are integer ZAR cents, except units (whole items).
Output exactly {contributionCents, revenueCents, profitCents, breakEvenUnits}.
contributionCents=priceCents-costCents; revenueCents=priceCents*units; profitCents=contributionCents*units-fixedCents.
breakEvenUnits is null when contributionCents<=0, otherwise ceil(fixedCents/contributionCents). No fees, taxes, demand or business advice are inferred.`;

const inputs: [string, Record<string, unknown>][] = [
  [
    "profitable",
    { priceCents: 2500, costCents: 1000, fixedCents: 100000, units: 100 },
  ],
  ["loss", { priceCents: 100, costCents: 80, fixedCents: 5000, units: 2 }],
  ["round-up", { priceCents: 10, costCents: 7, fixedCents: 10, units: 4 }],
  ["zero", { priceCents: 0, costCents: 0, fixedCents: 0, units: 0 }],
  [
    "no-contribution",
    { priceCents: 15, costCents: 15, fixedCents: 99, units: 20 },
  ],
  [
    "negative-contribution",
    { priceCents: 10, costCents: 20, fixedCents: 50, units: 10 },
  ],
  [
    "upper-bound",
    { priceCents: 1000000, costCents: 0, fixedCents: 1000000, units: 1000000 },
  ],
  ["negative-input", { priceCents: -1, costCents: 0, fixedCents: 0, units: 1 }],
  [
    "fractional-input",
    { priceCents: 1, costCents: 0, fixedCents: 0, units: 1.5 },
  ],
  ["string-input", { priceCents: "10", costCents: 0, fixedCents: 0, units: 1 }],
  [
    "out-of-range",
    { priceCents: 1000001, costCents: 0, fixedCents: 0, units: 1 },
  ],
  ["missing-input", { priceCents: 10, costCents: 0, units: 1 }],
];
const output = z
  .object({
    contributionCents: z.number().safe(),
    revenueCents: z.number().safe(),
    profitCents: z.number().safe(),
    breakEvenUnits: z.number().safe().nonnegative().nullable(),
  })
  .strict();
export function expectedOutput(input: Record<string, unknown>) {
  if (
    !["priceCents", "costCents", "fixedCents", "units"].every(
      (k) =>
        typeof input[k] === "number" &&
        Number.isSafeInteger(input[k]) &&
        Number(input[k]) >= 0 &&
        Number(input[k]) <= 1000000,
    )
  )
    return null;
  const p = BigInt(input.priceCents as number),
    c = BigInt(input.costCents as number),
    f = BigInt(input.fixedCents as number),
    u = BigInt(input.units as number),
    d = p - c;
  return {
    contributionCents: Number(d),
    revenueCents: Number(p * u),
    profitCents: Number(d * u - f),
    breakEvenUnits: d > 0n ? Number((f + d - 1n) / d) : null,
  };
}
export const DRAFT_CASES = inputs.map(([id, input]) => ({
  id,
  input,
  expected: expectedOutput(input),
}));
const rowSchema = z
  .object({
    id: z.string(),
    outcome: z.enum(["value", "throw", "error", "limit"]),
    actual: z.string().max(2048).optional(),
  })
  .strict();
const reportSchema = z
  .object({
    contract: z.literal(DRAFT_CONTRACT),
    digest: z.string().regex(/^[a-f0-9]{64}$/),
    rows: z.array(rowSchema).length(DRAFT_CASES.length),
  })
  .strict();
export type DraftReport = z.infer<typeof reportSchema>;
export function passedCase(
  row: DraftReport["rows"][number],
  test = DRAFT_CASES.find((t) => t.id === row.id),
): boolean {
  if (!test) return false;
  if (test.expected === null) return row.outcome === "throw";
  if (row.outcome !== "value" || !row.actual) return false;
  try {
    const actual = output.parse(JSON.parse(row.actual));
    return Object.keys(test.expected).every(
      (k) =>
        actual[k as keyof typeof actual] ===
        test.expected![k as keyof typeof actual],
    );
  } catch {
    return false;
  }
}
export function checkedDraftReport(
  value: unknown,
  digest: string,
): DraftReport {
  const r = reportSchema.parse(value);
  if (r.digest !== digest || r.rows.some((x, i) => x.id !== DRAFT_CASES[i].id))
    throw Error("Unconfirmed test result");
  return r;
}
export const allDraftTestsPass = (r: DraftReport) =>
  r.rows.every((row) => passedCase(row));
export async function sourceDigest(source: string): Promise<string> {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(source),
  );
  return Array.from(new Uint8Array(bytes), (v) =>
    v.toString(16).padStart(2, "0"),
  ).join("");
}
export function parseAiDraft(raw: string): {
  code: string;
  explanation: string;
} {
  let text = raw.trim();
  if (text.startsWith("```json\n") && text.endsWith("```"))
    text = text.slice(8, -3).trim();
  return z
    .object({ code: draftSource, explanation: z.string().max(1500) })
    .strict()
    .parse(JSON.parse(text));
}
export const REFERENCE_DRAFT = `function solve(input) {
  for (const key of ['priceCents', 'costCents', 'fixedCents', 'units']) {
    const value = input[key];
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > 1000000) {
      throw new Error('Invalid integer input');
    }
  }
  const { priceCents, costCents, fixedCents, units } = input;
  const contributionCents = priceCents - costCents;
  return {
    contributionCents,
    revenueCents: priceCents * units,
    profitCents: contributionCents * units - fixedCents,
    breakEvenUnits: contributionCents > 0 ? Math.ceil(fixedCents / contributionCents) : null
  };
}`;
