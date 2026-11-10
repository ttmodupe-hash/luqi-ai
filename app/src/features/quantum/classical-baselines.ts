/** Small exact reference solvers. Results concern supplied numbers only. */
export function shortestClosedTour(costs: number[][]) {
  const n = costs.length;
  if (n < 2 || n > 7 || costs.some((row, i) => row.length !== n || row.some((value, j) =>
    !Number.isFinite(value) || value < 0 || value > 1_000_000 || (i === j && value !== 0)))) throw new Error('Use a 2–7 stop cost matrix with zero diagonal and finite nonnegative costs.');
  let minimum = Infinity, best: number[] = [], toursEvaluated = 0;
  function visit(path: number[], remaining: number[], cost: number) {
    if (!remaining.length) {
      const total = cost + costs[path.at(-1)!][0]; toursEvaluated++;
      if (total < minimum) { minimum = total; best = [...path, 0]; }
      return;
    }
    for (const next of remaining) visit([...path, next], remaining.filter(x => x !== next), cost + costs[path.at(-1)!][next]);
  }
  visit([0], Array.from({ length: n - 1 }, (_, i) => i + 1), 0);
  return { cost: minimum, tour: best, toursEvaluated };
}
export type CapitalProject = { id: string; costCents: number; priority: number };
export function allocateSmallBudget(projects: CapitalProject[], budgetCents: number) {
  if (!projects.length || projects.length > 8 || new Set(projects.map(p => p.id)).size !== projects.length ||
      !Number.isSafeInteger(budgetCents) || budgetCents < 0 || budgetCents > 100_000_000 ||
      projects.some(p => !p.id.trim() || p.id.length > 40 || !Number.isSafeInteger(p.costCents) || p.costCents < 0 || p.costCents > 100_000_000 ||
        !Number.isFinite(p.priority) || p.priority < 0 || p.priority > 1_000_000)) throw new Error('Invalid bounded project budget.');
  let best = { selected: [] as string[], costCents: 0, priority: 0 };
  for (let mask = 0; mask < 2 ** projects.length; mask++) {
    const selected = projects.filter((_, i) => mask & (1 << i));
    const costCents = selected.reduce((s, p) => s + p.costCents, 0), priority = selected.reduce((s, p) => s + p.priority, 0);
    if (costCents <= budgetCents && (priority > best.priority || (priority === best.priority && costCents < best.costCents))) {
      best = { selected: selected.map(p => p.id), costCents, priority };
    }
  }
  return { ...best, combinationsEvaluated: 2 ** projects.length };
}
