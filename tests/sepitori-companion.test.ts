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
    'I am in Soshanguve', 'Heita, Luqi, explain this', '']
' )('does not infer preference from greetings, geography or quoted content: %s', text => {
    expect(readLocalSepitoriSignal(text)).toBeNull();
  });
  it('rejects overly long and non-text instructions to prevent unintended local interception', () => {
    expect(readLocalSepitoriSignal('No Sepitori ' + 'x'.repeat(110))).toBeNull();
    expect(readLocalSepitoriSignal(null)).toBeNull();
    expect(readLocalSepitoriSignal('No Sepitori\nplease')).toBeNull();
  });
});
