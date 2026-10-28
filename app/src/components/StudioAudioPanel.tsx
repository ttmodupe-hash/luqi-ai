import { useEffect, useRef, useState } from 'react';
import { browserVoiceRecordingType, validateStudioAudioFile,
  STUDIO_AUDIO_FILE_MAX_BYTES } from '../lib/studio-audio';

export interface StudioAudioAssets {
  narration: Blob | null;
  music: File | null;
  musicVolume: number;
}
interface MicRun {
  media: MediaRecorder;
  stream: MediaStream;
  chunks: Blob[];
  bytes: number;
  discard: boolean;
  timer: ReturnType<typeof setTimeout>;
}
export default function StudioAudioPanel({ audio, onChange, disabled, clipSeconds, onRecordingChange }: {
  audio: StudioAudioAssets;
  onChange: (next: StudioAudioAssets) => void;
  disabled: boolean;
  clipSeconds: number;
  onRecordingChange: (recording: boolean) => void;
}) {
  const [rights, setRights] = useState(false);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [askingPermission, setAskingPermission] = useState(false);
  const [notice, setNotice] = useState('Audio files and microphone recordings stay on this device. Nothing is uploaded.');
  const [narrationUrl, setNarrationUrl] = useState('');
  const [musicUrl, setMusicUrl] = useState('');
  const mic = useRef<MicRun | null>(null), active = useRef(true), epoch = useRef(0);
  const assets = useRef(audio); assets.current = audio;

  function stopMic(discard = false) {
    const run = mic.current;
    if (!run) return;
    if (discard) run.discard = true;
    clearTimeout(run.timer);
    try { if (run.media.state !== 'inactive') run.media.stop(); }
    catch { run.discard = true; }
    if (discard) run.stream.getTracks().forEach(t => t.stop());
  }
  useEffect(() => {
    active.current = true;
    const stopOnHide = () => {
      if (document.hidden && mic.current) { stopMic(true); setNotice('Microphone recording discarded because this tab was hidden.'); }
    };
    document.addEventListener('visibilitychange', stopOnHide);
    return () => {
      active.current = false; epoch.current++;
      document.removeEventListener('visibilitychange', stopOnHide);
      stopMic(true);
    };
  }, []);
  useEffect(() => {
    if (!audio.narration) { setNarrationUrl(''); return; }
    const url = URL.createObjectURL(audio.narration); setNarrationUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audio.narration]);
  useEffect(() => {
    if (!audio.music) { setMusicUrl(''); return; }
    const url = URL.createObjectURL(audio.music); setMusicUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audio.music]);

  async function recordVoice() {
    if (disabled || voiceRecording || askingPermission || mic.current) return;
    const selected = browserVoiceRecordingType();
    if (!navigator.mediaDevices?.getUserMedia || !selected) {
      setNotice('Microphone recording is not available in this browser. You may use a supported audio file instead.');
      return;
    }
    const request = ++epoch.current;
    setAskingPermission(true);
    let stream: MediaStream | null = null;
    try {
      // Only user clicking this button requests access; no recording on page entry.
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      if (!active.current || request !== epoch.current) { stream.getTracks().forEach(t => t.stop()); return; }
      const media = new MediaRecorder(stream, { mimeType: selected, audioBitsPerSecond: 96_000 });
      const run: MicRun = { media, stream, chunks: [], bytes: 0, discard: false,
        timer: setTimeout(() => { if (media.state === 'recording') media.stop(); }, clipSeconds * 1000) };
      mic.current = run;
      media.ondataavailable = event => {
        if (event.data.size && !run.discard) {
          run.bytes += event.data.size;
          if (run.bytes > STUDIO_AUDIO_FILE_MAX_BYTES) {
            stopMic(true);
            if (active.current) setNotice('The recording exceeded 16 MiB and was discarded.');
          } else run.chunks.push(event.data);
        }
      };
      media.onerror = () => {
        stopMic(true);
        if (active.current) setNotice('Microphone recording failed and was discarded.');
      };
      media.onstop = () => {
        clearTimeout(run.timer);
        run.stream.getTracks().forEach(t => t.stop());
        if (mic.current === run) mic.current = null;
        if (!active.current) return;
        setVoiceRecording(false); onRecordingChange(false);
        if (run.discard || !run.bytes) {
          setNotice(run.discard ? 'Recording discarded; no audio was saved.' : 'No microphone audio was captured.');
          return;
        }
        onChange({ ...assets.current, narration: new Blob(run.chunks, { type: media.mimeType }) });
        setNotice('Voiceover recorded locally. Listen to it before exporting your video.');
      };
      media.start(1000); setVoiceRecording(true); onRecordingChange(true);
      setNotice('Recording microphone audio locally. Stop to keep it, or discard. The microphone closes automatically.');
    } catch {
      const run = mic.current;
      if (run) {
        run.discard = true; clearTimeout(run.timer);
        try { if (run.media.state !== 'inactive') run.media.stop(); } catch { /* Already stopped. */ }
        mic.current = null;
      }
      stream?.getTracks().forEach(t => t.stop());
      if (active.current) {
        setVoiceRecording(false); onRecordingChange(false);
        setNotice('Microphone access or recording was blocked. Check browser permission and use HTTPS, or import a recording.');
      }
    } finally { if (active.current && request === epoch.current) setAskingPermission(false); }
  }
  function importMusic(file: File) {
    if (disabled || voiceRecording || !rights) {
      setNotice('Confirm that you own the music or have permission to use it before choosing a file.');
      return;
    }
    try {
      validateStudioAudioFile(file);
      onChange({ ...audio, music: file });
      setRights(false);
      setNotice('Music loaded on this device. Preview it and choose the background volume before exporting.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unsupported audio file.');
    }
  }
  return <section className="luqi-studio-audio" aria-labelledby="studio-audio-heading">
    <h2 id="studio-audio-heading">Voiceovers and your licensed music</h2>
    <p>Record your own narration or add music you are authorised to use. Both can be mixed into the exported animation where your browser supports audio and video recording. No AI call or upload occurs.</p>
    <div className="luqi-studio-audio-grid">
      <div>
        <h3>1. Record your voice</h3>
        <p>Microphone permission is requested only when you choose Record. Record for up to {clipSeconds} seconds.</p>
        <div className="luqi-studio-audio-actions">
          {!voiceRecording ? <button type="button" disabled={disabled || askingPermission}
            onClick={() => { void recordVoice(); }}>{askingPermission ? 'Waiting for microphone permission…' : 'Record my voiceover'}</button> :
            <button type="button" onClick={() => stopMic(false)}>Stop and keep voiceover</button>}
          {voiceRecording && <button type="button" onClick={() => stopMic(true)}>Discard recording</button>}
          {audio.narration && <button type="button" disabled={disabled || voiceRecording || askingPermission}
            onClick={() => { onChange({ ...audio, narration: null }); setNotice('Recorded voiceover removed from this draft.'); }}>
            Remove voiceover</button>}
        </div>
        {narrationUrl && <div className="luqi-studio-audio-preview">
          <p>Review your voiceover before export.</p>
          <audio controls src={narrationUrl} preload="metadata" aria-label="Recorded voiceover preview" />
          <a href={narrationUrl} download={'luqi-my-voiceover.' + (audio.narration?.type.startsWith('audio/mp4') ? 'm4a' : audio.narration?.type.startsWith('audio/ogg') ? 'ogg' : 'webm')}>Download recorded voiceover</a>
        </div>}
      </div>
      <div>
        <h3>2. Add music you have rights to use</h3>
        <p>Upload MP3, WAV, M4A, AAC, OGG or WebM audio, up to 16 MiB. Luqi provides no commercial catalogue or music licence.</p>
        <label className="luqi-studio-rights"><input type="checkbox" checked={rights} disabled={disabled || voiceRecording}
          onChange={event => setRights(event.target.checked)} />
          I own this music or have permission to use it in the finished video.</label>
        <label>Choose music from this device
          <input type="file" aria-label="Choose licensed music" accept=".mp3,.wav,.m4a,.mp4,.aac,.ogg,.webm,audio/*"
            disabled={disabled || voiceRecording || !rights} onChange={event => {
              const file = event.currentTarget.files?.[0]; event.currentTarget.value = '';
              if (file) importMusic(file);
            }} />
        </label>
        {musicUrl && <div className="luqi-studio-audio-preview">
          <p>Selected music: {audio.music?.name}</p>
          <audio controls src={musicUrl} preload="metadata" aria-label="Music preview" />
          <label>Background music volume: {Math.round(audio.musicVolume * 100)}%
            <input type="range" aria-label="Background music volume" min="0" max="100" step="5"
              disabled={disabled || voiceRecording} value={Math.round(audio.musicVolume * 100)}
              onChange={event => onChange({ ...audio, musicVolume: Number(event.target.value) / 100 })} /></label>
          <button type="button" disabled={disabled || voiceRecording} onClick={() => {
            onChange({ ...audio, music: null }); setNotice('Music removed from this draft.');
          }}>Remove music</button>
        </div>}
      </div>
    </div>
    <p role="status" aria-label="Studio audio status" aria-live="polite">{notice}</p>
    <p className="luqi-studio-audio-footnote">Soundtracks and voiceovers are temporary, not saved with the storyboard JSON. Download any audio you want to keep. Media export availability and audio encoding depend on your browser.</p>
  </section>;
}
