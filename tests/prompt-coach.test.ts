import { describe, expect, it } from 'vitest';
import { MAX_PILOT_QUESTION_CHARS } from '../src/lib/pilot-input';
import {
  buildCoachedQuestion, suggestLocalSpelling, MAX_COACH_DETAIL_CHARS,
  type CoachRequest,
} from '../src/lib/prompt-coach';
const question: CoachRequest = {
  draft: 'I need help with my business', goal: 'unsure',
  style: 'adapt', language: 'same', detail: '',
};
describe('Luqi local prompt coaching', () => {
  it('preserves the user words and opens one gentle clarification instead of inventing facts', () => {
    const out = buildCoachedQuestion(question)!;
    expect(out.startsWith('I need help with my business')).toBe(true);
    expect(out).toContain('ask one focused question');
    expect(out).toContain('alternatives');
    expect(out).not.toContain('South Africa');
  });
  it('supports selected goals, alternative perspectives, and reply language without asserting accuracy', () => {
    const out = buildCoachedQuestion({ ...question, goal: 'compare', style: 'balanced', language: 'Setswana',
      detail: 'My two ideas are a shop and a cleaning service.' })!;
    expect(out).toContain(question.draft);
    expect(out).toContain('Compare reasonable options fairly');
    expect(out).toContain('trade-offs');
    expect(out).toContain('reply in Setswana; flag uncertain wording or translations');
    expect(out).toContain('My two ideas are a shop');
  });
  it('does not truncate a long question, unapproved values or detail', () => {
    expect(buildCoachedQuestion({ ...question, draft: '' })).toBeNull();
    expect(buildCoachedQuestion({ ...question, draft: 'a'.repeat(MAX_PILOT_QUESTION_CHARS) })).toBeNull();
    expect(buildCoachedQuestion({ ...question, detail: 'a'.repeat(MAX_COACH_DETAIL_CHARS + 1) })).toBeNull();
    expect(buildCoachedQuestion({ ...question, goal: 'payments' as CoachRequest['goal'] })).toBeNull();
  });
  it('offers only limited explicit English typo corrections, never transforms mixed language, email or code', () => {
    expect(suggestLocalSpelling('Plese explain teh idea adn the price')?.corrected)
      .toBe('Please explain the idea and the price');
    expect(suggestLocalSpelling('TEH plese')?.corrected).toBe('TEH please');
    expect(suggestLocalSpelling('ngicelā plese')).toBeNull();
    expect(suggestLocalSpelling('contact foo@bar.co.za plese')).toBeNull();
    expect(suggestLocalSpelling('see https://example.com/plese')).toBeNull();
    expect(suggestLocalSpelling('This looks right.')).toBeNull();
  });
});
