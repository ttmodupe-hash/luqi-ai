/** Source-linked education, not live telemetry, mission control, or operational advice. */
export const SOURCE_REVIEWED_ON = '2026-11-01';
export const SOURCE_REVIEW_DUE = '2026-12-01T00:00:00+02:00';
export const LIGHT_SPEED_M_S = 299_792_458;
export const LIGHT_SPEED_SOURCE = 'https://physics.nist.gov/cuu/Constants/Value/c.html';
export const SPACE_CATEGORIES = ['All topics', 'Radio astronomy', 'Space operations', 'Space weather', 'Earth observation'] as const;
export type SpaceCategory = typeof SPACE_CATEGORIES[number];
export type SpaceSource = Readonly<{
  id: string; title: string; publisher: string; category: Exclude<SpaceCategory, 'All topics'>;
  summary: string; limitation: string; url: string;
}>;
export const SPACE_SOURCES: readonly SpaceSource[] = [
  { id: 'meerkat', title: 'MeerKAT: listening to the radio sky', publisher: 'NRF / SARAO', category: 'Radio astronomy',
    summary: 'SARAO describes MeerKAT as a 64-dish radio interferometer in the Northern Cape. Signals from separated dishes are combined to study the radio sky.',
    limitation: 'This is an educational description, not a telescope feed or a claim about the number of dishes operating today.',
    url: 'https://www.sarao.ac.za/about/telescopes-and-instruments/' },
  { id: 'ska-mid', title: 'SKA-Mid: explore the telescope design', publisher: 'SKA Observatory', category: 'Radio astronomy',
    summary: 'SKAO describes a planned 197-dish array in South Africa that incorporates MeerKAT. Its design brings together receivers, long baselines and digital signal processing.',
    limitation: '197 is the published design total, not a live construction or commissioning count. Check the original publisher for project updates.',
    url: 'https://www.skao.int/en/explore/telescopes/ska-mid' },
  { id: 'hartrao', title: 'HartRAO: radio astronomy and geodesy', publisher: 'NRF / SARAO', category: 'Radio astronomy',
    summary: 'SARAO’s Hartebeesthoek Radio Astronomy Observatory contributes radio observations and measurements to celestial and terrestrial reference frames.',
    limitation: 'HartRAO is a SARAO facility. It must not be relabelled as SANSA Space Operations simply because both use the Hartebeesthoek name.',
    url: 'https://www.sarao.ac.za/about/hartebeesthoek-johannesburg-observatory/' },
  { id: 'space-operations', title: 'SANSA: communicating with spacecraft', publisher: 'SANSA', category: 'Space operations',
    summary: 'SANSA’s Space Operations programme describes tracking, telemetry and command support for spacecraft from its ground facilities.',
    limitation: 'Opening this source does not connect Luqi to ground-station equipment or verify the status of a particular mission.',
    url: 'https://www.sansa.org.za/programmes/space-operations/' },
  { id: 'space-weather', title: 'SANSA: understand space weather', publisher: 'SANSA', category: 'Space weather',
    summary: 'SANSA’s Space Science programme in Hermanus studies the space environment and provides space-weather information relevant to communications, navigation and other technology.',
    limitation: 'Luqi does not display a current storm level or safety forecast. Use the official bulletin below and check its own publication time.',
    url: 'https://www.sansa.org.za/programmes/space-science/' },
  { id: 'earth-observation', title: 'SANSA: learning from Earth observations', publisher: 'SANSA', category: 'Earth observation',
    summary: 'SANSA describes collecting, processing and distributing Earth-observation data for areas including water, agriculture, planning and disaster management.',
    limitation: 'This is not live imagery of your property or a cadastral, insurance, weather or damage assessment.',
    url: 'https://www.sansa.org.za/programmes/earth-observation/' },
];
export const SPACE_WEATHER_BULLETIN = 'https://spaceweather.sansa.org.za/products-and-services/current-conditions/daily-conditions';

export function sourceReviewCurrent(now = Date.now()): boolean {
  return Number.isFinite(now) && now >= Date.parse(SOURCE_REVIEWED_ON + 'T00:00:00+02:00') && now < Date.parse(SOURCE_REVIEW_DUE);
}
export function findSpaceSources(query: string, category: SpaceCategory): readonly SpaceSource[] {
  if (typeof query !== 'string' || query.length > 120 || !(SPACE_CATEGORIES as readonly string[]).includes(category)) return [];
  const words = query.toLowerCase().trim().split(/\s+/u).filter(Boolean);
  return SPACE_SOURCES.filter(source => (category === 'All topics' || source.category === category) &&
    words.every(word => `${source.title} ${source.publisher} ${source.category} ${source.summary}`.toLowerCase().includes(word)));
}
export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
function decimal(raw: string): number | null {
  if (typeof raw !== 'string' || raw.length > 24) return null;
  const text = raw.trim();
  // Full decimal only: no partial parse, exponents, hex, Infinity or commas.
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}
export const FREQUENCY_UNITS = ['Hz', 'kHz', 'MHz', 'GHz'] as const;
export type FrequencyUnit = typeof FREQUENCY_UNITS[number];
const scale: Record<FrequencyUnit, number> = { Hz: 1, kHz: 1_000, MHz: 1_000_000, GHz: 1_000_000_000 };
export function radioWavelength(raw: string, unit: FrequencyUnit): Result<{ frequencyHz: number; wavelengthM: number }> {
  const input = decimal(raw);
  if (input === null || !(FREQUENCY_UNITS as readonly string[]).includes(unit)) return { ok: false, error: 'Enter a decimal frequency and choose its unit.' };
  const frequencyHz = input * scale[unit];
  if (frequencyHz < 1 || frequencyHz > 1e12) return { ok: false, error: 'Use a frequency between 1 Hz and 1,000 GHz.' };
  return { ok: true, value: { frequencyHz, wavelengthM: LIGHT_SPEED_M_S / frequencyHz } };
}
export function signalDelay(rawKm: string): Result<{ distanceKm: number; oneWaySeconds: number; roundTripSeconds: number }> {
  const distanceKm = decimal(rawKm);
  if (distanceKm === null || distanceKm < 0 || distanceKm > 1e12) return { ok: false, error: 'Enter a distance from 0 to 1,000,000,000,000 km, using a decimal point and no commas.' };
  const oneWaySeconds = distanceKm * 1_000 / LIGHT_SPEED_M_S;
  return { ok: true, value: { distanceKm, oneWaySeconds, roundTripSeconds: 2 * oneWaySeconds } };
}
export const SPACE_PRACTICE = [
  { id: 'frequency', question: 'In a vacuum, what happens to wavelength when frequency doubles?',
    choices: ['It doubles', 'It halves', 'It stays the same'], answer: 1,
    explanation: 'Wavelength = c / frequency. At the same propagation speed, doubling frequency halves wavelength.' },
  { id: 'delay', question: 'A one-way vacuum path is 299,792.458 km. What is the ideal round-trip signal time?',
    choices: ['1 second', '2 seconds', 'It depends on the radio frequency in this model'], answer: 1,
    explanation: 'The one-way distance is 299,792,458 metres. Divide by c for 1 second, then double it for a 2-second round trip. Processing delay is excluded.' },
  { id: 'evidence', question: 'Where should you check a current space-weather bulletin and its timestamp?',
    choices: ['A Luqi source-description card', 'The local signal calculator', 'The official SANSA bulletin'], answer: 2,
    explanation: 'A source directory and a local calculation are not a live forecast. Open the original bulletin and check its publication time.' },
] as const;
export function checkSpaceAnswer(id: string, choice: number): { correct: boolean; explanation: string } | null {
  const item = SPACE_PRACTICE.find(question => question.id === id);
  if (!item || !Number.isInteger(choice) || choice < 0 || choice >= item.choices.length) return null;
  return { correct: choice === item.answer, explanation: item.explanation };
}
export function scienceNotebook(frequency: string, unit: FrequencyUnit, distance: string): Result<string> {
  const wave = radioWavelength(frequency, unit), delay = signalDelay(distance);
  if (!wave.ok) return wave;
  if (!delay.ok) return delay;
  return { ok: true, value: [
    'Luqi Space & Science — local study notes',
    'Educational calculations; not live telemetry or operational advice.',
    `Source descriptions reviewed: ${SOURCE_REVIEWED_ON}. Recheck original publishers for changes.`,
    '', 'RADIO WAVELENGTH IN VACUUM',
    `Frequency: ${wave.value.frequencyHz} Hz`,
    `Wavelength: ${wave.value.wavelengthM.toPrecision(8)} m`,
    'Formula: wavelength = c / frequency',
    '', 'SIGNAL TRAVEL TIME IN VACUUM',
    `Assumed one-way path: ${delay.value.distanceKm} km`,
    `One-way delay: ${delay.value.oneWaySeconds.toPrecision(8)} s`,
    `Round-trip delay: ${delay.value.roundTripSeconds.toPrecision(8)} s`,
    'Formula: time = distance / c; round trip = 2 × one-way time.',
    'Assumes a fixed vacuum path. Excludes processing, queuing, atmosphere and orbital motion.',
    `c = ${LIGHT_SPEED_M_S} m/s (exact SI value); ${LIGHT_SPEED_SOURCE}`,
    '', 'ORIGINAL PUBLISHERS', ...SPACE_SOURCES.map(source => `${source.publisher} — ${source.title}\n${source.url}`),
    '', `Current bulletin (not retrieved by Luqi): ${SPACE_WEATHER_BULLETIN}`,
  ].join('\n') };
}
