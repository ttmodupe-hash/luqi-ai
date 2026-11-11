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
  it('rejects missing statevector amplitudes instead of reporting a complete normalized state', () => {
    // Array#some skips holes, and the remaining |0> amplitude still has norm 1.
    const sparse = [{ re: 1, im: 0 }, ,] as ReturnType<typeof zeroState>;
    expect(sparse.length).toBe(2);
    expect(() => validateState(sparse)).toThrow('Invalid statevector.');
    expect(() => probabilities(sparse)).toThrow('Invalid statevector.');
    expect(() => stateMetrics(sparse)).toThrow('Invalid statevector.');
    expect(() => applyGate(sparse, { kind: 'h', target: 0 })).toThrow('Invalid statevector.');
    const missing = [{ re: 1, im: 0 }, undefined] as unknown as ReturnType<typeof zeroState>;
    expect(() => validateState(missing)).toThrow('Invalid statevector.');
    const wide = new Array(256) as ReturnType<typeof zeroState>;
    wide[0] = { re: 1, im: 0 };
    expect(() => validateState(wide)).toThrow('Invalid statevector.');
    // Fully specified pure states remain valid, including exact zero amplitudes.
    expect(validateState(zeroState(1))).toBe(1);
    expect(probabilities(zeroState(1))).toEqual([1, 0]);
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
  it('does not invent degenerate exact minima for very small valid Ising fields', () => {
    // Independent one-spin reference: E(0)=+h and E(1)=-h.
    const small = { fields: [1e-12], edges: [] };
    expect(isingEnergies(small)).toEqual([1e-12, -1e-12]);
    expect(exactIsingBaseline(small)).toEqual({
      minimum: -1e-12, states: [1], statesEvaluated: 2,
    });
    // Genuine degeneracy must still be reported at the same small scale.
    const tied = { fields: [0, 0], edges: [{ i: 0, j: 1, weight: 1e-12 }] };
    expect(exactIsingBaseline(tied)).toEqual({
      minimum: -1e-12, states: [1, 2], statesEvaluated: 4,
    });
  });
  it('normalizes valid tiny feeder loads without coefficient underflow or NaN', () => {
    // Two smallest representable positive kW loads have identical shares.
    const subnormal = [Number.MIN_VALUE, Number.MIN_VALUE];
    const snapshot = [...subnormal], small = loadBalanceModel(subnormal);
    expect(small.total).toBe(2 * Number.MIN_VALUE);
    expect(small.model.edges).toEqual([{ i: 0, j: 1, weight: 0.5 }]);
    expect(small.constant).toBe(0.5);
    expect(isingEnergies(small.model)).toEqual([0.5, -0.5, -0.5, 0.5]);
    expect(subnormal).toEqual(snapshot);

    // Independent dimensionless reference from the integer proportions 1:2:3.
    const loads = [1e-200, 2e-200, 3e-200];
    const balanced = loadBalanceModel(loads), spectrum = isingEnergies(balanced.model);
    const fractions = [1 / 6, 2 / 6, 3 / 6];
    expect([...balanced.model.edges.map(edge => edge.weight), balanced.constant].every(Number.isFinite)).toBe(true);
    expect(balanced.constant).toBeCloseTo(14 / 36, 14);
    for (let state = 0; state < spectrum.length; state++) {
      const signed = fractions.reduce((sum, share, index) => sum + (state & (1 << index) ? -share : share), 0);
      expect(spectrum[state] + balanced.constant).toBeCloseTo(signed ** 2, 12);
    }
    expect(loads).toEqual([1e-200, 2e-200, 3e-200]);
  });
  it('rejects missing numeric array elements instead of fabricating an Ising model or invalid feeder costs', () => {
    // Array#some skips holes; an omitted field previously behaved as an invented zero.
    const sparseFields = [, 1] as number[];
    expect(() => isingEnergies({ fields: sparseFields, edges: [] })).toThrow('Invalid field.');
    expect(() => exactIsingBaseline({ fields: new Array<number>(2), edges: [] })).toThrow('Invalid field.');
    expect(() => searchQaoaGrid({ fields: sparseFields, edges: [] }, 3)).toThrow('Invalid field.');
    expect(() => loadBalanceModel([, 2] as number[])).toThrow('Use 2–6 positive loads');
    expect(() => loadBalanceModel(new Array<number>(2))).toThrow('Use 2–6 positive loads');
    // Explicit zeros are valid: do not mistake them for missing measurements.
    expect(isingEnergies({ fields: [0, 1], edges: [] })).toEqual([1, 1, -1, -1]);
    expect(loadBalanceModel([1, 2]).total).toBe(3);
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
  it('refuses unrepresentable ratios and underflowed zero logical-error claims', () => {
    // Independent scaling law for distance 3: 0.1 * (0.001 / 0.01)^2 = 0.001.
    const ordinary = surfaceCodeEstimate(3, 0.001);
    expect(ordinary.thresholdRatio).toBe(10);
    expect(ordinary.logicalErrorEstimate).toBeCloseTo(0.001, 14);
    // Extremely low but representable predictions remain valid.
    const tiny = surfaceCodeEstimate(13, 1e-40);
    expect(tiny.logicalErrorEstimate).toBeGreaterThan(0);
    expect(Number.isFinite(tiny.thresholdRatio)).toBe(true);
    // Both inputs are finite and positive, but threshold/physical overflows.
    expect(() => surfaceCodeEstimate(3, Number.MIN_VALUE))
      .toThrow('Surface-code threshold ratio exceeds floating-point precision.');
    // The illustrative probability is positive analytically, not exactly 0.
    expect(() => surfaceCodeEstimate(13, 1e-100))
      .toThrow('Surface-code logical error estimate underflows floating-point precision.');
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
  it('matches the uncached public-layer reference across the maximum 25×25 angle grid', () => {
    const model = { fields: [0.8, -1.1], edges: [{ i: 0, j: 1, weight: 0.17 }] };
    const unchanged = structuredClone(model), steps = 25;
    let best = { gamma: 0, beta: 0, ...qaoaLayer(model, 0, 0) };
    for (let g = 0; g < steps; g++) for (let b = 0; b < steps; b++) {
      const gamma = 2 * Math.PI * g / (steps - 1);
      const beta = Math.PI * b / (steps - 1);
      const candidate = qaoaLayer(model, gamma, beta);
      if (candidate.expectedEnergy < best.expectedEnergy) best = { gamma, beta, ...candidate };
    }
    const cached = searchQaoaGrid(model, steps);
    expect(cached).toEqual({ ...best, parameterPairs: steps ** 2 });
    expect(model).toEqual(unchanged);
    expect(stateMetrics(cached.state).norm).toBeCloseTo(1, 12);
    expect(searchQaoaGrid(model, steps)).toEqual(cached);
  });
  it('applies a single computed RX rotation correctly to every pair in an eight-qubit state', () => {
    // Exercise the maximum simulator width with unequal complex amplitudes.
    let state = applyGate(zeroState(8), { kind: 'h', target: 1 });
    state = applyGate(state, { kind: 'cx', control: 1, target: 7 });
    state = applyGate(state, { kind: 'rz', target: 7, angle: 0.71 });
    const original = structuredClone(state), target = 7, bit = 1 << target;
    for (const angle of [-2.4, 0, 0.37, Math.PI]) {
      const actual = applyGate(state, { kind: 'rx', target, angle });
      const c = Math.cos(angle / 2), s = Math.sin(angle / 2);
      for (let i = 0; i < state.length; i++) {
        if (i & bit) continue;
        const a = state[i], b = state[i | bit];
        expect(actual[i].re).toBeCloseTo(c * a.re + s * b.im, 12);
        expect(actual[i].im).toBeCloseTo(c * a.im - s * b.re, 12);
        expect(actual[i | bit].re).toBeCloseTo(c * b.re + s * a.im, 12);
        expect(actual[i | bit].im).toBeCloseTo(c * b.im - s * a.re, 12);
      }
      expect(stateMetrics(actual).norm).toBeCloseTo(1, 12);
    }
    expect(state).toEqual(original);
  });
  it('applies exact RZ phases to an eight-qubit complex state without input mutation', () => {
    const raw = Array.from({ length: 256 }, (_, i) => ({ re: Math.cos(i / 11), im: Math.sin(i / 17) }));
    const length = Math.sqrt(raw.reduce((sum, z) => sum + z.re ** 2 + z.im ** 2, 0));
    const state = raw.map(z => ({ re: z.re / length, im: z.im / length }));
    const original = structuredClone(state);
    for (const target of [0, 7]) for (const angle of [-2.4, 0, 0.93, Math.PI]) {
      const actual = applyGate(state, { kind: 'rz', target, angle });
      expect(actual).not.toBe(state);
      expect(actual[0]).not.toBe(state[0]);
      for (let i = 0; i < state.length; i++) {
        // Independent direct reference: exp(i phase) multiplication on each basis amplitude.
        const phase = (i & (1 << target) ? 1 : -1) * angle / 2;
        const c = Math.cos(phase), s = Math.sin(phase), z = state[i];
        expect(actual[i].re).toBeCloseTo(z.re * c - z.im * s, 12);
        expect(actual[i].im).toBeCloseTo(z.re * s + z.im * c, 12);
      }
      expect(stateMetrics(actual).norm).toBeCloseTo(1, 12);
    }
    expect(state).toEqual(original);
    // Fail closed on invalid input before the optimized one-pass RZ map.
    expect(() => applyGate([{ re: 1, im: 0 }, { re: 1, im: 0 }],
      { kind: 'rz', target: 0, angle: 0 })).toThrow('Statevector must have unit norm.');
  });
  it('matches independent eight-qubit RX-gate sequence with one prepared mixer per beta', () => {
    const model = { fields: [0.25, -0.5, 0.75, -0.25, 0.5, -0.125, 0.375, -0.875],
      edges: [{ i: 0, j: 7, weight: 1.5 }, { i: 2, j: 5, weight: -0.375 }] };
    const original = structuredClone(model), gamma = 0.47, energies = isingEnergies(model);
    for (const beta of [-1.25, 0, 0.91, Math.PI]) {
      const phased = uniformState(8).map((z, i) => {
        const angle = -gamma * energies[i], c = Math.cos(angle), s = Math.sin(angle);
        return { re: z.re * c - z.im * s, im: z.re * s + z.im * c };
      });
      let reference = phased;
      for (let target = 0; target < 8; target++) {
        reference = applyGate(reference, { kind: 'rx', target, angle: 2 * beta });
      }
      const actual = qaoaLayer(model, gamma, beta);
      expect(actual.state).toEqual(reference);
      expect(actual.expectedEnergy).toBeCloseTo(
        probabilities(reference).reduce((sum, p, i) => sum + p * energies[i], 0), 12);
      expect(stateMetrics(actual.state).norm).toBeCloseTo(1, 12);
    }
    expect(model).toEqual(original);
    // The public layer must still reject finite betas whose doubled RX angle overflows.
    expect(() => qaoaLayer(model, gamma, 1e308)).toThrow('Use finite numbers.');
  });
  it('reuses an eight-qubit phase row without leaking in-place mixer mutations across beta candidates', () => {
    const model = {
      fields: [0.125, -0.25, 0.375, -0.5, 0.625, -0.75, 0.875, -1],
      edges: [{ i: 0, j: 7, weight: 0.325 }, { i: 2, j: 5, weight: -0.175 }],
    };
    const original = structuredClone(model), steps = 5;
    let expected = { gamma: 0, beta: 0, ...qaoaLayer(model, 0, 0) };
    for (let g = 0; g < steps; g++) for (let b = 0; b < steps; b++) {
      const gamma = 2 * Math.PI * g / (steps - 1), beta = Math.PI * b / (steps - 1);
      const candidate = qaoaLayer(model, gamma, beta);
      if (candidate.expectedEnergy < expected.expectedEnergy) expected = { gamma, beta, ...candidate };
    }
    const snapshot = structuredClone(expected);
    const actual = searchQaoaGrid(model, steps);
    expect(actual).toEqual({ ...snapshot, parameterPairs: steps ** 2 });
    expect(searchQaoaGrid(model, steps)).toEqual(actual);
    expect(expected).toEqual(snapshot);
    expect(model).toEqual(original);
    expect(stateMetrics(actual.state).norm).toBeCloseTo(1, 12);
  });


  it('matches a public-layer reference at the maximum 25x25 grid after beta-column coefficient reuse', () => {
    const model = {
      fields: [0.125, -0.375, 0.625],
      edges: [{ i: 0, j: 1, weight: -0.4 }, { i: 1, j: 2, weight: 0.275 }],
    };
    const unchanged = structuredClone(model), steps = 25;
    let reference = { gamma: 0, beta: 0, ...qaoaLayer(model, 0, 0) };
    for (let g = 0; g < steps; g++) for (let b = 0; b < steps; b++) {
      const gamma = 2 * Math.PI * g / (steps - 1), beta = Math.PI * b / (steps - 1);
      const candidate = qaoaLayer(model, gamma, beta);
      if (candidate.expectedEnergy < reference.expectedEnergy) reference = { gamma, beta, ...candidate };
    }
    const actual = searchQaoaGrid(model, steps);
    expect(actual).toEqual({ ...reference, parameterPairs: 625 });
    expect(searchQaoaGrid(model, steps)).toEqual(actual);
    expect(model).toEqual(unchanged);
    expect(stateMetrics(actual.state).norm).toBeCloseTo(1, 12);
  });

  it('measures reproducible bounded CPU baselines without gating on noisy timing', () => {
    // Paired measurements compare the original public API search with spectrum caching;
    // both use the same RX implementation. These are CI CPU samples, not phone timings.
    const model = { fields: [0.25, -0.5, 0.75, -0.25, 0.5, -0.125],
      edges: [{ i: 0, j: 1, weight: 1.5 }, { i: 2, j: 3, weight: -0.375 }, { i: 4, j: 5, weight: 0.625 }] };
    const steps = 15;
    const original = () => {
      let best = { gamma: 0, beta: 0, ...qaoaLayer(model, 0, 0) };
      for (let g = 0; g < steps; g++) for (let b = 0; b < steps; b++) {
        const gamma = 2 * Math.PI * g / (steps - 1), beta = Math.PI * b / (steps - 1);
        const candidate = qaoaLayer(model, gamma, beta);
        if (candidate.expectedEnergy < best.expectedEnergy) best = { gamma, beta, ...candidate };
      }
      return { ...best, parameterPairs: steps ** 2 };
    };
    const cached = () => searchQaoaGrid(model, steps);
    expect(cached()).toEqual(original());
    original(); cached(); // Warm both paths before sampling.
    const medianMs = (run: () => unknown) => {
      const samples: number[] = [];
      for (let i = 0; i < 5; i++) {
        const start = process.hrtime.bigint();
        run();
        samples.push(Number(process.hrtime.bigint() - start) / 1e6);
      }
      return samples.sort((a, b) => a - b)[2];
    };
    const originalMs = medianMs(original), cachedMs = medianMs(cached);
    // Informational measurements only; timing and ratio are never pass/fail gates.
    console.info(`LUQI_QAOA_CPU_BENCH node=${process.version} platform=${process.platform}/${process.arch} qubits=6 steps=15 repeats=5 original_median_ms=${originalMs.toFixed(3)} cached_median_ms=${cachedMs.toFixed(3)}`);
  });
  it('accumulates the exact eight-qubit Ising observable without intermediate probability arrays', () => {
    const model = {
      fields: [0.125, -0.375, 0.625, -0.875, 0.3, -0.2, 0.1, -0.45],
      edges: [{ i: 0, j: 7, weight: -0.42 }, { i: 3, j: 5, weight: 0.68 }],
    };
    const unchanged = structuredClone(model), energies = isingEnergies(model);
    for (const [gamma, beta] of [[0, 0], [0.47, -0.31], [1.75, 0.91]]) {
      const result = qaoaLayer(model, gamma, beta);
      let expectation = 0, norm = 0;
      for (let i = 0; i < result.state.length; i++) {
        const z = result.state[i], probability = z.re * z.re + z.im * z.im;
        norm += probability;
        expectation += probability * energies[i];
      }
      expect(result.expectedEnergy).toBe(expectation);
      expect(norm).toBeCloseTo(1, 12);
      expect(result.state).toHaveLength(256);
    }
    const grid = searchQaoaGrid(model, 5), probabilitiesFromState = probabilities(grid.state);
    expect(grid.expectedEnergy).toBe(
      probabilitiesFromState.reduce((sum, p, i) => sum + p * energies[i], 0));
    expect(model).toEqual(unchanged);
  });

  it('keeps eight-qubit mixer amplitudes separately owned after in-place RX updates', () => {
    const model = {
      fields: [0.125, -0.375, 0.625, -0.875, 0.3, -0.2, 0.1, -0.45],
      edges: [{ i: 0, j: 7, weight: -0.42 }, { i: 3, j: 5, weight: 0.68 }],
    };
    const original = structuredClone(model);
    for (const [gamma, beta] of [[0, 0], [0.47, -0.31], [1.75, 0.91]]) {
      const result = qaoaLayer(model, gamma, beta);
      const snapshot = structuredClone(result.state);
      expect(validateState(result.state)).toBe(8);
      expect(new Set(result.state).size).toBe(256);
      result.state[0].re += 0.125;
      expect(result.state[1]).toEqual(snapshot[1]);
      expect(model).toEqual(original);
    }
    // A 25×25 search must still return a non-aliased, normalized winner.
    const best = searchQaoaGrid(model, 25);
    expect(best.parameterPairs).toBe(625);
    expect(validateState(best.state)).toBe(8);
    expect(new Set(best.state).size).toBe(256);
    expect(model).toEqual(original);
  });

  it('keeps eight-qubit grid winners detached from a reused candidate workspace', () => {
    const model = {
      fields: [0.25, -0.5, 0.75, -0.25, 0.5, -0.125, 0.375, -0.875],
      edges: [{ i: 0, j: 7, weight: 1.5 }, { i: 2, j: 5, weight: -0.375 }],
    };
    const unchanged = structuredClone(model), steps = 7;
    let reference = { gamma: 0, beta: 0, ...qaoaLayer(model, 0, 0) };
    for (let g = 0; g < steps; g++) for (let b = 0; b < steps; b++) {
      const gamma = 2 * Math.PI * g / (steps - 1), beta = Math.PI * b / (steps - 1);
      const candidate = qaoaLayer(model, gamma, beta);
      if (candidate.expectedEnergy < reference.expectedEnergy) reference = { gamma, beta, ...candidate };
    }
    const actual = searchQaoaGrid(model, steps), snapshot = structuredClone(actual);
    expect(actual).toEqual({ ...reference, parameterPairs: steps ** 2 });
    expect(validateState(actual.state)).toBe(8);
    expect(new Set(actual.state).size).toBe(256);
    // Caller changes must not leak into the engine's workspace on a later search.
    actual.state[0].re += 0.25;
    expect(searchQaoaGrid(model, steps)).toEqual(snapshot);
    expect(model).toEqual(unchanged);
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
