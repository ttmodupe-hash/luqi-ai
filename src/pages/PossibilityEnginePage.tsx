import { useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { ArrowRight, CheckCircle2, Compass, Rocket, ShieldCheck, Sparkles, Target } from 'lucide-react';
import { getPossibilityPlan } from '../lib/possibility-engine';
import { saveCapabilityJourney } from '../lib/capability-journey';
import '../possibility-engine.css';

const examples = [
  'I want to become a network engineer',
  'I want to start a township business',
  'I want to pass matric physics',
  'I want to build an app for my community',
] as const;

function initialGoal(state: unknown) {
  if (!state || typeof state !== 'object' || !('luqiGoal' in state)) return '';
  const value = (state as { luqiGoal?: unknown }).luqiGoal;
  return typeof value === 'string' && value.trim().length <= 500 ? value.trim() : '';
}

export default function PossibilityEnginePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const seeded = useMemo(() => initialGoal(location.state), [location.state]);
  const [goal, setGoal] = useState(seeded);
  const [submitted, setSubmitted] = useState(seeded);
  const [saveNotice, setSaveNotice] = useState('');
  const plan = getPossibilityPlan(submitted);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = goal.trim();
    if (!value || value.length > 500) return;
    setSubmitted(value);
    setSaveNotice('');
  }

  function useExample(value: string) {
    setGoal(value);
    setSubmitted(value);
    setSaveNotice('');
  }

  function saveJourney() {
    if (!submitted) return;
    // Do not silently save an older preview after the user edits the goal.
    // The person must review the newly built path before opting into storage.
    if (goal.trim() !== submitted) {
      setSaveNotice('Your goal has changed. Build the updated path before saving it on this device.');
      return;
    }
    const saved = saveCapabilityJourney(submitted);
    if (!saved) {
      setSaveNotice('This browser did not allow LUQI to save the journey on this device. The path still works without saving.');
      return;
    }
    navigate('/journey');
  }

  return <main className="luqi-possibility">
    <section className="luqi-possibility-hero" aria-labelledby="possibility-title">
      <div className="luqi-possibility-copy">
        <p className="luqi-possibility-eyebrow"><Sparkles size={16} aria-hidden="true" /> LUQI POSSIBILITY ENGINE · CAPABILITY BEFORE STATUS</p>
        <h1 id="possibility-title">Tell LUQI what you want to become, build or change.</h1>
        <p className="luqi-possibility-lede">Start with ambition, not a menu. LUQI turns the goal into a practical path across learning, labs, business tools, opportunities and execution.</p>
        <form onSubmit={submit} className="luqi-possibility-form">
          <label htmlFor="luqi-possibility-goal">What do you want to make possible?</label>
          <div className="luqi-possibility-input">
            <Target size={20} aria-hidden="true" />
            <input id="luqi-possibility-goal" value={goal} maxLength={500}
              onChange={event => setGoal(event.target.value)}
              placeholder="I want to become a network engineer…" autoComplete="off" />
            <button type="submit" disabled={!goal.trim()} aria-label="Build my LUQI path"><ArrowRight size={20} /></button>
          </div>
        </form>
        <p className="luqi-possibility-local"><ShieldCheck size={15} aria-hidden="true" /> This first path is built locally. No paid AI request, application or payment is triggered.</p>
        <div className="luqi-possibility-examples" aria-label="Example goals">
          {examples.map(example => <button type="button" key={example} onClick={() => useExample(example)}>{example}</button>)}
        </div>
      </div>
      <div className="luqi-capability-orbit" aria-hidden="true">
        <div className="luqi-capability-ring ring-one" />
        <div className="luqi-capability-ring ring-two" />
        <div className="luqi-capability-core"><Rocket size={34} /><strong>Possible</strong><span>with a path</span></div>
        <span className="cap-node node-learn">LEARN</span>
        <span className="cap-node node-build">BUILD</span>
        <span className="cap-node node-prove">PROVE</span>
        <span className="cap-node node-move">MOVE</span>
      </div>
    </section>

    {plan && <section className="luqi-possibility-plan" aria-live="polite">
      <div className="luqi-possibility-plan-head">
        <div>
          <p>{plan.label}</p>
          <h2>{plan.affirmation}</h2>
          <p>{plan.outcome}</p>
        </div>
        <div className="luqi-possibility-badge"><CheckCircle2 size={20} /><span>Path ready</span></div>
      </div>

      <div className="luqi-possibility-goal"><span>Your goal</span><strong>{submitted}</strong></div>

      <div className="luqi-possibility-steps">
        {plan.steps.map((step, index) => <article key={step.stage}>
          <div className="luqi-step-number">{String(index + 1).padStart(2, '0')}</div>
          <p>{step.stage}</p>
          <h3>{step.title}</h3>
          <span>{step.detail}</span>
          <Link to={step.path}>Open this capability <ArrowRight size={16} /></Link>
        </article>)}
      </div>

      <div className="luqi-possibility-next">
        <div>
          <p className="luqi-possibility-eyebrow"><Compass size={16} /> GO DEEPER</p>
          <h3>LUQI should keep asking: what barrier can we remove next?</h3>
          <p>Knowledge, practice space, tools, visibility and guidance can all be made easier to reach. Effort, judgment and official decisions still remain with the person and the responsible institution.</p>
        </div>
        <div className="luqi-possibility-next-actions">
          <button type="button" className="luqi-possibility-primary" onClick={saveJourney}>
            Save as my journey <Target size={18} />
          </button>
          <Link className="luqi-possibility-secondary-action" to="/ask" state={{ luqiHomeNeed: submitted }}>
            Continue without saving <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>}
    {saveNotice && <p className="luqi-possibility-save-notice" role="status">{saveNotice}</p>}

    <section className="luqi-possibility-principles" aria-label="Capability equality principles">
      <article><strong>01</strong><h3>Access</h3><p>Useful capability should work on ordinary devices and low-cost paths, not only premium hardware.</p></article>
      <article><strong>02</strong><h3>Practice</h3><p>Reading is not enough. LUQI should give people places to experiment, simulate and build.</p></article>
      <article><strong>03</strong><h3>Opportunity</h3><p>Learning must connect to real openings, customers, programmes and next actions.</p></article>
      <article><strong>04</strong><h3>Truth</h3><p>LUQI can be ambitious without pretending. Unverified claims stay clearly labelled.</p></article>
    </section>
  </main>;
}
