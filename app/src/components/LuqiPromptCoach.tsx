import { useState } from 'react';
import {
  buildCoachedQuestion, suggestLocalSpelling, MAX_COACH_DETAIL_CHARS,
  type CoachGoal, type CoachStyle, type CoachLanguage,
} from '../lib/prompt-coach';
import '../prompt-coach.css';

interface Props {
  draft: string;
  disabled: boolean;
  onApply: (text: string) => void;
  onUseGuidedDraft?: (text: string) => void;
  focusTargetId?: string;
}

/** A non-metered tool: users keep the choice of wording and whether to send. */
export default function LuqiPromptCoach({ draft, disabled, onApply, onUseGuidedDraft, focusTargetId = 'ai-question' }: Props) {
  const [goal, setGoal] = useState<CoachGoal>('unsure');
  const [style, setStyle] = useState<CoachStyle>('adapt');
  const [language, setLanguage] = useState<CoachLanguage>('same');
  const [detail, setDetail] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [source, setSource] = useState('');
  const [status, setStatus] = useState('');
  const hint = suggestLocalSpelling(draft);
  const previewIsCurrent = preview !== null && source === draft;
  function suggestQuestion() {
    setStatus('');
    const proposal = buildCoachedQuestion({ draft, goal, style, language, detail });
    if (!proposal) {
      setPreview(null);
      setStatus(draft.trim()
        ? 'The complete suggestion does not fit the request limit. Nothing was changed; shorten an optional detail.'
        : 'Type what you need in the question box first. Ordinary words are enough.');
      return;
    }
    setPreview(proposal);
    setSource(draft);
  }
  function useWords(words: string, coached = false) {
    if (disabled) return;
    if (coached && onUseGuidedDraft) onUseGuidedDraft(words);
    else onApply(words);
    setPreview(null);
    setSource('');
    setStatus(coached && onUseGuidedDraft
      ? 'Your guided question is ready in optional AI Chat below. Nothing was sent.'
      : 'Your wording was updated. Review it before you agree to send; no AI request was made.');
    if (!coached || !onUseGuidedDraft) {
      document.getElementById(focusTargetId)?.focus({ preventScroll: true });
    }
  }
  return <div className="luqi-prompt-helper">
    <p className="luqi-prompt-native">Your phone can suggest spelling while you type. Luqi will not silently change your words or assume English is your language.</p>
    {hint && <div className="luqi-prompt-spelling" role="status">
      <span>Possible English spelling: {hint.examples.map(x => x.from + ' → ' + x.to).join(', ')}.</span>
      <button type="button" disabled={disabled} onClick={() => useWords(hint.corrected)}>Apply suggestion</button>
    </div>}
    <details className="luqi-prompt-coach">
      <summary>Help me ask Luqi — no perfect prompt needed</summary>
      <p>Start with your own words above. Choose what might help, or leave every option as it is. Preparing a question here does not call an AI provider.</p>
      <div className="luqi-prompt-fields">
        <label>What would help most?
          <select value={goal} disabled={disabled} onChange={e => { setGoal(e.target.value as CoachGoal); setPreview(null); }}>
            <option value="unsure">I'm not sure — help me start</option>
            <option value="understand">Understand or learn something</option>
            <option value="plan">Plan practical next steps</option>
            <option value="write">Write or improve a message</option>
            <option value="compare">Compare options fairly</option>
            <option value="brainstorm">Explore different ideas</option>
            <option value="decide">Think through a decision</option>
          </select>
        </label>
        <label>How should Luqi answer?
          <select value={style} disabled={disabled} onChange={e => { setStyle(e.target.value as CoachStyle); setPreview(null); }}>
            <option value="adapt">Adapt to my question</option>
            <option value="simple">Plain language</option>
            <option value="steps">Short practical steps</option>
            <option value="balanced">Balanced alternatives or trade-offs</option>
            <option value="detailed">More explanation</option>
          </select>
        </label>
        <label>Response language (optional)
          <select value={language} disabled={disabled} onChange={e => { setLanguage(e.target.value as CoachLanguage); setPreview(null); }}>
            <option value="same">Language I used</option>
            <option value="English">English</option>
            <option value="isiZulu">isiZulu</option>
            <option value="Sesotho">Sesotho</option>
            <option value="Setswana">Setswana</option>
            <option value="Afrikaans">Afrikaans</option>
            <option value="Kiswahili">Kiswahili</option>
          </select>
        </label>
        <label>One helpful detail (optional)
          <textarea rows={2} maxLength={MAX_COACH_DETAIL_CHARS}
            spellCheck autoCorrect="on" autoCapitalize="sentences" autoComplete="off"
            placeholder="Example: I am new to this, I have limited time, or it's for my small business."
            value={detail} disabled={disabled} onChange={e => { setDetail(e.target.value); setPreview(null); }} />
        </label>
      </div>
      <button type="button" className="luqi-prompt-generate" disabled={disabled}
        onClick={suggestQuestion}>Suggest a clearer question</button>
      {previewIsCurrent && <div className="luqi-prompt-preview">
        <label>Review the suggested question
          <textarea readOnly rows={6} value={preview ?? ''} />
        </label>
        <div className="luqi-prompt-actions">
          <button type="button" disabled={disabled} onClick={() => useWords(preview ?? '', true)}>Use this question</button>
          <button type="button" disabled={disabled} onClick={() => setPreview(null)}>Keep my own words</button>
        </div>
      </div>}
      {status && <p role="status" className="luqi-prompt-status">{status}</p>}
      <p className="luqi-prompt-disclaimer">Only your reviewed question is sent if you separately consent and press Send question. Use your own language; African-language replies still need review.</p>
    </details>
  </div>;
}
