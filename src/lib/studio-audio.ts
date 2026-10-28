/** Browser-only Studio audio. Audio never goes to Luqi servers or AI providers.
 * This does not grant permission to use copyrighted music or another person's voice.
 */
export const STUDIO_AUDIO_FILE_MAX_BYTES = 16 * 1024 * 1024;
const AUDIO_EXTENSIONS = /\.(?:mp3|wav|m4a|mp4|aac|ogg|webm)$/i;
const AUDIO_MIME = /^audio\/(?:mpeg|mp3|wav|x-wav|wave|aac|mp4|x-m4a|ogg|webm)(?:;|$)/i;

export function validateStudioAudioFile(file: Pick<File, 'size' | 'type' | 'name'>): void {
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > STUDIO_AUDIO_FILE_MAX_BYTES)
    throw new Error('Choose a non-empty audio file no larger than 16 MiB.');
  if (!AUDIO_EXTENSIONS.test(file.name) ||
      (file.type !== '' && !AUDIO_MIME.test(file.type)))
    throw new Error('Choose a supported MP3, WAV, M4A, AAC, OGG or WebM audio file.');
}

export const STUDIO_VOICE_TYPES = [
  'audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus',
] as const;
export const STUDIO_VIDEO_AUDIO_TYPES = [
  'video/mp4;codecs=avc1.42001E,mp4a.40.2',
  'video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus',
  'video/mp4', 'video/webm',
] as const;

export function selectRecordingType(
  candidates: readonly string[], isSupported?: (value: string) => boolean,
): string | null {
  if (!isSupported) return null;
  return candidates.find(type => {
    try { return isSupported(type) === true; } catch { return false; }
  }) ?? null;
}
export function browserVoiceRecordingType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  return selectRecordingType(STUDIO_VOICE_TYPES, MediaRecorder.isTypeSupported?.bind(MediaRecorder));
}
export function browserMixedRecordingType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  return selectRecordingType(STUDIO_VIDEO_AUDIO_TYPES, MediaRecorder.isTypeSupported?.bind(MediaRecorder));
}

/** A browser audio graph captured as ONE mixed track by the video MediaRecorder.
 * Does not connect sources to speakers; audio reaches only the selected export.
 */
export interface StudioAudioMix {
  track: MediaStreamTrack;
  start(): void;
  stop(): void;
}
export async function prepareStudioAudioMix(
  narration: Blob | null, music: File | null, musicVolume: number, clipSeconds: number,
): Promise<StudioAudioMix | null> {
  if (!narration && !music) return null;
  if (!Number.isFinite(clipSeconds) || clipSeconds < 1 || clipSeconds > 90 ||
      !Number.isFinite(musicVolume) || musicVolume < 0 || musicVolume > 1)
    throw new Error('Invalid audio duration or volume.');
  if (narration && (narration.size <= 0 || narration.size > STUDIO_AUDIO_FILE_MAX_BYTES))
    throw new Error('Your narration is empty or exceeds the 16 MiB local limit.');
  if (music) validateStudioAudioFile(music);
  if (typeof AudioContext === 'undefined')
    throw new Error('This browser cannot mix audio into video. Use a browser with Web Audio support.');
  const ctx = new AudioContext();
  const sources: AudioBufferSourceNode[] = [];
  const destination = ctx.createMediaStreamDestination();
  let stopped = false, started = false;
  function stop() {
    if (stopped) return;
    stopped = true;
    sources.forEach(source => { try { source.stop(); } catch { /* Not started or ended. */ }
      try { source.disconnect(); } catch { /* Already cleaned. */ } });
    destination.stream.getTracks().forEach(track => track.stop());
    void ctx.close().catch(() => { /* Already closed. */ });
  }
  try {
    // Resume while handling the customer's Record click, before async decoding.
    await ctx.resume();
    if (ctx.state !== 'running') throw new Error('The browser suspended audio. Tap Record again after enabling sound.');
    for (const [audio, volume, looping] of [
      [narration, 1, false], [music, musicVolume, true],
    ] as const) {
      if (!audio || volume === 0) continue;
      const buffer = await ctx.decodeAudioData(await audio.arrayBuffer());
      if (!Number.isFinite(buffer.duration) || buffer.duration <= 0 || buffer.duration > 180)
        throw new Error('Audio must be playable and no longer than three minutes.');
      const source = ctx.createBufferSource(); source.buffer = buffer; source.loop = looping;
      const gain = ctx.createGain(); gain.gain.value = volume;
      source.connect(gain); gain.connect(destination); sources.push(source);
    }
    if (!sources.length) throw new Error('No audible tracks were selected for export.');
    const track = destination.stream.getAudioTracks()[0];
    if (!track) throw new Error('This browser could not create a mixed audio track.');
    return {
      track,
      start() {
        if (stopped || started) return;
        started = true;
        const when = ctx.currentTime + .05;
        sources.forEach(source => { source.start(when); source.stop(when + clipSeconds); });
      },
      stop,
    };
  } catch (error) {
    stop();
    if (error instanceof Error && /suspended|audio|browser|duration|volume/i.test(error.message)) throw error;
    throw new Error('The selected audio could not be decoded or mixed. Try a smaller MP3 or WAV file.');
  }
}
