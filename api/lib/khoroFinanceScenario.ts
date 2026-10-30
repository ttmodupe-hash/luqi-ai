/**
 * KHORO/Luqi backend-ready finance capability.
 * Pure validated request handler: no network, DB, accounts, AI, or payment effects.
 * Not registered as a public API until authentication/rate-limit and consent
 * acceptance is completed. Shared arithmetic with the browser calculator.
 */
import { modelVehicleFinance } from '../../src/lib/khoro-vehicle-finance';

export type KhoroFinanceRequest = {
  principalRand: number;
  annualRatePercent: number;
  termMonths: number;
  balloonPercent: number;
};
export type KhoroFinanceEnvelope =
  | { ok: true; kind: 'ILLUSTRATIVE_FINANCE_SCENARIO'; result: ReturnType<typeof modelVehicleFinance>; limitations: readonly string[] }
  | { ok: false; error: 'INVALID_REQUEST' };

export const KHORO_FINANCE_LIMITATIONS = [
  'Illustrative equal-monthly-payment scenario, not a lender quote or legal advice.',
  'Assumes nominal fixed annual interest divided by twelve and end-of-month payments.',
  'Excludes fees, insurance, arrears, penalties, variable rates and contract rounding.',
  'The balloon is payable separately at the end of the term.',
] as const;

export function evaluateKhoroFinanceRequest(body: unknown): KhoroFinanceEnvelope {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'INVALID_REQUEST' };
  const object = body as Record<string, unknown>;
  const keys = ['principalRand', 'annualRatePercent', 'termMonths', 'balloonPercent'];
  if (Object.keys(object).length !== keys.length ||
      keys.some(key => typeof object[key] !== 'number' || !Number.isFinite(object[key]))) {
    return { ok: false, error: 'INVALID_REQUEST' };
  }
  try {
    const result = modelVehicleFinance({
      principalRand: object.principalRand as number,
      annualRatePercent: object.annualRatePercent as number,
      termMonths: object.termMonths as number,
      balloonPercent: object.balloonPercent as number,
    });
    return { ok: true, kind: 'ILLUSTRATIVE_FINANCE_SCENARIO', result, limitations: KHORO_FINANCE_LIMITATIONS };
  } catch {
    return { ok: false, error: 'INVALID_REQUEST' };
  }
}
