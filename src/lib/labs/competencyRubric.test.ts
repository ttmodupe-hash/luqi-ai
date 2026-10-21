import { describe, expect, it } from "vitest";
import { evaluatePracticeEvidence } from "./competencyRubric";

describe("LUQI lab practice rubric", () => {
  it("does not award completion for empty evidence", () => {
    expect(evaluatePracticeEvidence({ prediction: "", reflection: "", resultCalculated: false, parameterChanged: false })).toMatchObject({ score: 0, status: "incomplete" });
  });
  it("awards practice completion only when all four activities are present", () => {
    const result = evaluatePracticeEvidence({ prediction: "I predict the output increases.", reflection: "I changed the input and compared results.", resultCalculated: true, parameterChanged: true });
    expect(result.score).toBe(4);
    expect(result.status).toBe("practice-complete");
  });
  it("requires parameter exploration even when writing is complete", () => {
    expect(evaluatePracticeEvidence({ prediction: "This is a reasoned prediction.", reflection: "This is a sufficiently detailed reflection.", resultCalculated: true, parameterChanged: false }).score).toBe(3);
  });
});
