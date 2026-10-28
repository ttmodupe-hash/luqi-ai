import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { CLIP_SECONDS, SHOWCASE_SCENES, STUDIO_FORMATS, drawStudioFrame, episodeOutline,
  pendulumPeriod, sceneAt, storyboardJson, subtitles, studioDuration,
  type StudioFormat, type StudioScene, type StudioMotion, type StudioSceneSeconds } from '../lib/content-studio';
import { useOptionalChatWorkspace } from '../providers/chat-workspace';
import '../content-studio.css';
import { browserRecordingType } from '../lib/recording-support';
import StudioDraftImport from '../components/StudioDraftImport';
import { serializeStudioDraft } from '../lib/studio-draft';

interface Recording { media: MediaRecorder; stream: MediaStream; chunks: Blob[]; started: number; discard: boolean; timer: ReturnType<typeof setTimeout>; bytes: number }
function saveText(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
export default function ContentStudioPage() {
  const chatWorkspace = useOptionalChatWorkspace();
  // The approved proposal is transferred in memory, never in a URL or storage.
  const approvedPlan = chatWorkspace?.pendingStudioPlan ?? null;
  const [recordingType] = useState(browserRecordingType);
  const [scenes, setScenes] = useState<StudioScene[]>(() => approvedPlan ? approvedPlan.scenes.map(scene => ({ ...scene })) : SHOWCASE_SCENES.map(s => ({ ...s })));
  const [draftBusy, setDraftBusy] = useState(false);
  const [format, setFormat] = useState<StudioFormat>('landscape');
  const [sceneSeconds, setSceneSeconds] = useState<StudioSceneSeconds>(approvedPlan?.sceneSeconds ?? 15);
  const [motion, setMotion] = useState<StudioMotion>(approvedPlan?.theme ?? 'pendulum');
  const [approvedGoal] = useState(approvedPlan?.goal ?? '');
  const [time, setTime] = useState(0), [playing, setPlaying] = useState(false), [recording, setRecording] = useState(false);
  const [length, setLength] = useState(2.5), [gravity, setGravity] = useState(9.81), [yaw, setYaw] = useState(28);
  const [message, setMessage] = useState(approvedPlan ? 'Your reviewed Chat plan is loaded. Luqi will try to record the silent local video automatically where this browser supports it.' : 'Your draft stays in this page. Download it before leaving.');
  const [clip, setClip] = useState<{ url: string; extension: string; format: StudioFormat } | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null), position = useRef(0), active = useRef<Recording | null>(null), mounted = useRef(true);
  const clipSeconds = studioDuration(sceneSeconds);
  const dimensions = STUDIO_FORMATS[format], selected = sceneAt(time, sceneSeconds);
  const editingLocked = recording || draftBusy;
  function cancelRecording() {
    const run = active.current; if (!run) return;
    run.discard = true; clearTimeout(run.timer);
    if (run.media.state !== 'inactive') run.media.stop();
    run.stream.getTracks().forEach(track => track.stop());
    active.current = null; setRecording(false); setPlaying(false);
    setMessage('Export cancelled. The partial recording was discarded; your storyboard is still here.');
  }
  useEffect(() => { mounted.current = true; return () => {
    mounted.current = false; const run = active.current;
    if (run) { run.discard = true; clearTimeout(run.timer); if (run.media.state !== 'inactive') run.media.stop(); run.stream.getTracks().forEach(t => t.stop()); }
  }; }, []);
  useEffect(() => {
    // The click in Chat explicitly approved generation. The route does not
    // trigger paid AI, remote media processing or downloads automatically.
    if (!approvedPlan) return;
    const frame = requestAnimationFrame(() => {
      if (!mounted.current) return;
      chatWorkspace?.clearStudioPlan();
      if (recordingType) record();
      else setMessage('Approved video storyboard loaded. Recording is unsupported here; preview and download the script or storyboard instead.');
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => () => { if (clip) URL.revokeObjectURL(clip.url); }, [clip]);
  useEffect(() => {
    const interrupted = () => { if (document.hidden && active.current) cancelRecording(); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && active.current) cancelRecording(); };
    document.addEventListener('visibilitychange', interrupted); window.addEventListener('keydown', escape);
    return () => { document.removeEventListener('visibilitychange', interrupted); window.removeEventListener('keydown', escape); };
  }, []);
  useEffect(() => {
    let frame = 0, last = 0; const started = performance.now(), startPosition = position.current;
    const draw = (now: number) => {
      if (now - last >= 1000 / 24 || !playing) {
        last = now;
        const current = active.current ? Math.min(clipSeconds, (now - active.current.started) / 1000) :
          playing ? Math.min(clipSeconds, startPosition + (now - started) / 1000) : position.current;
        position.current = current;
        const context = canvas.current?.getContext('2d');
        if (context) drawStudioFrame(context, dimensions.width, dimensions.height, current, scenes, length, gravity, yaw, sceneSeconds, motion);
        if (playing) { setTime(current); if (current >= clipSeconds && !active.current) setPlaying(false); }
      }
      if (playing) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [playing, recording, scenes, format, length, gravity, yaw, sceneSeconds, motion, playing ? null : time]);
  function seek(next: number) { position.current = next; setTime(next); setPlaying(false); }
  function edit(key: keyof StudioScene, value: string) { setPlaying(false); setScenes(old => old.map((s, i) => i === selected ? { ...s, [key]: value } : s)); }
  function exportText(kind: 'storyboard' | 'subtitles' | 'script') {
    try {
      if (kind === 'storyboard') saveText('luqi-storyboard.json', serializeStudioDraft(scenes, format, length, gravity, yaw, sceneSeconds, motion), 'application/json');
      if (kind === 'subtitles') saveText('luqi-subtitles.srt', subtitles(scenes, sceneSeconds), 'text/plain;charset=utf-8');
      if (kind === 'script') saveText('luqi-episode-outline.txt', episodeOutline(scenes, sceneSeconds), 'text/plain;charset=utf-8');
      setMessage('Download prepared. Review your content before sharing it.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Complete the storyboard before exporting.'); }
  }
  function record() {
    if (active.current || draftBusy) return;
    let stream: MediaStream | undefined;
    try {
      storyboardJson(scenes, format, length, gravity, sceneSeconds, motion);
      if (!canvas.current?.captureStream || typeof MediaRecorder === 'undefined') throw new Error('Video export is unavailable in this browser. Download the storyboard and script instead.');
      const mimeType = browserRecordingType();
      if (!mimeType) throw new Error('No supported video encoder. Download the storyboard and script instead.');
      stream = canvas.current.captureStream(24);
      const media = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 3_000_000 });
      const run: Recording = { media, stream, chunks: [], started: performance.now(), discard: false, bytes: 0,
        timer: setTimeout(() => { if (media.state !== 'inactive') media.stop(); }, clipSeconds * 1000) };
      media.ondataavailable = event => {
        if (event.data.size && !run.discard) {
          run.bytes += event.data.size;
          if (run.bytes > 100 * 1024 * 1024) { cancelRecording(); setMessage('Export exceeded the local size limit and was discarded.'); }
          else run.chunks.push(event.data);
        }
      };
      media.onerror = () => { cancelRecording(); if (mounted.current) setMessage('The video encoder failed. No completed clip was created.'); };
      media.onstop = () => {
        clearTimeout(run.timer); run.stream.getTracks().forEach(track => track.stop());
        if (active.current === run) active.current = null;
        if (!mounted.current || run.discard) return;
        setPlaying(false); setRecording(false);
        if (!run.bytes || performance.now() - run.started < clipSeconds * 1000 - 500 || position.current < clipSeconds - 1) { setMessage('The recording ended early. No completed ' + clipSeconds + '-second clip was created.'); return; }
        const blob = new Blob(run.chunks, { type: media.mimeType });
        position.current = clipSeconds; setTime(clipSeconds);
        setClip({ url: URL.createObjectURL(blob), format, extension: media.mimeType.startsWith('video/mp4') ? 'mp4' : 'webm' });
        setMessage('Your silent ' + clipSeconds + '-second animation is ready. Watch it, then download and review it before publishing.');
      };
      position.current = 0; setTime(0); setClip(null); active.current = run;
      media.start(1000); setRecording(true); setPlaying(true);
      setMessage('Recording ' + clipSeconds + ' seconds locally. Keep this tab visible. Escape or Cancel discards a partial clip. No audio, provider call or social upload is made.');
    } catch (error) {
      stream?.getTracks().forEach(track => track.stop());
      if (active.current) { clearTimeout(active.current.timer); active.current = null; }
      setMessage(error instanceof Error ? error.message : 'Video export could not start.');
    }
  }
  return <main className="luqi-studio">
    <div className="luqi-studio-heading"><p className="luqi-eyebrow">Luqi Content Studio · Local creation</p><h1>Create. Explain. Make it clear.</h1>
      <p>Six editable scenes and original local motion graphics. Approved Chat videos use a topic-matched illustration when available; other topics use abstract visual cards, not fabricated AI footage. Download the storyboard before leaving so you can continue later.</p></div>
    {approvedGoal && <section className="luqi-studio-approved" aria-label="Approved Chat project"><h2>Your approved Chat project</h2><p>{approvedGoal}</p><p>All six scene captions are editable. This {clipSeconds}-second video is silent: narration, music and generated film footage are not included.</p><Link to="/chat">Return to Luqi Chat</Link></section>}
    <StudioDraftImport disabled={recording} onBusyChange={busy => { setDraftBusy(busy); if (busy) setPlaying(false); }}
      onRestore={draft => {
        if (active.current) return;
        setScenes(draft.scenes.map(scene => ({ ...scene }))); setFormat(draft.aspect);
        setLength(draft.length); setGravity(draft.gravity); setYaw(draft.yaw);
        setSceneSeconds(draft.sceneSeconds); setMotion(draft.visualTheme);
        seek(0); setClip(null);
        setMessage('Saved storyboard restored. Download your edited storyboard before leaving.');
      }} />
    <div className="luqi-studio-grid">
      <section className="luqi-studio-stage" aria-label="Animation preview">
        <canvas ref={canvas} width={dimensions.width} height={dimensions.height} role="img" aria-label={motion === 'pendulum' ? 'Projected 3D pendulum animation. The complete script and questions are available in the storyboard editor.' : 'Illustrative motion graphics for the approved video story, with on-screen captions.'} style={{ aspectRatio: `${dimensions.width}/${dimensions.height}` }} />
        <div className="luqi-studio-transport"><button type="button" disabled={editingLocked} onClick={() => { if (position.current >= clipSeconds) { position.current = 0; setTime(0); } setPlaying(!playing); }}>{playing ? 'Pause preview' : 'Play preview'}</button>
          <output role="timer" aria-live="off" aria-label="Timeline position">{Math.floor(time)} / {clipSeconds} s</output><label>Time<input type="range" aria-label="Animation time" min="0" max={clipSeconds} step=".1" value={time} disabled={editingLocked} onChange={e => seek(Number(e.target.value))} /></label></div>
        {motion === 'pendulum' && <div className="luqi-studio-physics"><label>Length · {length.toFixed(1)} m<input type="range" aria-label="Pendulum length" min=".5" max="4" step=".1" value={length} disabled={editingLocked} onChange={e => setLength(Number(e.target.value))} /></label>
          <label>Gravity<select aria-label="Gravity" value={gravity} disabled={editingLocked} onChange={e => setGravity(Number(e.target.value))}><option value="9.81">Earth · 9.81 m/s²</option><option value="1.62">Moon · 1.62 m/s²</option><option value="3.71">Mars · 3.71 m/s²</option>{![9.81, 1.62, 3.71].includes(gravity) && <option value={gravity}>Imported · {gravity} m/s²</option>}</select></label>
          <label>Camera angle<input type="range" aria-label="Camera angle" min="-80" max="80" value={yaw} disabled={editingLocked} onChange={e => setYaw(Number(e.target.value))} /></label></div>}
        <p className="luqi-studio-model">{motion === 'pendulum' ? <>Small-angle model: T ≈ 2π√(L/g) = <strong>{pendulumPeriod(length, gravity).toFixed(2)} s</strong>. “Fourth axis” means time in this view. Predict, observe, compare and explain.</> : 'This is an original illustrative animation, not an exact physical simulation or AI-generated film. Check facts and captions before sharing.'}</p>
      </section>
      <section className="luqi-studio-editor" aria-labelledby="storyboard-heading"><h2 id="storyboard-heading">Your storyboard</h2>
        <div className="luqi-studio-scenes" role="group" aria-label="Choose a scene">{scenes.map((s, i) => <button key={i} type="button" aria-pressed={selected === i} disabled={editingLocked} onClick={() => seek(i * sceneSeconds)}><span>{String(i + 1).padStart(2, '0')}</span><span>{s.title || 'Untitled scene'}<small>{i * sceneSeconds}–{(i + 1) * sceneSeconds} seconds</small></span></button>)}</div>
        <fieldset disabled={editingLocked}><legend>Edit scene {selected + 1}</legend>
          <label>Scene title<input aria-label="Scene title" maxLength={64} value={scenes[selected].title} onChange={e => edit('title', e.target.value)} /></label>
          <label>Scene caption<textarea aria-label="Scene caption" rows={4} maxLength={240} value={scenes[selected].caption} onChange={e => edit('caption', e.target.value)} /></label>
          <label>Critical-thinking question<textarea aria-label="Critical-thinking question" rows={2} maxLength={140} value={scenes[selected].question} onChange={e => edit('question', e.target.value)} /></label>
        </fieldset>
      </section>
    </div>
    <section className="luqi-studio-export" aria-labelledby="export-heading"><div><h2 id="export-heading">Review. Export. Make it yours.</h2>
      <p>Video is silent original motion graphics. No generative film footage, voice clone, payment or direct social connection is enabled. Native timing can vary slightly; check the finished duration before publishing. Add your own licensed audio and verify platform requirements before uploading.</p></div>
      <label>Video format<select aria-label="Video format" value={format} disabled={editingLocked} onChange={e => setFormat(e.target.value as StudioFormat)}>{Object.entries(STUDIO_FORMATS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label>
      <div className="luqi-studio-actions"><button className="luqi-primary" type="button" disabled={editingLocked || !recordingType} aria-describedby="studio-recording-support" onClick={record}>Record {clipSeconds}-second animation</button>
        {recording && <button type="button" onClick={cancelRecording}>Cancel recording</button>}
        <button type="button" disabled={recording} onClick={() => exportText('storyboard')}>Download storyboard</button><button type="button" disabled={recording} onClick={() => exportText('subtitles')}>Download subtitles</button><button type="button" disabled={recording} onClick={() => exportText('script')}>Download script / podcast outline</button></div>
      <p id="studio-recording-support">{recordingType
        ? 'This browser reports a compatible recorder. A successful export still depends on its encoder; review the finished clip.'
        : 'Video recording is unavailable in this browser. You can still edit and download your storyboard, subtitles and script.'}</p>
      <p role="status" aria-label="Studio export status" aria-live="polite">{message}</p>
      {clip && <div><video src={clip.url} controls aria-label="Completed local animation" /><a className="luqi-primary" href={clip.url} download={'luqi-showcase-' + clipSeconds + 's-' + clip.format + '.' + clip.extension}>Download {clipSeconds}-second video (.{clip.extension})</a></div>}
    </section>
    <section className="luqi-studio-responsibility"><h2>Support that keeps you in control.</h2><p>Use examples your audience can relate to. Distinguish evidence from opinion and invite a counterexample. Obtain permission for music, images, voices and guests. Check the rules for the audience’s country before publishing.</p>
      <p>Luqi does not file tax returns, act as a chartered accountant or publish on your behalf here. Those workflows need a verified identity, a specific mandate, the relevant professional review and approval of the final action.</p><Link to="/ai-trial">Check the separate signed-in text trial</Link><span> · </span><Link to="/privacy">Privacy information</Link></section>
  </main>;
}
