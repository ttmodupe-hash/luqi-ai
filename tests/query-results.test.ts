import { describe, expect, it } from 'vitest';
import { readSqlCount } from '../api/lib/queryResults';

describe('SQL aggregate result boundary', () => {
  it.each([0, 3, '3', '003', 3n, Number.MAX_SAFE_INTEGER, String(Number.MAX_SAFE_INTEGER)])(
    'normalizes a valid integer %s', value => expect(readSqlCount([{ count: value }])).toBe(Number(value)));
  it('handles an empty result and SQL null', () => {
    expect(readSqlCount([])).toBe(0);
    expect(readSqlCount([{ count: null }])).toBe(0);
  });
  it.each([undefined, '', ' ', '1.5', 'NaN', '-1', '1e3', true, {}, [], -1, 0.5, NaN, Infinity,
    Number.MAX_SAFE_INTEGER + 1, '9007199254740992', 9007199254740992n].map(value => ({ value })))(
    'rejects an invalid aggregate without exposing its value: $value', ({ value }) => {
      expect(() => readSqlCount([{ count: value }])).toThrow('Invalid aggregate result');
    });
  it.each([null, {}, 'private-db-value', [null], [{}], [Object.create({ count: 3 })]].map(rows => ({ rows })))(
    'rejects malformed rows', ({ rows }) => expect(() => readSqlCount(rows)).toThrow('Invalid aggregate result'));
});
