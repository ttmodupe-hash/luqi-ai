import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { GUIDE_NEXT_STEPS, guideLuqiNeed, MAX_GUIDE_NEED_CHARS } from '../lib/luqi-intent-guide';

/** A genuinely useful, no-cost visitor preview. It never calls a provider,
 * stores a cookie, accepts payment or pretends to be a full AI conversation.
 * The visible limit is per current tab, not a server-enforced entitlement.
 */
export default function GuestLuqiPreview() {
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<Array<{ question: string; kind: string; title: string; detail: string;
    nextQuestion: string; steps: readonly string[]; path: string | null; label: string | null }>>([]);
  const limit = 3, remaining = Math.max(0, limit - history.length);
  const [notice, setNotice] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (remaining === 0) return;
    const value = question.trim();
    if (!value || value.length > MAX_GUIDE_NEED_CHARS) {
      setNotice('Describe your goal in 500 characters or fewer.'); return;
    }
    const guide = guideLuqiNeed(value);
    if (!guide) { setNotice('Describe what you need to explore.'); return; }
    setHistory(previous => [...previous, { question: value, kind: guide.kind, title: guide.title,
      detail: guide.detail, nextQuestion: guide.nextQuestion, steps: GUIDE_NEXT_STEPS[guide.kind],
      path: guide.primaryPath, label: guide.primaryLabel }]);
    setQuestion(''); setNotice('');
  }
  return <section className="luqi-guest-preview" aria-label="Try Luqi before registering">
    <div className="luqi-guest-preview-top">
      <div><h2>Try Luqi before creating an account</h2>
        <p>Explore three everyday goals without a login. Get useful local guidance, then decide whether to register for a real, consent-based AI conversation.</p></div>
      <span aria-label={remaining + ' free guest interactions remaining'} className="luqi-guest-count">
        {remaining} of {limit} left
      </span>
    </div>
    <p className="luqi-guest-disclosure">This preview is a local guide, not a live AI response. No message goes to Gemini or OpenAI, and no paid API usage is started.</p>
    {history.length > 0 && <ol className="luqi-guest-history" aria-label="Your guest guide results">
      {history.map((item, index) => <li key={index}>
        <p className="luqi-guest-user"><strong>You:</strong> {item.question}</p>
        <div className="luqi-guest-response"><strong>Luqi guide: {item.title}</strong><p>{item.detail}</p>
          <ul>{item.steps.map(step => <li key={step}>{step}</li>)}</ul>
          <p><strong>To go further:</strong> {item.nextQuestion}</p>
          {item.path && item.label && <Link to={item.path}>{item.label}</Link>}
        </div>
      </li>)}
    </ol>}
    {remaining > 0 ? <form onSubmit={submit}>
      <label htmlFor="luqi-guest-idea">{history.length ? 'What else would you like help with?' : 'What would you like Luqi to help you do?'}</label>
      <textarea id="luqi-guest-idea" rows={3} value={question} maxLength={MAX_GUIDE_NEED_CHARS}
        placeholder="For example: help me plan an educational video for my child"
        onChange={event => setQuestion(event.target.value)} required />
      <div className="luqi-guest-preview-actions">
        <span>{question.length}/{MAX_GUIDE_NEED_CHARS}</span>
        <button type="submit" disabled={!question.trim()}>Explore with Luqi</button>
      </div>
    </form> : <div role="status" className="luqi-guest-complete">
      <strong>You have explored three goals.</strong>
      <p>Create a free Luqi account to continue with real, signed-in AI Chat, conversation continuity and other available customer tools. Provider consent and limits still apply.</p>
    </div>}
    {notice && <p role="alert">{notice}</p>}
    <div className="luqi-guest-join">
      <Link to="/join">Create a free account to continue</Link>
      <Link to="/login">I already have an account</Link>
    </div>
    <p className="luqi-guest-footnote">Your three examples remain only in this open Chat tab. Reloading clears them. This is an introductory experience, not a fraud-proof free-AI quota.</p>
  </section>;
}
