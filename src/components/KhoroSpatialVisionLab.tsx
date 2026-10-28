import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import { Link } from 'react-router';
import AccountAccessForm from './AccountAccessForm';
import SafePilotText from './SafePilotText';
import { useCustomerSession } from '../providers/customer-session';
import { pilotAvailability, PilotChatError, type PilotReply } from '../lib/ai-pilot';
import { askVisualTutor, normalizedCrop, prepareVisualPhoto, WHOLE_IMAGE, type CropRegion } from '../lib/visual-tutor';
import { getStoredLanguage, LANGUAGES } from '../lib/languages';
import { boxToCrop, calculateIllustrativeLoan, cropToBox, cropWithMasks, detectDetailBoxes,
  enhanceSpatialPhoto, redactImeiLikeText, SPATIAL_SAMPLE,
  type NormalizedBox, type ScanMode } from '../lib/spatial-vision';
import '../spatial-vision.css';

const MODES: ReadonlyArray<{ id: ScanMode; title: string; prompt: string }> = [
  { id: 'EXAM_3D', title: 'Exam & STEM',
    prompt: 'Explain the visible exam or STEM content step by step. State uncertainty and do not invent unreadable numbers.' },
  { id: 'CONTRACT_SHIELD', title: 'Contract review',
    prompt: 'Explain only visible contract terms and potential risks to verify. Do not invent laws or issue a legal verdict.' },
  { id: 'SERIAL_AUDIT', title: 'Hardware serial',
    prompt: 'Identify only a visible manufacturer serial number. Do not reproduce any IMEI or barcode. Say when unreadable.' },
];
const zar = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });
const clamp = (n: number) => Math.max(0, Math.min(100, n));
function boxStyle(box: NormalizedBox) {
  return { top: `${box[0] / 10}%`, left: `${box[1] / 10}%`,
    height: `${(box[2] - box[0]) / 10}%`, width: `${(box[3] - box[1]) / 10}%` };
}

/** Local CV and illustrative 2.5D, with an optional separately consented
 * authenticated Gemini explanation through Luqi's existing budgeted gateway.
 * No API keys, automatic model retries, fake masks or metric depth claims. */
export default function KhoroSpatialVisionLab() {
  const { session, acceptSession, signOut } = useCustomerSession();
  const [mode, setMode] = useState<ScanMode>('EXAM_3D');
  const [language, setLanguage] = useState(() => getStoredLanguage().name);
  const [photo, setPhoto] = useState(''), [enhanced, setEnhanced] = useState('');
  const [useEnhanced, setUseEnhanced] = useState(false), [originalBytes, setOriginalBytes] = useState(0);
  const [crop, setCrop] = useState<CropRegion>(WHOLE_IMAGE), [masks, setMasks] = useState<CropRegion[]>([]);
  const [draftMask, setDraftMask] = useState<CropRegion | null>(null);
  const [gesture, setGesture] = useState<'select' | 'mask'>('select');
  const [candidates, setCandidates] = useState<NormalizedBox[]>([]), [showCandidates, setShowCandidates] = useState(false);
  const [preview, setPreview] = useState(''), [question, setQuestion] = useState('');
  const [consent, setConsent] = useState(false), [redactionConfirmed, setRedactionConfirmed] = useState(false);
  const [show3d, setShow3d] = useState(false), [tilt, setTilt] = useState(24), [spin, setSpin] = useState(-22);
  const [principal, setPrincipal] = useState('100000'), [apr, setApr] = useState('12');
  const [months, setMonths] = useState('60'), [balloon, setBalloon] = useState('0');
  const [busy, setBusy] = useState(false), [preparing, setPreparing] = useState(false);
  const [ready, setReady] = useState(false), [uncertain, setUncertain] = useState(false);
  const [notice, setNotice] = useState(''), [answer, setAnswer] = useState<PilotReply | null>(null);
  const image = useRef<HTMLImageElement>(null), depthCanvas = useRef<HTMLCanvasElement>(null);
  const fileInput = useRef<HTMLInputElement>(null), dragStart = useRef<{ x: number; y: number } | null>(null);
  const pending = useRef<AbortController | null>(null), epoch = useRef(0), locked = useRef(false);
  const displayPhoto = useEnhanced && enhanced ? enhanced : photo;
  const modePrompt = MODES.find(item => item.id === mode)!;

  function invalidate() { setPreview(''); setConsent(false); setRedactionConfirmed(false); setAnswer(null); }
  function clearPhoto() {
    epoch.current++; pending.current?.abort(); pending.current = null; locked.current = false;
    setPhoto(''); setEnhanced(''); setOriginalBytes(0); setUseEnhanced(false);
    setCrop(WHOLE_IMAGE); setMasks([]); setDraftMask(null); setCandidates([]);
    setPreview(''); setConsent(false); setRedactionConfirmed(false); setAnswer(null); setQuestion('');
    setBusy(false); setPreparing(false); setUncertain(false); setNotice(''); setShow3d(false);
    if (fileInput.current) fileInput.current.value = '';
  }
  useLayoutEffect(() => { clearPhoto(); }, [session?.token]);
  useEffect(() => {
    const controller = new AbortController();
    pilotAvailability(controller.signal).then(value => { if (!controller.signal.aborted) setReady(value); })
      .catch(() => { if (!controller.signal.aborted) setReady(false); });
    return () => { controller.abort(); epoch.current++; pending.current?.abort(); };
  }, []);
  async function loadPhoto(file: File | undefined) {
    if (!file || locked.current) return;
    clearPhoto(); const version = epoch.current; setPreparing(true);
    try {
      const prepared = await prepareVisualPhoto(file);
      if (version !== epoch.current) return;
      setPhoto(prepared); setOriginalBytes(file.size);
      try { const contrasted = await enhanceSpatialPhoto(prepared);
        if (version === epoch.current) setEnhanced(contrasted);
      } catch { /* Keep the validated original preview if enhancement cannot fit. */ }
    } catch (error) {
      if (version === epoch.current) setNotice(error instanceof Error ? error.message : 'Photo unavailable.');
    } finally { if (version === epoch.current) setPreparing(false); }
  }
  function point(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: clamp((event.clientX - rect.left) / Math.max(1, rect.width) * 100),
      y: clamp((event.clientY - rect.top) / Math.max(1, rect.height) * 100) };
  }
  function dragRegion(start: { x: number; y: number }, end: { x: number; y: number }) {
    return { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y) };
  }
  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    const start = dragStart.current; if (!start) return;
    dragStart.current = null; setDraftMask(null);
    const raw = dragRegion(start, point(event));
    if (raw.width < 2 || raw.height < 2) return;
    const region = normalizedCrop(raw);
    if (gesture === 'mask') {
      if (masks.length >= 12) { setNotice('Maximum 12 masks. Undo one before adding another.'); return; }
      setMasks(previous => [...previous, region]);
    } else setCrop(region);
    invalidate();
  }
  useEffect(() => {
    if (!displayPhoto || !showCandidates) return;
    let cancelled = false; const source = new Image();
    source.onload = () => {
      if (cancelled) return;
      const canvas = document.createElement('canvas');
      canvas.width = SPATIAL_SAMPLE.width; canvas.height = SPATIAL_SAMPLE.height;
      const ctx = canvas.getContext('2d'); if (!ctx) return;
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
      try { if (!cancelled) setCandidates(detectDetailBoxes(
        ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height)); }
      catch { if (!cancelled) setCandidates([]); }
    };
    source.src = displayPhoto;
    return () => { cancelled = true; source.onload = null; };
  }, [displayPhoto, showCandidates]);
  useEffect(() => {
    const canvas = depthCanvas.current;
    if (!show3d || !canvas || !displayPhoto) return;
    const context = canvas.getContext('2d'); if (!context) return;
    let cancelled = false; const source = new Image();
    source.onload = () => {
      if (cancelled) return;
      const sampler = document.createElement('canvas');
      sampler.width = SPATIAL_SAMPLE.width; sampler.height = SPATIAL_SAMPLE.height;
      const ctx = sampler.getContext('2d'); if (!ctx) return;
      ctx.drawImage(source, 0, 0, sampler.width, sampler.height);
      const pixels = ctx.getImageData(0, 0, sampler.width, sampler.height).data;
      const rx = tilt * Math.PI / 180, ry = spin * Math.PI / 180;
      const points: Array<{ x: number; y: number; depth: number; radius: number; color: string }> = [];
      for (let y = 0; y < sampler.height; y++) for (let x = 0; x < sampler.width; x++) {
        const i = (y * sampler.width + x) * 4, r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        // Luminance is a synthetic height field, NOT metric monocular depth.
        const z = ((r * .299 + g * .587 + b * .114) / 255 - .5) * 90;
        const px = (x - sampler.width / 2) * 7.4, py = (y - sampler.height / 2) * 7.4;
        const x1 = px * Math.cos(ry) + z * Math.sin(ry);
        const z1 = -px * Math.sin(ry) + z * Math.cos(ry);
        const y1 = py * Math.cos(rx) - z1 * Math.sin(rx);
        const z2 = py * Math.sin(rx) + z1 * Math.cos(rx);
        const perspective = 420 / Math.max(100, 540 + z2);
        points.push({ x: canvas.width / 2 + x1 * perspective,
          y: canvas.height / 2 + y1 * perspective, depth: z2,
          radius: Math.max(1, 2.7 * perspective), color: `rgb(${r},${g},${b})` });
      }
      points.sort((a, b) => b.depth - a.depth);
      context.fillStyle = '#071326'; context.fillRect(0, 0, canvas.width, canvas.height);
      for (const p of points) { context.fillStyle = p.color; context.beginPath();
        context.arc(p.x, p.y, p.radius, 0, Math.PI * 2); context.fill(); }
    };
    source.src = displayPhoto;
    return () => { cancelled = true; source.onload = null; };
  }, [displayPhoto, show3d, tilt, spin]);
  function makePreview() {
    if (!image.current?.naturalWidth) return;
    try { setPreview(cropWithMasks(image.current, crop, masks)); setConsent(false);
      setRedactionConfirmed(false); setAnswer(null); setNotice(''); }
    catch { setNotice('The redacted preview could not be prepared. Choose a smaller region.'); }
  }
  async function submit() {
    const prompt = modePrompt.prompt + '\nQuestion: ' + question.trim();
    if (!session || !ready || !consent || !preview || !question.trim() || prompt.length > 2000 ||
        ((mode === 'SERIAL_AUDIT' || mode === 'CONTRACT_SHIELD') && !redactionConfirmed) ||
        busy || uncertain || locked.current) return;
    locked.current = true; setBusy(true); setNotice(''); setAnswer(null); setConsent(false);
    const version = epoch.current, controller = new AbortController(); pending.current = controller;
    try {
      const result = await askVisualTutor(session.token, prompt, preview, language, true, controller.signal);
      if (version === epoch.current) setAnswer(result);
    } catch (error) {
      if (version !== epoch.current) return;
      const code = error instanceof PilotChatError ? error.code : 'RESPONSE_UNCONFIRMED';
      if (code === 'AUTH_REQUIRED') { signOut(); return; }
      const beforeSpend = ['INVALID_INPUT', 'AI_INPUT_TOO_LARGE', 'AI_DISABLED', 'BILLING_NOT_APPROVED',
        'AI_PROVIDER_BUDGET_EXHAUSTED', 'AI_USER_DAILY_QUOTA_EXHAUSTED', 'AI_BUDGET_STORE_UNAVAILABLE'].includes(code);
      setUncertain(!beforeSpend);
      setNotice(beforeSpend ? 'The request was not started. Check your photo and allowance.' :
        'A complete reply was not confirmed. An attempt may count; no automatic retry was made.');
    } finally { if (version === epoch.current) { pending.current = null; locked.current = false; setBusy(false); } }
  }
  const loan = (() => { try { return calculateIllustrativeLoan(
    Number(principal), Number(apr), Number(months), Number(balloon)); } catch { return null; } })();
  const canSend = !!session && ready && !!preview && !!question.trim() && consent &&
    (mode === 'EXAM_3D' || redactionConfirmed) && !busy && !uncertain &&
    modePrompt.prompt.length + question.trim().length + 11 <= 2000;
  return <main className="luqi-spatial">
    <header className="luqi-spatial-head">
      <p className="luqi-spatial-kicker">LUQI · LOCAL VISION &amp; SPATIAL LEARNING</p>
      <h1>👁️ Spatial Vision &amp; 3D Lab</h1>
      <p>Explore a photo, mark regions, mask private details and rotate an illustrative 2.5D relief on your own device. A separate, consented Gemini request can explain only the reviewed crop.</p>
      <p className="luqi-spatial-caution">No automatic semantic segmentation, OCR accuracy guarantee, measured depth, legal verdict or research affiliation is claimed. <Link to="/visual-tutor">Open Visual Tutor</Link> for the simpler photo-learning experience.</p>
    </header>
    <section aria-label="Scan mode" className="luqi-spatial-modes">
      {MODES.map(item => <button type="button" key={item.id} aria-pressed={mode === item.id}
        onClick={() => { setMode(item.id); setQuestion(''); invalidate(); }} disabled={busy}>
        {item.title}
      </button>)}
    </section>
    <div className="luqi-spatial-grid">
      <section className="luqi-spatial-card" aria-labelledby="spatial-photo-heading">
        <h2 id="spatial-photo-heading">1. Prepare and review a photo</h2>
        <label>Choose a JPEG or PNG (up to 8 MB)
          <input ref={fileInput} type="file" accept="image/jpeg,image/png" disabled={busy || preparing}
            onChange={event => { void loadPhoto(event.target.files?.[0]); }} />
        </label>
        {preparing && <p role="status">Preparing a metadata-free photo on this device…</p>}
        {photo && <>
          <div className="luqi-spatial-actions">
            <label><input type="checkbox" checked={useEnhanced} disabled={!enhanced || busy}
              onChange={event => { setUseEnhanced(event.target.checked); invalidate(); }} />
              Contrast-enhanced preview</label>
            <label><input type="checkbox" checked={showCandidates} disabled={busy}
              onChange={event => setShowCandidates(event.target.checked)} />
              Show local edge-detail candidates</label>
          </div>
          <p className="luqi-spatial-small">Original: {Math.round(originalBytes / 1024)} KB · prepared JPEG: approximately {Math.round((displayPhoto.length - 23) * .75 / 1024)} KB. No measured OCR or bandwidth guarantee.</p>
          <fieldset className="luqi-spatial-gesture"><legend>Drag tool</legend>
            <label><input type="radio" name="spatial-gesture" checked={gesture === 'select'}
              onChange={() => setGesture('select')} /> Select region</label>
            <label><input type="radio" name="spatial-gesture" checked={gesture === 'mask'}
              onChange={() => setGesture('mask')} /> Black out private region</label>
          </fieldset>
          <div className="luqi-spatial-photo" onPointerDown={event => {
            if (busy) return; dragStart.current = point(event); event.currentTarget.setPointerCapture(event.pointerId);
          }} onPointerMove={event => {
            if (!dragStart.current || busy) return;
            const region = normalizedCrop(dragRegion(dragStart.current, point(event)));
            if (gesture === 'mask') setDraftMask(region);
            else setCrop(region);
          }} onPointerUp={finishDrag} onPointerCancel={() => { dragStart.current = null; setDraftMask(null); }}>
            <img ref={image} src={displayPhoto} alt="Your local photo; drag to select or mask a region" draggable={false} />
            {showCandidates && candidates.map((box, index) => <span key={index}
              className="luqi-spatial-candidate" style={boxStyle(box)} aria-hidden="true" />)}
            {masks.map((region, index) => <span key={index} className="luqi-spatial-mask"
              style={boxStyle(cropToBox(region))} aria-hidden="true" />)}
            {draftMask && <span className="luqi-spatial-mask-draft"
              style={boxStyle(cropToBox(draftMask))} aria-hidden="true" />}
            <span className="luqi-spatial-selection" style={boxStyle(cropToBox(crop))} aria-hidden="true" />
          </div>
          <p className="luqi-spatial-small">Selected [ymin, xmin, ymax, xmax]: [{cropToBox(crop).join(', ')}] on a 0–1000 scale. This is a manual selection, not a model-detected object.</p>
          <fieldset className="luqi-spatial-sliders"><legend>Keyboard-accessible selection</legend>
            {(['x', 'y', 'width', 'height'] as const).map(key => <label key={key}>
              {{ x: 'Left', y: 'Top', width: 'Width', height: 'Height' }[key]} ({Math.round(crop[key])}%)
              <input type="range" min={key === 'x' || key === 'y' ? 0 : 1}
                max={key === 'x' || key === 'y' ? 99 : 100} value={crop[key]} disabled={busy}
                onChange={event => { setCrop(normalizedCrop({ ...crop, [key]: Number(event.target.value) })); invalidate(); }} />
            </label>)}
          </fieldset>
          {showCandidates && candidates.length > 0 && <div className="luqi-spatial-actions">
            {candidates.map((box, index) => <button key={index} type="button" disabled={busy}
              onClick={() => { setCrop(boxToCrop(box)); invalidate(); }}>Select detail {index + 1}</button>)}
          </div>}
          <div className="luqi-spatial-actions">
            <button type="button" disabled={busy} onClick={() => { setCrop(WHOLE_IMAGE); invalidate(); }}>Whole photo</button>
            <button type="button" disabled={busy || masks.length === 0}
              onClick={() => { setMasks(previous => previous.slice(0, -1)); invalidate(); }}>Undo last mask</button>
            <button type="button" disabled={busy} onClick={makePreview}>Preview redacted crop</button>
            <button type="button" disabled={busy} onClick={clearPhoto}>Clear photo</button>
          </div>
        </>}
      </section>
      <section className="luqi-spatial-card" aria-labelledby="spatial-depth-heading">
        <h2 id="spatial-depth-heading">2. Explore illustrative 2.5D</h2>
        <p>Rotate a real local canvas point cloud. Height is derived from image brightness, not measured physical depth or Gaussian splatting.</p>
        <button type="button" disabled={!photo} onClick={() => setShow3d(value => !value)}>
          {show3d ? 'Return to photo' : '🧊 Show 2.5D point cloud'}
        </button>
        {show3d && photo && <>
          <canvas ref={depthCanvas} width={640} height={380} className="luqi-spatial-depth"
            role="img" aria-label="Illustrative rotatable luminance-based point cloud" />
          <div className="luqi-spatial-sliders">
            <label>Tilt X: {tilt}°
              <input type="range" min="-60" max="60" value={tilt} onChange={event => setTilt(Number(event.target.value))} />
            </label>
            <label>Spin Y: {spin}°
              <input type="range" min="-75" max="75" value={spin} onChange={event => setSpin(Number(event.target.value))} />
            </label>
          </div>
        </>}
        {mode === 'CONTRACT_SHIELD' && <div className="luqi-spatial-loan">
          <h3>Deterministic loan illustration</h3>
          <p>Fixed nominal annual rate, monthly payments and separate final balloon. Excludes fees, insurance and rate changes.</p>
          <div className="luqi-spatial-loan-fields">
            {([['Principal (ZAR)', principal, setPrincipal], ['Annual interest (%)', apr, setApr],
              ['Months', months, setMonths], ['Final balloon (ZAR)', balloon, setBalloon]] as const)
              .map(([label, value, setter]) => <label key={label}>{label}
                <input type="number" min="0" step={label === 'Months' ? '1' : '0.01'} value={value}
                  onChange={event => setter(event.target.value)} /></label>)}
          </div>
          {loan ? <p role="status">Monthly: <strong>{zar.format(loan.monthlyPayment)}</strong> ·
            Total: <strong>{zar.format(loan.totalRepayment)}</strong> ·
            Interest: <strong>{zar.format(loan.totalInterest)}</strong></p> :
            <p role="status">Enter valid principal, rate, term and balloon values.</p>}
          <p>This calculation does not determine legal compliance or whether a contract is fair.</p>
        </div>}
      </section>
    </div>
    <section className="luqi-spatial-card luqi-spatial-send" aria-labelledby="spatial-send-heading">
      <h2 id="spatial-send-heading">3. Ask Luqi about the reviewed crop (Gemini pilot)</h2>
      <p>Image preparation, masking and 2.5D exploration stay on your device. A provider request occurs only after sign-in, image review, agreement and Send. OpenAI vision is not yet enabled in this lab.</p>
      {preview && <img className="luqi-spatial-preview" src={preview} alt="Exactly the redacted crop proposed for the provider" />}
      {!preview && <p>Select and preview a region above to prepare a possible provider request. No image has been sent.</p>}
      {!session ? <AccountAccessForm purpose="account" onAuthenticated={acceptSession} /> : <>
        <p>Signed in as {session.user.name || session.user.email}. <button type="button" onClick={signOut}>Sign out</button></p>
        {!ready && <p role="status">AI image replies are paused or not confirmed. Local processing remains available.</p>}
        <form onSubmit={event => { event.preventDefault(); void submit(); }}>
          <label>Your question
            <textarea value={question} maxLength={1400} disabled={busy || uncertain}
              onChange={event => { setQuestion(event.target.value); setConsent(false); }}
              placeholder="What does this selected region show?" />
          </label>
          <label>Explanation language
            <select value={language} disabled={busy || uncertain}
              onChange={event => { setLanguage(event.target.value); setConsent(false); }}>
              {LANGUAGES.map(item => <option key={item.code} value={item.name}>{item.nativeName}</option>)}
            </select>
          </label>
          {(mode === 'SERIAL_AUDIT' || mode === 'CONTRACT_SHIELD') && <label className="luqi-spatial-consent">
            <input type="checkbox" checked={redactionConfirmed} disabled={busy || uncertain}
              onChange={event => { setRedactionConfirmed(event.target.checked); setConsent(false); }} />
            I reviewed the exact crop and masked IMEI, account numbers and other identifiers I do not want shared.
          </label>}
          <label className="luqi-spatial-consent"><input type="checkbox" checked={consent}
            disabled={busy || uncertain || !preview} onChange={event => setConsent(event.target.checked)} />
            I agree to send this redacted JPEG crop and question to Google Gemini for one request. Each attempt reserves $0.10 from Luqi's shared allowance, including failures; actual provider costs may differ.
          </label>
          <button type="submit" disabled={!canSend}>{busy ? 'Waiting for a reply…' : 'Send reviewed crop to Luqi'}</button>
        </form>
      </>}
      {busy && <button type="button" onClick={() => { epoch.current++; pending.current?.abort();
        pending.current = null; locked.current = false; setBusy(false); setUncertain(true);
        setNotice('Cancelled locally. A provider attempt may still count. No automatic retry.'); }}>Cancel locally</button>}
      {uncertain && <button type="button" onClick={() => { setUncertain(false); setConsent(false);
        setNotice('Review the image again and explicitly approve a new attempt.'); }}>Prepare a new request</button>}
      {notice && <p role="status">{notice}</p>}
      {answer && <section aria-label="Confirmed Luqi image explanation">
        <h3>Luqi's explanation</h3>
        <SafePilotText text={mode === 'SERIAL_AUDIT' ? redactImeiLikeText(answer.response) : answer.response} />
        <p>Gemini · {answer.provider_model}. These are model observations, not verified masks, serial audits, legal advice or measurements.</p>
      </section>}
      <p><Link to="/privacy">Privacy information</Link> · <Link to="/chat">Return to Chat</Link></p>
    </section>
  </main>;
}
