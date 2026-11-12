import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Check, Circle, Flag, RotateCcw, ShieldCheck, Target, Trophy } from 'lucide-react';
import { getPossibilityPlan } from '../lib/possibility-engine';
import {
  capabilityJourneyProgress,
  clearCapabilityJourney,
  CAPABILITY_JOURNEY_KEY,
  readCapabilityJourney,
  setCapabilityJourneyStep,
  type CapabilityJourney,
} from '../lib/capability-journey';
import '../capability-journey.css';

const STALE_JOURNEY_NOTICE = 'This journey changed in another tab or was cleared. Load the latest saved journey before editing so you do not change a different goal.';
const NEW_JOURNEY_NOTICE = 'A journey was saved in another tab. Load the latest saved journey to continue on this device.';
const UNREADABLE_STORAGE_NOTICE = 'Browser storage is unavailable. This view has not been replaced. Allow browser storage and try again.';
const INITIAL_UNREADABLE_STORAGE_NOTICE = 'Browser storage is unavailable. A previously saved journey may still exist on this device. Allow browser storage and load the latest journey before saving a new goal.';

function savedJourneyMatches(first: CapabilityJourney | null, second: CapabilityJourney | null): boolean {
  return Boolean(first && second &&
    first.goal === second.goal &&
    first.startedAt === second.startedAt &&
    first.updatedAt === second.updatedAt &&
    first.completed.join(',') === second.completed.join(','));
}

function canReadJourneyStorage(): boolean {
  try {
    window.localStorage.getItem(CAPABILITY_JOURNEY_KEY);
    return true;
  } catch {
    return false;
  }
}

export default function CapabilityJourneyPage() {
  const [journey, setJourney] = useState<CapabilityJourney | null>(() => readCapabilityJourney());
  const [initialStorageUnavailable] = useState(() => !canReadJourneyStorage());
  const [notice, setNotice] = useState(initialStorageUnavailable ? INITIAL_UNREADABLE_STORAGE_NOTICE : '');
  const [needsReload, setNeedsReload] = useState(initialStorageUnavailable);
  const focusAfterRecovery = useRef(false);
  // Recovery or clearing removes the keyboard-activated button. Keep the user's place.
  useLayoutEffect(() => {
    if (!focusAfterRecovery.current) return;
    focusAfterRecovery.current = false;
    document.getElementById(journey ? 'journey-title' : 'journey-empty-title')?.focus();
  }, [journey, needsReload]);
  const plan = useMemo(() => journey ? getPossibilityPlan(journey.goal) : null, [journey]);
  const progress = capabilityJourneyProgress(journey);
  const nextIndex = plan && journey ? plan.steps.findIndex((_, index) => !journey.completed.includes(index)) : -1;
  const nextStep = plan && nextIndex >= 0 ? plan.steps[nextIndex] : null;

  // Storage events arrive in OTHER tabs, including when this page has no goal yet.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== CAPABILITY_JOURNEY_KEY) return;
      // An access denial is not proof that another tab edited or deleted a goal.
      if (!canReadJourneyStorage()) {
        setNeedsReload(true);
        setNotice(UNREADABLE_STORAGE_NOTICE);
        return;
      }
      const saved = readCapabilityJourney();
      if (journey ? !savedJourneyMatches(journey, saved) : saved !== null) {
        setNeedsReload(true);
        setNotice(journey ? STALE_JOURNEY_NOTICE : NEW_JOURNEY_NOTICE);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [journey]);

  // Detect known other-tab changes before mutating this device-local record.
  // localStorage has no cross-tab transaction guarantee.
  function journeySnapshotMatchesSaved(): boolean {
    return savedJourneyMatches(journey, readCapabilityJourney());
  }

  function warnStaleJourney() {
    setNeedsReload(true);
    setNotice(STALE_JOURNEY_NOTICE);
  }

  function loadLatestSavedJourney() {
    // A failed storage read must not be mistaken for another tab clearing the goal.
    // Keep the visible state and recovery action until the device store is readable.
    if (!canReadJourneyStorage()) {
      setNeedsReload(true);
      setNotice(UNREADABLE_STORAGE_NOTICE);
      return;
    }
    const latest = readCapabilityJourney();
    focusAfterRecovery.current = true;
    setJourney(latest);
    setNeedsReload(false);
    setNotice(latest ? 'Loaded the latest saved journey from this browser.' : 'No readable saved journey is available on this device. It may have been cleared or become invalid. You can choose a new goal.');
  }

  function toggle(index: number) {
    if (!journey) return;
    if (!canReadJourneyStorage()) {
      setNeedsReload(true);
      setNotice(UNREADABLE_STORAGE_NOTICE);
      return;
    }
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
    setNeedsReload(false);
    setNotice(complete ? 'Stage marked complete on this device.' : 'Stage reopened on this device.');
  }

  function clearJourney() {
    if (!canReadJourneyStorage()) {
      setNeedsReload(true);
      setNotice(UNREADABLE_STORAGE_NOTICE);
      return;
    }
    if (!journeySnapshotMatchesSaved()) {
      warnStaleJourney();
      return;
    }
    if (!clearCapabilityJourney()) {
      setNotice('This browser did not allow the saved journey to be cleared.');
      return;
    }
    // Clearing unmounts this button; move keyboard focus to the empty-state heading.
    focusAfterRecovery.current = true;
    setJourney(null);
    setNeedsReload(false);
    setNotice('Saved journey cleared from this device.');
  }

  return <main className="luqi-journey">
    {!journey || !plan ? <section className="luqi-journey-empty" aria-labelledby="journey-empty-title">
      <div className="luqi-journey-empty-icon"><Target size={42} aria-hidden="true" /></div>
      <p className="luqi-journey-kicker">YOUR CAPABILITY JOURNEY</p>
      <h1 id="journey-empty-title" tabIndex={-1}>Start with a goal worth working toward.</h1>
      <p>LUQI will build the path first. You choose whether to save that goal on this device and track progress.</p>
      <Link className="luqi-journey-primary" to="/possibility">Build my path <ArrowRight size={18} /></Link>
      {notice && <p role="status" className="luqi-journey-notice">{notice}</p>}
      {needsReload && <button type="button" className="luqi-journey-primary" onClick={loadLatestSavedJourney}>Load latest saved journey</button>}
    </section> : <>
      <section className="luqi-journey-hero" aria-labelledby="journey-title">
        <div>
          <p className="luqi-journey-kicker"><Flag size={15} aria-hidden="true" /> YOUR CAPABILITY JOURNEY</p>
          <h1 id="journey-title" tabIndex={-1}>{journey.goal}</h1>
          <p>{plan.affirmation}</p>
          <p className="luqi-journey-device"><ShieldCheck size={15} aria-hidden="true" /> Saved only in this browser on this device. LUQI has not uploaded this goal or sent it to an AI provider.</p>
        </div>
        <div className="luqi-journey-progress-orbit" aria-label={progress + '% complete'}>
          <div className="luqi-journey-progress-ring" style={{ '--journey-progress': progress } as CSSProperties}>
            <div><strong>{progress}%</strong><span>complete</span></div>
          </div>
        </div>
      </section>
      {(notice || needsReload) && <section className="luqi-journey-recovery" aria-label="Journey storage notice">
        {notice && <p role="status" className="luqi-journey-notice">{notice}</p>}
        {needsReload && <button type="button" className="luqi-journey-primary" onClick={loadLatestSavedJourney}>Load latest saved journey</button>}
      </section>}

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
        {needsReload
          ? <p className="luqi-journey-device">Load the latest saved journey before continuing this mission.</p>
          : nextStep ? <Link className="luqi-journey-primary" to={nextStep.path}>Continue mission <ArrowRight size={18} /></Link>
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
              {needsReload
                ? <span>Load latest saved journey to open this capability.</span>
                : <Link to={step.path}>{complete ? 'Review capability' : 'Open capability'} <ArrowRight size={15} /></Link>}
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
    </>}
  </main>;
}
