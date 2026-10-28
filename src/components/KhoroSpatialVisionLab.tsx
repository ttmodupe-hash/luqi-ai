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
