import { describe, expect, it } from 'vitest';
import { applyGate, bellState, exactIsingBaseline, groverIteration, isingEnergies, loadBalanceModel,
  probabilities, qaoaLayer, searchQaoaGrid, stateMetrics, surfaceCodeEstimate, twoQubitQasm, uniformState, validateState, zeroState } from '../src/features/quantum/quantum-engine';
import { allocateSmallBudget, shortestClosedTour } from '../src/features/quantum/classical-baselines';

describe('two-qubit statevector calculations', () => {
  it('constructs a Bell state through H and CX, preserving the input and normalization', () => {
    const initial = zeroState(), copy = structuredClone(initial);
    const result = applyGate(applyGate(initial, { kind: 'h', target: 0 }), { kind: 'cx', control: 0, target: 1 });
    expect(initial).toEqual(copy);
    expect(result[0].re).toBeCloseTo(Math.SQRT1_2, 14); expect(result[3].re).toBeCloseTo(Math.SQRT1_2, 14);
    expect(result[1]).toEqual({ re: 0, im: 0 }); expect(result[2]).toEqual({ re: 0, im: 0 });
    expect(stateMetrics(result)).toMatchObject({ concurrence: 1 });
    expect(stateMetrics(result).norm).toBeCloseTo(1, 14);
  });
  it('uses the actual Rz diagonal phases, not a phase on an arbitrary amplitude', () => {
    const state = bellState(Math.PI / 2);
    expect(state[0].re).toBeCloseTo(0.5, 14); expect(state[0].im).toBeCloseTo(-0.5, 14);
    expect(state[3].re).toBeCloseTo(0.5, 14); expect(state[3].im).toBeCloseTo(0.5, 14);
    expect(probabilities(state)[0]).toBeCloseTo(0.5, 14); expect(probabilities(state)[3]).toBeCloseTo(0.5, 14);
  });
  it('distinguishes measurement uncertainty from entanglement', () => {
    const independent = stateMetrics(uniformState(2)), bell = stateMetrics(bellState());
    expect(independent.measurementEntropy).toBeCloseTo(2, 14);
    expect(independent.entanglementEntropy).toBeCloseTo(0, 14);
    expect(bell.measurementEntropy).toBeCloseTo(1, 14); expect(bell.entanglementEntropy).toBeCloseTo(1, 14);
  });
  it.each([0, 1, 2, 3])('amplifies marked state %i through an oracle and diffusion, then shows over-iteration', marked => {
    const initial = uniformState(2), amplified = groverIteration(initial, marked);
    probabilities(initial).forEach(p => expect(p).toBeCloseTo(0.25, 14));
    probabilities(amplified).forEach((p, i) => expect(p).toBeCloseTo(i === marked ? 1 : 0, 14));
    expect(probabilities(groverIteration(amplified, marked))[marked]).toBeCloseTo(0.25, 14);
  });
  it('preserves norm through supported unitary gates and rejects invalid dimensions/inputs', () => {
    let state = bellState(-0.7);
    for (const angle of [-Math.PI, -0.4, 0, 1.7, 2 * Math.PI]) {
      state = applyGate(applyGate(state, { kind: 'rx', target: 0, angle }), { kind: 'rz', target: 1, angle });
      expect(stateMetrics(state).norm).toBeCloseTo(1, 12);
    }
    expect(() => zeroState(9)).toThrow(); expect(() => validateState([{ re: 2, im: 0 }, { re: 0, im: 0 }])).toThrow();
    expect(() => applyGate(state, { kind: 'cx', control: 1, target: 1 })).toThrow();
    expect(() => applyGate(state, { kind: 'rx', target: 0, angle: NaN })).toThrow();
    expect(() => groverIteration(state, -1)).toThrow();
  });
  it('exports a bounded circuit with explicit basis convention and the Grover diffusion global phase', () => {
    const qasm = twoQubitQasm('grover', 0, 0, 2);
    expect(qasm).toContain('OPENQASM 3.0'); expect(qasm).toContain('Basis order |q1 q0>');
    expect(qasm.match(/gphase\(pi\)/g)).toHaveLength(2);
    expect(twoQubitQasm('grover', 0, 3, 0)).not.toContain('cz');
    expect(twoQubitQasm('bell', Math.PI / 2)).toContain(`rz(${Math.PI / 2}) q[1]`);
    expect(() => twoQubitQasm('grover', 0, 4)).toThrow(); expect(() => twoQubitQasm('grover', 0, 0, 100)).toThrow();
  });
});

describe('QAOA costs compared with independent analytical references', () => {
  const pair = { fields: [0, 0], edges: [{ i: 0, j: 1, weight: 1 }] };
  it.each([[0.2, 0.4], [0.9, -0.3], [3 * Math.PI / 4, Math.PI / 8]])('matches <ZZ>=sin(4 beta) sin(2 gamma) at gamma=%f beta=%f', (gamma, beta) => {
    const result = qaoaLayer(pair, gamma, beta);
    expect(result.expectedEnergy).toBeCloseTo(Math.sin(4 * beta) * Math.sin(2 * gamma), 12);
    expect(stateMetrics(result.state).norm).toBeCloseTo(1, 12);
  });
  it('handles local fields, reports exact reference minima and avoids fabricated success probabilities', () => {
    expect(isingEnergies(pair)).toEqual([1, -1, -1, 1]);
    expect(exactIsingBaseline(pair)).toEqual({ minimum: -1, states: [1, 2], statesEvaluated: 4 });
    const field = qaoaLayer({ fields: [1], edges: [] }, 0.6, 0.2);
    expect(field.expectedEnergy).toBeCloseTo(Math.sin(0.4) * Math.sin(1.2), 12);
    const result = searchQaoaGrid(pair, 9);
    expect(result.expectedEnergy).toBeGreaterThanOrEqual(-1 - 1e-12);
    expect(result.parameterPairs).toBe(81);
    expect(result.expectedEnergy).toBeCloseTo(qaoaLayer(pair, result.gamma, result.beta).expectedEnergy, 12);
  });
  it('maps feeder loads to squared imbalance with the required constant term', () => {
    const loads = [2, 3, 5, 7], model = loadBalanceModel(loads), energies = isingEnergies(model.model);
    energies.forEach((energy, state) => {
      const imbalance = loads.reduce((s, w, i) => s + w * (state & (1 << i) ? -1 : 1), 0);
      expect(energy + model.constant).toBeCloseTo((imbalance / model.total) ** 2, 12);
    });
    expect((exactIsingBaseline(model.model).minimum + model.constant) * 17 ** 2).toBeCloseTo(1, 10);
    expect(() => loadBalanceModel([0, 2])).toThrow(); expect(() => searchQaoaGrid(pair, 100)).toThrow();
    expect(() => isingEnergies({ fields: [0], edges: [{ i: 0, j: 0, weight: 1 }] })).toThrow();
  });
});

describe('small classical planning references', () => {
  it('finds the supplied-matrix closed tour and counts all six depot-fixed permutations', () => {
    const result = shortestClosedTour([[0,4,9,6],[4,0,3,8],[9,3,0,5],[6,8,5,0]]);
    expect(result).toEqual({ cost: 18, tour: [0,1,2,3,0], toursEvaluated: 6 });
    expect(() => shortestClosedTour([[0,-1],[2,0]])).toThrow(); expect(() => shortestClosedTour([[1,2],[2,0]])).toThrow();
  });
  it('allocates integer cents within budget and does not interpret priorities as returns', () => {
    const projects = [{ id: 'Tools', costCents: 1000000, priority: 8 }, { id: 'Stock', costCents: 800000, priority: 7 }, { id: 'Training', costCents: 500000, priority: 5 }];
    expect(allocateSmallBudget(projects, 1500000)).toEqual({ selected: ['Tools','Training'], costCents: 1500000, priority: 13, combinationsEvaluated: 8 });
    expect(allocateSmallBudget(projects, 1300000).selected).toEqual(['Stock','Training']);
    expect(allocateSmallBudget(projects, 0).selected).toEqual([]);
    expect(() => allocateSmallBudget(projects, 0.5)).toThrow();
  });
});

describe('surface-code assumptions', () => {
  it.each([[3,17],[5,49],[7,97]])('counts an ideal rotated d=%i patch as %i qubits', (d, qubits) => {
    const result = surfaceCodeEstimate(d, 0.001);
    expect(result.patchQubits).toBe(qubits); expect(result.dataQubits + result.syndromeQubits).toBe(qubits);
    expect(result.thresholdRatio).toBe(10);
    expect(result.logicalErrorEstimate).toBeCloseTo(0.1 * 0.1 ** ((d + 1) / 2), 14);
  });
  it('does not predict suppression at/above an assumed threshold or accept invalid inputs', () => {
    expect(surfaceCodeEstimate(7, 0.01).logicalErrorEstimate).toBeNull();
    expect(surfaceCodeEstimate(7, 0.1).belowThreshold).toBe(false);
    expect(() => surfaceCodeEstimate(4, 0.001)).toThrow(); expect(() => surfaceCodeEstimate(3, NaN)).toThrow();
    expect(() => surfaceCodeEstimate(3, 0)).toThrow(); expect(() => surfaceCodeEstimate(3, 0.001, 1)).toThrow();
  });
});

describe('QAOA grid optimisation preserves numerical results', () => {
  it('matches a separately enumerated public-layer reference across nontrivial fields and edges', () => {
    const model = {
      fields: [0.25, -0.5, 0.75],
      edges: [{ i: 0, j: 1, weight: 1.5 }, { i: 1, j: 2, weight: -0.375 }],
    };
    const steps = 7;
    let expectedEnergy = Infinity, expectedGamma = 0, expectedBeta = 0;
    for (let g = 0; g < steps; g++) for (let b = 0; b < steps; b++) {
      const gamma = 2 * Math.PI * g / (steps - 1);
      const beta = Math.PI * b / (steps - 1);
      const energy = qaoaLayer(model, gamma, beta).expectedEnergy;
      if (energy < expectedEnergy) { expectedEnergy = energy; expectedGamma = gamma; expectedBeta = beta; }
    }
    const result = searchQaoaGrid(model, steps);
    expect(result.parameterPairs).toBe(steps ** 2);
    expect(result.expectedEnergy).toBeCloseTo(expectedEnergy, 12);
    expect(result.gamma).toBe(expectedGamma);
    expect(result.beta).toBe(expectedBeta);
    expect(result.state).toEqual(qaoaLayer(model, expectedGamma, expectedBeta).state);
    expect(stateMetrics(result.state).norm).toBeCloseTo(1, 12);
    expect(searchQaoaGrid(model, steps)).toEqual(result);
  });
  it('preserves bounded input validation and rejects invalid Hamiltonians', () => {
    const model = { fields: [0], edges: [] };
    for (const steps of [2, 26, 4.5, NaN, Infinity]) {
      expect(() => searchQaoaGrid(model, steps)).toThrow();
    }
    expect(() => searchQaoaGrid({ fields: [NaN], edges: [] }, 3)).toThrow();
    expect(() => searchQaoaGrid({ fields: [0, 0], edges: [{ i: 0, j: 0, weight: 1 }] }, 3)).toThrow();
  });
});
