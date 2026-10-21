/** Deterministic, unit-aware reference calculations for LUQI STEM labs.
 * These are educational reference models, not replacements for the existing simulations.
 */
export function pendulumSmallAnglePeriod(lengthM: number, gravityMs2 = 9.80665): number {
  if (!Number.isFinite(lengthM) || !Number.isFinite(gravityMs2) || lengthM <= 0 || gravityMs2 <= 0) {
    throw new RangeError("Length and gravity must be finite positive numbers");
  }
  return 2 * Math.PI * Math.sqrt(lengthM / gravityMs2);
}

export function michaelisMentenRate(
  substrateConcentration: number,
  vmax: number,
  km: number,
): number {
  if (![substrateConcentration, vmax, km].every(Number.isFinite) ||
      substrateConcentration < 0 || vmax < 0 || km <= 0) {
    throw new RangeError("Concentrations and Vmax must be nonnegative; Km must be positive");
  }
  return (vmax * substrateConcentration) / (km + substrateConcentration);
}

/** Equivalence volume for a monoprotic acid and monovalent base, in liters. */
export function monoproticEquivalenceVolume(
  acidConcentrationMolL: number,
  acidVolumeL: number,
  baseConcentrationMolL: number,
): number {
  if (![acidConcentrationMolL, acidVolumeL, baseConcentrationMolL].every(Number.isFinite) ||
      acidConcentrationMolL < 0 || acidVolumeL < 0 || baseConcentrationMolL <= 0) {
    throw new RangeError("Concentrations and volumes must be valid nonnegative quantities");
  }
  return acidConcentrationMolL * acidVolumeL / baseConcentrationMolL;
}

/** Numerical derivative for smooth functions; use an appropriate step size. */
export function centralDifference(f: (x: number) => number, x: number, step = 1e-5): number {
  if (![x, step].every(Number.isFinite) || step <= 0) throw new RangeError("Invalid derivative parameters");
  return (f(x + step) - f(x - step)) / (2 * step);
}

/** Volume of a right circular cylinder in cubic meters. */
export function cylinderVolume(radiusM: number, heightM: number): number {
  if (![radiusM, heightM].every(Number.isFinite) || radiusM < 0 || heightM < 0) {
    throw new RangeError("Radius and height must be finite nonnegative numbers");
  }
  return Math.PI * radiusM ** 2 * heightM;
}
