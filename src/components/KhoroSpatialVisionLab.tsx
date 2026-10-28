import React, { useEffect, useRef, useState } from 'react';

type Mode = 'EXAM_3D' | 'CONTRACT_SHIELD' | 'SERIAL_AUDIT';
type Region = { label: string; category: string; box_2d: [number, number, number, number] };
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const modes: { id: Mode; label: string }[] = [
  { id: 'EXAM_3D', label: 'Exam and STEM' },
  { id: 'CONTRACT_SHIELD', label: 'Contract review' },
  { id: 'SERIAL_AUDIT', label: 'Hardware serial audit' },
];

function validateRegions(data: unknown): Region[] {
  if (!Array.isArray(data)) return [];
  return data.slice(0, 20).flatMap((item: unknown) => {
    if (!item || typeof item !== 'object') return [];
    const v = item as Record<string, unknown>;
    const b = v.box_2d;
    if (typeof v.label !== 'string' || typeof v.category !== 'string' ||
        !Array.isArray(b) || b.length !== 4 || !b.every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1000) ||
        b[0] >= b[2] || b[1] >= b[3]) return [];
    return [{ label: v.label.slice(0, 100), category: v.category.slice(0, 40),
      box_2d: b as [number, number, number, number] }];
  });
}

export default function KhoroSpatialVisionLab() {
  const [mode, setMode] = useState<Mode>('EXAM_3D');
  const [language, setLanguage] = useState('English');
  const [image, setImage] = useState<string | null>(null);
  const [processed, setProcessed] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState('');
  const [error, setError] = useState('');
  const [depth, setDepth] = useState(false);
  const [tilt, setTilt] = useState(20);
  const [spin, setSpin] = useState(-15);
  const [regions] = useState<Region[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const generation = useRef(0);

  useEffect(() => () => { generation.current++; }, []);

  async function handleImage(file?: File) {
    const id = ++generation.current;
    setImage(null); setProcessed(null); setDepth(false); setDimensions(''); setError('');
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > MAX_FILE_BYTES) {
      setError('Choose a JPEG, PNG or WebP image under 8 MB.'); return;
    }
    const objectUrl = URL.createObjectURL(file);
    try {
      const source = new Image();
      await new Promise<void>((resolve, reject) => {
        source.onload = () => resolve(); source.onerror = () => reject(new Error('Image could not be decoded'));
        source.src = objectUrl;
      });
      if (id !== generation.current) return;
      if (!source.naturalWidth || !source.naturalHeight || source.naturalWidth * source.naturalHeight > 24000000) {
        throw new Error('Image dimensions are unsupported');
      }
      const scale = Math.min(1, 1024 / Math.max(source.naturalWidth, source.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(source.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(source.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas is unavailable on this device');
      context.filter = 'contrast(1.18) brightness(1.04)';
      context.drawImage(source, 0, 0, canvas.width, canvas.height);
      const output = canvas.toDataURL('image/jpeg', 0.78);
      if (id !== generation.current) return;
      setImage(output); setProcessed(output);
      setDimensions(canvas.width + ' × ' + canvas.height + ' pixels');
    } catch {
      if (id === generation.current) setError('Unable to prepare this image on your device.');
    } finally { URL.revokeObjectURL(objectUrl); }
  }

  useEffect(() => {
    if (!depth || !image || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    let active = true;
    img.onload = () => {
      if (!active) return;
      const w = canvas.width, h = canvas.height;
      ctx.fillStyle = '#08152b'; ctx.fillRect(0, 0, w, h);
      const sampling = document.createElement('canvas'); sampling.width = 56; sampling.height = 40;
      const sampleCtx = sampling.getContext('2d'); if (!sampleCtx) return;
      sampleCtx.drawImage(img, 0, 0, 56, 40);
      const pixels = sampleCtx.getImageData(0, 0, 56, 40).data;
      const rx = tilt * Math.PI / 180, ry = spin * Math.PI / 180;
      for (let y = 0; y < 40; y++) for (let x = 0; x < 56; x++) {
        const i = (y * 56 + x) * 4;
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        const z = ((r * .299 + g * .587 + b * .114) / 255 - .5) * 70;
        const px = (x - 28) * 8, py = (y - 20) * 8;
        const xx = px * Math.cos(ry) + z * Math.sin(ry);
        const zz = -px * Math.sin(ry) + z * Math.cos(ry);
        const yy = py * Math.cos(rx) - zz * Math.sin(rx);
        const far = py * Math.sin(rx) + zz * Math.cos(rx);
        const perspective = 460 / (580 + far);
        ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
        ctx.beginPath(); ctx.arc(w / 2 + xx * perspective, h / 2 + yy * perspective, 2.3, 0, Math.PI * 2); ctx.fill();
      }
    };
    img.src = image;
    return () => { active = false; };
  }, [depth, image, tilt, spin]);

  return <main className="mx-auto max-w-5xl space-y-5 px-4 py-8 text-slate-100">
    <h1 className="text-2xl font-bold">Spatial Vision &amp; 3D Lab</h1>
    <p className="text-slate-300">Experimental, on-device image preparation and visual exploration. No image is uploaded or sent to an AI provider by this page.</p>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Scan mode">
      {modes.map(m => <button key={m.id} type="button" aria-pressed={mode === m.id}
        onClick={() => setMode(m.id)} className={'rounded-lg border px-3 py-2 ' + (mode === m.id ? 'border-sky-400 bg-sky-900' : 'border-slate-600 bg-slate-800')}>{m.label}</button>)}
    </div>
    <div className="grid gap-4 rounded-xl border border-slate-700 bg-slate-900 p-4 sm:grid-cols-2">
      <label className="space-y-2"><span className="block">Choose a photo</span>
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => void handleImage(e.target.files?.[0])} /></label>
      <label className="space-y-2"><span className="block">Explanation language (future AI analysis)</span>
        <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-800 p-2">
          {['English','Setswana','Sepedi','Sesotho','isiZulu','isiXhosa','Kiswahili','Yoruba'].map(x => <option key={x}>{x}</option>)}
        </select></label>
    </div>
    {error && <p role="alert" className="text-rose-300">{error}</p>}
    {image && <section className="space-y-4">
      <p className="text-sm text-slate-300">Prepared locally: {dimensions}. Contrast processing can make some text worse; verify against the original.</p>
      <button type="button" onClick={() => setDepth(!depth)} className="rounded-lg border border-sky-500 bg-sky-950 px-4 py-2">{depth ? 'Show 2D image' : 'Explore 3D-style projection'}</button>
      {depth ? <div className="space-y-3">
        <p className="text-sm text-amber-200">Illustrative luminance extrusion only. This is not measured depth, Gaussian splatting or physical 3D reconstruction.</p>
        <canvas ref={canvasRef} width={640} height={420} className="w-full max-w-full rounded-xl border border-slate-700" aria-label="Interactive illustrative point-cloud projection" />
        <label className="block">Tilt X: {tilt}° <input type="range" min="-60" max="60" value={tilt} onChange={e => setTilt(Number(e.target.value))} /></label>
        <label className="block">Spin Y: {spin}° <input type="range" min="-75" max="75" value={spin} onChange={e => setSpin(Number(e.target.value))} /></label>
      </div> : <div className="relative inline-block max-w-full">
        <img src={image} alt="Locally prepared uploaded photograph" className="block max-h-[560px] max-w-full rounded-xl" />
        {validateRegions(regions).map((r, i) => <div key={i} className="pointer-events-none absolute border-2 border-sky-400" style={{
          top: r.box_2d[0] / 10 + '%', left: r.box_2d[1] / 10 + '%',
          height: (r.box_2d[2] - r.box_2d[0]) / 10 + '%', width: (r.box_2d[3] - r.box_2d[1]) / 10 + '%',
        }} aria-label={r.label} />)}
      </div>}
      <p className="text-sm text-slate-300">AI segmentation, OCR, contract analysis and serial extraction are not enabled yet. Bounding boxes will appear only after a separately verified vision backend is connected.</p>
      {mode === 'SERIAL_AUDIT' && <p className="text-sm text-amber-200">Never use IMEI as the primary asset identifier. Do not upload unredacted asset labels without permission.</p>}
      {mode === 'CONTRACT_SHIELD' && <p className="text-sm text-amber-200">No legal determination or financial calculation has been made. Verify contracts with a qualified professional.</p>}
      {processed && <p className="text-xs text-slate-400">Image processing is local to this browser session. No automatic network request is made by this tool.</p>}
    </section>}
  </main>;
}
