import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { compassDirection, moonSnapshot, nextMoonEvents, parseMoonLocation,
  validMoonLocation, MOON_REFRESH_MS, type MoonLocation } from '../lib/moon-tracker.mjs';
import MoonDisc, { LRO_MOON_SOURCE } from './MoonDisc';
import './moon-now.css';

/** On-device lunar calculations; optional public NASA-derived image may load from Wikimedia. No account, location upload or paid AI. */
export default function MoonNowPanel() {
  const id = useId();
  const [now, setNow] = useState(() => new Date());
  const [paused, setPaused] = useState(false);
  const [view, setView] = useState<'phase' | 'surface'>('phase');
  // The homepage remains local-only until the visitor explicitly opts into a third-party image.
  const [detailed, setDetailed] = useState(false);
  const [location, setLocation] = useState<MoonLocation | null>(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [message, setMessage] = useState('');
  const [locating, setLocating] = useState(false);
  const requestGeneration = useRef(0);
  useEffect(() => () => { requestGeneration.current += 1; }, []);
  useEffect(() => {
    if (paused) return;
    const refresh = () => { if (document.visibilityState !== 'hidden') setNow(new Date()); };
    refresh();
    const timer = window.setInterval(refresh, MOON_REFRESH_MS);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [paused]);
  const snapshot = useMemo(() => {
    try { return moonSnapshot(now, location); } catch { return null; }
  }, [now, location]);
  const events = useMemo(() => {
    if (!snapshot || !location) return null;
    try { return nextMoonEvents(now, location); } catch { return null; }
  }, [snapshot, now, location]);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const formatTime = (iso: string | null) => iso ? new Intl.DateTimeFormat(undefined, {
    timeZone: zone, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso)) : 'Not found in the next 48 hours';
  const clearLocation = () => {
    requestGeneration.current += 1;
    setLocation(null); setLatitude(''); setLongitude(''); setLocationLabel('');
    setLocating(false); setMessage('Location cleared. Global Moon phase remains available.');
  };
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setMessage('This browser cannot provide location. Enter coordinates below instead.'); return;
    }
    const request = ++requestGeneration.current;
    setLocating(true); setMessage('Requesting a one-time location. You can decline and use manual coordinates.');
    navigator.geolocation.getCurrentPosition(result => {
      if (request !== requestGeneration.current) return;
      const area = { latitude: Math.round(result.coords.latitude * 10) / 10,
        longitude: Math.round(result.coords.longitude * 10) / 10 };
      setLocating(false);
      if (!validMoonLocation(area)) { setMessage('Location was not usable. Try manual coordinates.'); return; }
      setLocation(area); setLocationLabel('Your approximate area (rounded to 0.1°)');
      setLatitude(String(area.latitude)); setLongitude(String(area.longitude));
      setNow(new Date()); setMessage('Location stays in this tab and is cleared on reload.');
    }, () => {
      if (request !== requestGeneration.current) return;
      setLocating(false); setMessage('Location was not available. Moon phase still works; enter coordinates to see direction.');
    }, { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 });
  };
  return (
    <section className="luqi-moon" aria-labelledby={`${id}-heading`}>
      <header className="luqi-moon-heading">
        <div><p className="luqi-moon-eyebrow">LOOK UP. LEARN SOMETHING.</p><h2 id={`${id}-heading`}>Moon now</h2></div>
        <span className="luqi-moon-badge">{paused ? 'Updates paused' : 'Live calculation · every minute'}</span>
      </header>
      {!snapshot ? <p role="alert">Check your device clock. Moon calculations support dates from 1900 to 2100.</p> : <>
        <div className="luqi-moon-overview">
          <figure>
            <div className="luqi-moon-visual">
              <MoonDisc id={id} fraction={snapshot.fraction} rotation={snapshot.rotation}
                view={view} detailed={detailed}
                label={view === 'surface' ? 'Full lunar near-side map for study, not current illumination' :
                  `${snapshot.name}, ${(snapshot.fraction * 100).toFixed(0)} percent illuminated`} />
            </div>
            <figcaption>{view === 'surface'
              ? 'Full near-side surface for exploration, not today’s lunar illumination.'
              : 'Locally illustrated lunar surface with a calculated live phase, not camera footage. Choose the NASA image button for a historic photographic mosaic.'}
              <br />{location ? 'Phase tilt estimated for your selected area.' : 'Moon orientation is approximate without a location.'}
              <br /><a href={LRO_MOON_SOURCE} target="_blank" rel="noopener noreferrer">NASA LRO surface source</a> · NASA/GSFC/Arizona State University
            </figcaption>
          </figure>
          <div>
            <h3>{snapshot.name}</h3>
            <dl className="luqi-moon-facts">
              <div><dt>Illuminated</dt><dd>{(snapshot.fraction * 100).toFixed(0)}%</dd></div>
              <div><dt>Earth-centre distance</dt><dd>≈ {(Math.round(snapshot.distanceKm / 100) * 100).toLocaleString()} km</dd></div>
              <div><dt>Changing towards</dt><dd>{snapshot.waxing ? 'Full moon' : 'New moon'}</dd></div>
            </dl>
            <p>Calculated for <time dateTime={snapshot.at}>{formatTime(snapshot.at)}</time>.<br />All times use your device zone: {zone}.</p>
          </div>
        </div>
        {snapshot.local && <div className="luqi-moon-local">
          <h3>{locationLabel}</h3>
          <dl className="luqi-moon-facts">
            <div><dt>Direction from true north</dt><dd>{compassDirection(snapshot.local.azimuth)} · {snapshot.local.azimuth.toFixed(0)}°</dd></div>
            <div><dt>Centre above/below horizon</dt><dd>{snapshot.local.altitude.toFixed(0)}°</dd></div>
            <div><dt>Moon centre</dt><dd>{snapshot.local.altitude >= 0 ? 'Above model horizon' : 'Below model horizon'}</dd></div>
            <div><dt>Next estimated moonrise</dt><dd>{events ? formatTime(events.rise) : 'Estimate unavailable'}</dd></div>
            <div><dt>Next estimated moonset</dt><dd>{events ? formatTime(events.set) : 'Estimate unavailable'}</dd></div>
          </dl>
          <p>Position is calculated, not a visibility report. Clouds, daylight, buildings and terrain can hide the Moon. The model assumes an unobstructed horizon at sea level.</p>
        </div>}
      </>}
      <div className="luqi-moon-actions">
        <button type="button" aria-pressed={view === 'phase'} onClick={() => setView('phase')}>Current phase</button>
        <button type="button" aria-pressed={view === 'surface'} onClick={() => setView('surface')}>Explore full surface</button>
        <button type="button" onClick={() => setDetailed(value => !value)}>
          {detailed ? 'Use low-data Moon' : 'Show NASA Moon image'}
        </button>
        <button type="button" onClick={() => setNow(new Date())}>Refresh now</button>
        <button type="button" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? 'Resume live updates' : 'Pause live updates'}</button>
        <button type="button" onClick={requestLocation} disabled={locating}>{locating ? 'Requesting location…' : 'Use my location (optional)'}</button>
        {(location || locating) && <button type="button" onClick={clearLocation}>Clear location</button>}
      </div>
      <p className="luqi-moon-message" role="status">{message || 'No location needed for phase. Add a location for Moon direction and rise/set estimates.'}</p>
      <details>
        <summary>Enter an area manually</summary>
        <p>Coordinates work anywhere. South latitudes and west longitudes are negative. No location is assumed or saved.</p>
        <form className="luqi-moon-form" onSubmit={event => {
          event.preventDefault();
          const value = parseMoonLocation(latitude, longitude);
          if (!value) { setMessage('Enter latitude from −90 to 90 and longitude from −180 to 180.'); return; }
          requestGeneration.current += 1; setLocating(false); setLocation(value);
          setLocationLabel('Your manually selected area'); setNow(new Date());
          setMessage('Manual location is used only in this tab.');
        }}>
          <label htmlFor={`${id}-lat`}>Latitude<input id={`${id}-lat`} type="text" inputMode="decimal" autoComplete="off" maxLength={24} value={latitude} onChange={e => setLatitude(e.target.value)} placeholder="e.g. -26.2" /></label>
          <label htmlFor={`${id}-lon`}>Longitude<input id={`${id}-lon`} type="text" inputMode="decimal" autoComplete="off" maxLength={24} value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="e.g. 28.0" /></label>
          <button type="submit">Apply area</button>
        </form>
      </details>
      <details>
        <summary>Why does the Moon change shape?</summary>
        <p>Sunlight illuminates half the Moon. As it orbits Earth, we see different amounts of that sunlit half. Ordinary lunar phases are not caused by Earth's shadow. The Moon can also be above the horizon during daylight.</p>
        <p>The phase is shared worldwide at a given instant; its orientation and position in your sky depend on where you are.</p>
        <p>Read <a href="https://science.nasa.gov/moon/moon-phases/" target="_blank" rel="noreferrer noopener">NASA's Moon phase guide</a>.</p>
      </details>
      <details>
        <summary>Calculation sources and privacy</summary>
        <p>These educational estimates use the SunCalc 2.0.1 lunar equations, adapted locally. Device clock errors, atmospheric refraction and horizon assumptions affect results. A missing rise or set means the bounded search found no event, not that one never occurs.</p>
        <p>The familiar lunar near side comes from the public-domain NASA Lunar Reconnaissance Orbiter mosaic; the detailed image is served by Wikimedia Commons. Your browser contacts Wikimedia only if you select Show NASA Moon image; the initial view makes no external image request. The low-data version is an on-device textured illustration that makes no image request. Neither representation is a current telescope picture, eclipse renderer or exact libration simulation.</p>
        <p>No account, paid AI/provider request, microphone, camera, background location tracking or location storage is used by this panel. The Moon phase and local position are calculated on-device. Refresh pauses when the page is hidden and resumes when it is visible.</p>
        <p><a href="https://github.com/mourner/suncalc/tree/bbc91f689ede3ff7173011947d435b3fb6c0485d" target="_blank" rel="noreferrer noopener">Calculation source</a> · <a href="/licenses/luqi-moon-suncalc.txt" target="_blank" rel="noreferrer noopener">Open-source licence</a></p>
      </details>
    </section>
  );
}
