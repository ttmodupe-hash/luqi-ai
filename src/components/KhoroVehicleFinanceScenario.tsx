import { useState } from 'react';
import { modelVehicleFinance } from '../lib/khoro-vehicle-finance';

/**
 * Optional additive KHORO tool. Not wired into navigation until Luqi
 * preservation and responsive acceptance gates have passed.
 */
export default function KhoroVehicleFinanceScenario() {
  const [principalRand, setPrincipal] = useState(280000);
  const [annualRatePercent, setRate] = useState(13.75);
  const [termMonths, setTerm] = useState(72);
  const [balloonPercent, setBalloon] = useState(30);
  const result = modelVehicleFinance({ principalRand, annualRatePercent, termMonths, balloonPercent });
  const money = (amount: number) => new Intl.NumberFormat('en-ZA', {
    style: 'currency', currency: 'ZAR', minimumFractionDigits: 2,
  }).format(amount);
  return (
    <section aria-labelledby="khoro-finance-title" className="w-full max-w-3xl rounded-2xl border border-emerald-700/40 bg-slate-950 p-4 text-white sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">Luqi · KHORO Finance Explorer</p>
      <h2 id="khoro-finance-title" className="mt-2 text-xl font-bold">Understand a balloon-payment scenario</h2>
      <p className="mt-2 text-sm text-slate-200">
        Compare illustrative fixed-rate instalments with and without a balloon payment.
        This is a calculator, not a credit quote or an assessment of your contract.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {([
          { id: 'principal', label: 'Amount financed (rand)', value: principalRand, min: 1000, max: 100000000, step: 1000, update: setPrincipal },
          { id: 'rate', label: 'Annual interest (%)', value: annualRatePercent, min: 0, max: 100, step: 0.25, update: setRate },
          { id: 'term', label: 'Repayment term (months)', value: termMonths, min: 1, max: 360, step: 1, update: setTerm },
          { id: 'balloon', label: 'Balloon at term end (%)', value: balloonPercent, min: 0, max: 90, step: 1, update: setBalloon },
        ] as const).map(field => (
          <label key={field.id} htmlFor={'khoro-' + field.id} className="block space-y-2 text-sm">
            <span>{field.label}</span>
            <input id={'khoro-' + field.id} className="w-full rounded-lg border border-slate-600 bg-slate-900 p-3 text-white"
              type="number" min={field.min} max={field.max} step={field.step} value={field.value}
              onChange={event => {
                const raw = Number(event.target.value);
                if (Number.isFinite(raw)) field.update(Math.max(field.min, Math.min(field.max,
                  field.id === 'term' ? Math.round(raw) : raw)));
              }} />
          </label>
        ))}
      </div>
      <div aria-live="polite" className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-600 bg-emerald-950/50 p-4">
          <h3 className="text-sm font-semibold">With balloon</h3>
          <p className="mt-2 text-xl font-bold">{money(result.monthlyInstalmentRand)} / month</p>
          <p className="mt-1 text-sm">Final balloon: {money(result.balloonDueRand)}</p>
          <p className="mt-1 text-sm">Illustrative total interest: {money(result.totalInterestRand)}</p>
        </div>
        <div className="rounded-xl border border-slate-600 bg-slate-900 p-4">
          <h3 className="text-sm font-semibold">Without balloon</h3>
          <p className="mt-2 text-xl font-bold">{money(result.comparisonMonthlyInstalmentRand)} / month</p>
          <p className="mt-1 text-sm">Final balloon: {money(0)}</p>
          <p className="mt-1 text-sm">Illustrative total interest: {money(result.comparisonTotalInterestRand)}</p>
        </div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-slate-300">
        Assumptions: fixed annual nominal rate divided by 12; equal month-end repayments;
        balloon paid separately at the end; no initiation or monthly fees, insurance,
        variable interest, overdue payments, penalties or contractual rounding.
        Real vehicle-finance agreements may differ. Check your lender's written quote.
        Nothing entered here is transmitted, stored or used for an AI request.
      </p>
    </section>
  );
}
