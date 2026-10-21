import { describe, expect, it } from "vitest";
import { pendulumTrajectory } from "./pendulumTrajectory";
const defaults = { lengthM: 1, gravityMs2: 9.80665, massKg: 1, initialAngleRadians: 0.2, durationSeconds: 10, stepSeconds: 0.01 };
describe("4D pendulum reference trajectory", () => {
  it("generates deterministic frames with monotonically increasing time", () => {
    const a = pendulumTrajectory(defaults);
    expect(a).toEqual(pendulumTrajectory(defaults));
    expect(a).toHaveLength(1001);
    expect(a[0].timeSeconds).toBe(0);
    expect(a[1000].timeSeconds).toBe(10);
  });
  it("has bounded energy drift for the specified RK4 step size", () => {
    const frames = pendulumTrajectory(defaults);
    const baseline = frames[0].totalJoules;
    expect(Math.max(...frames.map(f => Math.abs(f.totalJoules - baseline)))).toBeLessThan(0.001);
  });
  it("rejects nonfinite and unbounded workloads", () => {
    expect(() => pendulumTrajectory({ ...defaults, stepSeconds: 0 })).toThrow(RangeError);
    expect(() => pendulumTrajectory({ ...defaults, durationSeconds: 1000 })).toThrow(RangeError);
  });
});
