import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import { Link } from 'react-router';
import AccountAccessForm from './AccountAccessForm';
import { useCustomerSession } from '../providers/customer-session';
import { pilotAvailability, PilotChatError } from '../lib/ai-pilot';
import { LANGUAGES, getStoredLanguage } from '../lib/languages';
import { askSpatialVision, boxFromPoints, prepareSpatialPhoto, redactSpatialPhoto, type SpatialVisionReply } from '../lib/spatial-vision';
import { possibleImei, type NormalizedBox, type SpatialMode, type SpatialProvider } from '../lib/spatial-vision-contract';
import '../spatial-vision.css';

type LocalRegion = { box: NormalizedBox; label: 'Serial region (manual)' | 'Possible IMEI (manual)' };
const modes: Array<{ value: SpatialMode; title: string; detail: string }> = [
  { value: 'EXAM_3D', title: 'Exam & STEM', detail: 'Explore formulas and diagrams' },
  { value: 'CONTRACT_SHIELD', title: 'Contract review', detail: 'Find terms worth checking' },
  { value: 'SERIAL_AUDIT', title: 'Serial audit', detail: 'Local-only asset labels' },
];
function boxStyle([top, left, bottom, right]: NormalizedBox) {
  return { top: (top / 10) + '%', left: (left / 10) + '%',
    width: ((right - left) / 10) + '%', height: ((bottom - top) / 10) + '%' };
}
/** Lightweight luminance extrusion, not learned depth or Gaussian splatting. */
function drawIllustrativeRelief(canvas: HTMLCanvasElement, photo: string, tilt: number, spin: number) {
  const context = canvas.getContext('2d');
  if (!context) return () => {};
  let cancelled = false;
  const image = new Image();
  image.onload = () => {
    if (cancelled) return;
    const w = canvas.width, h = canvas.height;
    context.fillStyle = '#071326'; context.fillRect(0, 0, w, h);
    const sample = document.createElement('canvas');
    const cols = 48, rows = 32;
    sample.width = cols; sample.height = rows;
    const pixels = sample.getContext('2d');
    if (!pixels) return;
    pixels.drawImage(image, 0, 0, cols, rows);
    const data = pixels.getImageData(0, 0, cols, rows).data;
    const rx = tilt * Math.PI / 180, ry = spin * Math.PI / 180;
    const points: Array<{ x: number; y: number; depth: number; radius: number; color: string }> = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const z = (lum - 0.5) * 90;
      const px = (x - cols / 2) * 9, py = (y - rows / 2) * 9;
      const xx = px * Math.cos(ry) + z * Math.sin(ry);
      const zz = -px * Math.sin(ry) + z * Math.cos(ry);
      const yy = py * Math.cos(rx) - zz * Math.sin(rx);
      const depth = py * Math.sin(rx) + zz * Math.cos(rx);
      const perspective = 420 / (540 + depth);
      points.push({ x: w / 2 + xx * perspective, y: h / 2 + yy * perspective,
        depth, radius: Math.max(1.5, 3.4 * perspective), color: 'rgb(' + r + ',' + g + ',' + b + ')' });
    }
    points.sort((a, b) => b.depth - a.depth);
    for (const p of points) {
      context.fillStyle = p.color; context.beginPath();
      context.arc(p.x, p.y, p.radius, 0, Math.PI * 2); context.fill();
    }
  };
  image.src = photo;
  return () => { cancelled = true; image.onload = null; };
}

export default function KhoroSpatialVisionLab() {
  const { session, acceptSession, signOut } = useCustomerSession();
  const [mode, setMode] = useState<SpatialMode>('EXAM_3D');
  const [provider, setProvider] = useState<SpatialProvider>('gemini');
  const [language, setLanguage] = useState(() => getStoredLanguage().name);
  const [photo, setPhoto] = useState('');
  const [enhance, setEnhance] = useState(true);
  const [preparing, setPreparing] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [consent, setConsent] = useState(false);
  const [notice, setNotice] = useState('');
  const [result, setResult] = useState<SpatialVisionReply | null>(null);
  const [selection, setSelection] = useState<NormalizedBox | null>(null);
  const [manual, setManual] = useState<LocalRegion[]>([]);
  const [serialText, setSerialText] = useState('');
  const [viewRelief, setViewRelief] = useState(false);
  const [tilt, setTilt] = useState(20), [spin, setSpin] = useState(-18);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const epoch = useRef(0), locked = useRef(false);
  const pending = useRef<AbortController | null>(null);

  const clear = () => {
    epoch.current++; pending.current?.abort(); pending.current = null; locked.current = false;
    setPhoto(''); setSelection(null); setManual([]); setSerialText('');
    setResult(null); setConsent(false); setNotice(''); setBusy(false);
    setPreparing(false); setUncertain(false); setViewRelief(false);
    if (fileRef.current) fileRef.current.value = '';
  };
  useLayoutEffect(() => { clear(); }, [session?.token]);
  useEffect(() => {
    const controller = new AbortController();
    pilotAvailability(controller.signal).then(value => {
      if (!controller.signal.aborted) setReady(value);
    }).catch(() => { if (!controller.signal.aborted) setReady(false); });
    return () => { controller.abort(); epoch.current++; pending.current?.abort(); };
  }, []);
  useEffect(() => {
    if (!viewRelief || !photo || !canvasRef.current) return;
    return drawIllustrativeRelief(canvasRef.current, photo, tilt, spin);
  }, [viewRelief, photo, tilt, spin]);

  async function choosePhoto(file: File | undefined) {
    if (!file || busy || locked.current) return;
    clear();
    const version = epoch.current;
    setPreparing(true);
    try {
      const next = await prepareSpatialPhoto(file, enhance);
      if (epoch.current === version) setPhoto(next);
    } catch (error) {
      if (epoch.current === version) setNotice(error instanceof Error ? error.message : 'Photo processing failed.');
    } finally { if (epoch.current === version) setPreparing(false); }
  }
  function point(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width * 1000,
      y: (event.clientY - rect.top) / rect.height * 1000 };
  }
  function finishSelection(event: PointerEvent<HTMLDivElement>) {
    const start = dragRef.current;
    dragRef.current = null;
    if (!start) return;
    const end = point(event);
    if (Math.abs(end.x - start.x) < 8 || Math.abs(end.y - start.y) < 8) return;
    try { setSelection(boxFromPoints(start.x, start.y, end.x, end.y)); }
    catch { setNotice('Choose a larger rectangular region.'); }
  }
  function switchMode(next: SpatialMode) {
    if (busy || preparing) return;
    setMode(next); setResult(null); setConsent(false); setUncertain(false);
    setSelection(null); setManual([]); setSerialText(''); setNotice('');
  }
  async function burnMask() {
    if (!selection || !photo || busy) return;
    const version = epoch.current;
    setPreparing(true);
    try {
      const masked = await redactSpatialPhoto(photo, selection);
      if (epoch.current === version) {
        setPhoto(masked); setSelection(null); setResult(null); setConsent(false);
        setManual(previous => [...previous, { box: selection, label: 'Possible IMEI (manual)' }].slice(-8));
        setNotice('Black rectangle burned into the local preview. The original photo on your device is unchanged.');
      }
    } catch { if (epoch.current === version) setNotice('Could not mask this region.'); }
    finally { if (epoch.current === version) setPreparing(false); }
  }
  async function analyse() {
    if (!session || !ready || !photo || mode === 'SERIAL_AUDIT' ||
        !consent || busy || preparing || uncertain || locked.current) return;
    locked.current = true; setBusy(true); setConsent(false); setResult(null); setNotice('');
    const version = epoch.current, controller = new AbortController(); pending.current = controller;
    try {
      const reply = await askSpatialVision(session.token, mode, provider, photo, language, true, controller.signal);
      if (epoch.current === version) setResult(reply);
    } catch (error) {
      if (epoch.current !== version) return;
      const code = error instanceof PilotChatError ? error.code : 'RESPONSE_UNCONFIRMED';
      if (code === 'AUTH_REQUIRED') { signOut(); return; }
      const beforeProvider = ['INVALID_INPUT', 'AI_INPUT_TOO_LARGE', 'AI_DISABLED',
        'BILLING_NOT_APPROVED', 'AI_KEYS_NOT_CONFIGURED', 'AI_PROVIDER_BUDGET_EXHAUSTED',
        'AI_USER_DAILY_QUOTA_EXHAUSTED', 'AI_BUDGET_STORE_UNAVAILABLE', 'LOCAL_ONLY'].includes(code);
      setUncertain(!beforeProvider);
      setNotice(beforeProvider
        ? 'Analysis did not start. Check your account, chosen provider and available allowance.'
        : 'The reply was not confirmed. The attempt may count toward your allowance. No automatic retry was made.');
    } finally {
      if (epoch.current === version) { pending.current = null; locked.current = false; setBusy(false); }
    }
  }
  const regions = result?.analysis.regions ?? [];

  return <main className="luqi-spatial" aria-label="Luqi Spatial Vision and 3D Lab">
    <div className="luqi-spatial-intro">
      <p className="luqi-spatial-eyebrow">LUQI · KHORO VISUAL REASONING PILOT</p>
      <h1>👁️ Spatial Vision &amp; 3D Lab</h1>
      <p>Explore an image on your phone, mark regions, or request an AI-assisted explanation. No photo leaves this browser unless you explicitly approve one analysis.</p>
      <p className="luqi-spatial-caveat">AI boxes are approximate suggestions, not verified object masks. The 3D view is an illustrative brightness relief, not measured depth. No guaranteed OCR or legal verdicts.</p>
    </div>
    <div className="luqi-spatial-modes" role="group" aria-label="Scan mode">
      {modes.map(item => <button type="button" key={item.value} disabled={busy || preparing}
        aria-pressed={mode === item.value} className={mode === item.value ? 'selected' : ''}
        onClick={() => switchMode(item.value)}>
        <strong>{item.title}</strong><span>{item.detail}</span>
      </button>)}
    </div>
    <div className="luqi-spatial-controls">
      <label>Choose a local JPEG or PNG (under 8 MB)
        <input ref={fileRef} type="file" accept="image/jpeg,image/png" disabled={busy || preparing}
          onChange={event => { void choosePhoto(event.target.files?.[0]); }} />
      </label>
      <label className="luqi-spatial-check"><input type="checkbox" checked={enhance} disabled={busy || preparing}
        onChange={event => setEnhance(event.target.checked)} /> Enhance contrast before preview</label>
      <button type="button" className="luqi-spatial-secondary" onClick={clear} disabled={busy || preparing}>Clear image</button>
      {preparing && <span role="status">Preparing the image locally…</span>}
    </div>
    {photo && <div className="luqi-spatial-grid">
      <section className="luqi-spatial-image-panel" aria-label="Local image and visual regions">
        <div className="luqi-spatial-view-tabs">
          <button type="button" aria-pressed={!viewRelief} onClick={() => setViewRelief(false)}>2D image</button>
          <button type="button" aria-pressed={viewRelief} onClick={() => setViewRelief(true)}>🧊 2.5D brightness relief</button>
        </div>
        {!viewRelief ? <>
          <p className="luqi-spatial-hint">Drag a rectangle on the image to mark a local region. Model-suggested boxes appear after an approved analysis.</p>
          <div className="luqi-spatial-image-wrap" onPointerDown={event => {
            if (busy || preparing) return;
            dragRef.current = point(event);
            event.currentTarget.setPointerCapture(event.pointerId);
          }} onPointerUp={finishSelection} onPointerCancel={() => { dragRef.current = null; }}>
            <img ref={imageRef} src={photo} draggable={false} alt="Locally re-encoded image for spatial review" />
            {regions.map((region, index) => <div key={index} className="luqi-spatial-region luqi-spatial-region-ai"
              style={boxStyle(region.box_2d)} title={region.label} aria-label={'AI-suggested: ' + region.label}>
              <span>{index + 1}</span>
            </div>)}
            {manual.map((region, index) => <div key={index}
              className={region.label === 'Possible IMEI (manual)' ? 'luqi-spatial-region luqi-spatial-region-redacted' : 'luqi-spatial-region luqi-spatial-region-manual'}
              style={boxStyle(region.box)} aria-label={region.label} />)}
            {selection && <div className="luqi-spatial-region luqi-spatial-region-selected"
              style={boxStyle(selection)} aria-label="Manually selected region" />}
          </div>
          {selection && <p className="luqi-spatial-hint">Selected region: top {selection[0]}, left {selection[1]}, bottom {selection[2]}, right {selection[3]} (0–1000).</p>}
          {mode === 'SERIAL_AUDIT' && <div className="luqi-spatial-local-actions">
            <button type="button" disabled={!selection || preparing} onClick={() => {
              if (!selection) return;
              setManual(previous => [...previous, { box: selection, label: 'Serial region (manual)' }].slice(-8));
              setSelection(null);
            }}>Mark serial region</button>
            <button type="button" disabled={!selection || preparing} onClick={() => { void burnMask(); }}>
              Mask selected IMEI/barcode area locally
            </button>
          </div>}
        </> : <div className="luqi-spatial-relief">
          <p>This is a brightness-extruded point display for exploration, not an inferred depth map or a measured 3D reconstruction.</p>
          <canvas ref={canvasRef} width={640} height={380} role="img" aria-label="Illustrative rotatable brightness relief" />
          <div className="luqi-spatial-sliders">
            <label>Tilt X ({tilt}°)<input type="range" min="-60" max="60" value={tilt}
              onChange={event => setTilt(Number(event.target.value))} /></label>
            <label>Spin Y ({spin}°)<input type="range" min="-75" max="75" value={spin}
              onChange={event => setSpin(Number(event.target.value))} /></label>
          </div>
        </div>}
      </section>

      <section className="luqi-spatial-results" aria-label="Spatial analysis and controls">
        {mode === 'SERIAL_AUDIT' ? <>
          <h2>Serial-only asset review · local</h2>
          <p>Manually mark a device serial label or mask a possible IMEI/barcode area. This mode makes <strong>no AI provider request</strong> and does not automatically read text.</p>
          <label>Optional serial text (typed by you)
            <input type="text" maxLength={80} autoComplete="off" value={serialText}
              onChange={event => setSerialText(event.target.value)} placeholder="Type only the device serial" />
          </label>
          {possibleImei(serialText) && <p role="alert" className="luqi-spatial-warning">
            This 15-digit number resembles an IMEI. Do not treat it as a verified device serial.
          </p>}
          {manual.length > 0 && <ul aria-label="Manual regions">{manual.map((item, index) =>
            <li key={index}>{item.label} · rectangle {index + 1}</li>)}</ul>}
          <p>Green outlines mean a region was marked manually, not that an identifier was verified. A black mask changes only the local preview; check the entire image for other private identifiers.</p>
        </> : <>
          <h2>{mode === 'EXAM_3D' ? 'Learn from the visible problem' : 'Review visible contract terms'}</h2>
          <p>{mode === 'EXAM_3D'
            ? 'Luqi can suggest regions and explain visible questions, but answers and coordinates need checking.'
            : 'Use a sample or anonymised contract only. Luqi highlights terms for review, not definitive legal rights or debt amounts.'}</p>
          {!session ? <AccountAccessForm purpose="account" onAuthenticated={acceptSession} /> : <>
            <p className="luqi-spatial-signed-in">Signed in to Luqi. <button type="button" onClick={signOut}>Sign out</button></p>
            <label>AI provider (one explicit attempt)
              <select value={provider} disabled={busy || uncertain} onChange={event => {
                setProvider(event.target.value as SpatialProvider); setConsent(false); setResult(null);
              }}>
                <option value="gemini">Gemini · configured server model</option>
                <option value="openai">OpenAI · configured server model</option>
              </select>
            </label>
            <label>Explanation language
              <select value={language} disabled={busy || uncertain} onChange={event => {
                setLanguage(event.target.value); setConsent(false); setResult(null);
              }}>
                {LANGUAGES.map(item => <option key={item.code} value={item.name}>{item.nativeName}</option>)}
              </select>
            </label>
            {!ready && <p role="status" className="luqi-spatial-warning">AI readiness is not confirmed. Local image tools remain available.</p>}
            <p className="luqi-spatial-disclosure">Only the locally re-encoded JPEG, selected mode and language are sent to the chosen provider after approval. Do not upload faces, account numbers, IMEI labels, confidential workplace documents or unredacted contracts. Each attempt reserves $0.20 from Luqi's existing AI allocation; this is not a provider invoice. No automatic fallback.</p>
            <label className="luqi-spatial-consent"><input type="checkbox" checked={consent}
              disabled={busy || uncertain || !ready} onChange={event => setConsent(event.target.checked)} />
              I agree to send this reviewed image to {provider === 'gemini' ? 'Gemini' : 'OpenAI'} for one AI analysis.</label>
            <button type="button" className="luqi-spatial-primary"
              disabled={!photo || !consent || !ready || busy || preparing || uncertain}
              onClick={() => { void analyse(); }}>{busy ? 'Analysing…' : 'Analyse selected image'}</button>
            {busy && <button type="button" className="luqi-spatial-secondary" onClick={() => {
              epoch.current++; pending.current?.abort(); pending.current = null; locked.current = false;
              setBusy(false); setUncertain(true);
              setNotice('Cancelled locally. A provider attempt may still count. No automatic retry.');
            }}>Cancel local wait</button>}
            {uncertain && <button type="button" className="luqi-spatial-secondary" onClick={() => {
              setUncertain(false); setConsent(false);
              setNotice('A new attempt needs separate consent and another budget reservation.');
            }}>Start a new request</button>}
          </>}
          {result && <div className="luqi-spatial-analysis" aria-label="AI-suggested analysis">
            <h3>AI-suggested regions · {result.provider}</h3>
            <p className="luqi-spatial-model">Model reported: {result.provider_model}. Not independently verified.</p>
            <h4>{result.analysis.sceneType}</h4>
            <p>{result.analysis.summary}</p>
            {regions.length ? <ol>{regions.map((region, index) =>
              <li key={index}><strong>{index + 1}. {region.label}</strong> · {region.category}
                <p>{region.insight}</p></li>)}</ol> : <p>No reliable regions were suggested. Try a clearer image.</p>}
            {result.analysis.limitations.length > 0 && <p>Limitations: {result.analysis.limitations.join(' · ')}</p>}
            <p><strong>Next step:</strong> {result.analysis.nextStep}</p>
          </div>}
        </>}
      </section>
    </div>}
    {notice && <p className="luqi-spatial-notice" role="status">{notice}</p>}
    {!photo && <div className="luqi-spatial-empty">
      <h2>Start with a photo</h2>
      <p>Everything begins locally. Choose a sample image to inspect it in 2D or a rotatable illustrative relief.</p>
    </div>}
    <div className="luqi-spatial-bottom-links">
      <Link to="/visual-tutor">Visual Tutor</Link>
      <Link to="/chat">Luqi Chat</Link>
      <Link to="/privacy">Privacy</Link>
    </div>
  </main>;
}
