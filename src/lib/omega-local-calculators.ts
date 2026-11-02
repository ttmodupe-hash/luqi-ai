/**
 * Pure browser-only web-v1 calculations, matching omega_ai.web_tasks.
 * No network, storage, FX, vehicle registry or AI inference.
 */
export type LocalBudgetInput = { currency: string; amounts: string[] };
export type LocalScheduleInput = {
  odometerKm: number;
  lastServiceKm: number;
  lastServiceDate: string;
  today: string;
  intervalKm: number;
  intervalDays: number;
};
export type LocalBudgetResult = {
  total: string;
  currency: string;
  basis: 'user_supplied';
  notice: 'Arithmetic from supplied amounts; no live prices or FX rates.';
};
export type LocalScheduleResult = {
  kmRemaining: number;
  serviceDueDate: string;
  overdueByKm: boolean;
  overdueByDate: boolean;
  needsService: boolean;
  basis: 'user_supplied';
  notice: "Scheduling aid only; follow manufacturer instructions and a mechanic's advice.";
};
const currencyPattern = /^[A-Z]{3}$/;
const amountPattern = /^(0|[1-9][0-9]{0,8})(\.[0-9]{1,2})?$/;
const datePattern = /^(19|20)[0-9]{2}-[0-9]{2}-[0-9]{2}$/;
const dayMs = 24 * 60 * 60 * 1000;

function utcDay(value: string): number {
  if (!datePattern.test(value)) throw new Error('INVALID_INPUT');
  const [year, month, day] = value.split('-').map(Number);
  const time = Date.UTC(year, month - 1, day);
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) {
    throw new Error('INVALID_INPUT');
  }
  return time;
}
function whole(value: number, min: number, max: number): boolean {
  return Number.isSafeInteger(value) && value >= min && value <= max;
}

export function calculateLocalBudget(input: LocalBudgetInput): LocalBudgetResult {
  if (!input || typeof input.currency !== 'string' || !currencyPattern.test(input.currency) ||
      !Array.isArray(input.amounts) || input.amounts.length < 1 || input.amounts.length > 50) {
    throw new Error('INVALID_INPUT');
  }
  let cents = 0n;
  for (const amount of input.amounts) {
    if (typeof amount !== 'string' || !amountPattern.test(amount)) throw new Error('INVALID_INPUT');
    const [units, fraction = ''] = amount.split('.');
    cents += BigInt(units) * 100n + BigInt(fraction.padEnd(2, '0'));
  }
  return {
    total: String(cents / 100n) + '.' + String(cents % 100n).padStart(2, '0'),
    currency: input.currency,
    basis: 'user_supplied',
    notice: 'Arithmetic from supplied amounts; no live prices or FX rates.',
  };
}

export function calculateLocalSchedule(input: LocalScheduleInput): LocalScheduleResult {
  if (!input || !whole(input.odometerKm, 0, 10_000_000) ||
      !whole(input.lastServiceKm, 0, 10_000_000) ||
      !whole(input.intervalKm, 1, 1_000_000) ||
      !whole(input.intervalDays, 1, 3650) ||
      input.lastServiceKm > input.odometerKm) throw new Error('INVALID_INPUT');
  const last = utcDay(input.lastServiceDate);
  const today = utcDay(input.today);
  if (last > today) throw new Error('INVALID_INPUT');
  const due = last + input.intervalDays * dayMs;
  const kmRemaining = input.lastServiceKm + input.intervalKm - input.odometerKm;
  const overdueByKm = kmRemaining <= 0;
  const overdueByDate = today >= due;
  return {
    kmRemaining,
    serviceDueDate: new Date(due).toISOString().slice(0, 10),
    overdueByKm,
    overdueByDate,
    needsService: overdueByKm || overdueByDate,
    basis: 'user_supplied',
    notice: "Scheduling aid only; follow manufacturer instructions and a mechanic's advice.",
  };
}
