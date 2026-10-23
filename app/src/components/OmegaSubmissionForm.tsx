import { useEffect, useRef, useState } from "react";
import { omegaDraftSchema, type OmegaDraft, type OmegaSubmission } from "../lib/omega-tasks";

type Handler = OmegaDraft["handler"];
type Props = {
  handlers: Handler[];
  disabled: boolean;
  submission: OmegaSubmission | null;
  ambiguous: boolean;
  onReview: (draft: OmegaDraft) => void;
  onEdit: () => void;
  onConfirm: () => void;
};
function localDate() {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")].join("-");
}
const numberFields = [
  ["odometerKm", "Current odometer (km)", 0, 10_000_000],
  ["lastServiceKm", "Odometer at last service (km)", 0, 10_000_000],
  ["intervalKm", "Manufacturer service interval (km)", 1, 1_000_000],
  ["intervalDays", "Manufacturer service interval (days)", 1, 3650],
] as const;
export default function OmegaSubmissionForm({
  handlers, disabled, submission, ambiguous, onReview, onEdit, onConfirm,
}: Props) {
  const [handler, setHandler] = useState<Handler>(handlers[0] ?? "travel.budget");
  const [currency, setCurrency] = useState("ZAR");
  const [amounts, setAmounts] = useState("");
  const [vehicle, setVehicle] = useState({
    odometerKm: "", lastServiceKm: "", intervalKm: "", intervalDays: "",
    lastServiceDate: "", today: localDate(),
  });
  const [error, setError] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const picker = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    setAcknowledged(false);
    if (submission) reviewHeading.current?.focus();
    else picker.current?.focus();
  }, [submission?.idempotencyKey]);
  if (submission) return (
    <section className="omega-panel omega-submit" aria-label="Review task submission">
      <h2 ref={reviewHeading} tabIndex={-1}>Review before queuing</h2>
      <p>{submission.handler === "travel.budget" ? "Travel budget" : "Vehicle service schedule"}</p>
      {submission.handler === "travel.budget" ? (
        <p className="omega-input-summary">{submission.payload.currency}: {submission.payload.amounts.join(" + ")}</p>
      ) : (
        <dl>
          <dt>Current odometer</dt><dd>{submission.payload.odometerKm} km</dd>
          <dt>Odometer at last service</dt><dd>{submission.payload.lastServiceKm} km</dd>
          <dt>Last service date</dt><dd>{submission.payload.lastServiceDate}</dd>
          <dt>Assessment date</dt><dd>{submission.payload.today}</dd>
          <dt>Supplied service interval</dt>
          <dd>{submission.payload.intervalKm} km or {submission.payload.intervalDays} days</dd>
        </dl>
      )}
      <p>Saving only queues this calculation. An operator must run a worker; execution and completion are not promised.</p>
      {ambiguous && <p className="omega-notice">
        Keep these inputs unchanged. Retrying this same submission reuses its request reference to avoid creating another task.
        Signing out or leaving clears this draft; check saved tasks before starting another.
      </p>}
      <label className="omega-acknowledgement">
        <input type="checkbox" checked={acknowledged} disabled={disabled}
          onChange={event => setAcknowledged(event.target.checked)} />
        I understand this only queues the task.
      </label>
      <div className="omega-submit-actions">
        {!ambiguous && <button type="button" className="luqi-secondary" disabled={disabled} onClick={onEdit}>Edit inputs</button>}
        <button type="button" className="luqi-primary" disabled={disabled || !acknowledged} onClick={onConfirm}>
          {ambiguous ? "Retry same submission" : "Queue task"}
        </button>
      </div>
    </section>
  );
  return (
    <form className="omega-panel omega-submit" aria-label="New calculation" onSubmit={event => {
      event.preventDefault();
      if (disabled || !handlers.includes(handler)) return;
      const integer = (value: string) => /^(0|[1-9][0-9]*)$/.test(value) ? Number(value) : NaN;
      const candidate = handler === "travel.budget"
        ? { handler, payload: { currency: currency.trim().toUpperCase(), amounts: amounts.trim().split(/\r?\n/).map(value => value.trim()) } }
        : { handler, payload: { odometerKm: integer(vehicle.odometerKm), lastServiceKm: integer(vehicle.lastServiceKm),
          intervalKm: integer(vehicle.intervalKm), intervalDays: integer(vehicle.intervalDays),
          lastServiceDate: vehicle.lastServiceDate, today: vehicle.today } };
      const checked = omegaDraftSchema.safeParse(candidate);
      if (!checked.success) {
        setError(handler === "travel.budget"
          ? "Use a three-letter currency code and 1–50 non-negative amounts, one per line, with at most two decimal places."
          : "Check dates and whole-number distances and intervals. Last service cannot be after the assessment date or current odometer.");
        return;
      }
      setError("");
      onReview(checked.data);
    }}>
      <h2>Queue a calculation</h2>
      <p>Use your own figures. This form does not start a worker, buy anything or contact an AI provider.</p>
      {error && <p role="alert" id="omega-input-error" className="omega-notice">{error}</p>}
      <fieldset disabled={disabled}>
        <legend className="sr-only">Calculation inputs</legend>
        <label htmlFor="omega-calculation-type">Calculation type</label>
        <select id="omega-calculation-type" ref={picker} value={handler}
          onChange={event => { setHandler(event.target.value as Handler); setError(""); }}>
          {handlers.includes("travel.budget") && <option value="travel.budget">Travel budget</option>}
          {handlers.includes("vehicle.schedule") && <option value="vehicle.schedule">Vehicle service schedule</option>}
        </select>
        {handler === "travel.budget" ? <>
          <label>Currency code
            <input required maxLength={3} pattern="[A-Za-z]{3}" value={currency}
              onChange={event => setCurrency(event.target.value)} />
          </label>
          <label>Amounts, one per line
            <textarea required rows={5} maxLength={700} value={amounts}
              aria-describedby="omega-budget-help" onChange={event => setAmounts(event.target.value)} />
          </label>
          <p id="omega-budget-help" className="omega-muted">Up to 50 amounts in one currency. Use a dot for decimals; no live prices or exchange rates.</p>
        </> : <>
          <div className="omega-input-grid">
            {numberFields.map(([field, label, min, max]) => <label key={field}>{label}
              <input type="number" required step={1} min={min} max={max} value={vehicle[field]}
                onChange={event => setVehicle(previous => ({ ...previous, [field]: event.target.value }))} />
            </label>)}
            {([["lastServiceDate", "Last service date"], ["today", "Assessment date"]] as const).map(([field, label]) =>
              <label key={field}>{label}
                <input type="date" required min="1900-01-01" max="2099-12-31" value={vehicle[field]}
                  onChange={event => setVehicle(previous => ({ ...previous, [field]: event.target.value }))} />
              </label>)}
          </div>
          <p className="omega-muted">Supply the manufacturer’s intervals. This scheduling aid does not replace a mechanic’s advice.</p>
        </>}
        <button className="luqi-primary" type="submit">Review task</button>
      </fieldset>
    </form>
  );
}
