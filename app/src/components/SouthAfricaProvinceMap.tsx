import { useId, useState } from 'react';
import { ArrowDown, ArrowUpRight, Check, Compass, MapPin, MousePointer2 } from 'lucide-react';
import { PROVINCES, type ProvinceCode } from '../lib/opportunity-sources';
import { GAUTENG_CALLOUT, MAP_CONTEXT_LABELS, PROVINCE_GEOMETRY } from '../lib/sa-province-map';
import '../province-map.css';

type Props = { value: ProvinceCode | null; onSelect: (value: ProvinceCode | null) => void;
  counts: Record<ProvinceCode, number> };
const names: Record<ProvinceCode, string[]> = { EC: ['Eastern Cape'], FS: ['Free State'], GP: ['Gauteng'],
  KZN: ['KwaZulu-', 'Natal'], LP: ['Limpopo'], MP: ['Mpumalanga'], NC: ['Northern', 'Cape'],
  NW: ['North West'], WC: ['Western Cape'] };
const colours: Record<ProvinceCode, string> = { EC: '#174959', FS: '#205969', GP: '#32777c',
  KZN: '#266674', LP: '#205264', MP: '#1c455a', NC: '#163d50', NW: '#277072', WC: '#24606b' };
export default function SouthAfricaProvinceMap({ value, onSelect, counts }: Props) {
  const prefix = 'za-map-' + useId().replace(/:/g, '');
  const [hovered, setHovered] = useState<ProvinceCode | null>(null);
  const chosen = PROVINCES.find(p => p.id === value);
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const select = (id: ProvinceCode) => onSelect(value === id ? null : id);
  const browse = () => document.getElementById('province-job-board')?.scrollIntoView({ block: 'start',
    behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  return <section className="luqi-province-explorer" aria-label="Choose a South African province">
    <header className="luqi-province-heading">
      <div><p className="luqi-province-kicker"><Compass size={15} aria-hidden="true" /> OPPORTUNITIES, CLOSER TO HOME</p>
        <h2>Explore South Africa by province</h2>
        <p>Start with your province. Discover reviewed job notices and trusted official sources.</p></div>
      <span className="luqi-province-country">🇿🇦 <span>South Africa</span><span className="luqi-province-country-count">9 provinces</span></span>
    </header>
    <div className="luqi-province-workspace">
      <div className="luqi-province-map-panel">
        <div className="luqi-province-map-topline"><span><MapPin size={14} aria-hidden="true" /> {chosen?.name ?? 'Choose your starting point'}</span>
          <span className="luqi-province-north" aria-hidden="true">↑ N</span></div>
        <svg viewBox="0 0 800 620" role="group" aria-labelledby={prefix + '-title ' + prefix + '-description'}
          className="luqi-province-svg" preserveAspectRatio="xMidYMid meet">
          <title id={prefix + '-title'}>South Africa province map</title>
          <desc id={prefix + '-description'}>Geographic outlines of all nine provinces. Choose an area or use the full-name buttons below to filter reviewed notices.</desc>
          <defs><pattern id={prefix + '-grid'} width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="#b2dae1" strokeOpacity=".045" strokeWidth="1" /></pattern></defs>
          <rect width="800" height="620" fill={'url(#' + prefix + '-grid)'} aria-hidden="true" />
          {PROVINCE_GEOMETRY.map(region => {
            const name = PROVINCES.find(p => p.id === region.id)!.name;
            const selected = value === region.id;
            return <path key={region.id} d={region.path} fillRule="evenodd" clipRule="evenodd"
              fill={colours[region.id]} stroke="#82aeb9" strokeWidth="1.25" vectorEffect="non-scaling-stroke"
              role="button" tabIndex={0} aria-label={'Explore ' + name + ' on the map'} aria-pressed={selected}
              className={'luqi-province-shape' + (selected ? ' is-selected' : '')}
              onClick={() => select(region.id)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(region.id); }
                if (event.key === 'Escape') onSelect(null);
              }}
              onPointerEnter={event => { if (event.pointerType !== 'touch') setHovered(region.id); }}
              onPointerLeave={() => setHovered(null)}>
              <title>{name + ' · ' + counts[region.id] + ' reviewed notice' + (counts[region.id] === 1 ? '' : 's')}</title>
            </path>;
          })}
          <g className="luqi-province-map-labels" aria-hidden="true" pointerEvents="none">
            {PROVINCE_GEOMETRY.map(region => <g key={region.id} className={(value === region.id ? 'is-selected' : '') + (region.id === 'GP' ? ' is-gauteng' : '')}>
              {region.id === 'GP' && <path className="luqi-province-leader" d={`M${region.label[0]},${region.label[1]} L${GAUTENG_CALLOUT[0] + 37},${GAUTENG_CALLOUT[1] + 19} L${GAUTENG_CALLOUT[0] - 30},${GAUTENG_CALLOUT[1] + 19}`} />}
              <text className="luqi-province-fullname" x={region.id === 'GP' ? GAUTENG_CALLOUT[0] : region.label[0]}
                y={region.id === 'GP' ? GAUTENG_CALLOUT[1] + 10 : region.label[1]} textAnchor="middle">
                {names[region.id].map((line, i) => <tspan key={line} x={region.id === 'GP' ? GAUTENG_CALLOUT[0] : region.label[0]} dy={i ? 24 : 0}>{line}</tspan>)}
              </text>
              <text className="luqi-province-shortname" x={region.label[0]} y={region.label[1]} textAnchor="middle">{region.id}</text>
              {region.id === 'GP' && <circle className="luqi-province-gauteng-dot" cx={region.label[0]} cy={region.label[1]} r="3.5" fill="#d2fff1" />}
            </g>)}
            {MAP_CONTEXT_LABELS.map(place => <text key={place.name} className="luqi-province-context" x={place.position[0]}
              y={place.position[1]} textAnchor="middle">{place.name}</text>)}
            <text className="luqi-province-ocean" x="103" y="504" transform="rotate(-32 103 504)">ATLANTIC OCEAN</text>
            <text className="luqi-province-ocean" x="660" y="475" transform="rotate(-38 660 475)">INDIAN OCEAN</text>
          </g>
        </svg>
        <div className="luqi-province-map-caption"><span><span className="luqi-province-key" /> {hovered ? PROVINCES.find(p => p.id === hovered)?.name : 'Select a province to explore'}</span>
          <span><MousePointer2 size={13} aria-hidden="true" /> Tap, click or use the list</span></div>
      </div>
      <aside className="luqi-province-summary" aria-label="Province opportunity summary">
        <div className="luqi-province-summary-icon"><Compass size={25} aria-hidden="true" /></div>
        <p className="luqi-province-kicker">{chosen ? 'YOUR SELECTED PROVINCE' : 'YOUR NEXT CHAPTER'}</p>
        <h3>{chosen ? chosen.name : 'Opportunity starts with a place.'}</h3>
        <p>{chosen ? `Explore Luqi’s reviewed notices for ${chosen.name}. Each listing links to its original government publisher.`
          : 'Choose a province on the map or below. Luqi will bring its reviewed notices into focus.'}</p>
        <div className="luqi-province-stat"><strong>{value ? counts[value] : total}</strong>
          <span>reviewed notice{(value ? counts[value] : total) === 1 ? '' : 's'}<small>{chosen ? 'in this province' : 'across the current collection'}</small></span></div>
        {value && counts[value] === 0 && <p className="luqi-province-empty">No matching notice in this collection yet. Explore the official sources below for more opportunities.</p>}
        <button type="button" className="luqi-province-browse" onClick={browse}>View reviewed notices <ArrowDown size={16} aria-hidden="true" /></button>
        {value && <button type="button" className="luqi-province-reset" onClick={() => onSelect(null)}>Show all South Africa</button>}
        <a href="https://www.dpsa.gov.za/newsroom/psvc/" target="_blank" rel="noopener noreferrer" className="luqi-province-official">Explore official vacancy circulars <ArrowUpRight size={15} aria-hidden="true" /></a>
        <p className="luqi-province-count-note">Counts describe Luqi’s reviewed collection. Check each original advert for its deadline and availability.</p>
      </aside>
    </div>
    <div className="luqi-province-selector" role="group" aria-label="Province selection">
      {PROVINCES.map(province => <button key={province.id} type="button" aria-label={'Select ' + province.name}
        aria-pressed={value === province.id} className={value === province.id ? 'is-selected' : ''} onClick={() => select(province.id)}>
        <span className="luqi-province-selector-code" aria-hidden="true">{value === province.id ? <Check size={15} /> : province.id}</span>
        <span>{province.name}</span><span className="luqi-province-selector-count" aria-label={counts[province.id] + ' reviewed notices'}>{counts[province.id]}</span>
      </button>)}
    </div>
    <p className="luqi-province-selection-status" role="status">{chosen ? 'Selected ' + chosen.name + '. The reviewed notices below now match this province.' : 'No province selected. Showing reviewed notices across all nine provinces.'}</p>
    <footer className="luqi-province-footnote"><p>Geographic province boundaries, not exact job-site coordinates. Location stays your choice; Luqi does not read GPS here.</p>
      <p>Boundaries: <a href="https://www.geoboundaries.org/api/current/gbOpen/ZAF/ADM1/" target="_blank" rel="noopener noreferrer">geoBoundaries · OCHA ROSEA / Municipal Demarcation Board</a> · 2020, simplified · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a> / <a href="https://creativecommons.org/licenses/by/3.0/igo/" target="_blank" rel="noopener noreferrer">CC BY 3.0 IGO</a></p>
    </footer>
  </section>;
}
