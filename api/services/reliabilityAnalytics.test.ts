import { describe, expect, it } from "vitest";
import { countIncidentTrend, summarizeMetricSamples } from "./reliabilityAnalytics";

describe("evidence-based reliability analysis", () => {
  it("returns insufficient data rather than fabricated health or averages", () => {
    expect(summarizeMetricSamples([])).toEqual({
      samples: 0, mean: null, stdDev: null,
      slopePerHour: null, trend: "insufficient_data", anomalyIndices: [],
    });
  });

  it("detects a measured upward trend from real timestamps", () => {
    const start = 1_700_000_000_000;
    const result = summarizeMetricSamples([
      { at: start, value: 10 },
      { at: start + 3_600_000, value: 20 },
      { at: start + 7_200_000, value: 30 },
    ]);
    expect(result.samples).toBe(3);
    expect(result.mean).toBe(20);
    expect(result.trend).toBe("rising");
    expect(result.slopePerHour).toBeCloseTo(10);
  });

  it("flags a policy threshold breach without claiming an automatic repair", () => {
    const start = 1_700_000_000_000;
    const analysis = summarizeMetricSamples([
      { at: start, value: 4, threshold: 50 },
      { at: start + 1_000, value: 99, threshold: 50 },
    ]);
    expect(analysis.anomalyIndices).toEqual([1]);
  });

  it("ignores invalid samples instead of counting them as operational evidence", () => {
    const result = summarizeMetricSamples([
      { at: Date.now(), value: NaN },
      { at: Date.now(), value: Infinity },
    ]);
    expect(result.samples).toBe(0);
    expect(result.mean).toBeNull();
  });

  it("never fabricates statistical forecasts or calibrated confidence", () => {
    expect(countIncidentTrend(5, 3)).toMatchObject({
      currentHourlyRate: 5,
      predictedNextHour: 5,
      predictedNext24h: 120,
      trend: "rising",
      confidence: 0,
      model: "persistence_baseline_not_predictive",
    });
    expect(countIncidentTrend(0, 0).trend).toBe("stable");
  });
});
