import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import AccountAccessForm from '../components/AccountAccessForm';
import SafePilotText from '../components/SafePilotText';
import { useCustomerSession } from '../providers/customer-session';
import { pilotAvailability, PilotChatError, type PilotReply } from '../lib/ai-pilot';
import { askVisualTutor, cropVisualPhoto, normalizedCrop, prepareVisualPhoto, WHOLE_IMAGE, type CropRegion } from '../lib/visual-tutor';
import { getStoredLanguage, LANGUAGES } from '../lib/languages';
import '../visual-tutor.css';

export default function VisualTutorPage() {
  const { session, acceptSession, signOut } = useCustomerSession();
  const [photo, setPhoto] = useState(''), [crop, setCrop] = useState<CropRegion>(WHOLE_IMAGE);
  const [preview, setPreview] = useState(''), [question, setQuestion] = useState('');
  const [language, setLanguage] = useState(() => getStoredLanguage().name);
  const [consent, setConsent] = useState(false), [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false), [ready, setReady] = useState(false);
  const [uncertain, setUncertain] = useState(false), [notice, setNotice] = useState('');
  const [answer, setAnswer] = useState<PilotReply | null>(null);
  const image = useRef<HTMLImageElement>(null), epoch = useRef(0), locked = useRef(false);
  const pending = useRef<AbortController | null>(null), drag = useRef<{ x: number; y: number } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const reset = () => {
    epoch.current++; pending.current?.abort(); pending.current = null; locked.current = false;
    setPhoto(''); setPreview(''); setCrop(WHOLE_IMAGE); setQuestion(''); setConsent(false);
    setAnswer(null); setBusy(false); setPreparing(false); setUncertain(false); setNotice('');
    if (fileInput.current) fileInput.current.value = '';
  };
  useLayoutEffect(() => { reset(); }, [session?.token]);
  useEffect(() => {
    const controller = new AbortController();
    pilotAvailability(controller.signal).then(value => { if (!controller.signal.aborted) setReady(value); })
      .catch(() => { if (!controller.signal.aborted) setReady(false); });
    return () => { controller.abort(); epoch.current++; pending.current?.abort(); };
  }, []);

  function selectCrop(value: CropRegion) {
    setCrop(normalizedCrop(value)); setPreview(''); setConsent(false); setAnswer(null);
  }
  async function loadPhoto(file: File | undefined) {
    if (!file || locked.current) return;
    reset(); const version = epoch.current; setPreparing(true);
    try { const value = await prepareVisualPhoto(file); if (epoch.current === version) setPhoto(value); }
    catch (error) { if (epoch.current === version) setNotice(error instanceof Error ? error.message : 'Photo preview is unavailable.'); }
    finally { if (epoch.current === version) setPreparing(false); }
  }
  function point(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100)),
      y: Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100)) };
  }
  async function submit() {
    if (!session || !ready || !consent || !preview || !question.trim() || question.trim().length > 2000 ||
        locked.current || uncertain || preparing) return;
    locked.current = true; setBusy(true); setNotice(''); setAnswer(null); setConsent(false);
    const version = epoch.current, controller = new AbortController(); pending.current = controller;
    try {
      const reply = await askVisualTutor(session.token, question, preview, language, true, controller.signal);
      if (epoch.current === version) setAnswer(reply);
    } catch (error) {
      if (epoch.current !== version) return;
      const code = error instanceof PilotChatError ? error.code : 'RESPONSE_UNCONFIRMED';
      if (code === 'AUTH_REQUIRED') { signOut(); return; }
      const rejected = ['INVALID_INPUT', 'AI_INPUT_TOO_LARGE', 'AI_DISABLED', 'BILLING_NOT_APPROVED',
        'AI_PROVIDER_BUDGET_EXHAUSTED', 'AI_USER_DAILY_QUOTA_EXHAUSTED', 'AI_BUDGET_STORE_UNAVAILABLE'].includes(code);
      setUncertain(!rejected);
      setNotice(rejected ? 'The request was not started. Check the photo, question and available allowance before trying again.'
        : 'A complete reply could not be confirmed. The attempt may count toward your allowance. Luqi will not retry automatically.');
    } finally {
      if (epoch.current === version) { pending.current = null; locked.current = false; setBusy(false); }
    }
  }

  return <main className="luqi-info luqi-visual">
    <p className="luqi-eyebrow">LOOK, SELECT AND LEARN</p>
    <h1>Visual tutor</h1>
    <p>Choose a photo, select the region you want to understand, and ask Luqi a question. Selection and preview stay on your device until you send.</p>
    <p>Use ordinary test photos. Avoid faces, personal documents and confidential work. AI can misidentify objects and details.</p>
    {!session ? <AccountAccessForm purpose="account" onAuthenticated={acceptSession} /> : <>
      <p>Signed in as {session.user.name || session.user.email}. <button type="button" className="luqi-secondary" onClick={signOut}>Sign out</button></p>
      {!ready && <p role="status">Image replies are currently paused. You can still prepare a local preview.</p>}
      <label>Choose a JPEG or PNG photo (up to 8 MB)
        <input ref={fileInput} type="file" accept="image/jpeg,image/png" disabled={busy || preparing}
          onChange={event => { void loadPhoto(event.target.files?.[0]); }} /></label>
      {preparing && <p role="status">Preparing your photo on this device…</p>}
      {photo && <section aria-labelledby="visual-selection-heading">
        <h2 id="visual-selection-heading">Select a region</h2>
        <p>Drag across the photo, or use the selection controls below. To ask about everything, choose the whole photo.</p>
        <div className="luqi-visual-photo" onPointerDown={event => {
          if (busy) return; drag.current = point(event); event.currentTarget.setPointerCapture(event.pointerId);
        }} onPointerMove={event => {
          if (!drag.current || busy) return; const end = point(event), start = drag.current;
          selectCrop({ x: Math.min(start.x, end.x), y: Math.min(start.y, end.y),
            width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y) });
        }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
          <img ref={image} src={photo} alt="Your local photo for region selection" draggable={false} />
          <div className="luqi-visual-selection" style={{ left: `${crop.x}%`, top: `${crop.y}%`, width: `${crop.width}%`, height: `${crop.height}%` }} />
        </div>
        <fieldset disabled={busy} className="luqi-visual-controls"><legend>Selection controls</legend>
          {(['x', 'y', 'width', 'height'] as const).map(key => <label key={key}>
            {{ x: 'Left', y: 'Top', width: 'Width', height: 'Height' }[key]} ({Math.round(crop[key])}%)
            <input type="range" min={key === 'x' || key === 'y' ? 0 : 1} max={key === 'x' || key === 'y' ? 99 : 100}
              value={crop[key]} onChange={event => selectCrop({ ...crop, [key]: Number(event.target.value) })} />
          </label>)}
        </fieldset>
        <div className="luqi-visual-actions">
          <button type="button" className="luqi-secondary" disabled={busy} onClick={() => selectCrop(WHOLE_IMAGE)}>Use whole photo</button>
          <button type="button" className="luqi-secondary" disabled={busy} onClick={() => {
            if (!image.current?.naturalWidth) return;
            try { setPreview(cropVisualPhoto(image.current, crop)); setConsent(false); setNotice(''); }
            catch { setNotice('The crop could not be prepared. Choose another region.'); }
          }}>Preview selected region</button>
          <button type="button" className="luqi-secondary" disabled={busy} onClick={reset}>Clear photo</button>
        </div>
      </section>}
      {preview && <section aria-labelledby="visual-send-heading">
        <h2 id="visual-send-heading">Review before sending</h2>
        <img className="luqi-visual-crop" src={preview} alt="Selected region that will be sent to Gemini" />
        <form onSubmit={event => { event.preventDefault(); void submit(); }}>
          <label>Your question<textarea className="luqi-access-input" maxLength={2000} disabled={busy}
            value={question} onChange={event => setQuestion(event.target.value)} placeholder="What is visible here, and how does it work?" /></label>
          <label htmlFor="visual-language">Reply language</label><select id="visual-language" className="luqi-access-input" disabled={busy} value={language}
            onChange={event => { setLanguage(event.target.value); setConsent(false); }}>
            {LANGUAGES.map(item => <option key={item.code} value={item.name}>{item.nativeName}</option>)}
          </select>
          <p>Only this preview and your question go to Google Gemini. Luqi does not save this photo or reply to your notes. Provider processing follows Google's API terms; no zero-retention promise is made. Language accuracy can vary.</p>
          <p>Each attempt counts toward your daily AI request limit and reserves $0.10 from Luqi's shared monthly AI budget, including failures. Provider charges are tracked separately.</p>
          <label className="luqi-visual-consent"><input type="checkbox" checked={consent} disabled={busy || uncertain}
            onChange={event => setConsent(event.target.checked)} />I agree to send this selected image and question to Google Gemini for this request.</label>
          <button className="luqi-primary" disabled={!ready || !consent || !question.trim() || busy || uncertain}>{busy ? 'Explaining…' : 'Explain selected image'}</button>
        </form>
      </section>}
      {uncertain && <button type="button" className="luqi-secondary" onClick={() => {
        setUncertain(false); setConsent(false); setNotice('A new request needs your agreement and another allowance reservation.');
      }}>Start a new request</button>}
      {busy && <button type="button" className="luqi-secondary" onClick={() => {
        epoch.current++; pending.current?.abort(); pending.current = null; locked.current = false;
        setBusy(false); setUncertain(true); setNotice('Cancelled locally. An attempt may still count toward your allowance.');
      }}>Cancel request</button>}
      {answer && <section aria-label="Luqi image explanation"><h2>Luqi's explanation</h2>
        <div className="luqi-visual-answer"><SafePilotText text={answer.response} /></div>
        <p>Gemini · {answer.provider_model}. Check uncertain details against the original object or a reliable source.</p>
      </section>}
    </>}
    {notice && <p role="status">{notice}</p>}
    <p>You select the region manually. Automatic object masks and 3D reconstruction are still being evaluated.</p>
    <Link to="/chat">Back to Chat</Link> · <Link to="/privacy">Privacy information</Link>
  </main>;
}
