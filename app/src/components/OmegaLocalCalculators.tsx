import { useState, type FormEvent } from 'react';
import {
  calculateLocalBudget,
  calculateLocalSchedule,
  type LocalBudgetResult,
  type LocalScheduleResult,
} from '../lib/omega-local-calculators';

type Mode = 'travel.budget' | 'vehicle.schedule';
type VehicleFields = {
  odometerKm: string;
  lastServiceKm: string;
  lastServiceDate: string;
  today: string;
  intervalKm: string;
  intervalDays: string;
};
const emptyVehicle: VehicleFields = {
  odometerKm: '', lastServiceKm: '', lastServiceDate: '',
  today: '', intervalKm: '', intervalDays: '',
};
const numericFields = [
  ['odometerKm', 'Local current odometer (km)', 0, 10000000],
  ['lastServiceKm', 'Local odometer at last service (km)', 0, 10000000],
  ['intervalKm', 'Local manufacturer distance interval (km)', 1, 1000000],
  ['intervalDays', 'Local manufacturer time interval (days)', 1, 3650],
] as const;
const dateFields = [
  ['lastServiceDate', 'Local date of last service'], ['today', 'Local assessment date'],
] as const;
function decimalInteger(value: string): number {
  return /^[0-9]+$/.test(value) ? Number(value) : NaN;
}

/** Two real, no-cost calculations, independent of disabled queued tasks. */
export default function OmegaLocalCalculators() {
  const [mode, setMode] = useState<Mode>('travel.budget');
  const [currency, setCurrency] = useState('ZAR');
  const [amounts, setAmounts] = useState('');
  const [vehicle, setVehicle] = useState<VehicleFields>(emptyVehicle);
  const [result, setResult] = useState<
    { kind: 'budget'; value: LocalBudgetResult } |
    { kind: 'vehicle'; value: LocalScheduleResult } | null
  >(null);
  const [error, setError] = useState('');
  function invalidate() { setResult(null); setError(''); }
  function calculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    invalidate();
    try {
      if (mode === 'travel.budget') {
        const values = amounts.split(/\r?\n/).map(value => value.trim());
        setResult({ kind: 'budget', value: calculateLocalBudget({ currency: currency.trim().toUpperCase(), amounts: values }) });
      } else {
        setResult({ kind: 'vehicle', value: calculateLocalSchedule({
          odometerKm: decimalInteger(vehicle.odometerKm),
          lastServiceKm: decimalInteger(vehicle.lastServiceKm),
          intervalKm: decimalInteger(vehicle.intervalKm),
          intervalDays: decimalInteger(vehicle.intervalDays),
          lastServiceDate: vehicle.lastServiceDate,
          today: vehicle.today,
        }) });
      }
    } catch {
      setError('Check the supplied amounts, dates and service intervals. No result was produced.');
    }
  }

  return (
    <section id="omega-local-tools" className="omega-panel omega-local" aria-labelledby="omega-local-title">
      <span className="omega-badge">Available in your browser</span>
      <h2 id="omega-local-title">Luqi quick calculations</h2>
      <p>Calculate now without signing in or waiting for a worker. The calculation runs only in this browser tab; it sends no inputs to Luqi, AI providers or third parties and saves no task.</p>
      <form className="omega-submit" onSubmit={calculate}>
        <label htmlFor="omega-local-type">Choose a local calculation</label>
        <select id="omega-local-type" value={mode} onChange={event => {
          setMode(event.target.value as Mode); invalidate();
        }}>
          <option value="travel.budget">Travel budget total</option>
          <option value="vehicle.schedule">Vehicle service schedule (local)</option>
        </select>
        {mode === 'travel.budget' ? <>
          <label htmlFor="omega-local-currency">Local currency code</label>
          <input id="omega-local-currency" value={currency} maxLength={3} required
            onChange={event => { setCurrency(event.target.value); invalidate(); }} />
          <label htmlFor="omega-local-amounts">Local amounts (one per line)</label>
          <textarea id="omega-local-amounts" rows={3} maxLength={700} required value={amounts}
            onChange={event => { setAmounts(event.target.value); invalidate(); }} />
          <p className="omega-muted">Enter 1–50 nonnegative amounts, at most two decimal places, all in one currency. No live prices, visa advice or FX conversion.</p>
        </> : <>
          <div className="omega-input-grid">
            {numericFields.map(([key, label, min, max]) => <label key={key} htmlFor={'omega-local-' + key}>
              {label}
              <input id={'omega-local-' + key} type="number" step="1" min={min} max={max} required
                value={vehicle[key]} onChange={event => {
                  setVehicle(previous => ({ ...previous, [key]: event.target.value })); invalidate();
                }} />
            </label>)}
            {dateFields.map(([key, label]) => <label key={key} htmlFor={'omega-local-' + key}>
              {label}
              <input id={'omega-local-' + key} type="date" min="1900-01-01" max="2099-12-31" required
                value={vehicle[key]} onChange={event => {
                  setVehicle(previous => ({ ...previous, [key]: event.target.value })); invalidate();
                }} />
            </label>)}
          </div>
          <p className="omega-muted">Use the actual service history and manufacturer intervals. No vehicle records are fetched or stored. This is not a safety inspection.</p>
        </>}
        <button type="submit" className="luqi-primary">Calculate in browser</button>
      </form>
      {error && <p role="alert" className="omega-notice">{error}</p>}
      {result && <div className="omega-result" role="status" aria-label="Local calculation result">
        {result.kind === 'budget' ? <>
          <p className="omega-result-number">{result.value.currency} {result.value.total}</p>
          <p>Sum of your entered amounts.</p>
        </> : <>
          <p className="omega-result-number">{result.value.needsService ? 'Service is due' : 'Service is not yet due'}</p>
          <dl>
            <dt>{result.value.kmRemaining < 0 ? 'Distance overdue' : 'Distance remaining'}</dt>
            <dd>{Math.abs(result.value.kmRemaining).toLocaleString()} km</dd>
            <dt>Due date</dt><dd>{result.value.serviceDueDate}</dd>
            <dt>Distance threshold reached</dt><dd>{result.value.overdueByKm ? 'Yes' : 'No'}</dd>
            <dt>Date threshold reached</dt><dd>{result.value.overdueByDate ? 'Yes' : 'No'}</dd>
          </dl>
        </>}
        <p>{result.value.notice}</p>
        <p>This result is not saved to your account or the Luqi task queue.</p>
      </div>}
      <p className="omega-muted">Live weather feeds, official travel/visa information, university and scholarship results, water/sanitation sources, and background Luqi workers still require separate integration and acceptance. This calculator does not make those services available.</p>
    </section>
  );
}
