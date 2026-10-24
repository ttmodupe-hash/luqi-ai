/** Normalize SQL COUNT results without accepting malformed or unsafe values.
 * MySQL drivers can return aggregate integers as numbers, strings or bigints.
 * Never put a database value into the public error message.
 */
export function readSqlCount(rows: unknown): number {
  if (!Array.isArray(rows)) throw new TypeError('Invalid aggregate result');
  if (rows.length === 0) return 0;
  const row: unknown = rows[0];
  if (!row || typeof row !== 'object' || !Object.hasOwn(row, 'count')) {
    throw new TypeError('Invalid aggregate result');
  }
  const raw: unknown = (row as Record<string, unknown>).count;
  if (raw === null) return 0;
  if (typeof raw !== 'number' && typeof raw !== 'bigint' &&
      !(typeof raw === 'string' && /^\d+$/.test(raw))) {
    throw new TypeError('Invalid aggregate result');
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError('Invalid aggregate result');
  return value;
}
