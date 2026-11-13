import { getPossibilityPlan, type PossibilityTrack } from './possibility-engine';

export const CAPABILITY_JOURNEY_KEY = 'luqi:capability-journey:v1';
export const MAX_JOURNEY_GOAL_CHARS = 500;

export interface CapabilityJourney {
  version: 1;
  goal: string;
  track: PossibilityTrack;
  completed: number[];
  startedAt: number;
  updatedAt: number;
}

function safeStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function validCompleted(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(item => Number.isInteger(item) && item >= 0 && item < 4) as number[])].sort((a,b) => a-b);
}

export function readCapabilityJourney(): CapabilityJourney | null {
  const storage = safeStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(CAPABILITY_JOURNEY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CapabilityJourney>;
    if (parsed.version !== 1 || typeof parsed.goal !== 'string') return null;
    const goal = parsed.goal.trim();
    if (!goal || goal.length > MAX_JOURNEY_GOAL_CHARS) return null;
    const plan = getPossibilityPlan(goal);
    if (!plan) return null;
    const startedAt = Number.isFinite(parsed.startedAt) ? Number(parsed.startedAt) : Date.now();
    const updatedAt = Number.isFinite(parsed.updatedAt) ? Number(parsed.updatedAt) : startedAt;
    return {
      version: 1,
      goal,
      track: plan.track,
      completed: validCompleted(parsed.completed),
      startedAt,
      updatedAt,
    };
  } catch {
    return null;
  }
}

// Confirm persistence using a readback. Some storage wrappers silently
// drop writes without throwing; UI success requires the exact saved bytes.
function writeConfirmed(storage: Storage, journey: CapabilityJourney): boolean {
  const serialized = JSON.stringify(journey);
  storage.setItem(CAPABILITY_JOURNEY_KEY, serialized);
  return storage.getItem(CAPABILITY_JOURNEY_KEY) === serialized;
}

export function saveCapabilityJourney(goalInput: string): CapabilityJourney | null {
  const goal = goalInput.trim();
  const plan = getPossibilityPlan(goal);
  const storage = safeStorage();
  if (!plan || !storage || goal.length > MAX_JOURNEY_GOAL_CHARS) return null;
  // Denied reads are not proof of an empty device store. A write could
  // succeed while its readback fails, silently replacing unseen progress.
  try { storage.getItem(CAPABILITY_JOURNEY_KEY); } catch { return null; }
  const now = Date.now();
  const previous = readCapabilityJourney();
  const journey: CapabilityJourney = {
    version: 1,
    goal,
    track: plan.track,
    completed: previous?.goal === goal ? previous.completed : [],
    startedAt: previous?.goal === goal ? previous.startedAt : now,
    updatedAt: now,
  };
  try {
    return writeConfirmed(storage, journey) ? journey : null;
  } catch {
    return null;
  }
}

export function setCapabilityJourneyStep(index: number, complete: boolean): CapabilityJourney | null {
  const storage = safeStorage();
  const current = readCapabilityJourney();
  if (!storage || !current || !Number.isInteger(index) || index < 0 || index > 3) return current;
  const completed = new Set(current.completed);
  if (complete) completed.add(index); else completed.delete(index);
  const journey: CapabilityJourney = {
    ...current,
    completed: [...completed].sort((a,b) => a-b),
    updatedAt: Date.now(),
  };
  try {
    return writeConfirmed(storage, journey) ? journey : current;
  } catch {
    return current;
  }
}

export function clearCapabilityJourney(): boolean {
  const storage = safeStorage();
  if (!storage) return false;
  try {
    storage.removeItem(CAPABILITY_JOURNEY_KEY);
    return storage.getItem(CAPABILITY_JOURNEY_KEY) === null;
  } catch {
    return false;
  }
}

export function capabilityJourneyProgress(journey: CapabilityJourney | null): number {
  return journey ? Math.round((journey.completed.length / 4) * 100) : 0;
}
