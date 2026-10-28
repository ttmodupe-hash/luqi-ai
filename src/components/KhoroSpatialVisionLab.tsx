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
  // __RENDER__
}
