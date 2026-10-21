/** Reproducible fixed-step RK4 pendulum reference trajectory.
 * Damping is zero; energy drift is numerical and should be measured, not assumed absent.
 */
export interface PendulumFrame {
  timeSeconds: number;
  angleRadians: number;
  angularVelocityRadS: number;
  kineticJoules: number;
  potentialJoules: number;
  totalJoules: number;
}
export interface PendulumParameters {
  lengthM: number;
  gravityMs2: number;
  massKg: number;
  initialAngleRadians: number;
  durationSeconds: number;
  stepSeconds: number;
}
export function pendulumTrajectory(p: PendulumParameters): PendulumFrame[] {
  const { lengthM: l, gravityMs2: g, massKg: m, durationSeconds: duration, stepSeconds: dt } = p;
  if (![l, g, m, duration, dt, p.initialAngleRadians].every(Number.isFinite) ||
      l <= 0 || g <= 0 || m <= 0 || duration <= 0 || dt <= 0 || duration > 120 ||
      dt > 0.1 || duration / dt > 12000 || Math.abs(p.initialAngleRadians) > Math.PI) {
    throw new RangeError("Pendulum parameters outside supported educational bounds");
  }
  let angle = p.initialAngleRadians, velocity = 0;
  const derivative = (a: number, w: number): [number, number] => [w, -(g / l) * Math.sin(a)];
  const frames: PendulumFrame[] = [];
  const count = Math.floor(duration / dt);
  for (let i = 0; i <= count; i++) {
    const kinetic = 0.5 * m * (l * velocity) ** 2;
    const potential = m * g * l * (1 - Math.cos(angle));
    frames.push({ timeSeconds: Number((i * dt).toFixed(10)), angleRadians: angle, angularVelocityRadS: velocity, kineticJoules: kinetic, potentialJoules: potential, totalJoules: kinetic + potential });
    if (i === count) break;
    const [k1a, k1w] = derivative(angle, velocity);
    const [k2a, k2w] = derivative(angle + dt * k1a / 2, velocity + dt * k1w / 2);
    const [k3a, k3w] = derivative(angle + dt * k2a / 2, velocity + dt * k2w / 2);
    const [k4a, k4w] = derivative(angle + dt * k3a, velocity + dt * k3w);
    angle += dt * (k1a + 2 * k2a + 2 * k3a + k4a) / 6;
    velocity += dt * (k1w + 2 * k2w + 2 * k3w + k4w) / 6;
  }
  return frames;
}
