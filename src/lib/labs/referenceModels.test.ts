import { describe, expect, it } from "vitest";
import { pendulumSmallAnglePeriod, michaelisMentenRate, monoproticEquivalenceVolume, centralDifference, cylinderVolume } from "./referenceModels";

describe("LUQI scientific reference fixtures", () => {
  it("physics: 1 m pendulum period is about 2.006 s in small-angle regime", () => {
    expect(pendulumSmallAnglePeriod(1)).toBeCloseTo(2.006, 2);
    expect(() => pendulumSmallAnglePeriod(-1)).toThrow(RangeError);
  });
  it("biology: Michaelis-Menten is half Vmax at Km and approaches Vmax", () => {
    expect(michaelisMentenRate(2, 10, 2)).toBe(5);
    expect(michaelisMentenRate(1e9, 10, 2)).toBeCloseTo(10, 6);
    expect(() => michaelisMentenRate(-1, 10, 2)).toThrow(RangeError);
  });
  it("chemistry: 25 mL 0.1 M acid requires 25 mL 0.1 M base", () => {
    expect(monoproticEquivalenceVolume(0.1, 0.025, 0.1)).toBeCloseTo(0.025, 10);
  });
  it("algebra: numerical derivative of x squared at 3 is 6", () => {
    expect(centralDifference(x => x * x, 3)).toBeCloseTo(6, 5);
  });
  it("geometry: cylinder volume follows pi r squared h", () => {
    expect(cylinderVolume(2, 3)).toBeCloseTo(12 * Math.PI, 10);
  });
});
