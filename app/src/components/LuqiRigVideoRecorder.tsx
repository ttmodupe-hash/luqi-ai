import { useEffect, useRef, useState } from 'react';
import { drawRigCanvas, validKeyframes, RIG_SECONDS,
  type RigId, type Keyframe } from '../lib/motion-rig';
import { browserMixedRecordingType, prepareStudioAudioMix,
  type StudioAudioMix } from '../lib/studio-audio';
import { browserRecordingType } from '../lib/recording-support';
import type { StudioAudioAssets } from './StudioAudioPanel';

type Capture = {
  recorder: MediaRecorder; stream: MediaStream; mix: StudioAudioMix | null;
  startedAt: number; timer: ReturnType<typeof setTimeout> | null; raf: number | null;
  discard: boolean; bytes: number; chunks: Blob[];
};
type Clip = { url: string; extension: string; mime: string; bytes: number };
const MAX_CAPTURE_BYTES = 20 * 1024 * 1024;
/** Browser-only four-second character video export. Audio is attached to the
 * same recorded MediaStream as the real Canvas2D character frames.
 * No silent fallback when a customer selected audio.
 */
export default function LuqiRigVideoRecorder({
  rig, frames, title, audio, disabled, onRecordingChange,
}: {
  rig: RigId; frames: readonly Keyframe[]; title: string;
  audio: StudioAudioAssets; disabled: boolean; onRecordingChange: (value: boolean) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const active = useRef<Capture | null>(null);
  const epoch = useRef(0), mounted = useRef(true);
  const [preparing, setPreparing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const [clip, setClip] = useState<Clip | null>(null);
  const [notice, setNotice] = useState('Record the moving character itself, with your selected voiceover or licensed music.');
  const hasAudio = Boolean(audio.narration || audio.music);
  const mime = hasAudio ? browserMixedRecordingType() : browserRecordingType();
  const busy = preparing || recording;

  function release(run: Capture) {
    if (run.timer !== null) clearTimeout(run.timer);
    if (run.raf !== null) cancelAnimationFrame(run.raf);
    run.stream.getTracks().forEach(track => track.stop());
    run.mix?.stop();
    if (active.current === run) {
      active.current = null;
      if (mounted.current) { setRecording(false); onRecordingChange(false); }
    }
  }
  function cancel() {
    ++epoch.current;
    const run = active.current;
    if (run) {
      run.discard = true;
      try { if (run.recorder.state !== 'inactive') run.recorder.stop(); } catch { /* Already ended */ }
      release(run);
    }
    if (mounted.current) {
      setPreparing(false); setRecording(false); onRecordingChange(false);
      setNotice('Character recording cancelled. No partial video was saved.');
    }
  }

  useEffect(() => {
    mounted.current = true;
    const hidden = () => {
      if (document.hidden && (active.current || epoch.current > 0)) {
        const run = active.current;
        if (run) {
          run.discard = true;
          try { if (run.recorder.state !== 'inactive') run.recorder.stop(); } catch { /* Already ended */ }
          release(run);
          setNotice('The tab was hidden, so the partial character recording was discarded.');
        }
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && active.current) {
        const run = active.current; run.discard = true;
        try { if (run.recorder.state !== 'inactive') run.recorder.stop(); } catch { /* Already ended */ }
        release(run);
        setNotice('Character recording cancelled. No partial video was saved.');
      }
    };
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('keydown', escape);
    return () => {
      mounted.current = false; ++epoch.current;
      const run = active.current;
      if (run) {
        run.discard = true;
        try { if (run.recorder.state !== 'inactive') run.recorder.stop(); } catch { /* Already ended */ }
        if (run.timer !== null) clearTimeout(run.timer);
        if (run.raf !== null) cancelAnimationFrame(run.raf);
        run.stream.getTracks().forEach(track => track.stop());
        run.mix?.stop(); active.current = null;
      }
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('keydown', escape);
    };
  }, []);
  useEffect(() => () => { if (clip) URL.revokeObjectURL(clip.url); }, [clip]);
  // Edits or audio replacement invalidate the old clip instead of offering a stale export.
  useEffect(() => { setClip(null); }, [rig, frames, title, audio.narration, audio.music, audio.musicVolume]);

  async function record() {
    if (disabled || busy || active.current || !mime || !canvas.current || !validKeyframes(frames)) return;
    const request = ++epoch.current;
    let stream: MediaStream | null = null, mix: StudioAudioMix | null = null;
    setPreparing(true); setProgress(0); setClip(null);
    setNotice('Preparing the local character-video encoder…');
    onRecordingChange(true);
    try {
      const surface = canvas.current, ctx = surface.getContext('2d');
      if (!ctx || typeof surface.captureStream !== 'function' || typeof MediaRecorder === 'undefined')
        throw new Error('Canvas video capture is unavailable on this device.');
      drawRigCanvas(ctx, surface.width, surface.height, rig, title, frames, 0);
      const video = surface.captureStream(24);
      mix = await prepareStudioAudioMix(audio.narration, audio.music, audio.musicVolume, RIG_SECONDS);
      if (!mounted.current || request !== epoch.current || document.hidden) {
        video.getTracks().forEach(track => track.stop()); mix?.stop(); return;
      }
      stream = mix ? new MediaStream([...video.getVideoTracks(), mix.track]) : video;
      const recorder = new MediaRecorder(stream, {
        mimeType: mime, videoBitsPerSecond: 1_400_000, ...(mix ? { audioBitsPerSecond: 96_000 } : {}),
      });
      const run: Capture = {
        recorder, stream, mix, startedAt: performance.now(),
        timer: null, raf: null, discard: false, bytes: 0, chunks: [],
      };
      recorder.ondataavailable = event => {
        if (run.discard || !event.data.size) return;
        run.bytes += event.data.size;
        if (run.bytes > MAX_CAPTURE_BYTES) {
          cancel(); setNotice('Character video exceeded the local 20 MiB limit and was discarded.');
        } else run.chunks.push(event.data);
      };
      recorder.onerror = () => {
        if (active.current === run) {
          cancel(); setNotice('The character-video encoder failed. No completed file was created.');
        }
      };
      recorder.onstop = () => {
        const elapsed = performance.now() - run.startedAt;
        release(run);
        if (!mounted.current || run.discard) return;
        if (!run.bytes || elapsed < RIG_SECONDS * 1000 - 300) {
          setNotice('The character recording ended early. No completed video was created.');
          return;
        }
        const blob = new Blob(run.chunks, { type: recorder.mimeType });
        const url = URL.createObjectURL(blob);
        setClip({ url, mime: recorder.mimeType,
          extension: recorder.mimeType.startsWith('video/mp4') ? 'mp4' : 'webm', bytes: blob.size });
        setNotice(mix ?
          'A character video with the selected soundtrack is ready. Play it to verify sound and timing before downloading.' :
          'Your moving character video is ready. Play it before downloading.');
      };
      active.current = run;
      recorder.start(250);
      mix?.start();
      setRecording(true); setPreparing(false);
      setNotice('Recording the actual animated character locally. Keep this tab visible.');
      const tick = (now: number) => {
        if (active.current !== run) return;
        const seconds = Math.min(RIG_SECONDS, (now - run.startedAt) / 1000);
        drawRigCanvas(ctx, surface.width, surface.height, rig, title, frames, seconds);
        setProgress(seconds);
        if (seconds < RIG_SECONDS) run.raf = requestAnimationFrame(tick);
      };
      run.raf = requestAnimationFrame(tick);
      run.timer = setTimeout(() => {
        if (active.current === run && recorder.state !== 'inactive') {
          try { recorder.stop(); } catch {
            cancel(); setNotice('The recorder could not finish the character clip.');
          }
        }
      }, RIG_SECONDS * 1000 + 110);
    } catch (error) {
      stream?.getTracks().forEach(track => track.stop());
      mix?.stop();
      if (mounted.current && request === epoch.current) {
        setNotice(error instanceof Error ? error.message : 'Recording could not be started.');
        setRecording(false); onRecordingChange(false);
      }
    } finally {
      if (mounted.current && request === epoch.current) setPreparing(false);
    }
  }
  return <section aria-label="Luqi character video export" className="luqi-motion-export">
    <h3>Record your animated character</h3>
    <p>Export a real {RIG_SECONDS}-second video of these keyframes. If you recorded a voiceover or selected authorised music in the Luqi Audio panel, the sound is mixed into the same video file on supported browsers.</p>
    <canvas ref={canvas} width={640} height={360} aria-hidden="true" className="luqi-motion-capture-canvas"/>
    <div className="luqi-motion-buttons">
      <button type="button" onClick={() => { void record(); }}
        disabled={disabled || busy || !mime} aria-describedby="luqi-motion-recording-support">
        {preparing ? 'Preparing character video…' : 'Record 4-second character video' + (hasAudio ? ' with sound' : '')}
      </button>
      {busy && <button type="button" onClick={cancel}>Cancel character recording</button>}
    </div>
    <p id="luqi-motion-recording-support">{mime ?
      'A supported browser video encoder was detected. The exported audio track must be checked by listening to the completed video.' :
      hasAudio ? 'This browser cannot combine character video and selected audio. No silent fallback will be substituted.' :
      'Video recording is unavailable here. SVG frame and keyframe JSON downloads remain available.'}</p>
    {busy && <p role="timer" aria-live="off">Character recording: {progress.toFixed(1)} / {RIG_SECONDS} seconds</p>}
    <p role="status" aria-label="Character video status" aria-live="polite">{notice}</p>
    {clip && <div className="luqi-motion-export-result">
      <video controls playsInline preload="metadata" src={clip.url} aria-label="Completed character video preview"/>
      <a href={clip.url} download={'luqi-motion-character-' + RIG_SECONDS + 's.' + clip.extension}>
        Download {RIG_SECONDS}-second character video (.{clip.extension})
      </a>
      <p>Recorded locally · {(clip.bytes / 1024).toFixed(0)} KiB · {clip.mime}. Listen and inspect the export before sharing.</p>
    </div>}
  </section>;
}
