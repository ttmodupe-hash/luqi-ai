/** Read-only, key-free Earth context. No raw GNSS access, RTK or position correction. */
export type MotionFix = { speed: number | null; heading: number | null; timestamp: number };
export type MotionEstimate = MotionFix;

/** Independent scalar speed and two-axis velocity Kalman filters for display only.
 * Q=4 (m/s)^2/s and R=9 (m/s)^2 are UX tuning assumptions, NOT measured sensor errors.
 * Coordinates, reported position accuracy and landmark matching are never modified.
 */
export function createMotionSmoother() {
  let state: { speed: number; east: number; north: number; p: number; vectorP: number; timestamp: number; vector: boolean } | null = null;
  let last: MotionEstimate | null = null;
  const reset = () => { state = null; last = null; };
  return {
    reset,
    next(fix: MotionFix | null, now = Date.now()): MotionEstimate | null {
      if (!fix || !Number.isFinite(fix.timestamp) || fix.timestamp > now + 5000 || now - fix.timestamp >= 30000 || fix.speed === null || !Number.isFinite(fix.speed) || fix.speed < 0) {
        reset();
        return null;
      }
      if (state && fix.timestamp <= state.timestamp) return last;
      const speed = fix.speed / 3.6;
      const hasCourse = fix.speed >= 5 && fix.heading !== null && Number.isFinite(fix.heading) && fix.heading >= 0 && fix.heading < 360;
      const angle = hasCourse ? fix.heading! * Math.PI / 180 : 0;
      const east = speed * Math.sin(angle), north = speed * Math.cos(angle);
      const dt = state ? (fix.timestamp - state.timestamp) / 1000 : Infinity;
      if (!state || dt >= 10 || speed === 0) {
        state = { speed, east, north, p: 9, vectorP: 9, timestamp: fix.timestamp, vector: hasCourse };
      } else {
        const p = state.p + 4 * dt;
        const k = p / (p + 9);
        state.speed += k * (speed - state.speed);
        state.p = (1 - k) * p;
        if (hasCourse && state.vector) {
          const vp = state.vectorP + 4 * dt;
          const vk = vp / (vp + 9);
          state.east += vk * (east - state.east);
          state.north += vk * (north - state.north);
          state.vectorP = (1 - vk) * vp;
        } else {
          state.east = east; state.north = north; state.vectorP = 9;
        }
        state.vector = hasCourse;
        state.timestamp = fix.timestamp;
      }
      const heading = hasCourse && Math.hypot(state.east, state.north) >= 1
        ? (Math.atan2(state.east, state.north) * 180 / Math.PI + 360) % 360 : null;
      last = { speed: Math.round(state.speed * 3.6), heading, timestamp: fix.timestamp };
      return last;
    },
  };
}

export const EONET_URL = "https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires%2Cfloods%2CsevereStorms&status=all&days=7&limit=100&bbox=16%2C-22%2C33%2C-35";
export const GIBS_ROOT = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi";
export const EARTH_SOURCES = {
  gibs: "https://nasa-gibs.github.io/gibs-api-docs/access-basics/",
  events: "https://eonet.gsfc.nasa.gov/docs/v3",
  sentinel: "https://dataspace.copernicus.eu/data-collections/copernicus-sentinel-missions/sentinel-2",
  sansa: "https://www.sansa.org.za/products-and-services/earth-observation/",
  gnss: "https://www.w3.org/TR/geolocation/",
} as const;
export function yesterdayUtc(now = Date.now()) { return new Date(now - 86400000).toISOString().slice(0, 10); }
export function validImageryDay(day: string, now = Date.now()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const date = Date.parse(day + "T00:00:00Z");
  return Number.isFinite(date) && new Date(date).toISOString().slice(0, 10) === day && day >= "2000-02-24" && day <= new Date(now).toISOString().slice(0, 10);
}
/** Call only with a selected PUBLIC landmark, never a device coordinate. */
export function gibsImageUrl(place: { lat: number; lon: number }, day: string, now = Date.now()) {
  if (!Number.isFinite(place.lat) || Math.abs(place.lat) > 90 || !Number.isFinite(place.lon) || Math.abs(place.lon) > 180 || !validImageryDay(day, now)) throw new Error("Invalid public place or imagery date");
  const bbox = [Math.max(-180, place.lon - 1), Math.max(-90, place.lat - 1), Math.min(180, place.lon + 1), Math.min(90, place.lat + 1)].map(n => n.toFixed(4)).join(",");
  const params = new URLSearchParams({ SERVICE: "WMS", VERSION: "1.1.1", REQUEST: "GetMap", LAYERS: "MODIS_Terra_CorrectedReflectance_TrueColor", STYLES: "", SRS: "EPSG:4326", BBOX: bbox, WIDTH: "640", HEIGHT: "640", FORMAT: "image/jpeg", TIME: day });
  return GIBS_ROOT + "?" + params.toString();
}
export type EarthEvent = { id: string; title: string; date: string; closed: boolean | null; categories: string[] };
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
export function parseEarthEvents(payload: unknown, now = Date.now()): EarthEvent[] {
  if (!record(payload) || !Array.isArray(payload.events)) throw new Error("Invalid NASA event response");
  const found = new Map<string, EarthEvent>();
  for (const item of payload.events.slice(0, 100)) {
    if (!record(item) || typeof item.id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(item.id) || typeof item.title !== "string" || !Array.isArray(item.geometry) || !Array.isArray(item.categories)) continue;
    const categories = item.categories.filter(record).map(c => c.id).filter((id): id is string => typeof id === "string" && ["wildfires", "floods", "severeStorms"].includes(id));
    const dates = item.geometry.slice(0, 100).filter(record).map(g => typeof g.date === "string" ? Date.parse(g.date) : NaN).filter(t => Number.isFinite(t) && t <= now && now - t <= 7 * 86400000);
    if (!dates.length || !categories.length) continue;
    found.set(item.id, { id: item.id, title: item.title.slice(0, 180), date: new Date(Math.max(...dates)).toISOString(), closed: item.closed === null ? false : typeof item.closed === "string" && Number.isFinite(Date.parse(item.closed)) ? true : null, categories });
  }
  return [...found.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
}

/** No credentials, referrer, auto retries or location parameters. Bounded response. */
export async function loadEarthEvents(signal: AbortSignal, request: typeof fetch = fetch): Promise<EarthEvent[]> {
  const response = await request(EONET_URL, { signal, credentials: "omit", referrerPolicy: "no-referrer", redirect: "error", headers: { Accept: "application/json" } });
  const mediaType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  // Public acceptance 42635354912 captured valid EONET JSON labelled RSS in WebKit.
  // Only this fixed NASA endpoint gets the compatibility exception. JSON parsing,
  // schema validation and the size limit below remain mandatory; XML is never parsed.
  if (!response.ok || (mediaType !== "application/json" && mediaType !== "application/rss+xml")) throw new Error("NASA event feed unavailable");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("NASA event response unavailable");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 512000) { await reader.cancel(); throw new Error("NASA event response too large"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return parseEarthEvents(JSON.parse(new TextDecoder().decode(bytes)));
}
