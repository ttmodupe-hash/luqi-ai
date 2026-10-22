/** Reviewed, deterministic sample calculations; NEVER run model-generated JS. */
export function calculateEducationSample(
  conceptHash: string,
  input: number,
  unit = "units",
): string {
  if (!Number.isFinite(input)) return "Enter a valid finite number";
  switch (conceptHash) {
    case "pre-counting-baobab": {
      const count = Math.max(1, Math.min(10, Math.round(input)));
      return `${count} Baobab mangoes: ${"🥭 ".repeat(count).trim()} | ${count > 5 ? "🦅 High canopy eagle watching!" : "🐦 Sunbird chirping!"}`;
    }
    case "primary-solar-rooftop": {
      const panels = Math.max(1, Math.min(40, Math.round(input)));
      const dailyKwh = panels * 400 * 5.5 / 1000;
      return `${dailyKwh.toFixed(2)} kWh/day (illustrative only) | Equivalent to ${(dailyKwh / 10).toFixed(1)} hypothetical 10 kWh/day homes`;
    }
    case "high-projectile-kinematics": {
      const velocity = Math.max(1, input);
      const g = 9.81;
      const range = velocity * velocity / g; // 45 degrees, no drag
      const height = velocity * velocity / (4 * g);
      return `Ideal 45° range: ${range.toFixed(2)} m | peak height: ${height.toFixed(2)} m (air resistance ignored)`;
    }
    case "higher-gravitational-orbital": {
      const G = 6.6743e-11;
      const earthMass = 5.972e24 * Math.max(0.1, input);
      const radius = 6.371e6 + 400e3;
      const speed = Math.sqrt(G * earthMass / radius);
      const surfaceG = G * earthMass / (6.371e6 * 6.371e6);
      return `Circular orbital speed: ${speed.toFixed(1)} m/s | surface gravity: ${surfaceG.toFixed(2)} m/s² (idealised model)`;
    }
    default:
      return `Reviewed calculation unavailable for ${Number(input).toLocaleString()} ${unit}. Generated code is not executed in the browser.`;
  }
}
