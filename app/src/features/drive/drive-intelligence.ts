/** Local planning and source metadata only. No GPS, provider calls or live road claims. */
export type Corridor = 'za' | 'heritage' | 'n1' | 'n3';
export type DriveSource = Readonly<{ id: string; title: string; url: string; topic: 'fuel' | 'tolls' | 'road' | 'weather' | 'visits'; corridors: readonly Corridor[]; cadenceHours: number; directoryReviewedOn: string; note: string }>;
export const DRIVE_SOURCES: readonly DriveSource[] = Object.freeze([
  { id: 'dmpr-fuel', title: 'DMPR fuel-price notices', url: 'https://www.dmpr.gov.za/Branches/Petroleum-Resources/Fuel-Prices', topic: 'fuel', corridors: ['za','heritage','n1','n3'], cadenceHours: 24, directoryReviewedOn: '2026-11-05', note: 'Check effective date, fuel grade and zone. Directory located; live fetch was unavailable during review. No pump price is supplied.' },
  { id: 'sanral-notices', title: 'SANRAL public notices', url: 'https://www.nra.co.za/press-releases', topic: 'tolls', corridors: ['za','heritage','n1','n3'], cadenceHours: 24, directoryReviewedOn: '2026-11-05', note: 'Find the applicable toll schedule and vehicle class. This directory does not calculate your plazas or confirm route conditions.' },
  { id: 'n3tc-updates', title: 'N3TC route updates', url: 'https://www.n3tc.co.za/category/route-updates/', topic: 'road', corridors: ['n3'], cadenceHours: 6, directoryReviewedOn: '2026-11-05', note: 'N3TC concession updates are not nationwide coverage. Check the exact location, issue time and operator scope.' },
  { id: 'saws-weather', title: 'South African Weather Service', url: 'https://www.weathersa.co.za/', topic: 'weather', corridors: ['za','heritage','n1','n3'], cadenceHours: 6, directoryReviewedOn: '2026-11-05', note: 'Open current official warnings. Automated access may be restricted. No forecast or all-clear is embedded here.' },
  { id: 'sanparks-roads', title: 'SANParks road-information directory', url: 'https://www.sanparks.org/travel/plan/travel-information/road-conditions', topic: 'road', corridors: ['za','heritage','n1','n3'], cadenceHours: 24, directoryReviewedOn: '2026-11-05', note: 'A directory of original road-information providers, not a verified incident feed.' },
  { id: 'sanparks-visits', title: 'SANParks travel planning', url: 'https://www.sanparks.org/travel', topic: 'visits', corridors: ['za','heritage','n1','n3'], cadenceHours: 24, directoryReviewedOn: '2026-11-05', note: 'Check park-specific fees, notifications, gate times and access. This does not verify private attractions or make bookings.' },
].map(s => Object.freeze({...s, corridors: Object.freeze([...s.corridors])}) as DriveSource));
export function corridorId(value: string | null): Corridor { return ['za','heritage','n1','n3'].includes(value || '') ? value as Corridor : 'za'; }
export function sourcesForCorridor(id: Corridor): readonly DriveSource[] { return DRIVE_SOURCES.filter(s => s.corridors.includes(id)); }
export function approvedDriveUrl(input: string): DriveSource | null {
  if (typeof input !== 'string' || input !== input.trim() || input.length > 2048 || /[\\\u0000-\u0020]/u.test(input)) return null;
  try { const u = new URL(input); if (u.protocol !== 'https:' || u.username || u.password || u.port || u.hash || u.search || u.href !== input) return null;
    return DRIVE_SOURCES.find(s => s.url === input) || null;
  } catch { return null; }
}
export function isoTime(input: string): number {
  if (typeof input !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(input)) throw new Error('Use canonical UTC timestamps.');
  const n = Date.parse(input); if (!Number.isFinite(n) || new Date(n).toISOString() !== input) throw new Error('Invalid timestamp.'); return n;
}
export function directoryState(reviewed: string, now = new Date()): 'reviewed-directory' | 'review-due' | 'unverified' {
  try { const n = isoTime(reviewed + 'T00:00:00.000Z'), at = now.getTime();
    if (!Number.isFinite(at) || n > at) return 'unverified'; return at - n > 30 * 86400000 ? 'review-due' : 'reviewed-directory';
  } catch { return 'unverified'; }
}
function bound(n: number, min: number, max: number, label: string, integer = false): number {
  if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isSafeInteger(n))) throw new RangeError('Check ' + label + '.'); return n;
}
export type JourneyInputs = { roadKm: number; litresPer100Km: number; priceRandPerLitre: number; travellers: number; tollsRand: number; feesRand: number; otherRand: number; contingencyPercent: number; budgetRand: number; drivingMinutes: number; breakMinutes: number; availableMinutes: number };
export type PlanStop = { id: string; name: string; minutes: number };
export type JourneyResult = { litres: number; fuelCents: number; baseCents: number; contingencyCents: number; totalCents: number; budgetCents: number; remainingCents: number; perPersonCents: number[]; visitMinutes: number; totalMinutes: number; spareMinutes: number; fitsBudget: boolean; fitsTime: boolean };
const cents = (n: number) => Math.round(n * 100);
export function planJourney(x: JourneyInputs, stops: readonly PlanStop[]): JourneyResult {
  bound(x.roadKm,.1,10000,'total road kilometres'); bound(x.litresPer100Km,.1,100,'fuel consumption'); bound(x.priceRandPerLitre,.01,1000,'pump price');
  bound(x.travellers,1,100,'traveller count',true); bound(x.contingencyPercent,0,100,'contingency percentage');
  for (const [label,value] of Object.entries({tolls:x.tollsRand,fees:x.feesRand,other:x.otherRand,budget:x.budgetRand})) bound(value,0,1e7,label);
  bound(x.drivingMinutes,1,10080,'driving minutes',true); bound(x.breakMinutes,0,10080,'break minutes',true); bound(x.availableMinutes,1,43200,'available minutes',true);
  if (stops.length > 12 || new Set(stops.map(s=>s.id)).size !== stops.length) throw new Error('Choose up to 12 distinct stops.');
  for (const s of stops) { if (!/^[\w-]{1,80}$/.test(s.id) || !s.name.trim() || s.name.length>160) throw new Error('Invalid stop.'); bound(s.minutes,0,1440,'visit minutes',true); }
  const litres=x.roadKm*x.litresPer100Km/100, fuelCents=cents(litres*x.priceRandPerLitre);
  const baseCents=fuelCents+cents(x.tollsRand)+cents(x.feesRand)+cents(x.otherRand);
  const contingencyCents=Math.ceil(baseCents*x.contingencyPercent/100),totalCents=baseCents+contingencyCents,budgetCents=cents(x.budgetRand);
  const per=Math.floor(totalCents/x.travellers), remainder=totalCents % x.travellers;
  const visitMinutes=stops.reduce((n,s)=>n+s.minutes,0),totalMinutes=x.drivingMinutes+x.breakMinutes+visitMinutes;
  return {litres,fuelCents,baseCents,contingencyCents,totalCents,budgetCents,remainingCents:budgetCents-totalCents,
    perPersonCents:Array.from({length:x.travellers},(_,i)=>per+(i<remainder?1:0)),visitMinutes,totalMinutes,spareMinutes:x.availableMinutes-totalMinutes,
    fitsBudget:totalCents<=budgetCents,fitsTime:totalMinutes<=x.availableMinutes};
}
export type TripQuestion = 'road' | 'weather' | 'fuel' | 'tolls' | 'visits';
export function evidenceAnswer(topic: TripQuestion, corridor: Corridor): {text:string;sources:readonly DriveSource[];liveVerified:false} {
  const answers:Record<TripQuestion,string>={
    road:'Current road closures, traffic, security incidents and route safety are not verified here. No listed alert does not mean the road is clear. Check the responsible operator before travel; this planner cannot issue an all-clear or a detour.',
    weather:'No current weather forecast or warning has been retrieved for this journey. Consult official SAWS warnings for the relevant place and time. A cached guide is not current weather evidence.',
    fuel:'No live pump price is loaded. Enter your actual grade, zone and pump-price assumption. Cost is total road kilometres x litres per 100 km / 100 x rand per litre; return travel is not added automatically.',
    tolls:'No route-specific toll total has been verified. Check applicable plazas, direction, vehicle class and current tariffs, then enter the total. A national notice alone does not calculate your tolls.',
    visits:'Opening times, accessibility, fees and availability need confirmation with each venue. Landmark points may represent regions rather than entrances. This planner creates no reservations and does not certify suitability.'
  };
  if (!Object.hasOwn(answers, topic)) throw new Error('Unsupported evidence question.');
  return {text:answers[topic],sources:sourcesForCorridor(corridor).filter(s=>s.topic===topic),liveVerified:false};
}
export function makeJourneyPack(corridor:Corridor, inputs:JourneyInputs, stops:readonly PlanStop[], learningNote:string, now=new Date()):string {
  if (!['za','heritage','n1','n3'].includes(corridor) || learningNote.length>1000) throw new Error('Invalid export input.');
  const result=planJourney(inputs,stops), createdAt=now.toISOString();isoTime(createdAt);
  // Explicit field projection: unknown properties such as GPS, account IDs or raw questions cannot leak into the export.
  const {roadKm,litresPer100Km,priceRandPerLitre,travellers,tollsRand,feesRand,otherRand,contingencyPercent,budgetRand,drivingMinutes,breakMinutes,availableMinutes}=inputs;
  const text=JSON.stringify({schema:'luqi.drive.plan.v1',createdAt,corridor,mode:'local-user-assumptions',
    limitations:'Reference copy only. Not navigation, a booking, a current traffic/weather report, an official quote or a signed approval. Verify sources again before travel. No automatic return distance.',
    inputs:{roadKm,litresPer100Km,priceRandPerLitre,travellers,tollsRand,feesRand,otherRand,contingencyPercent,budgetRand,drivingMinutes,breakMinutes,availableMinutes},
    stops:stops.map(({id,name,minutes})=>({id,name,minutes})),result,learningNote,
    sources:sourcesForCorridor(corridor).map(({id,title,url,directoryReviewedOn})=>({id,title,url,directoryReviewedOn,status:'directory-not-live-conditions'}))},null,2);
  if (new TextEncoder().encode(text).length>40000) throw new Error('Journey pack exceeds the 40,000-byte export limit.'); return text;
}
