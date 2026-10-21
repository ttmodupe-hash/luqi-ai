import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { omegaKnowledgeRouter } from "../omega-knowledge";
import {
  getOmegaArchiveDetail, listOmegaArchive, omegaArchiveOverview,
  traditionalKnowledgeNote,
} from "./omegaKnowledge";

describe("OMEGA educational archives imported into LUQI", () => {
  const anonymous = omegaKnowledgeRouter.createCaller({
    req: new Request("https://luqi-ai.com/api/trpc/omegaKnowledge"),
    user: null,
  });

  it("preserves the full versioned, public 49-entry bibliography", async () => {
    const overview = await anonymous.overview();
    expect(overview.entryCount).toBe(49);
    expect(overview.archives.map((a) => [a.kind, a.count])).toEqual([
      ["history", 29], ["heritage", 14], ["iks", 6],
    ]);
    expect(overview.sourceRepository).toBe("https://github.com/ttmodupe-hash/omega-super-ai");
    expect(overview.license).toContain("MIT");
    for (const kind of ["history", "heritage", "iks"] as const) {
      const { entries, total } = await anonymous.list({ archive: kind, limit: 50 });
      expect(entries).toHaveLength(total);
      for (const item of entries) {
        expect(item.referenceCount).toBeGreaterThanOrEqual(2);
        expect((await anonymous.detail({ archive: kind, id: item.id })).references.length)
          .toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("includes scholarly notes and does not flatten heritage into a single tradition", () => {
    const entry = getOmegaArchiveDetail("heritage", "ethiopian-canon-81");
    expect(entry?.topic).toBe("ethiopian_canon");
    expect(entry?.scholarlyNote).toContain("enumeration");
    expect(entry?.references.length).toBeGreaterThanOrEqual(2);
    expect(entry?.editorialNote).toContain("not been independently verified");
  });

  it("keeps Indigenous Knowledge Systems cautions attached to every result", async () => {
    const index = await anonymous.list({ archive: "iks", limit: 50 });
    expect(index.total).toBe(6);
    for (const summary of index.entries) {
      const detail = await anonymous.detail({ archive: "iks", id: summary.id });
      expect(detail.caution?.length).toBeGreaterThan(0);
      expect(detail.researchNote).toBeTruthy();
      expect(detail.traditionalKnowledgeNote).toBe(traditionalKnowledgeNote);
      expect(detail.references.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("finds African history and IKS by title, topic and vernacular words", async () => {
    const nile = await anonymous.list({ archive: "history", query: "Kush", limit: 50 });
    expect(nile.entries.some((e) => e.id === "kush-meroe")).toBe(true);
    const lengana = await anonymous.list({ archive: "iks", query: "lengana", limit: 50 });
    expect(lengana.entries.some((e) => e.id === "lengana-artemisia-afra")).toBe(true);
    const unmatched = listOmegaArchive({ query: "xx_q_unfindable_veryrare" });
    expect(unmatched.total).toBe(0);
  });

  it("paginates consistently and sorts the historical timeline by BCE/CE", async () => {
    const first = await anonymous.list({ archive: "history", limit: 8, offset: 0, timeline: true });
    const second = await anonymous.list({ archive: "history", limit: 8, offset: 8, timeline: true });
    expect(first.entries).toHaveLength(8);
    expect(new Set([...first.entries, ...second.entries].map((e) => e.id)).size).toBe(16);
    const years = first.entries.map((e) => e.year ?? 9999);
    expect(years).toEqual([...years].sort((a, b) => a - b));
  });

  it("rejects arbitrary IDs and oversized queries without changing any data", async () => {
    await expect(anonymous.detail({ archive: "history", id: "not-a-real-entry" }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(anonymous.list({ query: "a".repeat(161) })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    await expect(anonymous.list({ limit: 5000 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("never implies live web verification, artificial intelligence, or clinical advice", () => {
    const overview = omegaArchiveOverview();
    expect(overview.editorialNote).toContain("not been independently verified");
    expect(traditionalKnowledgeNote).toContain("never individual medical advice");
    expect(getOmegaArchiveDetail("history", "unknown-id")).toBeNull();
  });
});
