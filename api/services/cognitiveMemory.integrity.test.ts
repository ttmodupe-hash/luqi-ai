import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let root = "";

async function moduleUnderTest() {
  vi.resetModules();
  return import("./cognitiveMemory");
}

const fact = {
  category: "entity" as const,
  subject: "Reviewed test article",
  predicate: "source_reference",
  object: "internal-fixture-1",
  confidence: 0.5,
  sourceTask: "controlled-test",
  agentRole: "unit-test",
};

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "luqi-memory-"));
  vi.stubEnv("CREWAI_STORAGE_DIR", root);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  fs.rmSync(root, { recursive: true, force: true });
});

describe("cognitive memory persistence and evidence integrity", () => {
  it("contains no fictional tax, pricing or verification facts at startup", async () => {
    const memory = await moduleUnderTest();
    const found = await memory.queryCognitiveMemory();
    expect(found.facts).toEqual([]);
    expect(found.entities).toEqual([]);
    expect(found.totalFacts).toBe(0);
    expect(fs.readdirSync(root)).toEqual([]);
  });

  it("stores a real user-recorded fact and rehydrates its entity after restart", async () => {
    const memory = await moduleUnderTest();
    const record = await memory.storeCognitiveFact(fact);
    expect(record.id).toMatch(/^fact_/);
    const restored = await moduleUnderTest();
    const result = await restored.queryCognitiveMemory({ category: "entity" });
    expect(result.facts).toEqual([record]);
    expect(result.entities).toEqual([
      expect.objectContaining({
        name: "Reviewed test article",
        attributes: { source_reference: "internal-fixture-1" },
      }),
    ]);
  });

  it("refuses dangerous prototype-property names", async () => {
    const memory = await moduleUnderTest();
    await expect(memory.storeCognitiveFact({ ...fact, predicate: "__proto__" })).rejects.toThrow("Invalid");
    await expect(memory.storeCognitiveFact({ ...fact, predicate: "constructor" })).rejects.toThrow("Invalid");
    expect((await memory.queryCognitiveMemory()).totalFacts).toBe(0);
  });

  it("rejects corrupted data rather than overwriting it", async () => {
    const journal = path.join(root, "unified_memory.json");
    fs.writeFileSync(journal, '{"facts":"broken"}');
    const memory = await moduleUnderTest();
    await expect(memory.queryCognitiveMemory()).rejects.toThrow("integrity check");
    await expect(memory.storeCognitiveFact(fact)).rejects.toThrow("integrity check");
    expect(fs.readFileSync(journal, "utf8")).toBe('{"facts":"broken"}');
  });

  it("rejects symbolic links instead of reading or writing through them", async () => {
    const external = path.join(root, "outside.json");
    fs.writeFileSync(external, "[]");
    fs.symlinkSync(external, path.join(root, "unified_memory.json"));
    const memory = await moduleUnderTest();
    await expect(memory.queryCognitiveMemory()).rejects.toThrow("integrity check");
    await expect(memory.storeCognitiveFact(fact)).rejects.toThrow("integrity check");
    expect(fs.readFileSync(external, "utf8")).toBe("[]");
  });

  it("does not acknowledge a fact when persistence is unavailable", async () => {
    const file = path.join(root, "not-a-directory");
    fs.writeFileSync(file, "no");
    vi.stubEnv("CREWAI_STORAGE_DIR", file);
    const memory = await moduleUnderTest();
    await expect(memory.storeCognitiveFact(fact)).rejects.toThrow();
    expect(fs.readFileSync(file, "utf8")).toBe("no");
  });
});
