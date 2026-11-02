import { describe, expect, it } from 'vitest';
import {
  DRIVER_FACTS, DRIVER_QUICK, DRIVER_RECHECK_AFTER, DRIVER_REVIEWED_ON,
  DRIVER_SOURCES, DRIVER_TOPICS, detectDriverMode, driverGuideIsCurrent,
  driverSourcesFor,
} from '../src/lib/driver-rights';
import { guideLuqiNeed } from '../src/lib/luqi-intent-guide';

describe('South African roadside guidance source, expiry and safety gates', () => {
  it('provides a dated external source for every legal statement', () => {
    expect(DRIVER_REVIEWED_ON).toBe('2026-10-28');
    expect(DRIVER_RECHECK_AFTER).toBe('2026-11-11');
    const hosts = new Set([
      'www.tshwane.gov.za', 'api.acts.co.za', 'www.acts.co.za',
      'lawlibrary.org.za', 'www.rtia.co.za', 'www.gov.za',
      'www.capetown.gov.za', 'www.justice.gov.za', 'www.saps.gov.za',
    ]);
    const ids = new Set(DRIVER_SOURCES.map(item => item.id));
    expect(ids.size).toBe(DRIVER_SOURCES.length);
    for (const source of DRIVER_SOURCES) {
      const url = new URL(source.url);
      expect(url.protocol).toBe('https:');
      expect(url.username).toBe('');
      expect(url.password).toBe('');
      expect(hosts.has(url.hostname)).toBe(true);
      expect(source.reviewedOn).toBe(DRIVER_REVIEWED_ON);
    }
    for (const fact of DRIVER_FACTS) {
      expect(fact.summary.length).toBeGreaterThan(85);
      expect(fact.sourceIds.length).toBeGreaterThan(0);
      expect(fact.sourceIds.every(id => ids.has(id))).toBe(true);
      expect(driverSourcesFor(fact)).toHaveLength(fact.sourceIds.length);
      expect(DRIVER_TOPICS.some(t => t.id === fact.topic)).toBe(true);
    }
  });
  it('expires time-sensitive interpretations rather than claiming a perpetual legal review', () => {
    expect(driverGuideIsCurrent(new Date('2026-10-28T10:00:00+02:00'))).toBe(true);
    expect(driverGuideIsCurrent(new Date('2026-11-11T23:59:59+02:00'))).toBe(true);
    expect(driverGuideIsCurrent(new Date('2026-11-12T00:00:00+02:00'))).toBe(false);
    expect(driverGuideIsCurrent(new Date('2026-10-27T23:59:59+02:00'))).toBe(false);
    expect(driverGuideIsCurrent(new Date('bad date'))).toBe(false);
  });
  it('keeps every 3-step urgent card safety-first and free of phone or location actions', () => {
    for (const mode of ['stop', 'bribe', 'search', 'fine', 'arrest'] as const) {
      expect(DRIVER_QUICK[mode].steps).toHaveLength(3);
      expect(DRIVER_QUICK[mode].steps.every(step => step.length > 25)).toBe(true);
      expect(DRIVER_QUICK[mode].detail.length).toBeGreaterThan(55);
    }
    expect(DRIVER_QUICK.stop.steps[0]).toMatch(/Do not use your phone while driving/);
    expect(DRIVER_QUICK.bribe.steps.join(' ')).toMatch(/Do not offer/);
    expect(DRIVER_QUICK.search.steps.join(' ')).toMatch(/avoid physical resistance/);
    const documentary = DRIVER_FACTS.find(item => item.id === 'licence');
    expect(documentary?.summary).toMatch(/must issue a receipt/);
    const fines = DRIVER_FACTS.find(item => item.id === 'warrants');
    expect(fines?.summary).toMatch(/rollout is phased/);
    const alcohol = DRIVER_FACTS.find(item => item.id === 'sobriety');
    expect(alcohol?.summary).toMatch(/two-hour evidentiary presumptions/);
  });
  it('recognises current roadside stress without routing unrelated police questions', () => {
    const cases: Array<[string, ReturnType<typeof detectDriverMode>]> = [
      ['Luqi, I am being pulled over', 'stop'],
      ['I am at a roadblock', 'stop'],
      ['the cop wants money', 'bribe'],
      ['traffic officer asked for cash', 'bribe'],
      ['Police are searching my car', 'search'],
      ['They want to search my vehicle', 'search'],
      ['I am being arrested', 'arrest'],
      ['I have unpaid traffic fines', 'fine'],
      ['Can you translate an article about police ethics?', null],
      ['I am researching criminal policing institutions', null],
      ['', null],
      ['x'.repeat(501), null],
    ];
    for (const [input, expected] of cases) expect(detectDriverMode(input)).toBe(expected);
  });
  it('directs local intent to the source-linked guide before generic police emergency classification', () => {
    const guide = guideLuqiNeed('Luqi the cop wants money');
    expect(guide?.kind).toBe('driver');
    expect(guide?.primaryPath).toBe('/driver-rights');
    expect(guide?.status).toBe('local');
    expect(guide?.detail).toMatch(/No account, AI request or incident upload/);
    expect(guideLuqiNeed('Need an ambulance now')?.kind).toBe('urgent');
  });
});
