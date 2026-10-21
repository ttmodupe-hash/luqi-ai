/**
 * Deterministic reliability analytics. No LLM inference, fabricated incidents,
 * or unverifiable "AI repaired production" conclusions.
 */
export function summarizeMetricSamples(
  samples: ReadonlyArray<{ value: number; at: number; threshold?: number | null }>,
) {
  const valid = samples.filter((point) => Number.isFinite(point.value) && Number.isFinite(point.at))
    .sort((a, b) => a.at - b.at);
  const n = valid.length;
  if (!n) return {
    samples: 0, mean: null as number | null,
    stdDev: null as number | null,
    slopePerHour: null as number | null,
    trend: "insufficient_data" as const,
    anomalyIndices: [] as number[],
  };
  const mean = valid.reduce((sum, p) => sum + p.value, 0) / n;
  const variance = valid.reduce((sum, p) => sum + (p.value - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  const start = valid[0].at;
  const hours = valid.map((p) => (p.at - start) / 3_600_000);
  const avgX = hours.reduce((sum, x) => sum + x, 0) / n;
  const denominator = hours.reduce((sum, x) => sum + (x - avgX) ** 2, 0);
  const slopePerHour = n < 3 || denominator === 0 ? null :
    hours.reduce((sum, x, i) => sum + (x - avgX) * (valid[i].value - mean), 0) / denominator;
  const anomalyIndices = valid.flatMap((point, i) => {
    const exceedsThreshold = point.threshold != null && point.value > point.threshold;
    const statisticalOutlier = n >= 5 && stdDev > 0 &&
      Math.abs(point.value - mean) / stdDev > 2;
    return exceedsThreshold || statisticalOutlier ? [i] : [];
  });
  const noise = Math.max(stdDev * 0.1, Math.abs(mean) * 0.01, 0.000001);
  const trend: "rising" | "falling" | "stable" | "insufficient_data" = slopePerHour === null
    ? "insufficient_data"
    : slopePerHour > noise ? "rising" : slopePerHour < -noise ? "falling" : "stable";
  return { samples: n, mean, stdDev, slopePerHour, trend, anomalyIndices };
}

export function countIncidentTrend(currentHour: number, previousHour: number) {
  const current = Math.max(0, Math.floor(currentHour));
  const previous = Math.max(0, Math.floor(previousHour));
  const trend = current > previous ? "rising" : current < previous ? "falling" : "stable";
  return {
    currentHourlyRate: current,
    predictedNextHour: current, // persistence baseline only, not an ML forecast
    predictedNext24h: current * 24,
    trend,
    confidence: 0,
    model: "persistence_baseline_not_predictive",
    comparison: { previousHour: previous },
  };
}
