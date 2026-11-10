/** Runs only generated, bounded numeric fixtures. Never executes pasted source. */
export interface ComparisonResult {
  size: number;
  matches: number;
  pairComparisons: number;
  setBuilds: number;
  setLookups: number;
  pairMilliseconds: number;
  setMilliseconds: number;
  sameResults: true;
  scope: "generated-membership-reference";
}
export function compareMembership(size: unknown): ComparisonResult {
  if (!Number.isInteger(size) || Number(size) < 10 || Number(size) > 3000)
    throw Error("INVALID_COMPARISON_SIZE");
  const count = Number(size),
    left = Uint32Array.from({ length: count }, (_, i) => i * 2),
    right = Uint32Array.from({ length: count }, (_, i) => i);
  const nested: number[] = [];
  let pairComparisons = 0;
  const before = performance.now();
  for (const value of left) {
    for (const candidate of right) {
      pairComparisons++;
      if (value === candidate) {
        nested.push(value);
        break;
      }
    }
  }
  const after = performance.now();
  const index = new Set(right),
    indexed: number[] = [];
  for (const value of left) if (index.has(value)) indexed.push(value);
  const end = performance.now();
  if (
    nested.length !== indexed.length ||
    nested.some((value, i) => value !== indexed[i])
  )
    throw Error("REFERENCE_MISMATCH");
  return {
    size: count,
    matches: nested.length,
    pairComparisons,
    setBuilds: count,
    setLookups: count,
    pairMilliseconds: Math.max(0, after - before),
    setMilliseconds: Math.max(0, end - after),
    sameResults: true,
    scope: "generated-membership-reference",
  };
}
export function checkedComparison(v: unknown): v is ComparisonResult {
  if (!v || typeof v !== "object") return false;
  const x = v as ComparisonResult;
  return (
    Object.keys(x).sort().join(",") ===
      "matches,pairComparisons,pairMilliseconds,sameResults,scope,setBuilds,setLookups,setMilliseconds,size" &&
    Number.isInteger(x.size) &&
    x.size >= 10 &&
    x.size <= 3000 &&
    x.matches === Math.ceil(x.size / 2) &&
    Number.isSafeInteger(x.pairComparisons) &&
    x.pairComparisons >= x.size &&
    x.pairComparisons <= x.size * x.size &&
    x.setBuilds === x.size &&
    x.setLookups === x.size &&
    [x.pairMilliseconds, x.setMilliseconds].every(
      (n) => typeof n === "number" && Number.isFinite(n) && n >= 0,
    ) &&
    x.sameResults === true &&
    x.scope === "generated-membership-reference"
  );
}
