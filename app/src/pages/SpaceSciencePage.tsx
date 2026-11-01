import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { FREQUENCY_UNITS, LIGHT_SPEED_SOURCE, SOURCE_REVIEWED_ON, SPACE_CATEGORIES, SPACE_PRACTICE,
  SPACE_WEATHER_BULLETIN, checkSpaceAnswer, findSpaceSources, radioWavelength, scienceNotebook, signalDelay,
  sourceReviewCurrent, type FrequencyUnit, type SpaceCategory } from '../lib/space-science';
import '../space-science.css';

export default function SpaceSciencePage() {
  const [query, setQuery] = useState(''), [category, setCategory] = useState<SpaceCategory>('All topics');
  const [frequency, setFrequency] = useState('1.4'), [unit, setUnit] = useState<FrequencyUnit>('GHz');
  const [distance, setDistance] = useState('384400'), [notice, setNotice] = useState('');
  const [choices, setChoices] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState<Record<string, number>>({});
  const [reviewCurrent, setReviewCurrent] = useState(() => sourceReviewCurrent());
  const downloadRef = useRef<{ url: string; timer: number } | null>(null);
  const sources = findSpaceSources(query, category), wave = radioWavelength(frequency, unit), delay = signalDelay(distance);
  const score = Object.entries(checked).filter(([id, choice]) => checkSpaceAnswer(id, choice)?.correct).length;
  function clearDownload() {
    if (downloadRef.current) {
      window.clearTimeout(downloadRef.current.timer); URL.revokeObjectURL(downloadRef.current.url); downloadRef.current = null;
    }
  }
  useEffect(() => {
    const refresh = () => setReviewCurrent(sourceReviewCurrent());
    const timer = window.setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh); clearDownload(); };
  }, []);
  function jumpTo(id: string) {
    const heading = document.getElementById(id);
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ block: 'start' });
  }
  function downloadNotes() {
    const notes = scienceNotebook(frequency, unit, distance);
    if (!notes.ok) { setNotice(notes.error); return; }
    clearDownload();
    let url: string | undefined;
    const anchor = document.createElement('a');
    try {
      url = URL.createObjectURL(new Blob([notes.value], { type: 'text/plain;charset=utf-8' }));
      anchor.href = url; anchor.download = 'luqi-space-science-notes.txt'; document.body.appendChild(anchor); anchor.click();
      const objectUrl = url;
      downloadRef.current = { url, timer: window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl); if (downloadRef.current?.url === objectUrl) downloadRef.current = null;
      }, 1500) };
      setNotice('Study-note download requested. Check your browser’s downloads.');
    } catch {
      if (url) URL.revokeObjectURL(url);
      setNotice('The download could not start. Your calculations remain on this page.');
    } finally { anchor.remove(); }
  }
  return <main className="luqi-space" aria-labelledby="luqi-space-title">
    <header className="luqi-space-hero">
      <p className="luqi-space-kicker">LUQI · LEARN, EXPLORE, UNDERSTAND</p>
      <h1 id="luqi-space-title">Space &amp; Science Hub</h1>
      <p>Explore South African space science, investigate radio signals and build your own study notes. These local activities need no account or paid AI.</p>
      <nav aria-label="Space learning shortcuts"><a href="#space-experiments" onClick={event => { event.preventDefault(); jumpTo('space-experiments-title'); }}>Try an experiment</a><a href="#space-sources" onClick={event => { event.preventDefault(); jumpTo('space-sources-title'); }}>Explore original sources</a><a href="#space-practice" onClick={event => { event.preventDefault(); jumpTo('space-practice-title'); }}>Check your understanding</a></nav>
    </header>
    <section className="luqi-space-notice" aria-label="Source and privacy information">
      <p><strong>Original sources, not a live feed.</strong> Page descriptions reviewed on <time dateTime={SOURCE_REVIEWED_ON}>1 November 2026</time>. No telescope, satellite, location or forecast is connected to this page.</p>
      {!reviewCurrent && <p role="status">These source descriptions are due for review, or your device clock is outside their review window. Open the original publishers for current information.</p>}
      <p>Inputs and practice answers stay in this page’s memory and clear when you leave. External sources open only when selected, in a new tab under the publisher’s own privacy terms.</p>
    </section>

    <section id="space-experiments" aria-labelledby="space-experiments-title">
      <h2 id="space-experiments-title" tabIndex={-1}>Experiment with radio and distance</h2>
      <div className="luqi-space-grid">
        <section className="luqi-space-card" aria-labelledby="space-wave-title">
          <h3 id="space-wave-title">Frequency → wavelength</h3>
          <p>Change frequency and observe the calculated wavelength in a vacuum.</p>
          <div className="luqi-space-inputs">
            <label htmlFor="space-frequency">Frequency<input id="space-frequency" inputMode="decimal" autoComplete="off" maxLength={24} value={frequency}
              onChange={event => { setFrequency(event.target.value); setNotice(''); }} aria-invalid={!wave.ok} aria-describedby="space-wave-result" /></label>
            <div><label htmlFor="space-frequency-unit">Unit</label><select id="space-frequency-unit" value={unit} onChange={event => { setUnit(event.target.value as FrequencyUnit); setNotice(''); }}>
              {FREQUENCY_UNITS.map(value => <option key={value}>{value}</option>)}
            </select></div>
          </div>
          <div id="space-wave-result" className="luqi-space-result" role="status" aria-live="polite">
            {wave.ok ? <><strong>{wave.value.wavelengthM.toPrecision(6)} m</strong><span>Wavelength in vacuum</span></> : <p>{wave.error}</p>}
          </div>
          <p><code>λ = c / f</code> · Twice the frequency gives half the wavelength in this model. This does not calculate antenna gain, radio range or reception quality.</p>
        </section>
        <section className="luqi-space-card" aria-labelledby="space-delay-title">
          <h3 id="space-delay-title">Distance → signal delay</h3>
          <p>Enter an assumed one-way path, not a destination or a live spacecraft position.</p>
          <label htmlFor="space-distance">One-way path length (km)<input id="space-distance" inputMode="decimal" autoComplete="off" maxLength={24} value={distance}
            onChange={event => { setDistance(event.target.value); setNotice(''); }} aria-invalid={!delay.ok} aria-describedby="space-delay-result" /></label>
          <div className="luqi-space-presets" role="group" aria-label="Example path lengths">
            {[400, 384400, 225000000].map(km => <button type="button" key={km} onClick={() => { setDistance(String(km)); setNotice(''); }}>{km.toLocaleString('en-ZA')} km example</button>)}
          </div>
          <div id="space-delay-result" className="luqi-space-result" role="status" aria-live="polite">
            {delay.ok ? <><strong>{delay.value.oneWaySeconds.toFixed(6)} s one-way</strong><span>{delay.value.roundTripSeconds.toFixed(6)} s round-trip</span></> : <p>{delay.error}</p>}
          </div>
          <p><code>t = d / c</code> · A fixed vacuum path, with no processing, network, atmospheric or orbital-motion delay. Presets are exercises, not current measured distances.</p>
        </section>
      </div>
      <p className="luqi-space-caption">Both tools use c = 299,792,458 m/s, the exact SI value. <a href={LIGHT_SPEED_SOURCE} target="_blank" rel="noopener noreferrer">Read the NIST constant (new tab)</a>. Calculations are educational, not mission or safety advice.</p>
      <button type="button" className="luqi-space-primary" disabled={!wave.ok || !delay.ok} onClick={downloadNotes}>Download my study notes</button>
      <p role="status" aria-live="polite">{notice}</p>
    </section>

    <section id="space-sources" aria-labelledby="space-sources-title">
      <h2 id="space-sources-title" tabIndex={-1}>Discover the original publishers</h2>
      <p>SANSA, SARAO and SKAO have distinct programmes. Keep the organisation, publication time and evidence behind each claim visible.</p>
      <div className="luqi-space-inputs luqi-space-filter">
        <label htmlFor="space-source-query">Search science sources<input id="space-source-query" type="search" maxLength={120} value={query} onChange={event => setQuery(event.target.value)} placeholder="MeerKAT, water, spacecraft…" /></label>
        <div><label htmlFor="space-source-category">Topic</label><select id="space-source-category" value={category} onChange={event => setCategory(event.target.value as SpaceCategory)}>
          {SPACE_CATEGORIES.map(value => <option key={value}>{value}</option>)}
        </select></div>
      </div>
      <p role="status" aria-live="polite">{sources.length} matching source{sources.length === 1 ? '' : 's'}</p>
      <div className="luqi-space-grid">
        {sources.map(source => <article className="luqi-space-card" key={source.id}>
          <p className="luqi-space-kicker">{source.publisher} · {source.category}</p><h3>{source.title}</h3>
          <p>{source.summary}</p><p className="luqi-space-boundary">{source.limitation}</p>
          <a href={source.url} target="_blank" rel="noopener noreferrer">Read {source.publisher} source (new tab)</a>
        </article>)}
      </div>
      {!sources.length && <div className="luqi-space-notice"><p>No sources match both filters.</p><button type="button" onClick={() => { setQuery(''); setCategory('All topics'); }}>Reset source filters</button></div>}
      <p className="luqi-space-notice"><strong>Looking for a current bulletin?</strong> <a href={SPACE_WEATHER_BULLETIN} target="_blank" rel="noopener noreferrer">Open the official SANSA space-weather bulletin (new tab)</a>. Check the date on that page; Luqi has not fetched a current bulletin for you.</p>
    </section>

    <section id="space-practice" aria-labelledby="space-practice-title">
      <h2 id="space-practice-title" tabIndex={-1}>Check your understanding</h2>
      <p>Three Luqi-authored practice questions. No AI grading, exam certification or stored learner profile.</p>
      <div className="luqi-space-practice">
        {SPACE_PRACTICE.map(item => {
          const feedback = checkSpaceAnswer(item.id, checked[item.id]);
          return <fieldset className="luqi-space-card" key={item.id}>
            <legend>{item.question}</legend>
            {item.choices.map((choice, index) => <label className="luqi-space-choice" key={choice}>
              <input type="radio" name={'space-' + item.id} checked={choices[item.id] === index} onChange={() => {
                setChoices(previous => ({ ...previous, [item.id]: index }));
                setChecked(previous => { const next = { ...previous }; delete next[item.id]; return next; });
              }} />{choice}
            </label>)}
            <button type="button" disabled={choices[item.id] === undefined} onClick={() => setChecked(previous => ({ ...previous, [item.id]: choices[item.id] }))}>Check answer</button>
            {feedback && <p role="status">{feedback.correct ? 'Correct. ' : 'Not quite. '}{feedback.explanation}</p>}
          </fieldset>;
        })}
      </div>
      <p role="status">{score} of {SPACE_PRACTICE.length} practice answers correct.</p>
      <button type="button" onClick={() => { setChoices({}); setChecked({}); }}>Reset practice</button>
    </section>
    <nav className="luqi-space-next" aria-label="Continue learning in Luqi"><Link to="/cert-academy">Continue with networking</Link><Link to="/content-studio">Create a science explainer</Link><Link to="/">Back to Luqi workspace</Link></nav>
  </main>;
}
