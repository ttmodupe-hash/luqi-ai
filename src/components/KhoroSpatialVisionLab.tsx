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
