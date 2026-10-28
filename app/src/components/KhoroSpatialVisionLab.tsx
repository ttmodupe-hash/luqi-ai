import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import AccountAccessForm from './AccountAccessForm';
import SafePilotText from './SafePilotText';
import { useCustomerSession } from '../providers/customer-session';
import { pilotAvailability, PilotChatError } from '../lib/ai-pilot';
import { prepareVisualPhoto, cropVisualPhoto, normalizedCrop, WHOLE_IMAGE, type CropRegion } from '../lib/visual-tutor';
import { askSpatialVision, type SpatialProvider } from '../lib/spatial-vision';
import { type SpatialMode, type SpatialReply } from '../lib/spatial-vision-contract';
import { drawIllustrativeRelief, enhanceLocalPreview } from '../lib/spatial-image';
import { LANGUAGES, getStoredLanguage } from '../lib/languages';
import './khoro-spatial-vision.css';

const MODES: { id: SpatialMode; label: string; help: string }[] = [
  { id: 'EXAM_3D', label: 'Exam & STEM', help: 'Explore legible formulas and diagrams. Marks and translations are not certified.' },
  { id: 'CONTRACT_SHIELD', label: 'Contract review', help: 'Spot visible terms to check against official law. Not a legal verdict.' },
  { id: 'SERIAL_AUDIT', label: 'Hardware serial', help: 'Crop to the serial only. Never send an IMEI or confidential company tag.' },
];
const whole = (region: CropRegion) =>
  region.x === 0 && region.y === 0 && region.width === 100 && region.height === 100;

export default function KhoroSpatialVisionLab() {
  const { session, acceptSession, signOut } = useCustomerSession();
  const [mode, setMode] = useState<SpatialMode>('EXAM_3D');
  const [provider, setProvider] = useState<SpatialProvider>('gemini');
  const [language, setLanguage] = useState(() => getStoredLanguage().name);
  const [photo, setPhoto] = useState(''), [preview, setPreview] = useState('');
  const [crop, setCrop] = useState<CropRegion>(WHOLE_IMAGE), [enhance, setEnhance] = useState(false);
  const [question, setQuestion] = useState('What can you identify in the selected region?');
  const [consent, setConsent] = useState(false), [serialConfirmed, setSerialConfirmed] = useState(false);
  const [busy, setBusy] = useState(false), [preparing, setPreparing] = useState(false);
  const [ready, setReady] = useState(false), [uncertain, setUncertain] = useState(false);
  const [notice, setNotice] = useState(''), [reply, setReply] = useState<SpatialReply | null>(null);
  const [relief, setRelief] = useState(false), [tilt, setTilt] = useState(24), [spin, setSpin] = useState(-18);
  const imageRef = useRef<HTMLImageElement>(null), reliefRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null), epoch = useRef(0);
  const locked = useRef(false), pending = useRef<AbortController | null>(null);

  function clearImage() {
    epoch.current++; pending.current?.abort(); pending.current = null; locked.current = false;
    setPhoto(''); setPreview(''); setCrop(WHOLE_IMAGE); setConsent(false); setSerialConfirmed(false);
    setReply(null); setNotice(''); setUncertain(false); setBusy(false); setPreparing(false); setRelief(false);
    if (fileRef.current) fileRef.current.value = '';
  }
  useLayoutEffect(() => { clearImage(); }, [session?.token]);
  useEffect(() => {
    const controller = new AbortController();
    pilotAvailability(controller.signal).then(value => { if (!controller.signal.aborted) setReady(value); })
      .catch(() => { if (!controller.signal.aborted) setReady(false); });
    return () => { controller.abort(); epoch.current++; pending.current?.abort(); };
  }, []);
  async function loadPhoto(file: File | undefined) {
    if (!file || locked.current) return;
    clearImage(); const version = epoch.current; setPreparing(true);
    try {
      const value = await prepareVisualPhoto(file);
      if (epoch.current === version) setPhoto(value);
    } catch (error) {
      if (epoch.current === version) setNotice(error instanceof Error ? error.message : 'Photo could not be prepared.');
    } finally { if (epoch.current === version) setPreparing(false); }
  }
  function changeCrop(next: CropRegion) {
    setCrop(normalizedCrop(next)); setPreview(''); setConsent(false); setSerialConfirmed(false); setReply(null);
  }
  async function prepareCrop() {
    if (!imageRef.current?.naturalWidth || busy) return;
    const version = epoch.current; setPreparing(true); setPreview(''); setConsent(false); setSerialConfirmed(false); setReply(null);
    try {
      const selected = cropVisualPhoto(imageRef.current, crop);
      const result = enhance ? await enhanceLocalPreview(selected) : selected;
      if (epoch.current === version) setPreview(result);
    } catch { if (epoch.current === version) setNotice('Could not prepare the crop. Try a smaller region.'); }
    finally { if (epoch.current === version) setPreparing(false); }
  }
  useEffect(() => {
    if (!relief || !preview || !reliefRef.current) return;
    let cancelled = false; const img = new Image();
    img.onload = () => { if (!cancelled && reliefRef.current) drawIllustrativeRelief(reliefRef.current, img, tilt, spin); };
    img.src = preview;
    return () => { cancelled = true; };
  }, [preview, relief, tilt, spin]);

  async function submit() {
    if (!session || !ready || !consent || !preview || !question.trim() || question.length > 500 ||
        (mode === 'SERIAL_AUDIT' && (!serialConfirmed || whole(crop))) ||
        busy || preparing || uncertain || locked.current) return;
    locked.current = true; setBusy(true); setNotice(''); setReply(null); setConsent(false);
    const version = epoch.current, controller = new AbortController(); pending.current = controller;
    try {
      const result = await askSpatialVision(session.token, question, preview, mode, language, provider,
        serialConfirmed, controller.signal);
      if (epoch.current === version) setReply(result);
    } catch (error) {
      if (epoch.current !== version) return;
      const code = error instanceof PilotChatError ? error.code : 'RESPONSE_UNCONFIRMED';
      if (code === 'AUTH_REQUIRED') { signOut(); return; }
      const rejected = ['INVALID_INPUT', 'AI_INPUT_TOO_LARGE', 'AI_DISABLED', 'BILLING_NOT_APPROVED',
        'AI_PROVIDER_BUDGET_EXHAUSTED', 'AI_USER_DAILY_QUOTA_EXHAUSTED', 'AI_BUDGET_STORE_UNAVAILABLE'].includes(code);
      setUncertain(!rejected);
      setNotice(rejected ? 'No provider attempt started. Check your crop, consent and allowance.'
        : 'A complete analysis was not confirmed. The attempt may count toward your allowance. No automatic retry was made.');
    } finally {
      if (epoch.current === version) { pending.current = null; locked.current = false; setBusy(false); }
    }
  }
  const sendReady = !!session && ready && consent && !!preview && !!question.trim() &&
    question.length <= 500 && !busy && !preparing && !uncertain &&
    (mode !== 'SERIAL_AUDIT' || (serialConfirmed && !whole(crop)));
  const modeHelp = MODES.find(item => item.id === mode)?.help;

  return <main className="luqi-spatial" aria-labelledby="spatial-title">
    <header>
      <p className="luqi-eyebrow">LUQI · VISUAL LEARNING LAB</p>
      <h1 id="spatial-title">Spatial Vision & 2.5D Lab</h1>
      <p>Explore exam diagrams, visible contract terms and hardware labels. KHORO works inside Luqi; no separate login.</p>
      <p className="luqi-spatial-caution">Model boxes are estimates, not verified segmentation. The rotatable brightness relief is an illustration, not a measured depth map or real 3D reconstruction.</p>
    </header>
    {!session ? <AccountAccessForm purpose="account" onAuthenticated={acceptSession} /> : <>
      <p className="luqi-spatial-account">Signed in as {session.user.name || session.user.email}. <button type="button" onClick={signOut}>Sign out</button></p>
      {!ready && <p role="status">The AI image gateway is not currently configured as ready. You can still explore images locally.</p>}
      <div className="luqi-spatial-controls">
        <label>Scan mode
          <select value={mode} disabled={busy} onChange={event => {
            setMode(event.target.value as SpatialMode); setReply(null); setConsent(false); setSerialConfirmed(false);
          }}>{MODES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
        </label>
        <label>Vision provider
          <select value={provider} disabled={busy} onChange={event => {
            setProvider(event.target.value as SpatialProvider); setConsent(false); setReply(null);
          }}>
            <option value="gemini">Gemini (existing visual pilot)</option>
            <option value="openai">OpenAI gpt-4o (experimental)</option>
          </select>
        </label>
        <label>Explanation language
          <select value={language} disabled={busy} onChange={event => {
            setLanguage(event.target.value); setConsent(false); setReply(null);
          }}>{LANGUAGES.map(item => <option key={item.code} value={item.name}>{item.nativeName}</option>)}</select>
        </label>
      </div>
      <p>{modeHelp} Provider availability is configuration-only, not proof of a complete answer.</p>
      <label className="luqi-spatial-file">Choose a JPEG or PNG (up to 8 MB)
        <input ref={fileRef} type="file" accept="image/jpeg,image/png" disabled={busy || preparing}
          onChange={event => { void loadPhoto(event.target.files?.[0]); }} />
      </label>
      {preparing && <p role="status">Preparing the selected image on your device…</p>}
      {photo && <section aria-label="Local crop and preview" className="luqi-spatial-workspace">
        <div>
          <h2>Select the region to analyse</h2>
          <p>Crop locally before any upload. For hardware serials, exclude IMEI, personal and company identifiers.</p>
          <div className="luqi-spatial-image">
            <img ref={imageRef} src={photo} alt="Local image for crop selection" draggable={false} />
            <div className="luqi-spatial-selection" style={{
              left: `${crop.x}%`, top: `${crop.y}%`, width: `${crop.width}%`, height: `${crop.height}%`,
            }} aria-hidden="true" />
          </div>
          <div className="luqi-spatial-crop-controls">
            {(['x', 'y', 'width', 'height'] as const).map(key => <label key={key}>
              {{ x: 'Left', y: 'Top', width: 'Width', height: 'Height' }[key]} ({Math.round(crop[key])}%)
              <input type="range" min={key === 'x' || key === 'y' ? 0 : 1}
                max={key === 'x' || key === 'y' ? 99 : 100} value={crop[key]} disabled={busy}
                onChange={event => changeCrop({ ...crop, [key]: Number(event.target.value) })} />
            </label>)}
          </div>
          <label className="luqi-spatial-check"><input type="checkbox" checked={enhance} disabled={busy}
            onChange={event => { setEnhance(event.target.checked); setPreview(''); setConsent(false); }} />
            Optional local contrast enhancement (may obscure fine text)</label>
          <div className="luqi-spatial-actions">
            <button type="button" disabled={busy} onClick={() => changeCrop(WHOLE_IMAGE)}>Whole photo</button>
            <button type="button" disabled={busy || preparing} onClick={() => { void prepareCrop(); }}>Prepare selected crop</button>
            <button type="button" disabled={busy} onClick={clearImage}>Clear image</button>
          </div>
        </div>

        {preview && <div className="luqi-spatial-preview">
          <h2>Review exactly what would be sent</h2>
          <div className="luqi-spatial-image luqi-spatial-preview-image">
            <img src={preview} alt="Selected local JPEG preview for optional provider analysis" />
            {reply?.analysis.entities.map((entity, index) => {
              const [ymin, xmin, ymax, xmax] = entity.box_2d;
              return <div key={index}
                className={'luqi-spatial-box ' + (entity.category === 'IMEI_REJECTED' || entity.category === 'CONTRACT_TERM'
                  ? 'luqi-spatial-box-caution' : 'luqi-spatial-box-info')}
                style={{ top: `${ymin / 10}%`, left: `${xmin / 10}%`,
                  width: `${(xmax - xmin) / 10}%`, height: `${(ymax - ymin) / 10}%` }}
                title={entity.label} aria-hidden="true" />;
            })}
          </div>
          <p>Rectangles are model suggestions. A green box is not verified OCR; a red box is not a legal finding.</p>
          <button type="button" className="luqi-spatial-relief-toggle"
            onClick={() => setRelief(value => !value)}>{relief ? 'Hide 2.5D illustration' : 'Explore 2.5D brightness relief'}</button>
          {relief && <div className="luqi-spatial-relief">
            <canvas ref={reliefRef} width={640} height={380} role="img"
              aria-label="Illustrative brightness-based rotatable point cloud, not measured depth" />
            <div className="luqi-spatial-relief-controls">
              <label>Tilt X ({tilt}°)<input type="range" min="-60" max="60" value={tilt}
                onChange={event => setTilt(Number(event.target.value))} /></label>
              <label>Spin Y ({spin}°)<input type="range" min="-75" max="75" value={spin}
                onChange={event => setSpin(Number(event.target.value))} /></label>
            </div>
            <p>This illustration uses pixel brightness, not a learned depth model. Do not use it to measure distances or identify damage.</p>
          </div>}
        </div>}
      </section>}
      {preview && <form className="luqi-spatial-send" onSubmit={event => { event.preventDefault(); void submit(); }}>
        <h2>Ask Luqi about this crop</h2>
        <label>Question
          <textarea maxLength={500} value={question} disabled={busy || uncertain} rows={2}
            onChange={event => { setQuestion(event.target.value); setConsent(false); }} />
        </label>
        {mode === 'SERIAL_AUDIT' && <label className="luqi-spatial-check">
          <input type="checkbox" checked={serialConfirmed} disabled={busy || uncertain || whole(crop)}
            onChange={event => { setSerialConfirmed(event.target.checked); setConsent(false); }} />
          I reviewed the crop and excluded visible IMEI and other private identifiers.
          {whole(crop) && ' Select a smaller region first.'}
        </label>}
        <p>The selected JPEG and question go only to your chosen provider after Send. No automatic fallback or storage in Luqi notes. An image containing an IMEI could still be sent if you crop incorrectly.</p>
        <p>Each attempt uses the existing shared daily allowance and reserves $0.10 from the selected provider's approved application allocation. This is not the actual provider invoice.</p>
        <label className="luqi-spatial-check"><input type="checkbox" checked={consent} disabled={busy || uncertain}
          onChange={event => setConsent(event.target.checked)} />
          I agree to send this selected crop and question to {provider === 'gemini' ? 'Gemini' : 'OpenAI'} for this request.
        </label>
        <button type="submit" className="luqi-spatial-send-button" disabled={!sendReady}>
          {busy ? 'Analysing…' : 'Analyse selected crop'}
        </button>
        {busy && <button type="button" onClick={() => {
          epoch.current++; pending.current?.abort(); pending.current = null; locked.current = false;
          setBusy(false); setUncertain(true);
          setNotice('Cancelled locally. A provider attempt may still count toward your allowance.');
        }}>Cancel request</button>}
      </form>}
      {uncertain && <button type="button" className="luqi-spatial-reset" onClick={() => {
        setUncertain(false); setConsent(false); setSerialConfirmed(false);
        setNotice('Review the crop and approve a new attempt. No request is retried automatically.');
      }}>Prepare a new attempt</button>}
      {reply && <section className="luqi-spatial-results" aria-label="Model-estimated spatial analysis">
        <h2>Luqi's image reading</h2>
        <p>Provider: {reply.provider} · {reply.provider_model}. Model-estimated boxes are not independently verified.</p>
        <h3>What is visible</h3><SafePilotText text={reply.analysis.summary} />
        <h3>Explanation and next checks</h3><SafePilotText text={reply.analysis.guidance} />
        <h3>Suggested regions ({reply.analysis.entities.length})</h3>
        <ul>{reply.analysis.entities.map((entity, index) => <li key={index}>
          <strong>{entity.label}</strong> · {entity.category.replaceAll('_', ' ')}
          <p>{entity.insight}</p>
        </li>)}</ul>
        <p><strong>Uncertainty:</strong> {reply.analysis.limitations}</p>
      </section>}
      {notice && <p role="status" className="luqi-spatial-notice">{notice}</p>}
    </>}
    <footer><Link to="/visual-tutor">Visual tutor</Link> · <Link to="/chat">Luqi Chat</Link> · <Link to="/privacy">Privacy</Link></footer>
  </main>;
}
