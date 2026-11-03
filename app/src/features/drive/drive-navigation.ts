// Regional orientation and landmark proximity. Distances are straight-line kilometres.
import { nationalStops } from "./national-guides";
import { suggestProvince } from "../../lib/location-province";
import type { ProvinceCode } from "../../lib/opportunity-sources";
import { corridors } from "./drive-content";
import {
  DRIVE_AREA_STORIES,
  type HighwayId,
  type RoadsideStory,
} from "./roadside-stories";

export type Point = { lat: number; lon: number };
export type PhoneFix = Point & {
  accuracy: number;
  timestamp: number;
  speed: number | null;
  heading: number | null;
};
export type Stop = Point & {
  province?: ProvinceCode;
  id: string;
  name: string;
  area: string;
  destination: string | null;
  source: { label: string; url: string };
  descriptions: (typeof corridors)[number]["descriptions"];
  radiusKm: number;
  story?: RoadsideStory;
};
export type Trail = {
  id: string;
  name: string;
  region: string;
  origin: Point & { name: string };
  end?: Point & { name: string };
  stops: Stop[];
  maxAccuracy: number;
};
export const stops: Stop[] = [
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
].map((s) => ({ ...corridors[s.index], ...s, radiusKm: 12 }));
export const legSeconds = 18;
export const demoSeconds = legSeconds * stops.length;
const origin = { lat: -25.52, lon: 28.09 };
const highwayCopy: Record<
  string,
  { name: string; sepitori: string; setswana: string; isizulu: string }
> = {
  "n1-waterberg": {
    name: "Modimolle",
    sepitori:
      "Pela Modimolle, dithaba tša Waterberg di na le diswantšho tša kgale tša San mo maswikeng.",
    setswana:
      "Gaufi le Modimolle, dithaba tsa Waterberg di na le ditshwantsho tsa bogologolo tsa Basarwa mo mafikeng.",
    isizulu:
      "Eduze kwaseModimolle, izintaba zaseWaterberg zinemidwebo yasendulo yamaSan emadwaleni.",
  },
  "n1-mokopane": {
    name: "Mokopane",
    sepitori:
      "Pela Mokopane ke Makapan Valley. Magaga a gona a na le bohlatse bja bophelo bja batho ba kgale.",
    setswana:
      "Gaufi le Mokopane go na le mokgatšha wa Makapan. Magaga a teng a bolokile bosupi jwa botshelo jwa batho ba bogologolo.",
    isizulu:
      "Eduze kwaseMokopane kuneMakapan Valley. Imigede yakhona igcine ubufakazi bokuphila kwabantu basendulo.",
  },
  "n3-harrismith": {
    name: "Harrismith",
    sepitori:
      "Ge o feta Harrismith, o batamela selete sa Drakensberg. Dithabeng go na le diswantšho tša San mo maswikeng.",
    setswana:
      "Fa o feta Harrismith, o atamela kgaolo ya Drakensberg. Dithaba tsa teng di na le ditshwantsho tsa Basarwa mo mafikeng.",
    isizulu:
      "Uma udlula eHarrismith, usondela esifundeni soKhahlamba. Ezintabeni kukhona imidwebo yamaSan emadwaleni.",
  },
  "n3-howick": {
    name: "Howick",
    sepitori:
      "Nelson Mandela o ile a swarwa pela Howick ka di 5 tša August 1962. Lefelo leo le gopola tiragalo yeo.",
    setswana:
      "Nelson Mandela o ne a tshwarwa gaufi le Howick ka la 5 Phatwe 1962. Lefelo leo le gopotsa batho tiragalo eo.",
    isizulu:
      "UNelson Mandela waboshwa eduze kwaseHowick mhla zi-5 kuNcwaba ngo-1962. Kunesikhumbuzo salowo mcimbi eduze kwalapho.",
  },
};
function highways(id: HighwayId): Stop[] {
  return DRIVE_AREA_STORIES.filter((s) => s.routeId === id).map((story) => {
    const { name, ...translations } = highwayCopy[story.id];
    return {
      id: story.id,
      name,
      area: story.title,
      lat: story.latitude,
      lon: story.longitude,
      source: story.sources[0],
      destination: name + ", South Africa",
      radiusKm: story.radiusKm,
      descriptions: { english: story.audioBrief, ...translations },
      story,
    };
  });
}
export const trails: Trail[] = [
  {
    id: "za",
    name: "South Africa · all 9 provinces",
    region: "South Africa",
    origin: { name: "National overview", lat: -29, lon: 25 },
    stops: nationalStops,
    maxAccuracy: 5000,
  },
  {
    id: "heritage",
    name: "Gauteng heritage trail",
    region: "Gauteng / North West",
    origin: { ...origin, name: "Soshanguve" },
    stops,
    maxAccuracy: 5000,
  },
  {
    id: "n1",
    name: "N1 · Pretoria to Polokwane",
    region: "Gauteng / Limpopo",
    origin: { name: "Pretoria", lat: -25.747, lon: 28.229 },
    end: { name: "Polokwane", lat: -23.905, lon: 29.469 },
    stops: highways("n1-pretoria-polokwane"),
    maxAccuracy: 1500,
  },
  {
    id: "n3",
    name: "N3 · Johannesburg to Durban",
    region: "Gauteng / Free State / KwaZulu-Natal",
    origin: { name: "Johannesburg", lat: -26.204, lon: 28.047 },
    end: { name: "Durban", lat: -29.859, lon: 31.021 },
    stops: highways("n3-joburg-durban"),
    maxAccuracy: 1500,
  },
];
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
export function demoFrame(seconds: number, trail: Trail = trails[1]) {
  const { stops, origin } = trail;
  const demoSeconds = legSeconds * stops.length;
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
export function matchLandmark(
  fix: PhoneFix | null,
  trail: Trail = trails[1],
): number | null {
  if (!fix || fix.accuracy > trail.maxAccuracy) return null;
  if (trail.id === "za") {
    const region = suggestProvince(fix.lat, fix.lon, fix.accuracy);
    const i = trail.stops.findIndex((s) => s.province === region);
    return i < 0 ? null : i;
  }
  let match: number | null = null,
    best = Infinity;
  trail.stops.forEach((stop, i) => {
    const km = distanceKm(fix, stop);
    if (km + fix.accuracy / 1000 <= stop.radiusKm && km < best) {
      match = i;
      best = km;
    }
  });
  return match;
}
export { origin as demoOrigin };
