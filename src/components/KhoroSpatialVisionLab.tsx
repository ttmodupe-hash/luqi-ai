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
