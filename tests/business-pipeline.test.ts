import { describe, expect, it } from 'vitest';
import { parseSalesFile, serializeSalesFile, summarizeSales, validateSalesRecords } from '../src/lib/business-pipeline';
import type { SalesRecord } from '../src/lib/business-pipeline';
const first: SalesRecord = {
  id: 'da9c1eb2-62f6-45fb-b7f9-a989521270ae',
  alias: 'Client A', valueZar: '100.25', stage: 'sent', followUpDate: '2026-10-25',
};
const second: SalesRecord = {
  id: 'ba9c1eb2-62f6-45fb-b7f9-a989521270ae',
  alias: 'Client B', valueZar: '40.10', stage: 'won', followUpDate: null,
};
describe('offline owned-by-file sales board', () => {
  it('counts open, won and due records with exact cents and no inferred conversion', () => {
    expect(summarizeSales([first, second], '2026-10-25')).toEqual({
      openCount: 1, wonCount: 1, dueCount: 1,
      openValueZar: '100.25', wonValueZar: '40.10',
    });
    expect(summarizeSales([first, second], '2026-10-24').dueCount).toBe(0);
    expect(summarizeSales([first, second, {
      id: 'ca9c1eb2-62f6-45fb-b7f9-a989521270ae',
      alias: 'Client C', valueZar: '0.20', stage: 'followup', followUpDate: '2026-10-20',
    }], '2026-10-25').openValueZar).toBe('100.45');
  });
  it('roundtrips a bounded strictly validated JSON archive', () => {
    const file = serializeSalesFile([first, second]);
    expect(parseSalesFile(file)).toEqual([first, second]);
    expect(serializeSalesFile(parseSalesFile(file))).toBe(file);
  });
  it('refuses malformed and untrusted records, format or unknown properties', () => {
    for (const bad of [
      '{"format":"luqi.sales-board.v0","records":[]}',
      '{"format":"luqi.sales-board.v1","records":[],"secret":"extra"}',
      '{"format":"luqi.sales-board.v1","records":[{"alias":"No id"}]}',
      '<script>alert(1)</script>',
      ' '.repeat(32769),
    ]) expect(() => parseSalesFile(bad)).toThrow('INVALID_PIPELINE_FILE');
    for (const bad of [
      { ...first, valueZar: '100.251' },
      { ...first, valueZar: '-1.00' },
      { ...first, alias: 'A\nhidden data' },
      { ...first, followUpDate: '2026-02-30' },
      { ...first, stage: 'won' },
      { ...first, stage: 'unknown' },
      { ...first, ownerId: 'another-user' },
    ]) expect(() => validateSalesRecords([bad])).toThrow('INVALID_PIPELINE_FILE');
    expect(() => validateSalesRecords([first, first])).toThrow('INVALID_PIPELINE_FILE');
    expect(() => validateSalesRecords(Array(51).fill(first))).toThrow('INVALID_PIPELINE_FILE');
  });
  it('stores no payment records, secret account metadata, provider values or unbounded notes', () => {
    const file = serializeSalesFile([first]);
    expect(file).not.toContain('payment');
    expect(file).not.toContain('billing');
    expect(file).not.toContain('token');
    expect(file.length).toBeLessThan(2048);
  });
});
