import { useEffect, useState } from 'react';
import {
  AFRICAN_REGION_CODES, AFRICAN_REGIONAL_PROFILES, AU_EIGHT_RECS,
  CONTINENTAL_LINKS, REVIEWED_ON, isAfricanRegionCode, suggestRegionFromTimezone,
  type AfricanRegionCode,
} from '../services/panAfricanSovereignEngine';
import { useOptionalSovereignRegion } from '../providers/sovereign-region';
import '../sovereign-region.css';

/** Curated official LINK directory; no automatic location collection or government API. */
export default function SovereignRegionBar({ compact = false }: { compact?: boolean }) {
  const shared = useOptionalSovereignRegion();
  const [local, setLocal] = useState<AfricanRegionCode>('PAN_AFRICAN_AU');
  const region = shared?.region ?? local;
  const setRegion = shared?.setRegion ?? setLocal;
  const [hint, setHint] = useState<AfricanRegionCode | null>(null);
  useEffect(() => {
    try {
      setHint(suggestRegionFromTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone));
    } catch { setHint(null); }
  }, []);
  const active = AFRICAN_REGIONAL_PROFILES[region];
  return <section className={`luqi-region-bar${compact ? ' luqi-region-compact' : ''}`} aria-label="KHORO country and continental source guide">
    <div className="luqi-region-head">
      <div><p className="luqi-region-overline">KHORO · CONTINENTAL KNOWLEDGE</p>
        <h2>{active.flag} Explore Africa with local context</h2>
        <p>Choose a country guide, or keep the African Union view. This is a directory of reviewed starting points, not a government or payment integration.</p></div>
      <label htmlFor={compact ? 'luqi-country-home' : 'luqi-country-chat'}>
        Country and continental view
        <select id={compact ? 'luqi-country-home' : 'luqi-country-chat'}
          value={region} onChange={event => {
            if (isAfricanRegionCode(event.target.value)) setRegion(event.target.value);
          }}>
          {AFRICAN_REGION_CODES.map(code => <option key={code} value={code}>
            {AFRICAN_REGIONAL_PROFILES[code].flag} {AFRICAN_REGIONAL_PROFILES[code].title}
          </option>)}
        </select>
      </label>
    </div>
    {hint && hint !== region && <p className="luqi-region-hint">
      Browser timezone may suggest {AFRICAN_REGIONAL_PROFILES[hint].country}, but does not establish your location or applicable law.
      <button type="button" onClick={() => setRegion(hint)}>Use that country guide</button>
    </p>}
    <p className="luqi-region-note"><strong>{active.country}</strong> · {active.regionContext}. Currency information: {active.currency}. Reviewed reference links: {REVIEWED_ON}. Confirm every regulation, fee and eligibility with the relevant agency.</p>
    <nav className="luqi-region-links" aria-label="Official and institutional references">
      {active.govPortals.map(item => <a key={item.url} href={item.url} target="_blank" rel="noopener noreferrer">
        {item.label} <span aria-hidden="true">↗</span>
      </a>)}
    </nav>
    {!compact && <details className="luqi-region-details">
      <summary>Local law, education, languages and African trade — limitations</summary>
      <div className="luqi-region-grid">
        <div><h3>Topics to verify in this jurisdiction</h3><ul>{active.legalTopics.map(x => <li key={x}>{x}</li>)}</ul></div>
        <div><h3>Education and exams to research</h3><ul>{active.educationAndExamBoards.map(x => <li key={x}>{x}</li>)}</ul></div>
        <div><h3>Language examples (not tested translation support)</h3><ul>{active.languageExamples.map(x => <li key={x}>{x}</li>)}</ul></div>
        <div><h3>Cross-border trade checks</h3><ul>{active.crossBorderChecks.map(x => <li key={x}>{x}</li>)}</ul></div>
      </div>
      <p>The AU recognises <strong>eight</strong> Regional Economic Communities; these five curated country guides are <em>not</em> the full REC map. Some countries participate in more than one REC.</p>
      <p className="luqi-region-rec-list">{AU_EIGHT_RECS.join(' · ')}</p>
      <p>AfCFTA benefits require applicable tariff schedules and rules of origin. PAPSS depends on participating providers and supported payment corridors. LUQI has no clearance to file, send, pay, translate official exams or act for an agency.</p>
      <nav className="luqi-region-links" aria-label="Continental trade evidence">{CONTINENTAL_LINKS.map(item =>
        <a key={item.url} href={item.url} target="_blank" rel="noopener noreferrer">{item.label} ↗</a>)}</nav>
    </details>}
  </section>;
}
