/** Deterministic time-dependent reference models, separate from the existing labs. */
export interface KineticsFrame { timeSeconds: number; substrate: number; product: number; rate: number }
export function enzymeProgress(initialSubstrate: number, vmax: number, km: number, duration = 60, step = 0.1): KineticsFrame[] {
  if (![initialSubstrate, vmax, km, duration, step].every(Number.isFinite) || initialSubstrate < 0 || vmax < 0 || km <= 0 || duration <= 0 || duration > 3600 || step <= 0 || step > 10 || duration / step > 12000) throw new RangeError("Invalid enzyme parameters");
  let substrate = initialSubstrate;
  const frames: KineticsFrame[] = [];
  const rate = (s: number) => vmax * s / (km + s);
  const count = Math.ceil(duration / step);
  for (let i = 0; i <= count; i++) {
    const time = Math.min(duration, i * step);
    frames.push({ timeSeconds: time, substrate, product: Math.max(0, initialSubstrate - substrate), rate: rate(substrate) });
    if (i === count) break;
    const dt = Math.min(step, duration - time);
    const k1 = -rate(substrate);
    const k2 = -rate(Math.max(0, substrate + dt * k1 / 2));
    const k3 = -rate(Math.max(0, substrate + dt * k2 / 2));
    const k4 = -rate(Math.max(0, substrate + dt * k3));
    substrate = Math.max(0, substrate + dt * (k1 + 2 * k2 + 2 * k3 + k4) / 6);
  }
  return frames;
}

export interface TitrationFrame { timeSeconds: number; baseVolumeL: number; fractionToEquivalence: number; excessBaseMol: number }
export function titrationProgress(acidMolL: number, acidVolumeL: number, baseMolL: number, flowLPerSecond: number, duration = 60, step = 0.1): TitrationFrame[] {
  if (![acidMolL, acidVolumeL, baseMolL, flowLPerSecond, duration, step].every(Number.isFinite) || acidMolL <= 0 || acidVolumeL <= 0 || baseMolL <= 0 || flowLPerSecond < 0 || duration <= 0 || duration > 3600 || step <= 0 || step > 10 || duration / step > 12000) throw new RangeError("Invalid titration parameters");
  const equivalenceVolumeL = acidMolL * acidVolumeL / baseMolL;
  return Array.from({ length: Math.ceil(duration / step) + 1 }, (_, i) => {
    const timeSeconds = Math.min(duration, i * step);
    const baseVolumeL = flowLPerSecond * timeSeconds;
    return { timeSeconds, baseVolumeL, fractionToEquivalence: baseVolumeL / equivalenceVolumeL, excessBaseMol: baseMolL * baseVolumeL - acidMolL * acidVolumeL };
  });
}
