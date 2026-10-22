/**
 * Reviewed, deterministic education examples. No generated JavaScript is
 * evaluated. These formulas are illustrative and not engineering advice.
 */
export function evaluateReviewedSimulation(conceptHash: string, input: number): string {
  if (!Number.isFinite(input)) return "Please enter a finite number.";
  switch (conceptHash) {
    case "pre-counting-baobab": {
      const count = Math.max(1, Math.min(10, Math.round(input)));
      return `${count} fruit${count === 1 ? "" : "s"} in the counting tree.`;
    }
    case "primary-solar-rooftop": {
      const panels = Math.max(1, Math.min(40, Math.round(input)));
      const kwh = panels * 0.4 * 5.5;
      return `Illustrative daily energy: ${kwh.toFixed(2)} kWh (400 W panels, 5.5 peak sun hours; no losses).`;
    }
    case "high-projectile-kinematics": {
      const velocity = Math.max(0, Math.min(120, input));
      const gravity = 9.81;
      const range = velocity * velocity / gravity;
      const height = velocity * velocity / (4 * gravity);
      return `Ideal 45° range: ${range.toFixed(2)} m; peak height: ${height.toFixed(2)} m (ignoring air resistance).`;
    }
    case "higher-gravitational-orbital": {
      const multiplier = Math.max(0.1, Math.min(10, input));
      const G = 6.6743e-11;
      const earthMass = 5.972e24 * multiplier;
      const radius = 6.371e6 + 400e3;
      const orbitalSpeed = Math.sqrt(G * earthMass / radius);
      return `Illustrative circular orbital speed: ${orbitalSpeed.toFixed(1)} m/s at 400 km altitude.`;
    }
    default:
      return "Unreviewed generated simulation logic is disabled for safety.";
  }
}
