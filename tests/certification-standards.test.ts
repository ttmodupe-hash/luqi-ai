import { describe, expect, it } from 'vitest';
import { CERT_PATHWAYS, CERT_REVIEWED_ON, LUQI_PRACTICE_GOAL, issuerPathwayFor } from '../src/lib/certification-standards';
describe('Issuer-checked Luqi certification courses', () => {
 it('stores only original awarding-body links and the verified 2026 release pathway', () => {
  expect(CERT_REVIEWED_ON).toBe('1 November 2026');
  expect(LUQI_PRACTICE_GOAL).toBe(80);
  expect(Object.keys(CERT_PATHWAYS)).toHaveLength(4);
  for (const course of Object.values(CERT_PATHWAYS)) {
    expect(course.examUrl).toMatch(/^https:\/\/www\.(?:cisco|peoplecert)\.com\//);
    expect(course.learningUrl).toMatch(/^https:\/\/(?:www\.cisco|u\.cisco|www\.peoplecert)\.com\//);
    expect(course.duration.length).toBeGreaterThan(8);
    expect(course.topics.length).toBeGreaterThanOrEqual(5);
  }
  expect(CERT_PATHWAYS.ccna_200_301.status).toContain('2 February 2027');
  expect(CERT_PATHWAYS.ccna_200_301.status).toContain('3 February 2027');
  expect(CERT_PATHWAYS.ccip_sp.title).toContain('Service Provider');
  expect(CERT_PATHWAYS.ccip_sp.status).toContain('retired');
  expect(CERT_PATHWAYS.itil_ai_v5.examFacts).toContain('70%');
  expect(CERT_PATHWAYS.ccnp_encor.code).toContain('v1.2');
 });
 it('does not reinterpret unknown track IDs as verified standards', () => {
  expect(issuerPathwayFor('__proto__')).toBeNull();
  expect(issuerPathwayFor('toonbee')).toBeNull();
  expect(issuerPathwayFor('ccna_200_301')?.code).toContain('v1.1');
 });
});
