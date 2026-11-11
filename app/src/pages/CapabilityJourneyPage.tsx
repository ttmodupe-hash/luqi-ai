import { useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Check, Circle, Flag, RotateCcw, ShieldCheck, Target, Trophy } from 'lucide-react';
import { getPossibilityPlan } from '../lib/possibility-engine';
import {
  capabilityJourneyProgress,
  clearCapabilityJourney,
  readCapabilityJourney,
  setCapabilityJourneyStep,
  type CapabilityJourney,
} from '../lib/capability-journey';
import '../capability-journey.css';

export default function CapabilityJourneyPage() {
  const [journey, setJourney] = useState<CapabilityJourney | null>(() => readCapabilityJourney());
  const [notice, setNotice] = useState('');
  const plan = useMemo(() => journey ? getPossibilityPlan(journey.goal) : null, [journey]);
  const progress = capabilityJourneyProgress(journey);
  const nextIndex = plan && journey ? plan.steps.findIndex((_, index) => !journey.completed.includes(index)) : -1;
  const nextStep = plan && nextIndex >= 0 ? plan.steps[nextIndex] : null;

  // Detect known other-tab changes before mutating this device-local record.
  // localStorage has no cross-tab transaction guarantee.
  function journeySnapshotMatchesSaved(): boolean {
    const saved = readCapabilityJourney();
    return Boolean(saved && journey &&
      saved.goal === journey.goal &&
      saved.startedAt === journey.startedAt &&
      saved.updatedAt === journey.updatedAt &&
      saved.completed.join(',') === journey.completed.join(','));
  }

  function warnStaleJourney() {
    setNotice('This journey changed in another tab or was cleared. Reload before editing so you do not change a different goal.');
  }

  function toggle(index: number) {
    if (!journey) return;
    if (!journeySnapshotMatchesSaved()) {
      warnStaleJourney();
      return;
    }
    const complete = !journey.completed.includes(index);
    const updated = setCapabilityJourneyStep(index, complete);
    if (!updated || updated.completed.includes(index) !== complete) {
      setNotice('Stage change could not be confirmed as saved on this device. Check browser storage before relying on progress.');
      return;
    }
    setJourney(updated);
    setNotice(complete ? 'Stage marked complete on this device.' : 'Stage reopened on this device.');
  }

  function clearJourney() {
    if (!journeySnapshotMatchesSaved()) {
      warnStaleJourney();
      return;
    }
    if (!clearCapabilityJourney()) {
      setNotice('This browser did not allow the saved journey to be cleared.');
      return;
    }
    setJourney(null);
    setNotice('Saved journey cleared from this device.');
  }

  return <main className="luqi-journey">
    {!journey || !plan ? <section className="luqi-journey-empty" aria-labelledby="journey-empty-title">
      <div className="luqi-journey-empty-icon"><Target size={42} aria-hidden="true" /></div>
      <p className="luqi-journey-kicker">YOUR CAPABILITY JOURNEY</p>
      <h1 id="journey-empty-title">Start with a goal worth working toward.</h1>
      <p>LUQI will build the path first. You choose whether to save that goal on this device and track progress.</p>
      <Link className="luqi-journey-primary" to="/possibility">Build my path <ArrowRight size={18} /></Link>
      {notice && <p role="status" className="luqi-journey-notice">{notice}</p>}
    </section> : <>
      <section className="luqi-journey-hero" aria-labelledby="journey-title">
        <div>
          <p className="luqi-journey-kicker"><Flag size={15} aria-hidden="true" /> YOUR CAPABILITY JOURNEY</p>
          <h1 id="journey-title">{journey.goal}</h1>
          <p>{plan.affirmation}</p>
          <p className="luqi-journey-device"><ShieldCheck size={15} aria-hidden="true" /> Saved only in this browser on this device. LUQI has not uploaded this goal or sent it to an AI provider.</p>
        </div>
        <div className="luqi-journey-progress-orbit" aria-label={progress + '% complete'}>
          <div className="luqi-journey-progress-ring" style={{ '--journey-progress': progress } as CSSProperties}>
            <div><strong>{progress}%</strong><span>complete</span></div>
          </div>
        </div>
      </section>

      <section className="luqi-journey-mission" aria-labelledby="journey-mission-title">
        <div>
          <p className="luqi-journey-kicker">NEXT MISSION</p>
          {nextStep ? <>
            <h2 id="journey-mission-title">{nextStep.title}</h2>
            <p>{nextStep.detail}</p>
          </> : <>
            <h2 id="journey-mission-title">Path completed. Decide what level comes next.</h2>
            <p>Completion here means you marked all four LUQI stages complete. It is not a certification, job guarantee or independent assessment.</p>
          </>}
        </div>
        {nextStep ? <Link className="luqi-journey-primary" to={nextStep.path}>Continue mission <ArrowRight size={18} /></Link>
          : <Link className="luqi-journey-primary" to="/possibility">Set the next goal <Trophy size={18} /></Link>}
      </section>

      <section className="luqi-journey-stages" aria-label="Journey stages">
        {plan.steps.map((step, index) => {
          const complete = journey.completed.includes(index);
          const current = index === nextIndex;
          return <article key={step.stage} className={complete ? 'complete' : current ? 'current' : ''}>
            <button type="button" className="luqi-journey-check" onClick={() => toggle(index)}
              aria-pressed={complete} aria-label={(complete ? 'Reopen ' : 'Mark complete: ') + step.title}>
              {complete ? <Check size={19} /> : <Circle size={19} />}
            </button>
            <div>
              <p>{step.stage}</p>
              <h3>{step.title}</h3>
              <span>{step.detail}</span>
              <Link to={step.path}>{complete ? 'Review capability' : 'Open capability'} <ArrowRight size={15} /></Link>
            </div>
          </article>;
        })}
      </section>

      <section className="luqi-journey-truth">
        <div>
          <p className="luqi-journey-kicker">PROGRESS WITH TRUTH</p>
          <h2>LUQI tracks actions you confirm—not imaginary success.</h2>
          <p>Mark a stage complete only when you have actually done the work you intended. Future versions can add evidence, assessments and verified milestones without pretending they already exist.</p>
        </div>
        <button type="button" onClick={clearJourney}><RotateCcw size={16} /> Clear saved journey</button>
      </section>
      {notice && <p role="status" className="luqi-journey-notice">{notice}</p>}
    </>}
  </main>;
}
