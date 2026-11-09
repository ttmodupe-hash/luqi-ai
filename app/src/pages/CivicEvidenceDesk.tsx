import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Clock3, Database, FileCheck2, Fingerprint, Layers3, Search, ShieldCheck } from 'lucide-react';
import CivicAtlasMap from '../components/CivicAtlasMap';
import CivicWardGuide from '../components/CivicWardGuide';
import CivicEvidencePanel, { useCivicReviewClock } from '../components/CivicEvidencePanel';
import { CIVIC_CLAIMS, CIVIC_EDITION, CIVIC_SCOPE_NOTICE, CIVIC_SOURCES, civicReviewCurrent, getCivicSource } from '../lib/civic-evidence';
import type { ProvinceCode } from '../lib/opportunity-sources';
import '../civic-atlas.css';

const TOPICS = ['All topics', 'Audits', 'Public money', 'Accountability', 'Voting'];
const SOURCE_NAMES: Record<string, string> = { 'agsa-audits': 'AGSA', 'agsa-compliance': 'AGSA', 'treasury-data': 'National Treasury', 'parliament-oversight': 'Parliament', 'iec-voter': 'IEC' };

export default function CivicEvidenceDesk() {
  const [topic, setTopic] = useState('All topics');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(CIVIC_CLAIMS[0].id);
  const [view, setView] = useState<'records' | 'sources'>('records');
  const [province, setProvince] = useState<ProvinceCode | null>(null);
  const now = useCivicReviewClock();
  const query = search.trim().toLocaleLowerCase('en-ZA');
  const claims = CIVIC_CLAIMS.filter(claim => (topic === 'All topics' || claim.topic === topic)
    && (!query || [claim.title, claim.topic, ...claim.sourceIds.map(id => getCivicSource(id)?.publisher ?? '')].join(' ').toLocaleLowerCase('en-ZA').includes(query)));
  const selected = claims.find(claim => claim.id === selectedId) ?? claims[0];
  const sources = CIVIC_SOURCES.filter(source => claims.some(claim => claim.sourceIds.includes(source.id)));
  const current = CIVIC_CLAIMS.filter(claim => civicReviewCurrent(claim, now)).length;
  const scrollToRecord = () => {
    if (!selected) return;
    const target = document.getElementById('civic-title-' + selected.id);
    const calm = document.querySelector('.luqi-shell[data-motion="calm"]') || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    target?.scrollIntoView({ block: 'start', behavior: calm ? 'auto' : 'smooth' });
    target?.focus({ preventScroll: true });
  };

  return <section aria-labelledby="civic-desk-title" className="civic-atlas">
    <header className="civic-atlas-header">
      <div className="civic-atlas-topline"><p className="civic-eyebrow"><span className="civic-brand-mark" aria-hidden="true"><Layers3 size={16} /></span> LUQI / CIVIC ATLAS <span className="civic-divider">/</span> SOUTH AFRICA</p><span className="civic-edition">EDITION {CIVIC_EDITION}</span></div>
      <div className="civic-atlas-title-row"><div><h1 id="civic-desk-title">Civic Evidence Desk<span aria-hidden="true">.</span></h1><p>A clearer view of your country. Evidence you can explore.</p></div>
        <div className="civic-header-actions"><Link to="/drive" className="civic-button">Luqi-Drive <ArrowUpRight size={15} aria-hidden="true" /></Link><a href="https://results.elections.org.za/" target="_blank" rel="noopener noreferrer" className="civic-button civic-button-primary">Official IEC results <ArrowUpRight size={16} aria-hidden="true" /></a></div></div>
      <div className="civic-atlas-context"><span><ShieldCheck size={14} aria-hidden="true" /> Independent civic learning</span><span><Fingerprint size={14} aria-hidden="true" /> No vote preference saved</span><span className="civic-context-status"><i /> Dated reference edition · not a live feed</span></div>
    </header>

    <div className="civic-metrics" aria-label="Current civic collection">
      <div className="civic-metric"><span className="civic-metric-icon"><Database size={18} aria-hidden="true" /></span><div><p>Evidence records</p><strong>{String(CIVIC_CLAIMS.length).padStart(2, '0')}</strong><span>Dated, source-linked explanations</span></div><span className="civic-metric-code">LIBRARY</span></div>
      <div className="civic-metric"><span className="civic-metric-icon"><FileCheck2 size={18} aria-hidden="true" /></span><div><p>Official source pages</p><strong>{String(CIVIC_SOURCES.length).padStart(2, '0')}</strong><span>{new Set(CIVIC_SOURCES.map(source => source.publisher)).size} publishing institutions</span></div><span className="civic-metric-code">SOURCES</span></div>
      <div className="civic-metric"><span className="civic-metric-icon"><BookOpen size={18} aria-hidden="true" /></span><div><p>Civic topics</p><strong>{String(new Set(CIVIC_CLAIMS.map(claim => claim.topic)).size).padStart(2, '0')}</strong><span>Audits, money, oversight & voting</span></div><span className="civic-metric-code">EXPLORE</span></div>
      <div className={'civic-metric civic-metric-review' + (current < CIVIC_CLAIMS.length ? ' needs-review' : '')}><span className="civic-metric-icon"><Clock3 size={18} aria-hidden="true" /></span><div><p>Within review window</p><strong>{String(current).padStart(2, '0')}<small>/{String(CIVIC_CLAIMS.length).padStart(2, '0')}</small></strong><span>{current === CIVIC_CLAIMS.length ? 'Check dates on each record' : 'Expired records need source recheck'}</span></div><span className="civic-metric-code">AS DATED</span></div>
    </div>

    <div className="civic-dashboard-grid">
      <CivicAtlasMap province={province} onProvince={setProvince} />
      <section className="civic-evidence-console civic-surface" aria-labelledby="civic-console-title">
        <header className="civic-panel-heading"><div><p className="civic-eyebrow">THE EVIDENCE LAYER</p><h2 id="civic-console-title">Explore the public record</h2></div><span className="civic-record-total">{String(claims.length).padStart(2, '0')}<small> / {String(CIVIC_CLAIMS.length).padStart(2, '0')}</small></span></header>
        <div className="civic-console-tabs" role="tablist" aria-label="Evidence view">
          <button type="button" role="tab" id="civic-tab-records" aria-controls="civic-console-panel" aria-selected={view === 'records'} tabIndex={view === 'records' ? 0 : -1} onClick={() => setView('records')} onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft' || event.key === 'End') { event.preventDefault(); setView('sources'); document.getElementById('civic-tab-sources')?.focus(); } }}>Evidence records <span>{claims.length}</span></button>
          <button type="button" role="tab" id="civic-tab-sources" aria-controls="civic-console-panel" aria-selected={view === 'sources'} tabIndex={view === 'sources' ? 0 : -1} onClick={() => setView('sources')} onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Home') { event.preventDefault(); setView('records'); document.getElementById('civic-tab-records')?.focus(); } }}>Source pages <span>{sources.length}</span></button>
        </div>
        <div className="civic-console-filters"><label className="civic-search"><Search size={16} aria-hidden="true" /><span className="civic-sr-only">Search civic records</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search records or publishers" maxLength={120} /></label>
          <label className="civic-topic-filter"><span className="civic-sr-only">Evidence topic</span><select value={topic} onChange={event => setTopic(event.target.value)}>{TOPICS.map(value => <option key={value}>{value}</option>)}</select></label></div>
        <div id="civic-console-panel" role="tabpanel" aria-labelledby={view === 'records' ? 'civic-tab-records' : 'civic-tab-sources'} tabIndex={0} className="civic-console-results">
          {view === 'records' && claims.length > 0 && <table className="civic-record-table"><caption className="civic-sr-only">National educational records, not provincial or party results</caption><thead><tr><th scope="col">Record / topic</th><th scope="col">Source</th><th scope="col">Review</th></tr></thead><tbody>{claims.map((claim, index) => <tr key={claim.id} className={selected?.id === claim.id ? 'is-selected' : ''}><th scope="row"><button type="button" aria-label={`Inspect ${claim.title}`} aria-pressed={selected?.id === claim.id} onClick={() => setSelectedId(claim.id)}><span className="civic-row-index">{String(index + 1).padStart(2, '0')}</span><span><strong>{claim.title}</strong><small>{claim.topic}</small></span></button></th><td>{SOURCE_NAMES[claim.sourceIds[0]]}</td><td><span className={'civic-review-badge' + (civicReviewCurrent(claim, now) ? ' is-current' : '')}>{civicReviewCurrent(claim, now) ? 'In window' : 'Recheck'}</span></td></tr>)}</tbody></table>}
          {view === 'sources' && sources.length > 0 && <div className="civic-publisher-list">{sources.map(source => <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer"><span className="civic-publisher-mark">{SOURCE_NAMES[source.id].slice(0, 2).toUpperCase()}</span><span><strong>{source.publisher}</strong><small>{source.title}</small></span><ArrowUpRight size={16} aria-hidden="true" /></a>)}</div>}
          {!claims.length && <div className="civic-empty"><Search size={25} aria-hidden="true" /><h3>No matching evidence records</h3><p>Try another topic, record title or publisher.</p><button type="button" className="civic-button" onClick={() => { setSearch(''); setTopic('All topics'); }}>Clear filters <ArrowRight size={14} aria-hidden="true" /></button></div>}
        </div>
        {selected && <aside className="civic-record-inspector" aria-label="Selected evidence record"><p className="civic-eyebrow"><span className="civic-dot" /> RECORD IN FOCUS <span>{selected.topic}</span></p><h3>{selected.title}</h3><p>{selected.coverage}</p><div><span><Clock3 size={13} aria-hidden="true" /> Reviewed {selected.reviewedOn}</span><button type="button" onClick={scrollToRecord}>Read full record <ArrowDown size={14} aria-hidden="true" /></button></div></aside>}
        <p className="civic-console-footnote" role="status">{claims.length} dated evidence record{claims.length === 1 ? '' : 's'}. National reference material; province selection does not change these records.</p>
      </section>
    </div>

    <div className="civic-collection-strip"><span className="civic-eyebrow">COLLECTION COVERAGE</span><div className="civic-topic-bars" aria-label="Evidence by topic">{TOPICS.slice(1).map((name, index) => { const count = CIVIC_CLAIMS.filter(claim => claim.topic === name).length; return <button type="button" key={name} aria-pressed={topic === name} onClick={() => setTopic(topic === name ? 'All topics' : name)} className={`civic-topic-segment civic-topic-${index}`} style={{ flexGrow: count }}><span>{name}</span><strong>{count}</strong></button>; })}</div><span className="civic-coverage-note">National context · local data unavailable</span></div>

    <div className="civic-library-heading"><div><p className="civic-eyebrow">GO BEYOND THE HEADLINE</p><h2>Read. Question. Verify.</h2><p>Open the evidence, understand its limits and follow the original source.</p></div><span><BookOpen size={16} aria-hidden="true" /> {claims.length} record{claims.length === 1 ? '' : 's'} in view</span></div>
    <div className="civic-record-library">{claims.map(claim => <CivicEvidencePanel key={claim.id} claim={claim} />)}</div>

    <details className="civic-verification-guide civic-surface"><summary><ShieldCheck size={18} aria-hidden="true" /><span>Official verification guide<small>Party information, ward details & civic responsibilities</small></span><span className="civic-disclosure-symbol" aria-hidden="true">+</span></summary><CivicWardGuide /></details>
    <footer className="civic-atlas-footer"><p>{CIVIC_SCOPE_NOTICE}</p><p>Luqi is independent of political parties and is not an IEC or government service. Your voting decision remains yours. Read without an account. The optional AI supporter selects reviewed explanations in Luqi Chat; it does not search live. This initial reference set is in English.</p><Link to="/chat">Return to general Chat <ArrowRight size={14} aria-hidden="true" /></Link></footer>
  </section>;
}
