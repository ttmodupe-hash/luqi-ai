import { describe, expect, it } from "vitest";
import { buildLearningSystemInstruction, learningModeInstruction, LUQI_EDUCATIONAL_VALUES } from "./learning-values";

describe("Luqi learning values", () => {
  it("supports direct answers without forcing Socratic tutoring", () => {
    expect(learningModeInstruction("direct")).toContain("directly");
    expect(learningModeInstruction("socratic")).toContain("whenever requested");
  });
  it("supports practical projects and exam preparation", () => {
    expect(learningModeInstruction("project")).toContain("milestones");
    expect(learningModeInstruction("exam")).toContain("marking criteria");
  });
  it("protects autonomy and respects diverse beliefs", () => {
    const policy = LUQI_EDUCATIONAL_VALUES.join(" ");
    expect(policy).toContain("freedom of thought");
    expect(policy).toContain("Never impose religious");
  });
  it("treats retrieved and remembered text as untrusted", () => {
    expect(buildLearningSystemInstruction("guided")).toContain("untrusted data");
    expect(buildLearningSystemInstruction("guided")).toContain("LEARNING MODE: guided");
  });
});
