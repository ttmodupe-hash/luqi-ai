import { useState } from 'react';
import type { StudioScene } from '../lib/content-studio';
import { EMPTY_STUDIO_BRIEF, STUDIO_BRIEF_PRESETS, creativeBriefScenes,
  creativeBriefText, studioPreflight, type StudioCreativeBrief } from '../lib/studio-preflight';

export default function StudioPreflightPanel({ disabled, onApply, onExport }: {
  disabled: boolean;
  onApply: (scenes: StudioScene[]) => void;
  onExport: (text: string) => void;
}) {
  const [templateId, setTemplateId] = useState('');
  const [brief, setBrief] = useState<StudioCreativeBrief>({ ...EMPTY_STUDIO_BRIEF });
  const [pending, setPending] = useState<StudioScene[] | null>(null);
  const [notice, setNotice] = useState('');
  const status = studioPreflight(brief);
  function setField(key: keyof StudioCreativeBrief, value: string) {
    setBrief(current => ({ ...current, [key]: value }));
    setPending(null); setNotice('');
  }
  function chooseTemplate(id: string) {
    setTemplateId(id); setPending(null); setNotice('');
    const preset = STUDIO_BRIEF_PRESETS.find(template => template.id === id);
    setBrief(preset ? { ...preset.brief } : { ...EMPTY_STUDIO_BRIEF });
  }
  function prepare() {
    if (disabled || !status.ready) return;
    try {
      setPending(creativeBriefScenes(brief));
      setNotice('Review these six scene drafts below. Nothing has replaced your existing work yet.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Review the creative brief before continuing.');
    }
  }
  function exportBrief() {
    if (disabled || !status.ready) return;
    try {
      onExport(creativeBriefText(brief));
      setNotice('Local production brief prepared for download. No video was generated or credits charged.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not prepare the brief.');
    }
  }
  return <section className="luqi-studio-export luqi-studio-preflight" aria-labelledby="studio-preflight-heading">
    <h2 id="studio-preflight-heading">Zero-credit creative preflight</h2>
    <p>Plan a local advert, educational story or documentary before recording. Five fields check <strong>brief completeness only</strong> — not cinematic quality, identity consistency or an available cloud render. No AI request or payment is made.</p>
    <label>Creative template
      <select aria-label="Creative template" value={templateId} disabled={disabled} onChange={event => chooseTemplate(event.target.value)}>
        <option value="">Start from my own idea</option>
        {STUDIO_BRIEF_PRESETS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
    </label>
    <fieldset disabled={disabled} className="luqi-studio-preflight-fields">
      <legend>Five cinematic details</legend>
      <label>Subject and action <input aria-label="Subject and action" maxLength={96} value={brief.subject} onChange={event => setField('subject', event.target.value)} placeholder="What should the audience see?" /></label>
      <label>Camera and framing <input aria-label="Camera and framing" maxLength={80} value={brief.camera} onChange={event => setField('camera', event.target.value)} placeholder="Close-up, wide, 35mm..." /></label>
      <label>Lighting <input aria-label="Lighting" maxLength={80} value={brief.lighting} onChange={event => setField('lighting', event.target.value)} placeholder="Natural window light..." /></label>
      <label>Motion <input aria-label="Motion" maxLength={80} value={brief.movement} onChange={event => setField('movement', event.target.value)} placeholder="Slow push-in, gentle pan..." /></label>
      <label>Setting <input aria-label="Setting" maxLength={80} value={brief.setting} onChange={event => setField('setting', event.target.value)} placeholder="Your shop, street or scene..." /></label>
    </fieldset>
    <details className="luqi-studio-preflight-options"><summary>Audience, call to action and continuity (optional)</summary>
      <fieldset disabled={disabled} className="luqi-studio-preflight-fields">
        <label>Audience <input aria-label="Audience" maxLength={64} value={brief.audience} onChange={event => setField('audience', event.target.value)} /></label>
        <label>Call to action <input aria-label="Call to action" maxLength={96} value={brief.callToAction} onChange={event => setField('callToAction', event.target.value)} /></label>
        <label>Visual continuity note <input aria-label="Visual continuity note" maxLength={96} value={brief.appearance} onChange={event => setField('appearance', event.target.value)} placeholder="Approved wardrobe and brand appearance" /></label>
      </fieldset>
    </details>
    <p className="luqi-studio-preflight-progress" aria-label="Preflight completeness">{status.completed} of {status.total} planning details complete{status.missing.length ? `. Still needed: ${status.missing.join(', ')}.` : '. Ready to draft six scenes.'}</p>
    <div className="luqi-studio-actions">
      <button type="button" disabled={disabled || !status.ready} onClick={prepare}>Preview six-scene replacement</button>
      <button type="button" disabled={disabled || !status.ready} onClick={exportBrief}>Download creative production brief</button>
    </div>
    {pending && <section className="luqi-studio-preflight-review" aria-label="Review scene replacement">
      <h3>Review before replacing your storyboard</h3>
      <ol>{pending.map((scene, i) => <li key={i}><strong>{scene.title}</strong> — {scene.caption}</li>)}</ol>
      <p>These six scenes are editable drafts: Luqi has not independently checked original sources for this script. Verify facts, dates and permissions before publishing. Replacing your storyboard does not produce footage, lock a face, spend credits or publish a video.</p>
      <div className="luqi-studio-actions">
        <button type="button" disabled={disabled} className="luqi-primary" onClick={() => {
          if (!pending || disabled) return;
          onApply(pending); setPending(null);
          setNotice('Six editable scenes applied. Review them in the Studio editor before recording.');
        }}>Replace current storyboard</button>
        <button type="button" onClick={() => { setPending(null); setNotice('Current storyboard kept unchanged.'); }}>Keep existing storyboard</button>
      </div>
    </section>}
    {notice && <p role="status" aria-live="polite">{notice}</p>}
  </section>;
}
