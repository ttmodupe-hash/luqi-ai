import { describe, expect, it } from 'vitest';
import { prepareCompanionQuestion, MAX_SHARED_COMPANION_NOTE_CHARS } from '../src/lib/companion-context';
import { buildPilotInput, PilotInputError } from '../src/lib/pilot-input';

describe('Luqi companion request context (no provider calls)', () => {
  it('keeps the original text request untouched by default', () => {
    expect(prepareCompanionQuestion('  Help me plan tomorrow  ', false)).toBe('Help me plan tomorrow');
  });

  it('adds conversational guidance only when deliberately enabled', () => {
    const input = prepareCompanionQuestion('I need to talk.', true);
    expect(input).toContain('warm and respectful AI conversational companion');
    expect(input).toContain('My message:\nI need to talk.');
    expect(input).not.toContain('Personal context explicitly shared');
    expect(buildPilotInput(input, 'auto', [])).toContain('My message');
  });

  it('includes only the short, explicitly chosen note in the one request', () => {
    const input = prepareCompanionQuestion('Where do I start?', false, 'I prefer short practical steps.');
    expect(input).toContain('Personal context explicitly shared by me for this single request');
    expect(input).toContain('I prefer short practical steps.');
    expect(input).toContain('My message:\nWhere do I start?');
    expect(prepareCompanionQuestion('Where do I start?', false)).not.toContain('I prefer');
  });

  it('never silently truncates or shares an empty or overlarge note', () => {
    expect(() => prepareCompanionQuestion('Hello', true, '  ')).toThrow(PilotInputError);
    expect(() => prepareCompanionQuestion('Hello', true, 'x'.repeat(MAX_SHARED_COMPANION_NOTE_CHARS + 1))).toThrow(PilotInputError);
  });

  it('still uses the existing full input budget gate with optional context', () => {
    const input = prepareCompanionQuestion('q'.repeat(5600), true, 'note'.repeat(80));
    expect(() => buildPilotInput(input, 'auto', [])).toThrow(PilotInputError);
  });
});
