import { useState } from "react";
import { ArrowRight, Fuel, Info, Sparkles, Users } from "lucide-react";
import { emptyFuelDraft, estimateFuel, type FuelDraft } from "./trip-fuel";

const fuelFields = [
  {
    key: "distance",
    label: "Road distance (km)",
    placeholder: "e.g. 600",
    unit: "km",
  },
  {
    key: "consumption",
    label: "Fuel use (L/100 km)",
    placeholder: "e.g. 7.4",
    unit: "L/100 km",
  },
  {
    key: "price",
    label: "Pump price (R/L)",
    placeholder: "Local pump price",
    unit: "R/L",
  },
] as const;
const money = (n: number) =>
  new Intl.NumberFormat("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

export default function TripFuel({
  value,
  onChange,
}: {
  value?: FuelDraft;
  onChange?: (draft: FuelDraft) => void;
}) {
  const [local, setLocal] = useState(emptyFuelDraft);
  const draft = value ?? local;
  function update(next: Partial<FuelDraft>) {
    const changed = { ...draft, ...next };
    setLocal(changed);
    onChange?.(changed);
  }
  const estimate = estimateFuel(draft);
  const complete = fuelFields.filter(
    ({ key }) =>
      draft[key].trim() !== "" &&
      Number.isFinite(Number(draft[key])) &&
      Number(draft[key]) > 0,
  ).length;
  const consumption = Number(draft.consumption);
  const highConsumption = Number.isFinite(consumption) && consumption > 35;
  const decimalSuggestion =
    consumption >= 50 && consumption <= 200 ? consumption / 10 : null;

  return (
    <section className="driveFuel" aria-labelledby="trip-fuel-title">
      <div className="planningCardTop">
        <span className="driveOverline">
          <Fuel size={14} /> COST INTELLIGENCE
        </span>
        <span className="drivePill">On-device calculator</span>
      </div>
      <h2 id="trip-fuel-title">Trip fuel budget</h2>
      <p className="planningIntro">Know the cost before you go.</p>
      <div className="fuelTripType" role="group" aria-label="Journey type">
        <button
          type="button"
          aria-pressed={!draft.returning}
          onClick={() => update({ returning: false })}
        >
          One way <ArrowRight size={14} />
        </button>
        <button
          type="button"
          aria-pressed={draft.returning}
          onClick={() => update({ returning: true })}
        >
          Return trip <span aria-hidden="true">↔</span>
        </button>
      </div>
      <p className="fuelInputHint">
        {draft.returning
          ? "Enter the one-way road distance. We double it for your return."
          : "Use the road distance from your navigation app."}
      </p>
      <div className="fuelInputs">
        {fuelFields.map(({ key, label, placeholder, unit }, index) => (
          <label key={key}>
            <span>
              <i aria-hidden="true">0{index + 1}</i>
              {label}
            </span>
            <div className="fuelInputWrap">
              <input
                aria-label={label}
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                placeholder={placeholder}
                value={draft[key]}
                onChange={(e) => update({ [key]: e.target.value })}
                aria-describedby={
                  key === "consumption" && highConsumption
                    ? "fuel-consumption-check"
                    : undefined
                }
              />
              <b aria-hidden="true">{unit}</b>
            </div>
          </label>
        ))}
      </div>
      <div
        className="fuelPresets"
        role="group"
        aria-label="Example fuel consumption"
      >
        <span>Try a fuel-use example</span>
        {[6, 8, 12].map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={draft.consumption === String(n)}
            onClick={() => update({ consumption: String(n) })}
          >
            {n} L/100 km
          </button>
        ))}
      </div>
      {highConsumption && (
        <div id="fuel-consumption-check" className="fuelCheck" role="status">
          <Info size={17} />
          <div>
            <strong>Check your fuel use</strong>
            <p>
              {consumption} L/100 km is a high entry. Confirm it matches your
              vehicle.
              {decimalSuggestion !== null &&
                ` If you meant ${decimalSuggestion.toFixed(1)}, you can update it below.`}
            </p>
            {decimalSuggestion !== null && (
              <button
                type="button"
                onClick={() =>
                  update({ consumption: String(decimalSuggestion) })
                }
              >
                Use {decimalSuggestion.toFixed(1)} L/100 km
              </button>
            )}
          </div>
        </div>
      )}
      <div className="fuelEstimateCard">
        <div className="fuelEstimateTop">
          <span>ESTIMATED FUEL COST</span>
          <Fuel size={18} />
        </div>
        <div className="fuelAmount">
          <span>R</span>
          {estimate ? money(estimate.cost) : "—"}
        </div>
        <p className="fuelCostScope">
          {draft.returning ? "Return journey" : "One-way journey"} · fuel only,
          excluding tolls
        </p>
        <div className="fuelFacts">
          <div>
            <span>Total distance</span>
            <strong>
              {estimate
                ? money(estimate.distance).replace(/\.00$/, "") + " km"
                : "—"}
            </strong>
          </div>
          <div>
            <span>Fuel needed</span>
            <strong>
              {estimate ? estimate.litres.toFixed(1) + " L" : "—"}
            </strong>
          </div>
          <div>
            <span>Cost per km</span>
            <strong>{estimate ? "R" + money(estimate.perKm) : "—"}</strong>
          </div>
        </div>
        <div className="fuelSplit">
          <label>
            <Users size={15} /> Travellers
            <select
              aria-label="Travellers"
              value={draft.travellers}
              onChange={(e) => update({ travellers: e.target.value })}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <div>
            <strong>
              {estimate?.perPerson != null
                ? "R" + money(estimate.perPerson)
                : "—"}
            </strong>
            <span>per person, equal split</span>
          </div>
        </div>
      </div>
      <p
        className="fuelLiveStatus"
        role="status"
        aria-label="Trip fuel estimate"
        aria-live="polite"
      >
        {estimate
          ? estimate.litres.toFixed(1) +
            " L · R" +
            estimate.cost.toFixed(2) +
            " estimated fuel cost (excluding tolls)"
          : "Enter three positive amounts to calculate a trip estimate."}
      </p>
      {!estimate && (
        <div className="fuelProgress">
          <span aria-hidden="true">
            {fuelFields.map(({ key }) => (
              <i
                key={key}
                className={
                  draft[key].trim() !== "" &&
                  Number(draft[key]) > 0 &&
                  Number.isFinite(Number(draft[key]))
                    ? "complete"
                    : ""
                }
              />
            ))}
          </span>
          <small>{complete} of 3 inputs ready</small>
        </div>
      )}
      <details className="fuelAssumptions">
        <summary>
          <Info size={14} /> Prices &amp; calculation details
        </summary>
        <p>
          Enter your journey distance, your vehicle's fuel use and the actual
          local pump price for your fuel. No live pump price is loaded. Prices
          depend on date, location and fuel type; diesel retail prices may vary
          between stations. Check the date and zone in the{" "}
          <a
            href="https://www.dmpr.gov.za/Branches/Petroleum-Resources/Fuel-Prices"
            target="_blank"
            rel="noopener noreferrer"
          >
            official DMPR fuel-price notices (opens in new tab)
          </a>
          . Tolls are separate.
        </p>
        <p>
          Litres = road distance × fuel use ÷ 100. Cost = litres × pump price.
          Example fuel-use buttons are editable assumptions. The estimate does
          not include traffic, detours or other travel costs.
        </p>
      </details>
      <div className="planningFooter">
        <Sparkles size={13} /> Instant calculations · no AI request or location
        sharing
      </div>
    </section>
  );
}
