import { asZar, toCents, checkPricing } from "../../lib/business-desk";
export const POINTS = [1, 2, 3, 5, 8, 13, 21] as const;
export interface Story {
  title: string;
  points: string;
  given: string;
  when: string;
  then: string;
}
export interface Raid {
  kind: "Risk" | "Assumption" | "Issue" | "Dependency";
  description: string;
  owner: string;
}
export interface ProductPlan {
  name: string;
  idea: string;
  audience: string;
  metric: string;
  constraints: string;
  capacity: string;
  stories: Story[];
  raid: Raid[];
}
const field = (v: string) => {
  if (typeof v !== "string" || v.length > 2000) throw Error("INVALID_PLAN");
  return v.trim() || "To confirm";
};
export function productPlan(p: ProductPlan) {
  if (
    !p ||
    !/^([1-9]\d{0,2})$/.test(p.capacity) ||
    p.stories.length > 8 ||
    p.raid.length > 12
  )
    throw Error("INVALID_PLAN");
  const capacity = Number(p.capacity);
  let sprint = 1,
    used = 0;
  const backlog = p.stories.map((s) => {
    const points = s.points === "" ? null : Number(s.points);
    if (points !== null && !POINTS.includes(points as (typeof POINTS)[number]))
      throw Error("INVALID_POINTS");
    let proposedSprint: number | null = null;
    if (points !== null && points <= capacity) {
      if (used + points > capacity) {
        sprint++;
        used = 0;
      }
      proposedSprint = sprint;
      used += points;
    }
    return {
      title: field(s.title),
      points,
      proposedSprint,
      status:
        points === null
          ? "Unestimated"
          : points > capacity
            ? "Refine before scheduling"
            : "Proposed only",
      acceptance: {
        given: field(s.given),
        when: field(s.when),
        then: field(s.then),
      },
    };
  });
  const raid = p.raid.map((r) => {
    if (!["Risk", "Assumption", "Issue", "Dependency"].includes(r.kind))
      throw Error("INVALID_RAID");
    return {
      kind: r.kind,
      description: field(r.description),
      owner: field(r.owner),
      status: "Unresolved / review required",
    };
  });
  return {
    format: "luqi.devsecnet.product-plan.v1",
    name: field(p.name),
    problem: field(p.idea),
    audience: field(p.audience),
    successMetric: field(p.metric),
    constraints: field(p.constraints),
    capacityAssumption: capacity,
    backlog,
    raid,
    completed: false,
    notice:
      "User-authored planning draft. Story points are not hours. No dates, completion or AI professional review are implied.",
  };
}
export function forecast(
  price: string,
  cost: string,
  fixed: string,
  units: string,
) {
  if (!/^(0|[1-9]\d{0,6})$/.test(units)) throw Error("INVALID_UNITS");
  const economics = checkPricing({
    sellingPriceZar: price,
    directCostZar: cost,
    monthlyFixedZar: fixed,
  });
  const n = BigInt(units);
  return {
    ...economics,
    revenueZar: asZar(toCents(price) * n),
    profitZar: asZar((toCents(price) - toCents(cost)) * n - toCents(fixed)),
    assumedUnits: units,
  };
}
export function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    if (!/^#[0-9a-f]{6}$/i.test(hex)) throw Error("INVALID_COLOR");
    const rgb = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function designTokens(
  bg: string,
  card: string,
  text: string,
  accent: string,
) {
  const pairs = [
    { name: "Text / background", ratio: contrast(text, bg) },
    { name: "Text / card", ratio: contrast(text, card) },
    { name: "Accent / background", ratio: contrast(accent, bg) },
    { name: "Button text / accent", ratio: contrast(bg, accent) },
  ];
  return {
    colors: { bg, card, text, accent },
    spacing: [8, 16, 24, 32, 48, 64],
    touchTargetPx: 48,
    font: { heading: "Georgia, serif", body: "system-ui, sans-serif" },
    pairs,
    passes: pairs.every((p) => p.ratio >= 7),
    scope: "Selected solid-color pairs only; not a WCAG conformance audit.",
  };
}
