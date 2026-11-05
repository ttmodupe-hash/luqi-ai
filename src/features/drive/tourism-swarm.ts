// Luqi-Drive Tool 020: bounded, offline, source-linked four-lens concierge.
// This is deterministic editorial composition, NOT live autonomous research,
// an AI model, an official safety feed, or a credit/booking service.
import {
  DRIVE_AREA_STORIES,
  type DriveAreaCategory,
  type RoadsideStory,
} from "./roadside-stories";

export const TOURISM_PERSONAS = [
  { id: "HERITAGE_ROOTS", label: "Heritage & roots" },
  { id: "ECO_SAFARI", label: "Big-5 & eco-safari" },
  { id: "FAMILY_EXPLORER", label: "Family adventure" },
  { id: "TOWNSHIP_CULINARY", label: "Township & culinary" },
  { id: "LUXURY_WELLNESS", label: "Luxury & wellness" },
] as const;

export type TravelPersona = (typeof TOURISM_PERSONAS)[number]["id"];
export type ConciergeAgentId = "heritage" | "eco" | "local" | "safety";
export type SourceFinding = Readonly<{
  category: DriveAreaCategory;
  text: string;
  sourceLabel: string;
  sourceUrl: string;
}>;
export type ConciergeAgent = Readonly<{
  id: ConciergeAgentId;
  title: string;
  findings: readonly SourceFinding[];
  status: "SOURCE_LINKED_BACKGROUND" | "NOT_AVAILABLE";
  limitation: string;
}>;
export type TourismBrief = Readonly<{
  schemaVersion: 1;
  areaId: string;
  areaTitle: string;
  vicinity: string;
  persona: TravelPersona;
  budgetCeilingZar: number | null;
  agents: readonly ConciergeAgent[];
  distinctSourceCount: number;
  priceStatus: "NO_VERIFIED_PRICES";
}>;

// Exact-area lookups are O(1) on average. A six-character geohash does
// NOT guarantee a correct nearby-area lookup: adjacent cells and a geodesic
// radius check are necessary for proximity.
const areaById = new Map<string, RoadsideStory>(
  DRIVE_AREA_STORIES.map((area) => [area.id, area]),
);
const geohashAlphabet = "0123456789bcdefghjkmnpqrstuvwxyz";
export function geohash6(latitude: number, longitude: number): string {
  if (
    !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
    !Number.isFinite(longitude) || longitude < -180 || longitude > 180
  ) throw new RangeError("INVALID_COORDINATES");
  const lat = [-90, 90], lon = [-180, 180];
  let text = "", bits = 0, used = 0, longitudeBit = true;
  while (text.length < 6) {
    const range = longitudeBit ? lon : lat;
    const midpoint = (range[0] + range[1]) / 2;
    const value = longitudeBit ? longitude : latitude;
    const bit = value >= midpoint ? 1 : 0;
    range[bit === 1 ? 0 : 1] = midpoint;
    bits = bits * 2 + bit;
    used += 1;
    if (used === 5) {
      text += geohashAlphabet[bits];
      bits = 0;
      used = 0;
    }
    longitudeBit = !longitudeBit;
  }
  return text;
}
export function areaGeohash6(areaId: string): string | null {
  const area = areaById.get(areaId);
  return area ? geohash6(area.latitude, area.longitude) : null;
}

function safeHttps(url: string): boolean {
  try { return new URL(url).protocol === "https:"; } catch { return false; }
}
function findingsFor(
  story: RoadsideStory,
  categories: readonly DriveAreaCategory[],
): readonly SourceFinding[] {
  const findings: SourceFinding[] = [];
  for (const category of categories) {
    for (const topic of story.topics) {
      if (topic.category !== category) continue;
      const source = story.sources[topic.source];
      if (!source || !safeHttps(source.url) || !source.label.trim()) continue;
      findings.push(Object.freeze({
        category: topic.category,
        text: topic.fact,
        sourceLabel: source.label,
        sourceUrl: source.url,
      }));
    }
  }
  return Object.freeze(findings);
}
function agent(
  id: ConciergeAgentId,
  title: string,
  story: RoadsideStory,
  categories: readonly DriveAreaCategory[],
  limitation: string,
): ConciergeAgent {
  const findings = findingsFor(story, categories);
  return Object.freeze({
    id, title, findings,
    status: findings.length ? "SOURCE_LINKED_BACKGROUND" as const : "NOT_AVAILABLE" as const,
    limitation,
  });
}
const order: Record<TravelPersona, readonly ConciergeAgentId[]> = {
  HERITAGE_ROOTS: ["heritage", "eco", "local", "safety"],
  ECO_SAFARI: ["eco", "safety", "heritage", "local"],
  FAMILY_EXPLORER: ["safety", "heritage", "eco", "local"],
  TOWNSHIP_CULINARY: ["local", "heritage", "eco", "safety"],
  LUXURY_WELLNESS: ["safety", "local", "heritage", "eco"],
};

export function synthesizeLocalConcierge(
  areaId: string,
  persona: TravelPersona,
  budgetCeilingZar: number | null,
): TourismBrief | null {
  if (!(Object.prototype.hasOwnProperty.call(order, persona))) throw new RangeError("INVALID_TRAVEL_PERSONA");
  if (budgetCeilingZar !== null &&
      (!Number.isFinite(budgetCeilingZar) || budgetCeilingZar <= 0 ||
        budgetCeilingZar > 10000000 ||
        Math.abs(Math.round(budgetCeilingZar * 100) - budgetCeilingZar * 100) > 0.000001))
    throw new RangeError("INVALID_BUDGET");
  const story = areaById.get(areaId);
  if (!story) return null; // Never hallucinate an unreviewed corridor.
  const lenses: Record<ConciergeAgentId, ConciergeAgent> = {
    heritage: agent("heritage", "Heritage & anthropology", story,
      ["History", "Culture & languages", "Did you know?"],
      "Regional history is source-linked editorial context, not a live guided tour."),
    eco: agent("eco", "Biodiversity & eco-safari", story,
      ["Fauna & flora", "Geography"],
      "Wildlife sightings, seasonal conditions and entry availability cannot be promised."),
    local: agent("local", "Local economy & culinary discovery", story,
      ["Natural wealth", "Culture & languages"],
      "Regional context only. No individual business, rating, opening time or food venue is verified here."),
    safety: agent("safety", "Route, weather & safety", story,
      ["Geography", "Did you know?"],
      "No live traffic, weather, detours, emergency-service verification or turn-by-turn guidance."),
  };
  const agents = Object.freeze(order[persona].map((key) => lenses[key]));
  const distinctSourceCount = new Set(
    agents.flatMap((entry) => entry.findings.map((finding) => finding.sourceUrl)),
  ).size;
  return Object.freeze({
    schemaVersion: 1 as const,
    areaId: story.id, areaTitle: story.title, vicinity: story.vicinity,
    persona, budgetCeilingZar, agents, distinctSourceCount,
    priceStatus: "NO_VERIFIED_PRICES" as const,
  });
}

export type CostedStop = Readonly<{
  id: string;
  estimatedCostZar: number | null;
  priceEvidenceUrl?: string;
}>;
export type BudgetSelection = Readonly<{
  selectedIds: readonly string[];
  overBudgetIds: readonly string[];
  unpricedIds: readonly string[];
  totalKnownZar: number;
}>;
// Available only for future source-verified stops. Costs with no evidence are
// unknown, NOT free. Budgeting is cumulative and uses integer cents.
export function selectStopsWithinBudget(
  stops: readonly CostedStop[],
  ceilingZar: number,
): BudgetSelection {
  if (!Number.isFinite(ceilingZar) || ceilingZar < 0 ||
      ceilingZar > 10000000) throw new RangeError("INVALID_BUDGET");
  if (stops.length > 200) throw new RangeError("TOO_MANY_STOPS");
  const ceilingCents = Math.round(ceilingZar * 100);
  const selectedIds: string[] = [], overBudgetIds: string[] = [], unpricedIds: string[] = [];
  const seen = new Set<string>();
  let totalCents = 0;
  for (const stop of stops) {
    if (!stop.id || seen.has(stop.id)) throw new RangeError("INVALID_STOP_ID");
    seen.add(stop.id);
    const amount = stop.estimatedCostZar;
    if (amount === null || !stop.priceEvidenceUrl) {
      unpricedIds.push(stop.id);
      continue;
    }
    const cents = Math.round(amount * 100);
    if (!Number.isFinite(amount) || amount < 0 || amount > 10000000 ||
        (!Number.isSafeInteger(cents) || Math.abs(cents - amount * 100) > 0.000001)) throw new RangeError("INVALID_STOP_COST");
    if (!safeHttps(stop.priceEvidenceUrl)) {
      unpricedIds.push(stop.id); // An unsafe price source cannot establish a price.
      continue;
    }
    if (totalCents + cents > ceilingCents) overBudgetIds.push(stop.id);
    else { totalCents += cents; selectedIds.push(stop.id); }
  }
  return Object.freeze({
    selectedIds, overBudgetIds, unpricedIds,
    totalKnownZar: totalCents / 100,
  });
}

// Content digest only. It is NOT a signature, proof of factual accuracy,
// proof of origin, or tamper-proof storage. No account/GPS data is included.
export async function tourismContentSha256(brief: TourismBrief): Promise<string | null> {
  if (!globalThis.crypto?.subtle) return null;
  const data = new TextEncoder().encode(JSON.stringify(brief));
  try {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0")).join("");
  } catch { return null; }
}

export type ConciergeRole = "unselected" | "passenger" | "stopped";
export function canRequestTourismBrief(role: ConciergeRole, gpsActive: boolean, speedKmh: number | null): boolean {
  if (role === "passenger") return true;
  if (role !== "stopped") return false;
  if (!gpsActive) return true; // Self-attested parking; never guaranteed by GPS.
  return speedKmh !== null && Number.isFinite(speedKmh) && speedKmh >= 0 && speedKmh < 5;
}
