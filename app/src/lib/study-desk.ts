/** Small, offline, user-authored study practice. No AI, cloud, telemetry or storage. */
export const STUDY_FORMAT = 'luqi.study-deck.v1';
export const MAX_STUDY_CARDS = 30;
export type StudyCard = {
  question: string;
  answer: string;
  intervalDays: number;
  dueOn: string | null;
  reviews: number;
};
export type StudyDeck = {
  format: typeof STUDY_FORMAT;
  title: string;
  cards: StudyCard[];
};
export type StudyPlan = { topics: number; daysAvailable: number; topicsPerDay: number; examDate: string };

const fail = (): never => { throw new Error('INVALID_STUDY_DECK'); };
const record = (input: unknown): input is Record<string, unknown> =>
  input !== null && typeof input === 'object' && !Array.isArray(input);
const exactKeys = (data: Record<string, unknown>, expected: readonly string[]): boolean =>
  Object.keys(data).length === expected.length && expected.every(key => Object.prototype.hasOwnProperty.call(data, key));
function text(value: unknown, max: number): string {
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u0009\u000b-\u001f\u007f]/u.test(value)) return fail();
  const result = value.trim();
  if (!result) return fail();
  return result;
}
export function dateUTC(day: string): number {
  if (typeof day !== 'string' || !/^20[0-9]{2}-[0-9]{2}-[0-9]{2}$/.test(day)) return fail();
  const [year, month, date] = day.split('-').map(Number);
  const timestamp = Date.UTC(year, month - 1, date);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== day) return fail();
  return timestamp;
}
export function todayLocal(now: Date = new Date()): string {
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const date = String(now.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + date;
}
function plusDays(day: string, days: number): string {
  return new Date(dateUTC(day) + days * 86_400_000).toISOString().slice(0, 10);
}
function whole(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
}
export function makeCard(question: string, answer: string): StudyCard {
  return { question: text(question, 240), answer: text(answer, 800), intervalDays: 0, dueOn: null, reviews: 0 };
}
export function validateDeck(input: unknown): StudyDeck {
  if (!record(input) || !exactKeys(input, ['format', 'title', 'cards']) ||
      input.format !== STUDY_FORMAT || !Array.isArray(input.cards) || input.cards.length > MAX_STUDY_CARDS) return fail();
  const title = text(input.title, 85);
  if (/[\r\n]/u.test(title)) return fail();
  const cards = input.cards.map((raw: unknown) => {
    if (!record(raw) || !exactKeys(raw, ['question', 'answer', 'intervalDays', 'dueOn', 'reviews']) ||
        !whole(raw.intervalDays, 0, 90) || !whole(raw.reviews, 0, 10000) ||
        (raw.dueOn !== null && typeof raw.dueOn !== 'string') ||
        (raw.intervalDays === 0 && (raw.dueOn !== null || raw.reviews !== 0)) ||
        (raw.intervalDays > 0 && (raw.dueOn === null || raw.reviews < 1))) return fail();
    if (raw.dueOn !== null) dateUTC(raw.dueOn as string);
    return {
      question: text(raw.question, 240), answer: text(raw.answer, 800),
      intervalDays: raw.intervalDays as number,
      dueOn: raw.dueOn as string | null,
      reviews: raw.reviews as number,
    };
  });
  return { format: STUDY_FORMAT, title, cards };
}
export function createDeck(title: string, cards: StudyCard[] = []): StudyDeck {
  return validateDeck({ format: STUDY_FORMAT, title, cards });
}
export function importStudyDeck(source: string): StudyDeck {
  if (typeof source !== 'string' || source.length < 1 || source.length > 64_000) return fail();
  try { return validateDeck(JSON.parse(source)); } catch { return fail(); }
}
export function exportStudyDeck(deck: StudyDeck): string {
  return JSON.stringify(validateDeck(deck), null, 2);
}
export function dueCards(deck: StudyDeck, day: string): number[] {
  dateUTC(day);
  return validateDeck(deck).cards.flatMap((card, i) => card.dueOn === null || card.dueOn <= day ? [i] : []);
}
export function reviewCard(deck: StudyDeck, index: number, remembered: boolean, day: string): StudyDeck {
  dateUTC(day);
  const current = validateDeck(deck);
  if (!whole(index, 0, current.cards.length - 1) || typeof remembered !== 'boolean') return fail();
  const card = current.cards[index];
  if (card.dueOn !== null && card.dueOn > day) return fail();
  const intervalDays = remembered
    ? card.intervalDays === 0 ? 2 : Math.min(90, Math.max(3, card.intervalDays * 2))
    : 1;
  return createDeck(current.title, current.cards.map((entry, i) => i === index ? {
    ...entry, intervalDays, dueOn: plusDays(day, intervalDays), reviews: entry.reviews + 1,
  } : entry));
}
/** A simple *user-entered* topic count and calendar estimate, not a curriculum guarantee. */
export function planStudy(topics: number, examDate: string, day: string): StudyPlan {
  const start = dateUTC(day);
  const end = dateUTC(examDate);
  const daysAvailable = (end - start) / 86_400_000;
  if (!whole(topics, 1, 120) || !whole(daysAvailable, 1, 365)) return fail();
  return { topics, daysAvailable, topicsPerDay: Math.ceil(topics / daysAvailable), examDate };
}
