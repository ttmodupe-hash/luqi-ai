import { describe, expect, it } from "vitest";
import { evaluateReviewedSimulation } from "./reviewedSimulations";

describe("reviewed education calculations (no evaluated JS)", () => {
  it("uses bounded counting examples", () => {
    expect(evaluateReviewedSimulation("pre-counting-baobab", 9)).toContain("9 fruits");
    expect(evaluateReviewedSimulation("pre-counting-baobab", 99)).toContain("10 fruits");
  });
  it("computes solar examples without paid vendors", () => {
    expect(evaluateReviewedSimulation("primary-solar-rooftop", 8)).toContain("17.60 kWh");
  });
  it("computes the reviewed projectile equation", () => {
    expect(evaluateReviewedSimulation("high-projectile-kinematics", 9.81)).toContain("9.81 m");
  });
  it("does not execute arbitrary unreviewed scripts", () => {
    expect(evaluateReviewedSimulation("unknown-generated-identifier", 12)).toContain("disabled for safety");
    expect(evaluateReviewedSimulation("pre-counting-baobab", Infinity)).toContain("finite number");
  });
});
