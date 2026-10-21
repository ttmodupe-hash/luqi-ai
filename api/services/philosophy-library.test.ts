import { describe, expect, it } from "vitest";
import { PHILOSOPHY_LIBRARY, philosophyGuidance } from "./philosophy-library";
import { buildLearningSystemInstruction } from "./learning-values";

describe("pluralistic philosophy library", () => {
  it("keeps entries unique and includes African and global traditions", () => {
    expect(new Set(PHILOSOPHY_LIBRARY.map((item) => item.id)).size).toBe(PHILOSOPHY_LIBRARY.length);
    expect(PHILOSOPHY_LIBRARY.some((item) => item.id === "ubuntu")).toBe(true);
    expect(PHILOSOPHY_LIBRARY.some((item) => item.id === "scientific-inquiry")).toBe(true);
  });
  it("only includes requested lenses", () => {
    const guidance = philosophyGuidance(["hatata"]);
    expect(guidance).toContain("hatata");
    expect(guidance).not.toContain("confucian-cultivation");
  });
  it("integrates guidance without imposing doctrine", () => {
    const instruction = buildLearningSystemInstruction("guided");
    expect(instruction).toContain("CROSS-CULTURAL EDUCATIONAL LENSES");
    expect(instruction).toContain("Never impose religious");
  });
});
