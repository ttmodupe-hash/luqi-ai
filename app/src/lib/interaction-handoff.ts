import { CIVIC_RECORD_IDS } from './civic-record-ids';
export const GUIDE_PATHS = ['/driver-rights', '/consumer-rights', '/comparative-evidence', '/sassa', '/uif', '/social-support', '/visa-entry', '/township-economy', '/municipalities', '/tenders', '/opportunities'] as const;
export type GuidePath = typeof GUIDE_PATHS[number];
const TTL = 20 * 60_000;
type Guide = { owner: string; path: GuidePath; draft: string; selection: string | null; copyToGuide: boolean; at: number };
type CivicSignIn = { claimId: string; question: string; at: number };
let guide: Guide | null = null;
let civicSignIn: CivicSignIn | null = null;
let civicResume: (CivicSignIn & { owner: string }) | null = null;
const fresh = (at: number, now: number) => Number.isFinite(now) && now >= at && now - at <= TTL;
export function isGuidePath(path: string): path is GuidePath { return (GUIDE_PATHS as readonly string[]).includes(path); }
export function stageGuide(owner: string | null, path: string, draft: string, selection: string | null, copyToGuide = false, now = Date.now()): boolean {
  if (!owner || !isGuidePath(path) || typeof draft !== 'string' || draft.length > 6000 || !draft.trim() || !Number.isFinite(now) ||
      (selection !== null && (typeof selection !== 'string' || !/^[a-zA-Z0-9_-]{1,60}$/.test(selection)))) return false;
  guide = { owner, path, draft, selection, copyToGuide: copyToGuide === true, at: now }; return true;
}
export function readGuide(owner: string | null, path: string, now = Date.now()) {
  if (!guide || !owner || guide.owner !== owner || guide.path !== path || !fresh(guide.at, now)) return null;
  return { selection: guide.selection, question: guide.copyToGuide ? guide.draft : '', hasDraft: true };
}
export function readChatReturn(owner: string | null, now = Date.now()): string | null {
  return guide && owner && guide.owner === owner && fresh(guide.at, now) ? guide.draft : null;
}
export function clearGuideHandoff() { guide = null; }
export function stageCivicSignIn(claimId: string, question = '', now = Date.now()): boolean {
  if (!(CIVIC_RECORD_IDS as readonly string[]).includes(claimId) || typeof question !== 'string' || question.length > 1000 || !Number.isFinite(now)) return false;
  civicSignIn = { claimId, question, at: now }; civicResume = null; return true;
}
export function civicReturnPath(now = Date.now()): string | null {
  return civicSignIn && fresh(civicSignIn.at, now) ? '/chat?evidence=' + encodeURIComponent(civicSignIn.claimId) : null;
}
export function completeCivicSignIn(owner: string | null, now = Date.now()): string | null {
  const path = civicReturnPath(now);
  if (!path || !owner || !civicSignIn) { civicSignIn = null; return null; }
  civicResume = { ...civicSignIn, owner }; civicSignIn = null; return path;
}
export function readCivicResume(owner: string | null, claimId: string, now = Date.now()): string {
  return civicResume && owner && civicResume.owner === owner && civicResume.claimId === claimId && fresh(civicResume.at, now) ? civicResume.question : '';
}
export function clearCivicResume() { civicResume = null; }
export function syncInteractionOwner(owner: string | null) {
  if (guide?.owner !== owner) guide = null;
  if (civicResume?.owner !== owner) civicResume = null;
  // A pending guest login is usable only by the explicit account form callback.
  civicSignIn = null;
}
export function clearInteractionHandoffs() { guide = null; civicSignIn = null; civicResume = null; }
