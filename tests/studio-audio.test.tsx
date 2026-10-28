// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { browserMixedRecordingType, browserVoiceRecordingType,
  prepareStudioAudioMix, selectRecordingType, STUDIO_AUDIO_FILE_MAX_BYTES,
  STUDIO_VIDEO_AUDIO_TYPES, validateStudioAudioFile } from '../src/lib/studio-audio';
import StudioAudioPanel, { type StudioAudioAssets } from '../src/components/StudioAudioPanel';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Studio local audio validation and cost boundaries', () => {
  it('rejects oversized, empty and non-audio files before any browser mixing', () => {
    expect(() => validateStudioAudioFile({ name: 'music.mp3', type: 'audio/mpeg', size: 120 })).not.toThrow();
    for (const invalid of [
      { name: 'track.mp3', type: 'audio/mpeg', size: 0 },
      { name: 'track.mp3', type: 'audio/mpeg', size: STUDIO_AUDIO_FILE_MAX_BYTES + 1 },
      { name: 'payload.exe', type: 'application/octet-stream', size: 100 },
      { name: 'payload.mp3', type: 'application/octet-stream', size: 100 },
      { name: 'track.mp3.exe', type: 'audio/mpeg', size: 100 },
    ]) expect(() => validateStudioAudioFile(invalid)).toThrow();
  });
  it('uses real MediaRecorder supported codecs and never fabricates an encoder', () => {
    expect(selectRecordingType(STUDIO_VIDEO_AUDIO_TYPES)).toBeNull();
    expect(selectRecordingType(['a', 'b'], type => type === 'b')).toBe('b');
    expect(selectRecordingType(['a', 'b'], () => { throw new Error('unsupported'); })).toBeNull();
    vi.stubGlobal('MediaRecorder', { isTypeSupported: (type: string) => type === 'video/webm;codecs=vp8,opus' || type === 'audio/webm;codecs=opus' });
    expect(browserMixedRecordingType()).toBe('video/webm;codecs=vp8,opus');
    expect(browserVoiceRecordingType()).toBe('audio/webm;codecs=opus');
  });
  it('does not create an audio context or call any provider for a silent export', async () => {
    const net = vi.fn(); vi.stubGlobal('fetch', net);
    const audioCtx = vi.fn(); vi.stubGlobal('AudioContext', audioCtx);
    expect(await prepareStudioAudioMix(null, null, .25, 30)).toBeNull();
    expect(audioCtx).not.toHaveBeenCalled();
    expect(net).not.toHaveBeenCalled();
  });
  it('builds one audio track from voice and music and schedules only the approved clip length', async () => {
    const starts: Array<[number, number | undefined]> = [];
    const stops: number[] = [];
    const gains: number[] = [];
    const track = { kind: 'audio', stop: vi.fn() } as unknown as MediaStreamTrack;
    const sources: Array<{ start: (when: number, offset?: number) => void }> = [];
    let closed = false;
    class AudioContextFixture {
      state = 'running'; currentTime = 10;
      resume = vi.fn(async () => undefined);
      close = vi.fn(async () => { closed = true; });
      createMediaStreamDestination() {
        return { stream: { getAudioTracks: () => [track], getTracks: () => [track] } };
      }
      async decodeAudioData(_: ArrayBuffer) { return { duration: 15 }; }
      createBufferSource() {
        const node = { buffer: null as unknown, loop: false,
          connect: vi.fn(), disconnect: vi.fn(),
          start: vi.fn((at: number, offset?: number) => starts.push([at, offset])),
          stop: vi.fn((at: number) => stops.push(at)) };
        sources.push(node); return node;
      }
      createGain() {
        const gain = { gain: { value: 0 }, connect: vi.fn() };
        gains.push(gain.gain.value); return gain;
      }
    }
    const net = vi.fn(); vi.stubGlobal('fetch', net);
    vi.stubGlobal('AudioContext', AudioContextFixture);
    const localAudio = { size: 100, arrayBuffer: async () => new ArrayBuffer(8) } as Blob;
    const localMusic = { size: 120, name: 'licensed.mp3', type: 'audio/mpeg',
      arrayBuffer: async () => new ArrayBuffer(8) } as File;
    const mix = await prepareStudioAudioMix(localAudio, localMusic, .25, 30);
    expect(mix?.track).toBe(track);
    mix?.start();
    expect(starts).toHaveLength(2);
    expect(starts.every(([time]) => time === 10.05)).toBe(true);
    expect(stops).toEqual([40.05, 40.05]);
    mix?.start();
    expect(starts).toHaveLength(2);
    mix?.stop(); mix?.stop();
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(closed).toBe(true);
    expect(net).not.toHaveBeenCalled();
  });
  it('rejects unsupported device audio without switching to a silent video', async () => {
    vi.stubGlobal('AudioContext', undefined);
    await expect(prepareStudioAudioMix({size:100} as Blob, null, .3, 30)).rejects.toThrow(/cannot mix audio/);
    await expect(prepareStudioAudioMix(null, null, 0, 0)).resolves.toBeNull();
  });
});

describe('Studio audio permissions and rights UI', () => {
  const fakeUrl = () => { const create = vi.fn(() => 'blob:studio-audio-fixture'); const revoke = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke });
    return { create, revoke };
  };
  function Harness() {
    const [audio, setAudio] = useState<StudioAudioAssets>({ narration: null, music: null, musicVolume: .25 });
    return <StudioAudioPanel audio={audio} onChange={setAudio} disabled={false}
      clipSeconds={30} onRecordingChange={() => undefined} />;
  }
  it('does not access the microphone or network unless the user explicitly clicks', () => {
    const getUserMedia = vi.fn();const net = vi.fn();
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    vi.stubGlobal('fetch', net);
    render(<Harness />);
    expect(screen.getByText('Voiceovers and your licensed music')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Record my voiceover' })).toBeTruthy();
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(net).not.toHaveBeenCalled();
  });
  it('requires rights confirmation and allows bounded local import with volume', () => {
    const { create } = fakeUrl(); const net = vi.fn(); vi.stubGlobal('fetch', net);
    render(<Harness />);
    const music = screen.getByLabelText('Choose licensed music') as HTMLInputElement;
    expect(music.disabled).toBe(true);
    fireEvent.click(screen.getByRole('checkbox', { name: /I own this music or have permission/ }));
    const file = new File(['synthetic fixture'], 'original.mp3', { type: 'audio/mpeg' });
    fireEvent.change(music, { target: { files: [file] } });
    expect(screen.getByText('Selected music: original.mp3')).toBeTruthy();
    expect(screen.getByLabelText('Music preview')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Background music volume'), { target: { value: '40' } });
    expect(screen.getByText('Background music volume: 40%')).toBeTruthy();
    expect(create).toHaveBeenCalled();
    expect(net).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Remove music' }));
    expect(screen.queryByText('Selected music: original.mp3')).toBeNull();
  });
});
