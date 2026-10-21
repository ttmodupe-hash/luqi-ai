import { describe, expect, it } from "vitest";
import { enzymeProgress, titrationProgress } from "./timeDependentModels";
describe("time-dependent educational models", () => {
  it("conserves total substrate plus product within numerical precision", () => {
    const frames = enzymeProgress(10, 0.1, 2, 20, 0.1);
    expect(frames.length).toBe(201);
    for (const frame of frames) expect(frame.substrate + frame.product).toBeCloseTo(10, 9);
    expect(frames.at(-1)!.substrate).toBeLessThan(10);
  });
  it("models equivalence crossing at the correct volume", () => {
    const frames = titrationProgress(0.1, 0.025, 0.1, 0.0005, 60, 1);
    expect(frames[50].fractionToEquivalence).toBeCloseTo(1);
    expect(frames[50].excessBaseMol).toBeCloseTo(0);
  });
  it("rejects invalid and unbounded workloads", () => {
    expect(() => enzymeProgress(1, 1, 0)).toThrow(RangeError);
    expect(() => titrationProgress(0.1, 0.025, 0.1, 0.001, 60, 0.00001)).toThrow(RangeError);
  });
});
