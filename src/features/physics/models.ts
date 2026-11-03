/**
 * Luqi local Physics Discovery Lab: deterministic classroom models.
 * Assumptions are intentionally explicit; no AI calls or external data needed.
 */
export type PhysicsId = 'projectile' | 'incline' | 'circuit' | 'wave' | 'lens' | 'energy' | 'collision' | 'thermal';
export type LabControl = {
  key: string; label: string; unit: string; min: number; max: number; step: number; initial: number;
  options?: { value: number; label: string }[];
};
export type PhysicsTopic = {
  id: PhysicsId; title: string; subject: string; level: string; summary: string;
  formula: string; assumptions: string; challenge: string; controls: LabControl[];
};
export type LabMetric = { label: string; value: number | null; unit: string };
export type PhysicsResult = { metrics: LabMetric[]; values: Record<string, number>; insight: string; state: string };

export const PHYSICS_TOPICS: PhysicsTopic[] = [
  { id: 'projectile', title: 'Projectile motion', subject: 'Motion', level: 'Grade 10–12',
    summary: 'Launch a ball at different angles and compare flight time, peak height and horizontal range.',
    formula: 'x = v cos(θ)t; y = h + v sin(θ)t − ½gt²',
    assumptions: 'Ideal motion on level ground, constant gravity, no air resistance or wind.',
    challenge: 'Predict what happens to horizontal range when you increase the angle above 45° from ground level.',
    controls: [
      { key: 'speed', label: 'Launch speed', unit: 'm/s', min: 5, max: 40, step: 1, initial: 20 },
      { key: 'angle', label: 'Launch angle', unit: '°', min: 5, max: 85, step: 1, initial: 45 },
      { key: 'height', label: 'Starting height', unit: 'm', min: 0, max: 10, step: 0.5, initial: 0 },
      { key: 'gravity', label: 'Gravity', unit: 'm/s²', min: 1.6, max: 15, step: 0.1, initial: 9.8 },
      { key: 'progress', label: 'Flight position', unit: '%', min: 0, max: 100, step: 5, initial: 50 },
    ] },
  { id: 'incline', title: 'Forces and friction', subject: 'Forces', level: 'Grade 9–12',
    summary: 'See when a block stays still and when gravity overcomes friction on an inclined plane.',
    formula: 'F∥ = mg sin(θ); N = mg cos(θ); a = Fnet/m',
    assumptions: 'Straight rigid slope, one simplified Coulomb friction coefficient for rest and motion; no air drag.',
    challenge: 'Keep the angle fixed. How much friction is needed to stop the block sliding?',
    controls: [
      { key: 'angle', label: 'Slope angle', unit: '°', min: 0, max: 60, step: 1, initial: 30 },
      { key: 'mass', label: 'Block mass', unit: 'kg', min: 1, max: 10, step: 0.5, initial: 3 },
      { key: 'friction', label: 'Friction coefficient', unit: 'μ', min: 0, max: 0.9, step: 0.05, initial: 0.3 },
      { key: 'gravity', label: 'Gravity', unit: 'm/s²', min: 1.6, max: 15, step: 0.1, initial: 9.8 },
    ] },
  { id: 'circuit', title: 'Electric circuits', subject: 'Electricity', level: 'Grade 10–12',
    summary: 'Switch two resistors between series and parallel, then calculate current and power.',
    formula: 'I = V/Req; P = VI; series: R1+R2; parallel: R1R2/(R1+R2)',
    assumptions: 'Ideal DC source and resistors; no lead resistance, heating or battery voltage sag.',
    challenge: 'Which connection draws more current from the same battery, series or parallel?',
    controls: [
      { key: 'voltage', label: 'Battery voltage', unit: 'V', min: 1, max: 24, step: 1, initial: 12 },
      { key: 'r1', label: 'Resistance 1', unit: 'Ω', min: 1, max: 100, step: 1, initial: 10 },
      { key: 'r2', label: 'Resistance 2', unit: 'Ω', min: 1, max: 100, step: 1, initial: 20 },
      { key: 'parallel', label: 'Connection', unit: '', min: 0, max: 1, step: 1, initial: 0,
        options: [{ value: 0, label: 'Series' }, { value: 1, label: 'Parallel' }] },
    ] },
  { id: 'wave', title: 'Waves and sound', subject: 'Waves', level: 'Grade 10–12',
    summary: 'Explore amplitude, wavelength, frequency, period and a travelling-wave snapshot.',
    formula: 'v = fλ; T = 1/f; y = A sin(2πx/λ − φ)',
    assumptions: 'Ideal sinusoidal travelling wave. Frequency and wavelength can vary independently; speed follows v = fλ.',
    challenge: 'If you double frequency while keeping wavelength fixed, what happens to wave speed?',
    controls: [
      { key: 'frequency', label: 'Frequency', unit: 'Hz', min: 0.5, max: 8, step: 0.5, initial: 2 },
      { key: 'wavelength', label: 'Wavelength', unit: 'm', min: 0.5, max: 10, step: 0.5, initial: 3 },
      { key: 'amplitude', label: 'Amplitude', unit: 'm', min: 0.2, max: 2, step: 0.1, initial: 1 },
      { key: 'phase', label: 'Phase', unit: '°', min: 0, max: 360, step: 15, initial: 0 },
    ] },
  { id: 'lens', title: 'Lenses and images', subject: 'Optics', level: 'Grade 11–12',
    summary: 'Move an object relative to a converging lens to explore real and virtual images.',
    formula: '1/f = 1/do + 1/di; m = −di/do',
    assumptions: 'Ideal thin converging lens, paraxial rays and distances measured along the optical axis.',
    challenge: 'Move the object inside the focal length. Why does the image become upright and virtual?',
    controls: [
      { key: 'focal', label: 'Focal length', unit: 'cm', min: 5, max: 25, step: 1, initial: 12 },
      { key: 'objectDistance', label: 'Object distance', unit: 'cm', min: 5, max: 60, step: 1, initial: 30 },
      { key: 'objectHeight', label: 'Object height', unit: 'cm', min: 1, max: 12, step: 1, initial: 5 },
    ] },
  { id: 'energy', title: 'Energy on a ramp', subject: 'Energy', level: 'Grade 9–12',
    summary: 'Move along a frictionless ramp to see gravitational potential become kinetic energy.',
    formula: 'E = mgh = ½mv² + mghcurrent',
    assumptions: 'Starts from rest. No friction, wind, rotation, energy loss or externally applied forces.',
    challenge: 'Does changing the mass change the speed at the bottom of an ideal ramp?',
    controls: [
      { key: 'mass', label: 'Rider mass', unit: 'kg', min: 1, max: 20, step: 1, initial: 5 },
      { key: 'height', label: 'Starting height', unit: 'm', min: 2, max: 30, step: 1, initial: 12 },
      { key: 'progress', label: 'Down-ramp position', unit: '%', min: 0, max: 100, step: 5, initial: 40 },
      { key: 'gravity', label: 'Gravity', unit: 'm/s²', min: 1.6, max: 15, step: 0.1, initial: 9.8 },
    ] },
  { id: 'collision', title: 'Momentum and collisions', subject: 'Motion', level: 'Grade 12',
    summary: 'Compare two carts in a one-dimensional collision and change how elastic their collision is.',
    formula: 'm1u1 + m2u2 = m1v1 + m2v2; e = (v2 − v1)/(u1 − u2)',
    assumptions: 'Straight-line ideal collision, no outside impulse. When cart 1 is not catching cart 2, they do not collide.',
    challenge: 'Set restitution to zero. How much kinetic energy is lost when the carts move together?',
    controls: [
      { key: 'm1', label: 'Cart 1 mass', unit: 'kg', min: 1, max: 10, step: 1, initial: 2 },
      { key: 'm2', label: 'Cart 2 mass', unit: 'kg', min: 1, max: 10, step: 1, initial: 1 },
      { key: 'u1', label: 'Cart 1 speed', unit: 'm/s', min: 1, max: 10, step: 1, initial: 6 },
      { key: 'u2', label: 'Cart 2 speed', unit: 'm/s', min: 0, max: 5, step: 1, initial: 0 },
      { key: 'restitution', label: 'Restitution coefficient', unit: 'e', min: 0, max: 1, step: 0.1, initial: 1 },
    ] },
  { id: 'thermal', title: 'Heat and temperature', subject: 'Thermal physics', level: 'Grade 10–12',
    summary: 'Compare the heat needed to warm water, aluminium and steel by the same temperature rise.',
    formula: 'Q = mcΔT',
    assumptions: 'Constant approximate specific heat, no phase change, no heat loss and uniform temperature.',
    challenge: 'Try the same mass and temperature rise for water and aluminium. Which needs more heat?',
    controls: [
      { key: 'material', label: 'Material', unit: '', min: 0, max: 2, step: 1, initial: 0,
        options: [{ value: 0, label: 'Water' }, { value: 1, label: 'Aluminium' }, { value: 2, label: 'Steel' }] },
      { key: 'mass', label: 'Material mass', unit: 'kg', min: 0.1, max: 5, step: 0.1, initial: 1 },
      { key: 'initial', label: 'Starting temperature', unit: '°C', min: 10, max: 70, step: 5, initial: 20 },
      { key: 'rise', label: 'Temperature increase', unit: '°C', min: 0, max: 20, step: 1, initial: 10 },
    ] },
];

export function initialPhysicsValues(id: PhysicsId): Record<string, number> {
  const topic = PHYSICS_TOPICS.find(topic => topic.id === id);
  if (!topic) throw new Error('Unknown physics topic');
  return Object.fromEntries(topic.controls.map(control => [control.key, control.initial]));
}

function input(id: PhysicsId, key: string, params: Record<string, number>): number {
  const topic = PHYSICS_TOPICS.find(topic => topic.id === id);
  const control = topic?.controls.find(control => control.key === key);
  if (!control) throw new Error('Unknown physics control');
  const value = params[key];
  return Math.min(control.max, Math.max(control.min, Number.isFinite(value) ? value : control.initial));
}
const metric = (label: string, value: number | null, unit = ''): LabMetric => ({ label, value, unit });

export function evaluatePhysics(id: PhysicsId, params: Record<string, number>): PhysicsResult {
  const p = (key: string) => input(id, key, params);
  if (id === 'projectile') {
    const g = p('gravity'), v = p('speed'), angle = p('angle') * Math.PI / 180, h = p('height');
    const vx = v * Math.cos(angle), vy = v * Math.sin(angle);
    const duration = (vy + Math.sqrt(vy * vy + 2 * g * h)) / g;
    const t = duration * p('progress') / 100;
    const x = vx * t, y = Math.max(0, h + vy * t - g * t * t / 2);
    const range = vx * duration, peak = h + vy * vy / (2 * g);
    return { state: 'In flight', insight: 'At the same launch height, horizontal and vertical motion are independent. Air resistance would shorten a real flight.',
      metrics: [metric('Horizontal range', range, 'm'), metric('Flight time', duration, 's'), metric('Maximum height', peak, 'm'), metric('Current height', y, 'm')],
      values: { x, y, t, duration, range, peak, vx, vy, h } };
  }
  if (id === 'incline') {
    const g = p('gravity'), m = p('mass'), theta = p('angle') * Math.PI / 180, mu = p('friction');
    const downslope = m * g * Math.sin(theta), normal = m * g * Math.cos(theta);
    const sliding = downslope > mu * normal + 1e-9;
    const net = sliding ? Math.max(0, downslope - mu * normal) : 0;
    return { state: sliding ? 'Sliding downhill' : 'At rest', insight: 'At rest, static friction balances the downhill component. Once sliding begins, this simplified model uses the same coefficient.',
      metrics: [metric('Downhill force', downslope, 'N'), metric('Normal force', normal, 'N'), metric('Net force', net, 'N'), metric('Acceleration', net / m, 'm/s²')],
      values: { downslope, normal, net, acceleration: net / m, sliding: sliding ? 1 : 0, theta } };
  }
  if (id === 'circuit') {
    const v = p('voltage'), r1 = p('r1'), r2 = p('r2'), parallel = p('parallel') >= 0.5;
    const req = parallel ? r1 * r2 / (r1 + r2) : r1 + r2;
    const current = v / req;
    return { state: parallel ? 'Parallel connection' : 'Series connection', insight: 'Parallel branches lower equivalent resistance; for a fixed ideal voltage, the total current increases.',
      metrics: [metric('Equivalent resistance', req, 'Ω'), metric('Total current', current, 'A'), metric('Circuit power', v * current, 'W'), metric('Battery voltage', v, 'V')],
      values: { req, current, power: v * current, parallel: parallel ? 1 : 0 } };
  }
  if (id === 'wave') {
    const f = p('frequency'), wavelength = p('wavelength'), amplitude = p('amplitude'), phase = p('phase') * Math.PI / 180;
    return { state: 'Travelling-wave snapshot', insight: 'Amplitude measures maximum displacement, while frequency and wavelength determine the chosen wave speed.',
      metrics: [metric('Wave speed', f * wavelength, 'm/s'), metric('Period', 1 / f, 's'), metric('Wavelength', wavelength, 'm'), metric('Amplitude', amplitude, 'm')],
      values: { speed: f * wavelength, period: 1 / f, wavelength, amplitude, phase } };
  }
  if (id === 'lens') {
    const f = p('focal'), objectDistance = p('objectDistance'), objectHeight = p('objectHeight');
    const atFocus = Math.abs(objectDistance - f) < 1e-9;
    const imageDistance = atFocus ? Infinity : f * objectDistance / (objectDistance - f);
    const magnification = atFocus ? Infinity : -imageDistance / objectDistance;
    return { state: atFocus ? 'Image at infinity' : imageDistance > 0 ? 'Real, inverted image' : 'Virtual, upright image',
      insight: atFocus ? 'At the focal point outgoing rays are parallel; no finite image distance exists.' :
        imageDistance > 0 ? 'A real inverted image can be projected onto a screen.' : 'A virtual upright image appears on the object side of the lens.',
      metrics: [metric('Image distance', atFocus ? null : imageDistance, 'cm'), metric('Magnification', atFocus ? null : magnification, '×'), metric('Image height', atFocus ? null : magnification * objectHeight, 'cm')],
      values: { f, objectDistance, objectHeight, imageDistance, magnification, atFocus: atFocus ? 1 : 0 } };
  }
  if (id === 'energy') {
    const mass = p('mass'), startHeight = p('height'), g = p('gravity');
    const currentHeight = startHeight * (1 - p('progress') / 100);
    const potential = mass * g * currentHeight;
    const kinetic = mass * g * (startHeight - currentHeight);
    return { state: 'Ideal energy conversion', insight: 'In an ideal lossless descent, the total mechanical energy stays constant; mass changes energy, not speed.',
      metrics: [metric('Potential energy', potential, 'J'), metric('Kinetic energy', kinetic, 'J'), metric('Speed', Math.sqrt(2 * g * (startHeight - currentHeight)), 'm/s'), metric('Total energy', mass * g * startHeight, 'J')],
      values: { potential, kinetic, total: mass * g * startHeight, currentHeight, startHeight } };
  }
  if (id === 'collision') {
    const m1 = p('m1'), m2 = p('m2'), u1 = p('u1'), u2 = p('u2'), e = p('restitution');
    const approaching = u1 > u2;
    const total = m1 + m2, momentum = m1 * u1 + m2 * u2;
    const v1 = approaching ? (momentum - m2 * e * (u1 - u2)) / total : u1;
    const v2 = approaching ? (momentum + m1 * e * (u1 - u2)) / total : u2;
    const before = (m1 * u1 * u1 + m2 * u2 * u2) / 2;
    const after = (m1 * v1 * v1 + m2 * v2 * v2) / 2;
    return { state: approaching ? (e === 0 ? 'Perfectly inelastic' : e === 1 ? 'Elastic' : 'Partially inelastic') : 'No catch-up collision',
      insight: approaching ? 'Momentum is conserved, while kinetic energy is conserved only in a perfectly elastic collision.' :
        'Cart 1 is not moving faster than cart 2; with these starting positions, no collision occurs.',
      metrics: [metric('Cart 1 final velocity', v1, 'm/s'), metric('Cart 2 final velocity', v2, 'm/s'), metric('Momentum before / after', momentum, 'kg·m/s'), metric('Energy dissipated', Math.max(0, before - after), 'J')],
      values: { m1, m2, u1, u2, v1, v2, momentum, before, after } };
  }
  const material = Math.round(p('material'));
  const capacities = [4180, 900, 450];
  const names = ['Water', 'Aluminium', 'Steel'];
  const c = capacities[material], mass = p('mass'), rise = p('rise'), start = p('initial');
  const q = mass * c * rise;
  return { state: names[material], insight: 'Different materials require different amounts of energy for the same mass and temperature rise. This model excludes melting and boiling.',
    metrics: [metric('Heat supplied', q / 1000, 'kJ'), metric('Final temperature', start + rise, '°C'), metric('Specific heat', c, 'J/(kg·°C)')],
    values: { q, c, mass, start, rise, final: start + rise, material } };
}
