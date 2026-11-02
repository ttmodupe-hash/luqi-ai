import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../public/labs/algebra-math.js', import.meta.url), 'utf8');
const context = vm.createContext({});
vm.runInContext(source, context);
const M = context.LuqiAlgebra;
const state = (mode, a, b, c) => ({ mode, a, b, c });
const near = (actual, expected, epsilon = 1e-9) => assert.ok(Math.abs(actual - expected) <= epsilon * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);
const cases = [
  ['default cubic', state('cubic', 1, 0, -3), [-Math.sqrt(3), 0, Math.sqrt(3)]],
  ['cubic with only zero root', state('cubic', 1, 0, 3), [0]],
  ['triple zero', state('cubic', 1, 0, 0), [0]],
  ['repeated cubic root', state('cubic', 1, -2, 1), [0, 1]],
  ['cubic reduces to quadratic', state('cubic', 0, 1, -2), [0, 2]],
  ['cubic reduces to linear', state('cubic', 0, 0, -3), [0]],
  ['negative leading cubic', state('cubic', -1, 0, 3), [-Math.sqrt(3), 0, Math.sqrt(3)]],
  ['default quadratic', state('quadratic', 1, -2, -1), [1 - Math.sqrt(2), 1 + Math.sqrt(2)]],
  ['double quadratic root', state('quadratic', 1, -2, 1), [1]],
  ['decimal double root', state('quadratic', 0.1, 0.2, 0.1), [-1]],
  ['quadratic no real roots', state('quadratic', 1, 0, 1), []],
  ['quadratic reduces to linear', state('quadratic', 0, 2, -6), [3]],
  ['constant nonzero quadratic', state('quadratic', 0, 0, -2), []],
  ['quadratic zero constant', state('quadratic', 1, 2, 0), [-2, 0]],
  ['sine zeros in fixed bounds', state('sine', 2, 1, 0), [-Math.PI, 0, Math.PI]],
  ['negative sine frequency', state('sine', -2, -1, 0), [-Math.PI, 0, Math.PI]],
  ['shifted sine', state('sine', 1, 1, 1), [-1, Math.PI - 1]],
  ['sine roots outside interval', state('sine', 1, 0.2, 1.5), []],
  ['constant nonzero sine', state('sine', 1, 0, 1), []],
];
for (const [name, s, expected] of cases) test(name, () => {
  const result = M.realRoots(s);
  assert.equal(result.values.length, expected.length);
  assert.equal(result.kind, expected.length ? 'finite' : 'none');
  result.values.forEach((x, i) => { near(x, expected[i]); near(M.evaluate(s, x), 0); });
});
for (const s of [state('cubic', 0, 0, 0), state('quadratic', 0, 0, 0), state('sine', 0, 2, 1), state('sine', 2, 0, 0), state('sine', 2, 0, Math.PI)]) {
  test(`identically zero: ${JSON.stringify(s)}`, () => assert.equal(M.realRoots(s).kind, 'all'));
}
test('sine endpoint zeros included', () => {
  const r = M.realRoots(state('sine', 1, Math.PI / 4, 0));
  assert.deepEqual(Array.from(r.values), [-4, 0, 4]);
});
test('x cubed has stationary inflection, not a local extremum', () => assert.match(M.pivotKind(state('cubic', 1, 0, 0), 0), /Stationary inflection/));
test('default cubic has separate maximum and minimum', () => {
  const s = state('cubic', 1, 0, -3);
  assert.match(M.pivotKind(s, -1), /Local maximum/);
  assert.match(M.pivotKind(s, 1), /Local minimum/);
  assert.match(M.pivotKind(s, 0), /Non-stationary/);
});
test('quadratic extremum and flat degeneracy', () => {
  assert.match(M.pivotKind(state('quadratic', -1, 2, 0), 1), /Local maximum/);
  assert.match(M.pivotKind(state('quadratic', 0, 0, 2), 1), /Constant/);
});
test('sine extrema use radians and zero frequency is constant', () => {
  assert.match(M.pivotKind(state('sine', 2, 1, 0), Math.PI / 2), /Local maximum/);
  assert.match(M.pivotKind(state('sine', 2, 1, 0), -Math.PI / 2), /Local minimum/);
  assert.match(M.pivotKind(state('sine', 2, 0, 1), 0), /Constant/);
});
test('analytic slopes match independent known values', () => {
  near(M.derivative(state('cubic', 1, 2, -3), 2), 17);
  near(M.derivative(state('quadratic', -1, 2, 3), 3), -4);
  near(M.derivative(state('sine', 2, 3, 0), 0), 6);
});
test('signed integrals distinguish cancellation and negative values', () => {
  near(M.signedIntegral(state('cubic', 1, 0, -3)), 0);
  near(M.signedIntegral(state('cubic', 1, 3, -3)), 16);
  near(M.signedIntegral(state('quadratic', 1, -2, -1)), 4 / 3);
  near(M.signedIntegral(state('quadratic', 0, 0, -2)), -8);
  near(M.signedIntegral(state('sine', 2, 1, 0)), 0);
  near(M.signedIntegral(state('sine', 2, 0, Math.PI / 2)), 8);
  near(M.signedIntegral(state('sine', 2, 1, Math.PI / 2)), 4 * Math.sin(2));
});
test('integral zero width, orientation and tiny frequency', () => {
  for (const mode of ['cubic', 'quadratic', 'sine']) {
    const s = state(mode, 1, 2, 3);
    near(M.signedIntegral(s, 1, 1), 0);
    near(M.signedIntegral(s, 2, -1), -M.signedIntegral(s, -1, 2));
  }
  near(M.signedIntegral(state('sine', 2, 1e-14, 1)), 8 * Math.sin(1));
});
test('bounded coefficient grid: every displayed root satisfies its function', () => {
  for (const mode of ['cubic', 'quadratic', 'sine']) for (const a of [-3, -1, 0, 0.1, 1, 3])
    for (const b of [-4, -1, 0, 0.2, 2, 4]) for (const c of [-6, -1, 0, 0.5, 3, 6]) {
      const s = state(mode, a, b, c), r = M.realRoots(s);
      r.values.forEach((x, i) => {
        near(M.evaluate(s, x), 0, 1e-7);
        if (i) assert.ok(x > r.values[i - 1]);
        if (mode === 'sine') assert.ok(x >= -4 && x <= 4);
      });
    }
});
test('root labels are approximate, domain-specific and remove negative zero', () => {
  assert.equal(M.formatRoots(M.realRoots(state('cubic', 1, 0, -3))), 'x ≈ -1.732, 0, 1.732');
  assert.equal(M.formatRoots(M.realRoots(state('quadratic', 0, 0, 0))), 'All real x');
  assert.equal(M.formatRoots(M.realRoots(state('quadratic', 1, 0, 1))), 'No real roots');
  assert.equal(M.formatRoots(M.realRoots(state('sine', 1, 0.2, 1.5))), 'No real zeros in [-4, 4]');
});
test('unsupported input fails explicitly instead of displaying stale roots', () => {
  for (const s of [state('unknown', 1, 0, 0), state('cubic', NaN, 0, 0), state('sine', 1, Infinity, 0), state('quadratic', 4, 0, 0), { ...state('cubic', 1, 0, 0), d: 1 }]) assert.throws(() => M.realRoots(s));
});
test('pure helper exposes no network, storage, code execution or DOM operations', () => {
  assert.doesNotMatch(source, /\b(fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|eval|document|setInterval)\b/);
  assert.ok(Object.isFrozen(M));
});
