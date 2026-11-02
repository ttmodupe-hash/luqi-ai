// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import ContentStudioPage from '../src/pages/ContentStudioPage';
import StudioDraftImport from '../src/components/StudioDraftImport';
import { SHOWCASE_SCENES, storyboardJson } from '../src/lib/content-studio';
import { parseStudioDraft, serializeStudioDraft } from '../src/lib/studio-draft';
vi.mock('../src/lib/recording-support', () => ({ browserRecordingType: () => null }));
const request = vi.fn(() => { throw new Error('Unexpected HTTP request'); });
const restoredScenes = SHOWCASE_SCENES.map((scene, i) => ({ ...scene, title: `Saved scene ${i + 1}` }));
const draft = () => serializeStudioDraft(restoredScenes, 'portrait', 1.7, 3.71, -45);
const choose = (source = draft()) => fireEvent.change(screen.getByLabelText('Open storyboard'), {
  target: { files: [new File([source], 'ordinary-local-storyboard.json', { type: 'application/json' })] },
});
const field = (name: string) => screen.getByLabelText(name) as HTMLInputElement;
function setup() { render(<MemoryRouter><ContentStudioPage /></MemoryRouter>); }
beforeEach(() => {
  request.mockClear(); vi.stubGlobal('fetch', request);
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn());
  localStorage.clear(); sessionStorage.clear();
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });

it('roundtrips the actual unchanged legacy exporter with an explicit camera default', () => {
  const legacy = storyboardJson(SHOWCASE_SCENES, 'square', 1.75, 9.8);
  expect(parseStudioDraft(legacy)).toEqual({ scenes: SHOWCASE_SCENES, aspect: 'square',
    length: 1.75, gravity: 9.8, yaw: 28, legacyCamera: true });
});
it('stages a local file without replacing the active draft until explicit confirmation', async () => {
  setup(); fireEvent.change(field('Scene title'), { target: { value: 'Keep this current work' } });
  choose(); await screen.findByRole('region', { name: 'Review storyboard replacement' });
  expect(field('Scene title').value).toBe('Keep this current work');
  expect(field('Video format').value).toBe('landscape');
  expect(field('Camera angle').value).toBe('28');
  expect((screen.getByRole('button', { name: 'Play preview' }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole('button', { name: 'Download storyboard', exact: true }) as HTMLButtonElement).disabled).toBe(false);
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Keep current storyboard' }));
  fireEvent.click(screen.getByRole('button', { name: 'Replace current storyboard' }));
  await screen.findByText(/Storyboard restored locally/);
  expect(field('Scene title').value).toBe('Saved scene 1'); expect(field('Video format').value).toBe('portrait');
  expect(field('Pendulum length').value).toBe('1.7'); expect(field('Gravity').value).toBe('3.71');
  expect(field('Camera angle').value).toBe('-45'); expect(field('Animation time').value).toBe('0');
  expect(document.activeElement).toBe(field('Open storyboard'));
  expect(request).not.toHaveBeenCalled(); expect(localStorage.length).toBe(0); expect(sessionStorage.length).toBe(0);
});
it('cancel keeps all current settings and lets the same file be selected again', async () => {
  setup(); fireEvent.change(field('Scene title'), { target: { value: 'Unsaved current title' } });
  fireEvent.change(field('Camera angle'), { target: { value: '61' } });
  choose(); await screen.findByRole('button', { name: 'Keep current storyboard' });
  fireEvent.click(screen.getByRole('button', { name: 'Keep current storyboard' }));
  expect(field('Scene title').value).toBe('Unsaved current title'); expect(field('Camera angle').value).toBe('61');
  expect(document.activeElement).toBe(field('Open storyboard')); expect(field('Open storyboard').value).toBe('');
  choose(); await screen.findByRole('button', { name: 'Replace current storyboard' });
  expect(field('Scene title').value).toBe('Unsaved current title'); expect(request).not.toHaveBeenCalled();
});
it('restores legacy drafts and represents bounded custom gravity without silently substituting it', async () => {
  setup(); choose(storyboardJson(restoredScenes, 'square', 1.75, 9.8));
  await screen.findByText(/older file did not save a camera angle/);
  fireEvent.click(screen.getByRole('button', { name: 'Replace current storyboard' }));
  expect(field('Camera angle').value).toBe('28'); expect(field('Gravity').value).toBe('9.8');
  expect(screen.getByRole('option', { name: 'Imported · 9.8 m/s²' })).toBeTruthy();
  expect(field('Scene caption').value).toBe(restoredScenes[0].caption);
});
it.each(['{"private":"fixture"}', 'not json', 'x'.repeat(32 * 1024 + 1)])(
  'rejects unsupported or oversized files without replacing current text %#', async source => {
    setup(); fireEvent.change(field('Scene title'), { target: { value: 'Retained title' } }); choose(source);
    await screen.findByText(/Could not open this storyboard/);
    expect(field('Scene title').value).toBe('Retained title'); expect(field('Open storyboard').disabled).toBe(false);
    expect(screen.queryByRole('button', { name: 'Replace current storyboard' })).toBeNull();
    expect(request).not.toHaveBeenCalled();
  });
it('treats markup in a title as text, not an element or a network request', async () => {
  setup(); const scenes = restoredScenes.map((s, i) => i ? s : { ...s, title: '<img src="https://untrusted.invalid/fixture">' });
  choose(serializeStudioDraft(scenes, 'square', 2.5, 9.81, 0));
  await screen.findByRole('button', { name: 'Replace current storyboard' });
  expect(document.querySelector('img[src="https://untrusted.invalid/fixture"]')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Replace current storyboard' }));
  expect(field('Scene title').value).toBe(scenes[0].title); expect(request).not.toHaveBeenCalled();
});
it('exports v2 with the actual current camera instead of losing it', async () => {
  setup(); let saved: Blob | undefined;
  const create = vi.fn((blob: Blob) => { saved = blob; return 'blob:synthetic-storyboard'; });
  vi.stubGlobal('URL', class extends URL { static createObjectURL = create; static revokeObjectURL = vi.fn(); });
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  fireEvent.change(field('Camera angle'), { target: { value: '62' } });
  fireEvent.click(screen.getByRole('button', { name: 'Download storyboard', exact: true }));
  expect(click).toHaveBeenCalledTimes(1); expect(saved).toBeTruthy();
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsText(saved!);
  });
  expect(JSON.parse(source).format).toBe('luqi.storyboard.v2'); expect(parseStudioDraft(source).yaw).toBe(62);
  expect(request).not.toHaveBeenCalled();
});
it('disables opening during a recording', () => {
  const restore = vi.fn(), busy = vi.fn();
  render(<StudioDraftImport disabled onRestore={restore} onBusyChange={busy} />);
  expect(field('Open storyboard').disabled).toBe(true); choose(); expect(restore).not.toHaveBeenCalled(); expect(busy).not.toHaveBeenCalled();
});
function stalledReader() {
  const readers: any[] = [];
  class Reader {
    readyState = 0; result: ArrayBuffer | null = null; onload: (() => void) | null = null;
    onerror: (() => void) | null = null; onabort: (() => void) | null = null;
    abort = vi.fn(() => { this.readyState = 2; this.onabort?.(); });
    constructor() { readers.push(this); }
    readAsArrayBuffer() { this.readyState = 1; }
  }
  vi.stubGlobal('FileReader', Reader); return readers;
}
it('cancels a pending read without changing the draft or accepting late data', async () => {
  const readers = stalledReader(); setup(); choose();
  expect(screen.getByRole('button', { name: 'Cancel opening' })).toBeTruthy();
  const late = readers[0].onload;
  fireEvent.click(screen.getByRole('button', { name: 'Cancel opening' }));
  await act(async () => { readers[0].result = new TextEncoder().encode(draft()).buffer; late(); });
  expect(readers[0].abort).toHaveBeenCalledTimes(1);
  expect(field('Scene title').value).toBe(SHOWCASE_SCENES[0].title);
  expect(screen.queryByRole('button', { name: 'Replace current storyboard' })).toBeNull();
});
it('releases a stalled read at the deadline and permits an explicit new attempt', async () => {
  vi.useFakeTimers(); const readers = stalledReader(); setup(); choose();
  await act(async () => { await vi.advanceTimersByTimeAsync(8_001); });
  expect(screen.getByText(/Could not open this storyboard/)).toBeTruthy();
  expect(field('Open storyboard').disabled).toBe(false); expect(readers[0].abort).toHaveBeenCalledTimes(1);
  expect(readers).toHaveLength(1); expect(request).not.toHaveBeenCalled();
});
it('unmount aborts the selected file read and ignores its late completion', async () => {
  const readers = stalledReader(), restore = vi.fn();
  render(<StudioDraftImport disabled={false} onRestore={restore} onBusyChange={vi.fn()} />); choose();
  const late = readers[0].onload; cleanup();
  await act(async () => { readers[0].result = new TextEncoder().encode(draft()).buffer; late(); });
  expect(readers[0].abort).toHaveBeenCalledTimes(1); expect(restore).not.toHaveBeenCalled();
});
