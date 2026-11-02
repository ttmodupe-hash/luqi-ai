import { illuminatedPath } from '../lib/moon-tracker.mjs';

type View = 'phase' | 'surface';

/**
 * SVG Moon surface: locally generated mare/crater fallback and an optional,
 * NASA LRO-derived near-side mosaic (served by Wikimedia Commons).
 * The photo is a fixed, historical composite, NOT a live telescope image;
 * only the phase mask is calculated on the device.
 */
export const LRO_MOON_IMAGE =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Moon_nearside_LRO_color_mosaic.png/512px-Moon_nearside_LRO_color_mosaic.png';
export const LRO_MOON_SOURCE = 'https://www.usgs.gov/media/images/moon-lroc-wac-nearside-mosaic';

type Crater = { x: number; y: number; r: number; brightness: number };
function buildLocalCraters(): Crater[] {
  const craters: Crater[] = [];
  let seed = 314159265;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 155; i++) {
    const x = 8 + 84 * random();
    const y = 8 + 84 * random();
    const r = .25 + random() * (i % 13 === 0 ? 3.1 : 1.2);
    if (Math.hypot(x - 50, y - 50) + r > 43.6) continue;
    craters.push({ x, y, r, brightness: .15 + random() * .3 });
  }
  return craters;
}
const CRATERS = buildLocalCraters();
const MARE = [
  'M12 28 Q21 21 30 25 T43 38 Q39 49 28 51 Q14 47 12 38 Z',
  'M26 17 Q38 14 46 20 T49 38 Q44 45 36 41 Q29 34 26 17 Z',
  'M52 29 Q60 18 70 24 Q78 30 70 39 Q60 43 52 36 Z',
  'M54 41 Q66 36 76 43 T79 56 Q66 61 57 56 T54 41 Z',
  'M35 52 Q46 49 50 57 T48 72 Q38 74 32 65 Z',
  'M13 47 Q18 42 24 51 T28 69 Q18 72 14 64 Z',
  'M70 56 Q77 52 83 59 T77 70 Q71 71 70 56 Z',
];

export type MoonDiscProps = {
  id: string;
  fraction: number;
  rotation: number;
  view: View;
  detailed: boolean;
  label: string;
};

export default function MoonDisc({ id, fraction, rotation, view, detailed, label }: MoonDiscProps) {
  // React useId is stable but can contain colons; SVG URL fragments are easier
  // to resolve consistently in older Android browsers with simple identifiers.
  const safeId = 'luqi-moon-' + id.replace(/[^a-zA-Z0-9_-]/g, '');
  const disc = safeId + '-disc';
  const light = safeId + '-lit';
  const sphere = safeId + '-surface';
  const sphereShade = safeId + '-shade';
  const mapTone = safeId + '-tone';
  const phaseD = illuminatedPath(fraction);
  const mask = view === 'surface' ? disc : light;

  return <svg className="luqi-moon-globe" viewBox="0 0 100 100" role="img" aria-label={label}
    data-moon-view={view} data-moon-detail={detailed ? 'lro' : 'local'} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <clipPath id={disc}><circle cx="50" cy="50" r="44" /></clipPath>
      <clipPath id={light}><path d={phaseD} transform={`rotate(${rotation.toFixed(2)} 50 50)`} /></clipPath>
      <radialGradient id={mapTone} cx="40%" cy="38%" r="70%">
        <stop offset="0%" stopColor="#bab9ae" />
        <stop offset="53%" stopColor="#8e928e" />
        <stop offset="82%" stopColor="#747c7d" />
        <stop offset="100%" stopColor="#384146" />
      </radialGradient>
      <radialGradient id={sphereShade} cx="40%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#f5f5eb" stopOpacity=".15" />
        <stop offset="62%" stopColor="#eceeea" stopOpacity="0" />
        <stop offset="88%" stopColor="#161c24" stopOpacity=".11" />
        <stop offset="100%" stopColor="#04070a" stopOpacity=".48" />
      </radialGradient>
      <g id={sphere}>
        <circle cx="50" cy="50" r="44" fill={`url(#${mapTone})`} />
        <g fill="#39464b" opacity=".45">{MARE.map((path, index) =>
          <path d={path} key={index}/>)}</g>
        <g aria-hidden="true">
          {CRATERS.map((crater, index) => <g key={index}>
            <circle cx={crater.x + .18} cy={crater.y + .25} r={crater.r * 1.12}
              fill="#354047" opacity={crater.brightness * 1.2}/>
            <circle cx={crater.x - .16} cy={crater.y - .19} r={crater.r}
              stroke="#e1e0d5" strokeWidth={Math.min(.28, crater.r * .18)}
              fill="#858d88" opacity={crater.brightness}/>
          </g>)}
        </g>
      </g>
    </defs>
    <circle cx="50" cy="50" r="44.6" fill="#04080d" />
    {/* Very faint Earthshine preserves surface detail on the unlit side. */}
    <g clipPath={`url(#${disc})`} opacity=".14">
      <use href={`#${sphere}`} />
      {detailed && <image href={LRO_MOON_IMAGE} x="6" y="6" width="88" height="88"
        preserveAspectRatio="xMidYMid meet" aria-hidden="true" pointerEvents="none"
        className="luqi-moon-nasa-image" />}
    </g>
    <g clipPath={`url(#${mask})`}>
      <use href={`#${sphere}`} />
      {detailed && <image href={LRO_MOON_IMAGE} x="6" y="6" width="88" height="88"
        preserveAspectRatio="xMidYMid meet" aria-hidden="true" pointerEvents="none"
        className="luqi-moon-nasa-image" />}
      <circle cx="50" cy="50" r="44" fill={`url(#${sphereShade})`} />
    </g>
    <circle cx="50" cy="50" r="44" fill="none" stroke="#bdc7c5" strokeOpacity=".56" strokeWidth=".25" />
  </svg>;
}
