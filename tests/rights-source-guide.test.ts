import { describe, expect, it } from 'vitest';
import {
  RIGHTS_INFORMATION, RIGHTS_LANGUAGES, RIGHTS_RECHECK_AFTER, RIGHTS_REVIEWED_ON,
  RIGHTS_SOURCES, RIGHTS_TOPICS, legalInformationIsCurrent,
  rightsLanguageHasSourceLinkedText, rightsSourcesFor,
} from '../src/lib/rights-source-guide';

describe('source-linked South African rights guide (offline)', () => {
  it('ties every factual item to an explicit, dated, trusted source URL', () => {
    expect(RIGHTS_INFORMATION.length).toBeGreaterThanOrEqual(5);
    const knownIds = new Set(RIGHTS_SOURCES.map(source => source.id));
    const allowHosts = new Set(['help.unhcr.org', 'www.gov.za', 'www.concourt.org.za', 'www.sanews.gov.za']);
    for (const source of RIGHTS_SOURCES) {
      const parsed = new URL(source.url);
      expect(parsed.protocol).toBe('https:');
      expect(allowHosts.has(parsed.hostname)).toBe(true);
      expect(parsed.username).toBe('');
      expect(parsed.password).toBe('');
      expect(parsed.search).toBe('');
      expect(source.reviewedOn).toBe(RIGHTS_REVIEWED_ON);
      expect(source.publisher.length).toBeGreaterThan(4);
    }
    for (const item of RIGHTS_INFORMATION) {
      expect(item.explanation.length).toBeGreaterThan(40);
      expect(item.sources.length).toBeGreaterThan(0);
      expect(item.sources.every(id => knownIds.has(id))).toBe(true);
      expect(rightsSourcesFor(item)).toHaveLength(item.sources.length);
      expect(RIGHTS_TOPICS.some(topic => topic.id === item.topic)).toBe(true);
    }
  });

  it('expires time-sensitive content rather than implying live government verification', () => {
    expect(RIGHTS_REVIEWED_ON).toBe('2026-10-26');
    expect(RIGHTS_RECHECK_AFTER).toBe('2026-11-02');
    expect(legalInformationIsCurrent(new Date('2026-10-26T08:53:00+02:00'))).toBe(true);
    expect(legalInformationIsCurrent(new Date('2026-11-02T23:59:59+02:00'))).toBe(true);
    expect(legalInformationIsCurrent(new Date('2026-11-03T00:00:00+02:00'))).toBe(false);
    expect(legalInformationIsCurrent(new Date('2026-10-25T23:59:59+02:00'))).toBe(false);
    expect(legalInformationIsCurrent(new Date('invalid'))).toBe(false);
  });

  it('tracks Sepitori separately and never implies it or another language is professionally reviewed', () => {
    const sepitori = RIGHTS_LANGUAGES.find(item => item.code === 'sepitori');
    expect(sepitori?.name).toMatch(/Sepitori/);
    expect(sepitori?.sourceLinkedTextAvailable).toBe(false);
    expect(RIGHTS_LANGUAGES.find(item => item.code === 'nso')?.name).toMatch(/Sepedi/);
    expect(RIGHTS_LANGUAGES.find(item => item.code === 'tn')?.name).toMatch(/Setswana/);
    expect(rightsLanguageHasSourceLinkedText('en')).toBe(true);
    for (const language of RIGHTS_LANGUAGES.filter(item => item.code !== 'en')) {
      expect(rightsLanguageHasSourceLinkedText(language.code)).toBe(false);
    }
    expect(rightsLanguageHasSourceLinkedText('unknown')).toBe(false);
  });

  it('does not describe planned immigration changes as live, or offer AI filing and fabricated outcomes', () => {
    const start = RIGHTS_INFORMATION.find(item => item.id === 'begin');
    expect(start?.explanation).toMatch(/proposed new intention-registration/);
    expect(start?.explanation).toMatch(/did not verify/);
    const court = RIGHTS_INFORMATION.find(item => item.id === 'court');
    expect(court?.explanation).toMatch(/does not automatically grant/);
    const refusal = RIGHTS_INFORMATION.find(item => item.id === 'appeals');
    expect(refusal?.explanation).toMatch(/does not calculate your deadline/);
    const interpreter = RIGHTS_INFORMATION.find(item => item.id === 'interpreter');
    expect(interpreter?.sources).toContain('unhcr-asylum');
    expect(interpreter?.explanation).toMatch(/request an interpreter/);
  });
});
