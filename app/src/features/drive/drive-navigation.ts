// Regional orientation and landmark proximity. Distances are straight-line kilometres.
import { corridors } from "./drive-content";

export type Point = { lat: number; lon: number };
export type PhoneFix = Point & {
  accuracy: number;
  timestamp: number;
  speed: number | null;
  heading: number | null;
};
export const stops = [
  {
    index: 0,
    name: "Tswaing crater",
    area: "Soshanguve",
    destination:
      "Ditsong Tswaing Meteorite Crater Visitor Centre, South Africa",
  },
  {
    index: 1,
    name: "Magaliesberg",
    area: "Brits & Rustenburg",
    destination: null,
  },
  {
    index: 3,
    name: "Cradle of Humankind",
    area: "Sterkfontein",
    destination: "Sterkfontein Caves Visitor Centre, South Africa",
  },
  {
    index: 2,
    name: "Mandela House",
    area: "Orlando West, Soweto",
    destination: "Mandela House, 8115 Vilakazi Street, Soweto, South Africa",
  },
].map((s) => ({ ...corridors[s.index], ...s }));
export const legSeconds = 18;
export const demoSeconds = legSeconds * stops.length;
const origin = { lat: -25.52, lon: 28.09 };
const rad = (x: number) => (x * Math.PI) / 180;
const deg = (x: number) => (x * 180) / Math.PI;

export function distanceKm(a: Point, b: Point) {
  const term =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) *
      Math.cos(rad(b.lat)) *
      Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(Math.min(1, term)));
}
export function bearing(a: Point, b: Point) {
  if (a.lat === b.lat && a.lon === b.lon) return null;
  const delta = rad(b.lon - a.lon);
  return (
    (deg(
      Math.atan2(
        Math.sin(delta) * Math.cos(rad(b.lat)),
        Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) -
          Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(delta),
      ),
    ) +
      360) %
    360
  );
}
export function compass(degrees: number | null) {
  return degrees === null
    ? "—"
    : ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][
        Math.round(degrees / 45) % 8
      ];
}
export function demoFrame(seconds: number) {
  const time = Math.max(0, Math.min(demoSeconds, seconds));
  const leg = Math.min(stops.length - 1, Math.floor(time / legSeconds));
  const from = leg ? stops[leg - 1] : origin,
    to = stops[leg];
  const t = (time - legSeconds * leg) / legSeconds;
  return {
    leg,
    lat: from.lat + (to.lat - from.lat) * t,
    lon: from.lon + (to.lon - from.lon) * t,
    heading: bearing(from, to),
    arrived: time === demoSeconds,
  };
}
export function readFix(
  position: GeolocationPosition,
  now = Date.now(),
): PhoneFix | null {
  const c = position?.coords;
  if (
    !c ||
    !Number.isFinite(c.latitude) ||
    Math.abs(c.latitude) > 90 ||
    !Number.isFinite(c.longitude) ||
    Math.abs(c.longitude) > 180 ||
    !Number.isFinite(c.accuracy) ||
    c.accuracy < 0 ||
    !Number.isFinite(position.timestamp) ||
    now - position.timestamp > 30000 ||
    position.timestamp > now + 5000
  )
    return null;
  return {
    lat: c.latitude,
    lon: c.longitude,
    accuracy: c.accuracy,
    timestamp: position.timestamp,
    speed:
      c.speed !== null && Number.isFinite(c.speed) && c.speed >= 0
        ? Math.round(c.speed * 3.6)
        : null,
    heading:
      c.speed !== 0 &&
      c.heading !== null &&
      Number.isFinite(c.heading) &&
      c.heading >= 0 &&
      c.heading < 360
        ? c.heading
        : null,
  };
}
export function matchLandmark(fix: PhoneFix | null): number | null {
  if (!fix || fix.accuracy > 5000) return null;
  let match: number | null = null,
    best = Infinity;
  stops.forEach((stop, i) => {
    const km = distanceKm(fix, stop);
    if (km + fix.accuracy / 1000 <= 12 && km < best) {
      match = i;
      best = km;
    }
  });
  return match;
}
export { origin as demoOrigin };
