import { describe, expect, it } from 'vitest';
import { readLocalSepitoriSignal, localSepitoriAcknowledgement } from '../src/lib/sepitori-companion';
import { LANGUAGES } from '../src/lib/languages';

describe('Luqi Sepitori companionship is an explicit user-controlled preference', () => {
  it('offers the non-official experimental variety alongside all official languages', () => {
    expect(LANGUAGES.filter(item => item.region === 'South Africa (11 Official)')).toHaveLength(11);
    const sepitori = LANGUAGES.find(item => item.code === 'sepitori');
    expect(sepitori?.region).toBe('Community variety (experimental)');
    expect(sepitori?.name).toContain('experimental');
    expect(sepitori?.name.length).toBeLessThanOrEqual(50);
  });
  it.each(['Heita', 'eita!', 'Ola dah.', 'ola da'])('greets locally without silently opting in: %s', text => {
    expect(readLocalSepitoriSignal(text)).toEqual({ kind: 'greeting' });
    expect(localSepitoriAcknowledgement({ kind: 'greeting' }, 'en')).toContain('choice is yours');
  });
  it.each(['Please speak Sepitori', 'Sepitori', 'Talk in Pitori!', 'se pitori please'])('honours explicit opt-in: %s', text => {
    expect(readLocalSepitoriSignal(text)).toEqual({ kind: 'language', code: 'sepitori' });
  });
  it.each(['No Sepitori please', "I don't want to talk in Sepitori", 'Do not speak Sepitori.',
    'Stop speaking Sepitori', 'English only', 'Reply in English please'])('honours explicit refusal: %s', text => {
    expect(readLocalSepitoriSignal(text)).toEqual({ kind: 'language', code: 'en' });
  });
  it.each(['Heita, can you help with rent?', 'What does Sepitori mean?',
    'My friend said no Sepitori please and I wondered why',
    'I am in Soshanguve', 'Heita, Luqi, explain this', ''])('does not infer preference from greetings, geography or quoted content: %s', text => {
    expect(readLocalSepitoriSignal(text)).toBeNull();
  });
  it('rejects overly long and non-text instructions to prevent unintended local interception', () => {
    expect(readLocalSepitoriSignal('No Sepitori ' + 'x'.repeat(110))).toBeNull();
    expect(readLocalSepitoriSignal(null)).toBeNull();
    expect(readLocalSepitoriSignal('No Sepitori\nplease')).toBeNull();
  });

  it.each(['No Pitori please', "Don't speak Pitori", 'Do not use se Pitori please',
    "I don't want to chat in Pitori", 'English, please', 'Reply in English, please'])
    ('honours Pitori aliases and comma-before-please English opt-outs: %s', text => {
      expect(readLocalSepitoriSignal(text)).toEqual({ kind: 'language', code: 'en' });
    });
  it.each(['What is Pitori?', 'I heard someone say no Pitori please', 'Heita, can you translate?'])
    ('never intercepts an ordinary question containing Pitori or a greeting: %s', text => {
      expect(readLocalSepitoriSignal(text)).toBeNull();
    });
  it.each(['No Pitori, please', 'No Sepitori, please!',
    'Please stop speaking Pitori, please.', 'Do not use se Pitori, please'])
    ('honours comma-separated polite refusal without provider inference: %s', text => {
      expect(readLocalSepitoriSignal(text)).toEqual({ kind: 'language', code: 'en' });
    });
  it.each([
    ['Switch to English', 'en'], ['Switch back to English', 'en'],
    ['Go back to English', 'en'], ['Change to English', 'en'],
    ['Please switch to English, please!', 'en'],
    ['Switch to Sepitori', 'sepitori'], ['Switch to Pitori', 'sepitori'],
    ['Change to se Pitori', 'sepitori'], ['Go back to Sepitori', 'sepitori'],
    ['Please switch back to Pitori.', 'sepitori'],
  ] as const)('handles explicit local switch command %s without provider inference', (input, code) => {
    expect(readLocalSepitoriSignal(input)).toEqual({ kind: 'language', code });
  });
  it.each([
    'What does switch to English mean?', 'How do I switch to English?',
    'I want to switch to English because I am tired', 'Switch to English and explain my bill',
    'My friend said switch to Sepitori', 'Heita, please switch to English',
    'Go back to English later', 'Can you go back to English?',
  ])('never intercepts a non-command explanation or question: %s', input => {
    expect(readLocalSepitoriSignal(input)).toBeNull();
  });

  it('preserves polite opt-in and never intercepts quoted or extended requests', () => {
    expect(readLocalSepitoriSignal('Please use Pitori, please.'))
      .toEqual({ kind: 'language', code: 'sepitori' });
    expect(readLocalSepitoriSignal('I heard someone say no Pitori, please'))
      .toBeNull();
    expect(readLocalSepitoriSignal('No Pitori, please explain what that phrase means'))
      .toBeNull();
  });

});
