import { useEffect, useRef, useState } from 'react';
import { readStudioDraft, type StudioDraft } from '../lib/studio-draft';

export default function StudioDraftImport({ disabled, onBusyChange, onRestore }: {
  disabled: boolean; onBusyChange: (busy: boolean) => void; onRestore: (draft: StudioDraft) => void;
}) {
  const [reading, setReading] = useState(false);
  const [pending, setPending] = useState<StudioDraft | null>(null);
  const [notice, setNotice] = useState('');
  const active = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null), keep = useRef<HTMLButtonElement>(null);
  useEffect(() => () => { const current = active.current; active.current = null; current?.abort(); }, []);
  const returnFocus = useRef(false);
  useEffect(() => {
    if (pending) keep.current?.focus();
    else if (!reading && returnFocus.current) { returnFocus.current = false; input.current?.focus(); }
  }, [pending, reading]);

  function cancel() {
    const current = active.current; active.current = null; current?.abort();
    returnFocus.current = true; setReading(false); setPending(null); onBusyChange(false);
    setNotice('Opening cancelled. Your current storyboard and completed clip are unchanged.');
  }
  async function open(file: File) {
    if (disabled || pending) return;
    active.current?.abort();
    const controller = new AbortController(); active.current = controller;
    setReading(true); setNotice(''); onBusyChange(true);
    let staged = false;
    try {
      const draft = await readStudioDraft(file, controller.signal);
      if (active.current !== controller) return;
      setPending(draft); staged = true;
    } catch {
      if (active.current !== controller) return;
      setNotice('Could not open this storyboard. Choose a supported LUQI JSON file up to 32 KiB. Your current draft and completed clip are unchanged.');
    } finally {
      if (active.current === controller) {
        active.current = null; setReading(false);
        if (!staged) onBusyChange(false);
      }
    }
  }
  return <section aria-labelledby="studio-open-heading" className="luqi-studio-export">
    <div><h2 id="studio-open-heading">Continue a saved storyboard</h2>
      <p id="studio-open-help">Open a LUQI storyboard JSON file from this device (up to 32 KiB). It is read locally, not uploaded. Nothing is replaced until you confirm. Video files are not imported.</p></div>
    <label>Open storyboard<input ref={input} type="file" accept=".json,application/json"
      aria-label="Open storyboard" aria-describedby="studio-open-help" disabled={disabled || reading || !!pending}
      onChange={event => {
        const file = event.currentTarget.files?.[0]; event.currentTarget.value = '';
        if (file) void open(file);
      }} /></label>
    {reading && <div><p role="status" aria-label="Storyboard import status">Reading local storyboard…</p>
      <button type="button" onClick={cancel}>Cancel opening</button></div>}
    {pending && <section aria-label="Review storyboard replacement">
      <h3>Replace the current storyboard?</h3>
      <p>Six scenes · 90 seconds · {pending.aspect}. First scene: {pending.scenes[0].title}</p>
      <p>This replaces the current text and simulation settings, resets the preview to the start and removes the previous completed clip from this page. Download anything you need to keep before replacing it.</p>
      {pending.legacyCamera && <p>This older file did not save a camera angle. The camera will use the original 28° default.</p>}
      <div className="luqi-studio-actions">
        <button ref={keep} type="button" onClick={cancel}>Keep current storyboard</button>
        <button type="button" disabled={disabled} onClick={() => {
          if (disabled) return;
          returnFocus.current = true; onRestore(pending); setPending(null); onBusyChange(false);
          setNotice('Storyboard restored locally. Review it before recording or sharing. No video was imported.');
        }}>Replace current storyboard</button>
      </div>
    </section>}
    {notice && <p role="status" aria-label="Storyboard import status">{notice}</p>}
  </section>;
}
