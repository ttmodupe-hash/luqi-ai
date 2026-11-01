import { useState } from 'react';
import { modelVehicleFinance, type VehicleFinanceScenario } from '../lib/khoro-vehicle-finance';

const fields = [
  { key: 'principalRand', id: 'principal', label: 'Amount financed (rand)', min: 1000, max: 100000000, step: 'any' },
  { key: 'annualRatePercent', id: 'rate', label: 'Annual interest (%)', min: 0, max: 100, step: 'any' },
  { key: 'termMonths', id: 'term', label: 'Repayment term (months)', min: 1, max: 360, step: '1' },
  { key: 'balloonPercent', id: 'balloon', label: 'Balloon at term end (%)', min: 0, max: 90, step: 'any' },
] as const;
type Draft = Record<keyof VehicleFinanceScenario, string>;
const money = (amount: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(amount);

/** Local-only addition to Consumer Rights. No accounts, storage or provider calls. */
export default function KhoroVehicleFinanceScenario() {
  const [draft, setDraft] = useState<Draft>({ principalRand: '280000', annualRatePercent: '13.75', termMonths: '72', balloonPercent: '30' });
  let result: ReturnType<typeof modelVehicleFinance> | null = null;
  try {
    if (fields.every(field => draft[field.key].trim() !== '')) {
      result = modelVehicleFinance({ principalRand: Number(draft.principalRand), annualRatePercent: Number(draft.annualRatePercent), termMonths: Number(draft.termMonths), balloonPercent: Number(draft.balloonPercent) });
    }
  } catch { /* Show validation feedback; never silently change an entered amount. */ }
  return <section aria-labelledby="khoro-finance-title" className="w-full min-w-0 max-w-3xl rounded-2xl border border-emerald-700/40 bg-slate-950 p-4 text-white sm:p-6">
    <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">Luqi · KHORO Finance Explorer</p>
    <h2 id="khoro-finance-title" className="mt-2 text-xl font-bold">Understand a balloon-payment scenario</h2>
    <p className="mt-2 text-sm text-slate-200">Compare illustrative fixed-rate instalments with and without a balloon payment. This is a calculator, not a credit quote or an assessment of your contract.</p>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      {fields.map(field => <label key={field.key} htmlFor={'khoro-' + field.id} className="block min-w-0 space-y-2 text-sm">
        <span>{field.label}</span>
        <input id={'khoro-' + field.id} className="w-full min-w-0 rounded-lg border border-slate-600 bg-slate-900 p-3 text-white" type="number"
          min={field.min} max={field.max} step={field.step} required value={draft[field.key]} aria-describedby="khoro-finance-validation"
          onChange={event => setDraft(previous => ({ ...previous, [field.key]: event.target.value }))} />
      </label>)}
    </div>
    <p id="khoro-finance-validation" role="status" className="mt-3 text-sm text-amber-200">{result ? 'Illustrative estimates updated.' : 'Enter an amount from R1,000 to R100,000,000, annual interest from 0% to 100%, a whole-number term from 1 to 360 months, and a balloon from 0% to 90%.'}</p>
    {result && <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2" aria-label="Finance comparison">
      <div className="min-w-0 break-words rounded-xl border border-emerald-600 bg-emerald-950/50 p-4">
        <h3 className="text-sm font-semibold">With balloon</h3>
        <p className="mt-2 text-xl font-bold">{money(result.monthlyInstalmentRand)} / month</p>
        <p className="mt-1 text-sm">Final balloon: {money(result.balloonDueRand)}</p>
        <p className="mt-1 text-sm">Illustrative total interest: {money(result.totalInterestRand)}</p>
        <p className="mt-1 text-sm">Illustrative total repaid: {money(result.totalPaidRand)}</p>
      </div>
      <div className="min-w-0 break-words rounded-xl border border-slate-600 bg-slate-900 p-4">
        <h3 className="text-sm font-semibold">Without balloon</h3>
        <p className="mt-2 text-xl font-bold">{money(result.comparisonMonthlyInstalmentRand)} / month</p>
        <p className="mt-1 text-sm">Final balloon: {money(0)}</p>
        <p className="mt-1 text-sm">Illustrative total interest: {money(result.comparisonTotalInterestRand)}</p>
        <p className="mt-1 text-sm">Illustrative total repaid: {money(result.totalPaidWithoutBalloonRand)}</p>
      </div>
    </div>}
    <p className="mt-4 text-xs leading-relaxed text-slate-300">Assumptions: fixed annual nominal rate divided by 12; equal month-end repayments; balloon paid separately at the end; no initiation or monthly fees, insurance, variable interest, overdue payments, penalties or contractual rounding. Instalments are displayed to cents; totals use unrounded calculations. Real vehicle-finance agreements may differ. Check your lender's written quote. Nothing entered here is transmitted, saved or used for an AI request.</p>
  </section>;
}
