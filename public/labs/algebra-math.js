/* Pure, local calculations for this lab's ax^3 + bx^2 + cx, ax^2 + bx + c,
 * and a*sin(bx+c) controls. Angles are radians. No network or storage access. */
(() => {
  'use strict';
  const EPS = 64 * Number.EPSILON;
  function validate(s) {
    if (!s || !['cubic', 'quadratic', 'sine'].includes(s.mode) ||
        ![s.a, s.b, s.c].every(Number.isFinite) ||
        Math.abs(s.a) > 3 || Math.abs(s.b) > 4 || Math.abs(s.c) > 6 ||
        (s.mode === 'cubic' && s.d !== undefined && s.d !== 0)) {
      throw new RangeError('Unsupported algebra lab parameters');
    }
  }
  function evaluate(s, x) {
    if (s.mode === 'cubic') return ((s.a * x + s.b) * x + s.c) * x;
    if (s.mode === 'quadratic') return (s.a * x + s.b) * x + s.c;
    if (s.mode === 'sine') return s.a * Math.sin(s.b * x + s.c);
    throw new RangeError('Unsupported function family');
  }
  function derivative(s, x) {
    if (s.mode === 'cubic') return (3 * s.a * x + 2 * s.b) * x + s.c;
    if (s.mode === 'quadratic') return 2 * s.a * x + s.b;
    if (s.mode === 'sine') return s.a * s.b * Math.cos(s.b * x + s.c);
    throw new RangeError('Unsupported function family');
  }
  function distinct(values) {
    return values.map(x => Object.is(x, -0) ? 0 : x).sort((a, b) => a - b)
      .filter((x, i, all) => i === 0 || Math.abs(x - all[i - 1]) > EPS * Math.max(1, Math.abs(x), Math.abs(all[i - 1])));
  }
  function quadratic(a, b, c) {
    if (a === 0) return b === 0 ? [] : [-c / b];
    const square = b * b, product = 4 * a * c;
    const delta = square - product;
    const tolerance = EPS * Math.max(Math.abs(square), Math.abs(product));
    if (delta < -tolerance) return [];
    if (Math.abs(delta) <= tolerance) return [-b / (2 * a)];
    // Avoid cancellation in the smaller root. A zero discriminant was handled above.
    const q = -0.5 * (b + (b >= 0 ? 1 : -1) * Math.sqrt(delta));
    return distinct([q / a, c / q]);
  }
  function realRoots(s) {
    validate(s);
    const { a, b, c, mode } = s;
    const interval = mode === 'sine' ? [-4, 4] : null;
    let values;
    if (mode === 'sine') {
      if (a === 0 || (b === 0 && Number.isInteger(c / Math.PI))) return { kind: 'all', values: [], interval };
      if (b === 0) return { kind: 'none', values: [], interval };
      const phases = interval.map(x => (b * x + c) / Math.PI);
      const first = Math.ceil(Math.min(...phases) - EPS * Math.max(1, ...phases.map(Math.abs)));
      const last = Math.floor(Math.max(...phases) + EPS * Math.max(1, ...phases.map(Math.abs)));
      values = [];
      for (let k = first; k <= last; k++) {
        const x = (k * Math.PI - c) / b;
        if (x >= -4 - EPS * 4 && x <= 4 + EPS * 4) values.push(Math.max(-4, Math.min(4, x)));
      }
    } else {
      if (a === 0 && b === 0 && c === 0) return { kind: 'all', values: [], interval };
      values = mode === 'cubic' ? [0, ...quadratic(a, b, c)] : quadratic(a, b, c);
    }
    if (!values.every(Number.isFinite)) throw new RangeError('Roots exceed numerical range');
    values = distinct(values);
    return { kind: values.length ? 'finite' : 'none', values, interval };
  }
  function signedIntegral(s, lo = -2, hi = 2) {
    validate(s);
    if (![lo, hi].every(Number.isFinite)) throw new RangeError('Finite integration bounds required');
    const { a, b, c, mode } = s;
    if (mode === 'cubic') return a * (hi ** 4 - lo ** 4) / 4 + b * (hi ** 3 - lo ** 3) / 3 + c * (hi ** 2 - lo ** 2) / 2;
    if (mode === 'quadratic') return a * (hi ** 3 - lo ** 3) / 3 + b * (hi ** 2 - lo ** 2) / 2 + c * (hi - lo);
    const half = b * (hi - lo) / 2;
    // Stable as frequency tends to zero; includes the constant-function case.
    return a * (hi - lo) * Math.sin(c + b * (lo + hi) / 2) * (half === 0 ? 1 : Math.sin(half) / half);
  }
  function pivotKind(s, x) {
    validate(s);
    if (!Number.isFinite(x)) throw new RangeError('Finite pivot required');
    const { a, b, c, mode } = s;
    if ((mode === 'sine' && (a === 0 || b === 0)) ||
        (mode === 'quadratic' && a === 0 && b === 0) ||
        (mode === 'cubic' && a === 0 && b === 0 && c === 0)) return 'Constant function; no isolated turning point';
    const scale = Math.max(1, Math.abs(3 * a * x * x), Math.abs(2 * b * x), Math.abs(c), Math.abs(a * b));
    if (Math.abs(derivative(s, x)) > EPS * scale) return 'Non-stationary at the pivot';
    const second = mode === 'cubic' ? 6 * a * x + 2 * b : mode === 'quadratic' ? 2 * a : -a * b * b * Math.sin(b * x + c);
    if (Math.abs(second) <= EPS * Math.max(1, Math.abs(6 * a * x), Math.abs(2 * b)) && mode === 'cubic' && a !== 0) return 'Stationary inflection; not a turning point';
    return second > 0 ? 'Local minimum at the pivot' : 'Local maximum at the pivot';
  }
  function formatRoots(result) {
    if (result.kind === 'all') return 'All real x';
    if (result.kind === 'none') return result.interval ? 'No real zeros in [-4, 4]' : 'No real roots';
    return 'x ≈ ' + result.values.map(x => Number(x.toFixed(3)).toString()).join(', ');
  }
  globalThis.LuqiAlgebra = Object.freeze({ evaluate, derivative, realRoots, signedIntegral, pivotKind, formatRoots });
})();
