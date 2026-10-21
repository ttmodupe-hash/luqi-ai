import { describe, expect, it } from "vitest";
import { createToonProductionPlan, validateToonProductionPlan } from "./productionPlan";

const input = { title: "Solar microgrid safety", purpose: "training" as const, targetAudience: "Technician trainees", learningObjectives: ["Identify components", "Demonstrate safe isolation"], durationSeconds: 420 };

describe("LUQIToons seven-minute production planning", () => {
  it("plans exactly seven minutes in contiguous bounded scenes", () => {
    const plan = createToonProductionPlan(input);
    expect(plan.scenes).toHaveLength(42);
    expect(plan.scenes.at(-1)?.endSeconds).toBe(420);
    expect(validateToonProductionPlan(plan)).toEqual([]);
    expect(plan.requiresFactualReview).toBe(true);
  });
  it("handles final partial scenes without extending the finished video", () => {
    const plan = createToonProductionPlan({ ...input, durationSeconds: 23 });
    expect(plan.scenes.map(s => s.durationSeconds)).toEqual([10, 10, 3]);
  });
  it("rejects overlength and unsafe training plans", () => {
    expect(() => createToonProductionPlan({ ...input, durationSeconds: 421 })).toThrow(RangeError);
    expect(() => createToonProductionPlan({ ...input, learningObjectives: [] })).toThrow(RangeError);
    expect(() => createToonProductionPlan({ ...input, sceneDurationSeconds: 16 })).toThrow(RangeError);
  });
  it("detects gaps or overlaps introduced by editing", () => {
    const plan = createToonProductionPlan({ ...input, durationSeconds: 20 });
    plan.scenes[1].startSeconds = 12;
    expect(validateToonProductionPlan(plan)).not.toEqual([]);
  });
});
