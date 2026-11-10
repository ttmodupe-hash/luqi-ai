/** Classical, bounded statevector simulation. Basis order is |q(n-1)...q0>.
 * No quantum hardware, stochastic measurements, cloud jobs or hidden solvers.
 */
export type Complex = { re: number; im: number };
export type Statevector = Complex[];
export type Gate = { kind: 'h' | 'x' | 'rz' | 'rx'; target: number; angle?: number }
  | { kind: 'cx' | 'cz'; control: number; target: number };
const add = (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im });
const scale = (a: Complex, s: number): Complex => ({ re: a.re * s, im: a.im * s });
const multiply = (a: Complex, b: Complex): Complex => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
const phase = (a: Complex, angle: number): Complex => multiply(a, { re: Math.cos(angle), im: Math.sin(angle) });
const finite = (x: number) => { if (!Number.isFinite(x)) throw new Error('Use finite numbers.'); return x; };

export function zeroState(qubits = 2): Statevector {
  if (!Number.isInteger(qubits) || qubits < 1 || qubits > 8) throw new Error('Use 1–8 simulated qubits.');
  return Array.from({ length: 2 ** qubits }, (_, i) => ({ re: i === 0 ? 1 : 0, im: 0 }));
}
export function validateState(state: Statevector): number {
  const n = Math.log2(state.length);
  if (!Number.isInteger(n) || n < 1 || n > 8 || state.some(z => !Number.isFinite(z.re) || !Number.isFinite(z.im))) throw new Error('Invalid statevector.');
  const norm = state.reduce((s, z) => s + z.re * z.re + z.im * z.im, 0);
  if (Math.abs(norm - 1) > 1e-9) throw new Error('Statevector must have unit norm.');
  return n;
}
export function applyGate(state: Statevector, gate: Gate): Statevector {
  const n = validateState(state);
  const validQubit = (q: number) => Number.isInteger(q) && q >= 0 && q < n;
  if (!validQubit(gate.target)) throw new Error('Invalid target qubit.');
  const result = state.map(z => ({ ...z })), target = 1 << gate.target;
  if (gate.kind === 'cx' || gate.kind === 'cz') {
    if (!validQubit(gate.control) || gate.control === gate.target) throw new Error('Control and target must differ.');
    const control = 1 << gate.control;
    for (let i = 0; i < state.length; i++) {
      if (gate.kind === 'cz' && (i & control) && (i & target)) result[i] = scale(state[i], -1);
      if (gate.kind === 'cx' && (i & control) && !(i & target)) {
        result[i] = { ...state[i | target] }; result[i | target] = { ...state[i] };
      }
    }
    return result;
  }
  if (gate.kind === 'rz') {
    const angle = finite(gate.angle ?? NaN);
    return state.map((z, i) => phase(z, (i & target ? 1 : -1) * angle / 2));
  }
  if (gate.kind !== 'h' && gate.kind !== 'x' && gate.kind !== 'rx') throw new Error('Unsupported gate.');
  const angle = gate.kind === 'rx' ? finite(gate.angle ?? NaN) : 0;
  // The RX rotation is fixed for all basis pairs; evaluate trig only once per gate.
  const rxCos = gate.kind === 'rx' ? Math.cos(angle / 2) : 0;
  const rxSin = gate.kind === 'rx' ? Math.sin(angle / 2) : 0;
  for (let i = 0; i < state.length; i++) {
    if (i & target) continue;
    const a = state[i], b = state[i | target];
    if (gate.kind === 'h') {
      result[i] = scale(add(a, b), Math.SQRT1_2);
      result[i | target] = scale(add(a, scale(b, -1)), Math.SQRT1_2);
    } else if (gate.kind === 'x') {
      result[i] = { ...b }; result[i | target] = { ...a };
    } else {
      result[i] = add(scale(a, rxCos), multiply(b, { re: 0, im: -rxSin }));
      result[i | target] = add(scale(b, rxCos), multiply(a, { re: 0, im: -rxSin }));
    }
  }
  return result;
}
export function uniformState(qubits: number): Statevector {
  let state = zeroState(qubits);
  for (let target = 0; target < qubits; target++) state = applyGate(state, { kind: 'h', target });
  return state;
}
export function bellState(angle = 0): Statevector {
  return applyGate(applyGate(applyGate(zeroState(), { kind: 'h', target: 0 }),
    { kind: 'cx', control: 0, target: 1 }), { kind: 'rz', target: 1, angle: finite(angle) });
}
export function groverIteration(state: Statevector, marked: number): Statevector {
  validateState(state);
  if (!Number.isInteger(marked) || marked < 0 || marked >= state.length) throw new Error('Invalid marked state.');
  const oracle = state.map((z, i) => scale(z, i === marked ? -1 : 1));
  const mean = scale(oracle.reduce(add, { re: 0, im: 0 }), 1 / oracle.length);
  return oracle.map(z => add(scale(mean, 2), scale(z, -1)));
}
export function probabilities(state: Statevector): number[] {
  validateState(state); return state.map(z => z.re * z.re + z.im * z.im);
}
const entropy = (p: number[]) => -p.reduce((s, x) => x > 0 ? s + x * Math.log2(x) : s, 0);
export function stateMetrics(state: Statevector) {
  const n = validateState(state), p = probabilities(state);
  let concurrence: number | null = null, entanglementEntropy: number | null = null;
  if (n === 2) {
    const determinant = add(multiply(state[0], state[3]), scale(multiply(state[1], state[2]), -1));
    concurrence = Math.max(0, Math.min(1, 2 * Math.hypot(determinant.re, determinant.im)));
    const eigenvalue = (1 + Math.sqrt(Math.max(0, 1 - concurrence ** 2))) / 2;
    entanglementEntropy = entropy([eigenvalue, 1 - eigenvalue]);
  }
  return { probabilities: p, norm: p.reduce((s, x) => s + x, 0), concurrence,
    measurementEntropy: entropy(p), entanglementEntropy };
}
export function twoQubitQasm(preset: 'bell' | 'grover' | 'uniform', angle = 0, marked = 3, iterations = 1): string {
  finite(angle);
  if (!Number.isInteger(marked) || marked < 0 || marked > 3) throw new Error('Invalid marked state.');
  const header = 'OPENQASM 3.0;\ninclude "stdgates.inc";\nqubit[2] q;\nbit[2] c;\n// Basis order |q1 q0>. Angles are radians.\n';
  if (preset === 'bell') return header + `h q[0];\ncx q[0], q[1];\nrz(${angle}) q[1];\nc = measure q;\n`;
  if (preset === 'uniform') return header + 'h q[0];\nh q[1];\nc = measure q;\n';
  if (preset !== 'grover') throw new Error('Unsupported circuit preset.');
  if (!Number.isInteger(iterations) || iterations < 0 || iterations > 8) throw new Error('Use 0–8 Grover iterations.');
  const flips = [0, 1].filter(q => !(marked & (1 << q))).map(q => `x q[${q}];`).join('\n');
  const iteration = `${flips}\ncz q[0], q[1];\n${flips}\n` +
    '// Diffusion 2|s><s|-I, including its global sign.\nh q[0]; h q[1];\nx q[0]; x q[1];\ncz q[0], q[1];\nx q[0]; x q[1];\nh q[0]; h q[1];\ngphase(pi);\n';
  return header + 'h q[0]; h q[1];\n' + iteration.repeat(iterations) + 'c = measure q;\n';
}

export type IsingModel = { fields: number[]; edges: { i: number; j: number; weight: number }[] };
function validateModel(model: IsingModel): number {
  const n = model.fields.length; zeroState(n);
  const seen = new Set<string>();
  if (model.fields.some(x => !Number.isFinite(x) || Math.abs(x) > 100_000)) throw new Error('Invalid field.');
  for (const { i, j, weight } of model.edges) {
    const key = [i, j].sort((a, b) => a - b).join(':');
    if (!Number.isInteger(i) || !Number.isInteger(j) || i < 0 || j < 0 || i >= n || j >= n || i === j ||
        !Number.isFinite(weight) || Math.abs(weight) > 100_000 || seen.has(key)) throw new Error('Invalid or duplicate Ising edge.');
    seen.add(key);
  }
  return n;
}
export function isingEnergies(model: IsingModel): number[] {
  const n = validateModel(model), spin = (index: number, q: number) => index & (1 << q) ? -1 : 1;
  return Array.from({ length: 2 ** n }, (_, index) => model.fields.reduce((s, h, q) => s + h * spin(index, q), 0) +
    model.edges.reduce((s, e) => s + e.weight * spin(index, e.i) * spin(index, e.j), 0));
}
export function exactIsingBaseline(model: IsingModel) {
  const energies = isingEnergies(model), minimum = Math.min(...energies);
  return { minimum, states: energies.flatMap((energy, index) => Math.abs(energy - minimum) < 1e-10 ? [index] : []), statesEvaluated: energies.length };
}
/** Compute from an already validated, fixed Ising spectrum; only a classical simulation. */
function qaoaLayerFromEnergies(energies: number[], initial: Statevector, qubits: number, gamma: number, beta: number) {
  // No mutation of initial: the first map makes a fresh state for each angle pair.
  let state = initial.map((z, i) => phase(z, -gamma * energies[i]));
  for (let target = 0; target < qubits; target++) state = applyGate(state, { kind: 'rx', target, angle: 2 * beta });
  const p = probabilities(state);
  return { state, expectedEnergy: p.reduce((s, x, i) => s + x * energies[i], 0) };
}
export function qaoaLayer(model: IsingModel, gamma: number, beta: number) {
  finite(gamma); finite(beta);
  const energies = isingEnergies(model), qubits = model.fields.length;
  return qaoaLayerFromEnergies(energies, uniformState(qubits), qubits, gamma, beta);
}
export function searchQaoaGrid(model: IsingModel, steps = 15) {
  if (!Number.isInteger(steps) || steps < 3 || steps > 25) throw new Error('Use 3–25 grid steps.');
  // The Ising Hamiltonian and uniform initial state are fixed for this bounded
  // grid; compute both once instead of allocating them for every angle pair.
  const energies = isingEnergies(model), qubits = model.fields.length, initial = uniformState(qubits);
  let best = { gamma: 0, beta: 0, ...qaoaLayerFromEnergies(energies, initial, qubits, 0, 0) };
  for (let g = 0; g < steps; g++) for (let b = 0; b < steps; b++) {
    const gamma = 2 * Math.PI * g / (steps - 1), beta = Math.PI * b / (steps - 1);
    const candidate = qaoaLayerFromEnergies(energies, initial, qubits, gamma, beta);
    if (candidate.expectedEnergy < best.expectedEnergy) best = { gamma, beta, ...candidate };
  }
  return { ...best, parameterPairs: steps ** 2 };
}
export function loadBalanceModel(loads: number[]) {
  if (loads.length < 2 || loads.length > 6 || loads.some(x => !Number.isFinite(x) || x <= 0 || x > 100)) throw new Error('Use 2–6 positive loads, up to 100 kW each.');
  const total = loads.reduce((s, x) => s + x, 0), edges: IsingModel['edges'] = [];
  for (let i = 0; i < loads.length; i++) for (let j = i + 1; j < loads.length; j++) edges.push({ i, j, weight: 2 * loads[i] * loads[j] / total ** 2 });
  return { model: { fields: loads.map(() => 0), edges }, total,
    constant: loads.reduce((s, x) => s + x * x, 0) / total ** 2 };
}
export function surfaceCodeEstimate(distance: number, physical: number, threshold = 0.01) {
  if (!Number.isInteger(distance) || distance < 3 || distance > 13 || distance % 2 !== 1 ||
      !Number.isFinite(physical) || physical <= 0 || physical >= 1 ||
      !Number.isFinite(threshold) || threshold <= 0 || threshold >= 1) throw new Error('Invalid surface-code inputs.');
  return { distance, dataQubits: distance ** 2, syndromeQubits: distance ** 2 - 1,
    patchQubits: 2 * distance ** 2 - 1, thresholdRatio: threshold / physical,
    belowThreshold: physical < threshold,
    // Illustrative scaling law, not a decoder simulation or hardware prediction.
    logicalErrorEstimate: physical < threshold ? 0.1 * (physical / threshold) ** ((distance + 1) / 2) : null };
}
