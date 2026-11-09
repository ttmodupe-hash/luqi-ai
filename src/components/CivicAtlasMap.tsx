import { useId, useState } from 'react';
import { ArrowUpRight, LocateFixed, MapPin, Minus, Plus, RotateCcw } from 'lucide-react';
import { PROVINCES, type ProvinceCode } from '../lib/opportunity-sources';
import { GAUTENG_CALLOUT, MAP_CONTEXT_LABELS, PROVINCE_GEOMETRY } from '../lib/sa-province-map';

type Props = { province: ProvinceCode | null; onProvince: (province: ProvinceCode | null) => void };
const colours: Record<ProvinceCode, string> = {
  EC: '#23594e', FS: '#2f6b59', GP: '#639c76', KZN: '#2f7868', LP: '#42755a',
  MP: '#3a8b73', NC: '#193f39', NW: '#3b7c61', WC: '#286555',
};

/** Reference geography only: colours never encode votes, party control or local evidence. */
export default function CivicAtlasMap({ province, onProvince }: Props) {
  const id = 'civic-atlas-' + useId().replace(/:/g, '');
  const [zoom, setZoom] = useState(1);
  const chosen = PROVINCES.find(item => item.id === province);
  const centre = PROVINCE_GEOMETRY.find(item => item.id === province)?.label ?? [400, 310];
  const width = 800 / zoom, height = 620 / zoom;
  const x = Math.max(0, Math.min(800 - width, centre[0] - width / 2));
  const y = Math.max(0, Math.min(620 - height, centre[1] - height / 2));
  const select = (value: ProvinceCode) => onProvince(province === value ? null : value);

  return <section className="civic-atlas-map civic-surface" aria-labelledby="civic-map-title">
    <header className="civic-panel-heading">
      <div><p className="civic-eyebrow">GEOGRAPHIC EXPLORER</p><h2 id="civic-map-title">South Africa <span>/ 09 provinces</span></h2></div>
      <span className="civic-chip"><span className="civic-dot" /> Reference map</span>
    </header>
    <div className="civic-map-toolbar">
      <label><MapPin size={14} aria-hidden="true" /><span className="civic-sr-only">Explore a province</span>
        <select value={province ?? ''} onChange={event => onProvince((event.target.value || null) as ProvinceCode | null)}>
          <option value="">All South Africa</option>
          {PROVINCES.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <span className="civic-map-coordinates" aria-hidden="true">ZA · 30° S / 25° E</span>
    </div>
    <div className="civic-map-canvas">
      <div className="civic-map-north" aria-hidden="true"><span>↑</span>N</div>
      <svg viewBox={`${x} ${y} ${width} ${height}`} role="group" aria-labelledby={`${id}-title ${id}-description`}>
        <title id={`${id}-title`}>South Africa civic reference map</title>
        <desc id={`${id}-description`}>Select one of nine provinces to explore its verification channels. Map colours identify geography and selection, not election results. You can also use the province menu.</desc>
        <defs>
          <pattern id={`${id}-grid`} width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#a6f1cc" strokeOpacity=".07" /></pattern>
          <radialGradient id={`${id}-glow`}><stop stopColor="#77e7ac" stopOpacity=".13" /><stop offset="1" stopColor="#77e7ac" stopOpacity="0" /></radialGradient>
        </defs>
        <rect width="800" height="620" fill={`url(#${id}-grid)`} aria-hidden="true" />
        <ellipse cx="415" cy="310" rx="360" ry="270" fill={`url(#${id}-glow)`} aria-hidden="true" />
        {PROVINCE_GEOMETRY.map(region => {
          const name = PROVINCES.find(item => item.id === region.id)!.name;
          const active = province === region.id;
          return <path key={region.id} d={region.path} fill={colours[region.id]} fillRule="evenodd"
            vectorEffect="non-scaling-stroke" className={'civic-map-region' + (active ? ' is-selected' : '')}
            role="button" tabIndex={0} aria-label={`Explore ${name} on the civic map`} aria-pressed={active}
            onClick={() => select(region.id)} onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(region.id); }
              if (event.key === 'Escape') onProvince(null);
            }}><title>{name} · reference geography; local records unavailable</title></path>;
        })}
        <g className="civic-map-labels" aria-hidden="true" pointerEvents="none">
          {PROVINCE_GEOMETRY.map(region => {
            const gp = region.id === 'GP';
            const label = gp ? GAUTENG_CALLOUT : region.label;
            const name = PROVINCES.find(item => item.id === region.id)!.name;
            return <g key={region.id}>
              {gp && <path d={`M${region.label[0]},${region.label[1]} L${label[0] + 38},${label[1] + 18} L${label[0] - 20},${label[1] + 18}`} fill="none" stroke="#c9e9c9" strokeWidth="1" />}
              <text x={label[0]} y={label[1]} textAnchor="middle" className="civic-map-full-label">{name}</text>
              <text x={region.label[0]} y={region.label[1]} textAnchor="middle" className="civic-map-short-label">{region.id}</text>
              {province === region.id && <g className="civic-map-marker"><circle cx={region.label[0]} cy={region.label[1] + 22} r="10" fill="none" stroke="#d9ffaa" /><circle cx={region.label[0]} cy={region.label[1] + 22} r="3" fill="#e5ffc6" /></g>}
            </g>;
          })}
          {MAP_CONTEXT_LABELS.map(place => <text key={place.name} x={place.position[0]} y={place.position[1]} className="civic-map-context" textAnchor="middle">{place.name}</text>)}
          <text x="94" y="490" transform="rotate(-36 94 490)" className="civic-map-ocean">ATLANTIC OCEAN</text>
          <text x="664" y="458" transform="rotate(-40 664 458)" className="civic-map-ocean">INDIAN OCEAN</text>
        </g>
      </svg>
      <div className="civic-map-controls" role="group" aria-label="Civic map zoom controls">
        <button type="button" aria-label="Zoom in on civic map" disabled={zoom >= 1.75} onClick={() => setZoom(value => Math.min(1.75, value + .25))}><Plus size={17} /></button>
        <output aria-label="Civic map zoom">{Math.round(zoom * 100)}%</output>
        <button type="button" aria-label="Zoom out on civic map" disabled={zoom <= 1} onClick={() => setZoom(value => Math.max(1, value - .25))}><Minus size={17} /></button>
        <button type="button" aria-label="Reset civic map view" onClick={() => { setZoom(1); onProvince(null); }}><RotateCcw size={15} /></button>
      </div>
      <div className="civic-map-legend"><span><i />Province boundary</span><span><i />Selected area</span></div>
    </div>
    <div className="civic-area-summary" aria-live="polite">
      <span className="civic-area-icon"><LocateFixed size={21} aria-hidden="true" /></span>
      <div><p className="civic-eyebrow">{chosen ? 'SELECTED PROVINCE' : 'NATIONAL CONTEXT'}</p><h3>{chosen?.name ?? 'Your country. In focus.'}</h3>
        <p>{chosen ? 'No verified province or ward records in this edition. The library remains national.' : 'Choose a province. Explore the national evidence, then verify local details at the source.'}</p></div>
      {chosen && <a href="https://www.elections.org.za/pw/voter/voter-information" target="_blank" rel="noopener noreferrer" className="civic-icon-link" aria-label={`Verify ${chosen.name} ward details with the IEC`}><ArrowUpRight size={20} /></a>}
    </div>
    <details className="civic-map-attribution"><summary>Map source & coverage</summary>
      <p>2020 province boundaries, simplified. This is reference geography, not ward boundaries or a live results map. Colour does not indicate political control.</p>
      <p><a href="https://www.geoboundaries.org/api/current/gbOpen/ZAF/ADM1/" target="_blank" rel="noopener noreferrer">geoBoundaries · OCHA ROSEA / Municipal Demarcation Board</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a> / <a href="https://creativecommons.org/licenses/by/3.0/igo/" target="_blank" rel="noopener noreferrer">CC BY 3.0 IGO</a></p>
    </details>
  </section>;
}
