import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  TOURISM_PERSONAS, areaGeohash6, geohash6, canRequestTourismBrief,
  selectStopsWithinBudget, synthesizeLocalConcierge,
  tourismContentSha256,
} from "../src/features/drive/tourism-swarm";
import { DRIVE_AREA_STORIES } from "../src/features/drive/roadside-stories";

describe("Luqi-Drive source-linked four-lens concierge", () => {
  it("assembles four independent, original-source-linked local briefs without invented prices", () => {
    for (const story of DRIVE_AREA_STORIES) {
      for (const persona of TOURISM_PERSONAS) {
        const brief = synthesizeLocalConcierge(story.id, persona.id, 350);
        expect(brief).not.toBeNull();
        expect(brief!.agents).toHaveLength(4);
        expect(new Set(brief!.agents.map((agent) => agent.id)).size).toBe(4);
        expect(brief!.areaId).toBe(story.id);
        expect(brief!.priceStatus).toBe("NO_VERIFIED_PRICES");
        for (const agent of brief!.agents) {
          for (const finding of agent.findings) {
            expect(story.sources.some((s) => s.url === finding.sourceUrl && s.label === finding.sourceLabel)).toBe(true);
            expect(story.topics.some((t) => t.fact === finding.text)).toBe(true);
          }
        }
      }
    }
    expect(synthesizeLocalConcierge("nonexistent", "HERITAGE_ROOTS", null)).toBeNull();
  });

  it("changes lens priority by travel persona without altering source facts", () => {
    expect(synthesizeLocalConcierge("n1-waterberg", "ECO_SAFARI", null)?.agents[0].id).toBe("eco");
    expect(synthesizeLocalConcierge("n1-waterberg", "TOWNSHIP_CULINARY", null)?.agents[0].id).toBe("local");
    expect(synthesizeLocalConcierge("n1-waterberg", "FAMILY_EXPLORER", null)?.agents[0].id).toBe("safety");
    expect(synthesizeLocalConcierge("n1-waterberg", "LUXURY_WELLNESS", null)?.agents[0].limitation).toMatch(/No live traffic/);
  });

  it("refuses invalid personas, budgets and exact-area requests without fallback facts", () => {
    for (const amount of [-1, 0, Infinity, NaN, 10000001, 1.001]) {
      expect(() => synthesizeLocalConcierge("n1-waterberg", "HERITAGE_ROOTS", amount)).toThrow();
    }
    expect(() => synthesizeLocalConcierge("n1-waterberg", "WRONG" as never, null)).toThrow();
  });

  it("never treats two individually affordable stops as jointly affordable, or missing evidence as zero", () => {
    const selection = selectStopsWithinBudget([
      { id: "a", estimatedCostZar: 400, priceEvidenceUrl: "https://example.org/a" },
      { id: "b", estimatedCostZar: 400, priceEvidenceUrl: "https://example.org/b" },
      { id: "c", estimatedCostZar: 0, priceEvidenceUrl: "https://example.org/c" },
      { id: "d", estimatedCostZar: 10 },
      { id: "e", estimatedCostZar: null },
      { id: "f", estimatedCostZar: 10, priceEvidenceUrl: "javascript:bad" },
    ], 500);
    expect(selection.selectedIds).toEqual(["a", "c"]);
    expect(selection.overBudgetIds).toEqual(["b"]);
    expect(selection.unpricedIds).toEqual(["d", "e", "f"]);
    expect(selection.totalKnownZar).toBe(400);
    expect(() => selectStopsWithinBudget([{ id:"a", estimatedCostZar: NaN, priceEvidenceUrl: "https://example.org" }], 500)).toThrow();
    expect(() => selectStopsWithinBudget([{ id:"a", estimatedCostZar: 1 }, { id:"a", estimatedCostZar: 1 }], 500)).toThrow();
  });

  it("produces stable six-character geohashes but does not mistake them for radius membership", () => {
    expect(geohash6(42.6, -5.6)).toBe("ezs42e");
    expect(geohash6(-24.7, 28.41)).toHaveLength(6);
    expect(areaGeohash6("n1-waterberg")).toBe(geohash6(-24.7, 28.41));
    expect(areaGeohash6("unknown")).toBeNull();
    expect(() => geohash6(91, 20)).toThrow();
    expect(() => geohash6(0, NaN)).toThrow();
  });

  it("hashes only deterministic editorial output; no network request, private location or identity", async () => {
    const brief = synthesizeLocalConcierge("n3-howick", "HERITAGE_ROOTS", 500)!;
    expect(JSON.stringify(brief)).not.toMatch(/(latitude|longitude|phone|account|email)/i);
    const first = await tourismContentSha256(brief);
    const second = await tourismContentSha256(brief);
    expect(first).toBe(second);
    if (first !== null) expect(first).toMatch(/^[0-9a-f]{64}$/);
  });

  it("prevents moving drivers using stale parked selection", () => {
    expect(canRequestTourismBrief("unselected", false, null)).toBe(false);
    expect(canRequestTourismBrief("stopped", true, 108)).toBe(false);
    expect(canRequestTourismBrief("stopped", true, 5)).toBe(false);
    expect(canRequestTourismBrief("stopped", true, null)).toBe(false);
    expect(canRequestTourismBrief("stopped", true, 0)).toBe(true);
    expect(canRequestTourismBrief("stopped", false, null)).toBe(true);
    expect(canRequestTourismBrief("passenger", true, 108)).toBe(true);
  });

  it("keeps root and app public engine mirrors byte-identical", () => {
    expect(readFileSync("src/features/drive/TourismConcierge.tsx", "utf8"))
      .toBe(readFileSync("app/src/features/drive/TourismConcierge.tsx", "utf8"));
    expect(readFileSync("src/features/drive/tourism-concierge.css", "utf8"))
      .toBe(readFileSync("app/src/features/drive/tourism-concierge.css", "utf8"));
    expect(readFileSync("src/features/drive/LuqiDrivePage.tsx", "utf8"))
      .toBe(readFileSync("app/src/features/drive/LuqiDrivePage.tsx", "utf8"));
    expect(readFileSync("src/features/drive/tourism-swarm.ts", "utf8"))
      .toBe(readFileSync("app/src/features/drive/tourism-swarm.ts", "utf8"));
  });
});
