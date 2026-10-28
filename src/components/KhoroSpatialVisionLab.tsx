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
