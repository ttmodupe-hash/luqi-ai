import { describe, expect, it } from 'vitest';
import { createDeck, dueCards, exportStudyDeck, importStudyDeck, makeCard,
  planStudy, reviewCard, STUDY_FORMAT, todayLocal } from '../src/lib/study-desk';

const date = '2026-10-25';
const sample = () => createDeck('CCNA practice', [
  makeCard('What is a VLAN?', 'A logical broadcast-domain subdivision.'),
  makeCard('How many bits in IPv4?', '32'),
]);
describe('Study Desk truthful offline practice and data boundary', () => {
  it('round-trips a versioned user-authored study deck', () => {
    const saved = exportStudyDeck(sample());
    expect(importStudyDeck(saved)).toEqual(sample());
    expect(saved).toContain(STUDY_FORMAT);
    expect(saved).not.toContain('Bearer ');
  });
  it('schedules due cards without adding artificial provider or exam truth', () => {
    const first = sample();
    expect(dueCards(first, date)).toEqual([0, 1]);
    const reviewed = reviewCard(first, 0, true, date);
    expect(reviewed.cards[0]).toMatchObject({ intervalDays: 2, dueOn: '2026-10-27', reviews: 1 });
    expect(dueCards(reviewed, date)).toEqual([1]);
    expect(dueCards(reviewed, '2026-10-27')).toEqual([0, 1]);
    const twice = reviewCard(reviewed, 0, false, '2026-10-27');
    expect(twice.cards[0]).toMatchObject({ intervalDays: 1, dueOn: '2026-10-28', reviews: 2 });
    expect(() => reviewCard(reviewed, 0, true, date)).toThrow('INVALID_STUDY_DECK');
    expect(first.cards[0].reviews).toBe(0);
  });
  it('rejects malformed imports, extra fields, huge content, impossible dates and script-like properties', () => {
    const valid = sample();
    const json = JSON.parse(exportStudyDeck(valid));
    for (const bad of [
      { ...json, token: 'private' },
      { ...json, format: 'future' },
      { ...json, cards: [{ ...json.cards[0], dueOn: '2026-02-30', intervalDays: 1, reviews: 1 }] },
      { ...json, cards: [{ ...json.cards[0], ownerId: 9 }] },
      { ...json, cards: [{ ...json.cards[0], intervalDays: 0, dueOn: '2026-10-28', reviews: 0 }] },
      { ...json, cards: Array(31).fill(json.cards[0]) },
      { ...json, title: '<script>\npretend sync</script>' },
      { ...json, cards: [{ ...json.cards[0], question: 'x'.repeat(241) }] },
      [],
    ]) expect(() => importStudyDeck(JSON.stringify(bad))).toThrow('INVALID_STUDY_DECK');
    expect(() => importStudyDeck('x'.repeat(64_001))).toThrow();
  });
  it('plans user-entered topics over calendar days without promising exam readiness', () => {
    expect(planStudy(16, '2026-11-02', date)).toEqual({
      topics: 16, daysAvailable: 8, topicsPerDay: 2, examDate: '2026-11-02',
    });
    for (const inputs of [
      [0, '2026-11-02', date], [15, '2026-02-30', date],
      [15, date, date], [15, '2028-01-01', date],
    ] as const) expect(() => planStudy(...inputs)).toThrow('INVALID_STUDY_DECK');
    expect(todayLocal(new Date(2026, 9, 25))).toBe(date);
  });
});
