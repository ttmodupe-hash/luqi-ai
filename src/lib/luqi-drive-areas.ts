import type { DriveRouteId } from './luqi-drive';

/** Public educational regions only; deliberately not road matching, wildlife tracking or traffic guidance. */
export const DRIVE_AREAS_REVIEWED_ON = '2026-11-03';
export const DRIVE_FIX_MAX_AGE_MS = 45_000;
export const DRIVE_FIX_MAX_ACCURACY_METERS = 1_500;
export const DRIVE_AREA_REPEAT_MS = 30 * 60_000;
export const DRIVE_AUTO_MIN_GAP_MS = 3 * 60_000;
export type DriveAreaCategory = 'Geography' | 'History' | 'Natural wealth' | 'Culture & languages' | 'Fauna & flora' | 'Did you know?';
export type DriveAreaTopic = Readonly<{ category: DriveAreaCategory; fact: string; source: number }>;
export type DriveAreaSource = Readonly<{ label: string; url: string }>;
export type DriveAreaStory = Readonly<{
  id: string; routeId: DriveRouteId; title: string; vicinity: string;
  latitude: number; longitude: number; radiusKm: number; audioBrief: string;
  topics: readonly DriveAreaTopic[]; sources: readonly DriveAreaSource[];
}>;

const PROVINCES = 'https://www.gov.za/about-sa/south-africas-provinces';
const WATERBERG = 'https://www.unesco.org/en/mab/waterberg';
const MAKAPAN = 'https://whc.unesco.org/en/list/915';
const DRAKENSBERG = 'https://whc.unesco.org/en/list/985';
const KZN_ECONOMY = 'https://www.kznedtea.gov.za/services/economic-services/economic-profiles/index.htm';
const HOWICK_TOURISM = 'https://www.southafrica.net/au/en/travel/article/howick-falls-kwazulu-natal-a-spectacular-cascade';
const MANDELA = 'https://www.sanews.gov.za/south-africa/nelson-mandela-chronology';
const UMNGENI = 'https://umngeni.gov.za/about-umngeni/';

export const DRIVE_AREA_STORIES: readonly DriveAreaStory[] = [
  {
    id: 'n1-waterberg', routeId: 'n1-pretoria-polokwane',
    title: 'Modimolle and the Waterberg approach',
    vicinity: 'Near Modimolle; the wider Waterberg biosphere extends away from the N1',
    latitude: -24.70, longitude: 28.41, radiusKm: 28,
    audioBrief: 'Did you know? Near Modimolle you approach the Waterberg region. UNESCO describes mountain savanna, San rock art and remarkable biodiversity here. Those sites are not necessarily visible from the motorway.',
    sources: [
      { label: 'UNESCO Waterberg Biosphere', url: WATERBERG },
      { label: 'South African Government provincial overview', url: PROVINCES },
    ],
    topics: [
      { category: 'Geography', fact: 'The wider Waterberg is mountain savanna and a regional water catchment; the protected biosphere is not directly on every stretch of the N1.', source: 0 },
      { category: 'History', fact: 'UNESCO describes a long record of human habitation and San rock art in the Waterberg region, beyond the motorway.', source: 0 },
      { category: 'Natural wealth', fact: 'Tourism, cattle rearing and crop production are documented economic activities in the broader Waterberg.', source: 0 },
      { category: 'Culture & languages', fact: 'Pedi-speaking communities are among the people living in the region. No single practice or language represents every resident.', source: 0 },
      { category: 'Fauna & flora', fact: 'The savanna biosphere supports diverse plants and habitat for threatened Cape vultures and mammals such as aardvark and brown hyaena. Roadside sightings are never promised.', source: 0 },
      { category: 'Did you know?', fact: 'UNESCO recognised the Waterberg as a biosphere reserve in 2001.', source: 0 },
    ],
  },
  {
    id: 'n1-mokopane', routeId: 'n1-pretoria-polokwane',
    title: 'Mokopane and Makapan Valley',
    vicinity: 'Near Mokopane; fossil-bearing Makapan caves require a separate detour',
    latitude: -24.19, longitude: 29.01, radiusKm: 30,
    audioBrief: 'Did you know? Near Mokopane, Makapan Valley is part of South Africa’s UNESCO-listed fossil hominid sites, preserving evidence of human evolution and ancient occupation. The caves are not on the N1.',
    sources: [
      { label: 'UNESCO Fossil Hominid Sites — Makapan Valley', url: MAKAPAN },
      { label: 'South African Government — Limpopo', url: PROVINCES },
    ],
    topics: [
      { category: 'Geography', fact: 'Makapan Valley contains limestone caves and wooded watercourses away from the N1.', source: 0 },
      { category: 'History', fact: 'UNESCO documents ancient human occupation and early hominid fossils in Makapan Valley, long before modern settlement.', source: 0 },
      { category: 'Natural wealth', fact: 'Limpopo has mining and fruit and vegetable farming sectors. This provincial context does not imply mineral deposits beneath the road.', source: 1 },
      { category: 'Culture & languages', fact: 'Sepedi, Tshivenda and Xitsonga are principal provincial languages. Specific communities and households are diverse.', source: 1 },
      { category: 'Fauna & flora', fact: 'Limpopo contains savanna vegetation, including mixed grasslands and trees. Wildlife may occur in reserves and other habitats, not necessarily along the road.', source: 1 },
      { category: 'Did you know?', fact: 'Makapan Valley is part of the UNESCO World Heritage property named the Fossil Hominid Sites of South Africa.', source: 0 },
    ],
  },
  {
    id: 'n3-harrismith', routeId: 'n3-joburg-durban',
    title: 'Harrismith and the Drakensberg gateway',
    vicinity: 'Near Harrismith; mountain heritage sites lie beyond the N3',
    latitude: -28.27, longitude: 29.13, radiusKm: 28,
    audioBrief: 'Did you know? The N3 near Harrismith approaches the Drakensberg region. The mountains farther away contain San rock paintings, rare alpine plants and threatened vultures, protected in a UNESCO World Heritage site.',
    sources: [
      { label: 'UNESCO Maloti-Drakensberg Park', url: DRAKENSBERG },
      { label: 'South African Government — Free State and KZN', url: PROVINCES },
    ],
    topics: [
      { category: 'Geography', fact: 'The broader Drakensberg includes basalt cliffs, sandstone ramparts and high grasslands. Most UNESCO park sites are off the N3.', source: 0 },
      { category: 'History', fact: 'San rock paintings in mountain shelters document thousands of years of cultural and spiritual history.', source: 0 },
      { category: 'Natural wealth', fact: 'Agriculture and grazing contribute to the Free State economy, while mountain tourism supports nearby destinations.', source: 1 },
      { category: 'Culture & languages', fact: 'Sesotho is a principal language in the Free State and isiZulu is prominent in KwaZulu-Natal. The region has diverse living communities.', source: 1 },
      { category: 'Fauna & flora', fact: 'Protected Drakensberg habitats shelter rare plants, Cape vultures and bearded vultures. These species are not guaranteed to be visible from the highway.', source: 0 },
      { category: 'Did you know?', fact: 'UNESCO protects the Maloti-Drakensberg for both its biodiversity and its rock paintings.', source: 0 },
    ],
  },
  {
    id: 'n3-howick', routeId: 'n3-joburg-durban',
    title: 'Howick and the KwaZulu-Natal Midlands',
    vicinity: 'Near Howick; falls, heritage and craft stops are separate from the N3',
    latitude: -29.49, longitude: 30.24, radiusKm: 23,
    audioBrief: 'Did you know? Nelson Mandela was arrested near Howick on 5 August 1962. The KwaZulu-Natal Midlands is also known for waterfalls, crafts and river landscapes. Any visit requires a safe separate stop.',
    sources: [
      { label: 'SAnews — Nelson Mandela chronology', url: MANDELA },
      { label: 'South African Tourism — Howick Falls and the Midlands', url: HOWICK_TOURISM },
      { label: 'uMngeni Local Municipality — history and nature', url: UMNGENI },
      { label: 'KZN provincial economic overview', url: KZN_ECONOMY },
    ],
    topics: [
      { category: 'Geography', fact: 'Howick Falls and the uMngeni river valley are part of the hilly Midlands, not features visible from every point on the N3.', source: 1 },
      { category: 'History', fact: 'Mandela was arrested near Howick on 5 August 1962 during apartheid. A nearby site commemorates that event.', source: 0 },
      { category: 'Natural wealth', fact: 'The Midlands Meander is associated with crafts, local food and tourism; agriculture and manufacturing also contribute to KZN’s economy.', source: 1 },
      { category: 'Culture & languages', fact: 'isiZulu is a principal language in KwaZulu-Natal. Craft traditions and visitor services support contemporary local livelihoods.', source: 3 },
      { category: 'Fauna & flora', fact: 'uMngeni Valley Nature Reserve protects river-valley habitat; the municipality reports zebra and wildebeest in the reserve, not on the N3.', source: 2 },
      { category: 'Did you know?', fact: 'Howick is near the site of an arrest in 1962 that became a turning point in modern South African history.', source: 0 },
    ],
  },
] as const;

function rad(degrees: number): number { return degrees * Math.PI / 180; }
export function driveAreaDistanceKm(lat: number, lon: number, destLat: number, destLon: number): number {
  if (![lat, lon, destLat, destLon].every(Number.isFinite) ||
      Math.abs(lat) > 90 || Math.abs(destLat) > 90 ||
      Math.abs(lon) > 180 || Math.abs(destLon) > 180) return Infinity;
  const dlat = rad(destLat - lat), dlon = rad(destLon - lon);
  const a = Math.sin(dlat / 2) ** 2 +
    Math.cos(rad(lat)) * Math.cos(rad(destLat)) * Math.sin(dlon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(Math.min(1, a)), Math.sqrt(Math.max(0, 1 - a)));
}

export type DriveAreaFix = Readonly<{
  routeId: DriveRouteId; latitude: number; longitude: number;
  accuracyMeters: number; timestamp: number;
}>;

/** Reject inaccurate, stale or nonsensical fixes. A selected route is not a verified road location. */
export function nearbyDriveArea(fix: DriveAreaFix, now = Date.now()): DriveAreaStory | null {
  if (!fix || !Number.isFinite(now) || !Number.isFinite(fix.timestamp) ||
      fix.timestamp > now + 2000 || now - fix.timestamp > DRIVE_FIX_MAX_AGE_MS ||
      !Number.isFinite(fix.accuracyMeters) || fix.accuracyMeters < 0 ||
      fix.accuracyMeters > DRIVE_FIX_MAX_ACCURACY_METERS ||
      !Number.isFinite(fix.latitude) || !Number.isFinite(fix.longitude)) return null;
  let nearest: DriveAreaStory | null = null, distance = Infinity;
  for (const item of DRIVE_AREA_STORIES) {
    if (item.routeId !== fix.routeId) continue;
    const d = driveAreaDistanceKm(fix.latitude, fix.longitude, item.latitude, item.longitude);
    if (d <= item.radiusKm && d < distance) { nearest = item; distance = d; }
  }
  return nearest;
}

export function canAutoNarrateDriveArea(lastAreaAt: number | undefined, lastAnyAt: number | undefined, now: number): boolean {
  if (!Number.isFinite(now) || now < 0) return false;
  for (const [last, cooldown] of [[lastAreaAt, DRIVE_AREA_REPEAT_MS], [lastAnyAt, DRIVE_AUTO_MIN_GAP_MS]] as const) {
    if (last !== undefined && (!Number.isFinite(last) || now < last || now - last < cooldown)) return false;
  }
  return true;
}
export function areasForDriveRoute(routeId: DriveRouteId): readonly DriveAreaStory[] {
  return DRIVE_AREA_STORIES.filter(item => item.routeId === routeId);
}
