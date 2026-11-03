import { useState } from "react";

const fuelFields = [
  { label: "Road distance (km)", placeholder: "e.g. 145" },
  { label: "Fuel use (L/100 km)", placeholder: "e.g. 7.4" },
  { label: "Pump price (R/L)", placeholder: "Enter your local price" },
];

export default function TripFuel() {
  // No assumed national price: both distance and consumption are user inputs too.
  const [values, setValues] = useState(["", "", ""]);
  const [km, consumption, price] = values.map(Number);
  const litres = (km * consumption) / 100;
  const cost = litres * price;
  const valid =
    values.every(
      (v) => v.trim() !== "" && Number.isFinite(Number(v)) && Number(v) > 0,
    ) &&
    Number.isFinite(litres) &&
    Number.isFinite(cost);

  return (
    <details className="driveFuel">
      <summary>Trip fuel budget</summary>
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
      {fuelFields.map(({ label, placeholder }, i) => (
        <label key={label}>
          {label}
          <input
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            placeholder={placeholder}
            value={values[i]}
            onChange={(e) =>
              setValues((previous) =>
                previous.map((v, j) => (j === i ? e.target.value : v)),
              )
            }
          />
        </label>
      ))}
      <p role="status" aria-label="Trip fuel estimate" aria-live="polite">
        {valid
          ? litres.toFixed(1) +
            " L · R" +
            cost.toFixed(2) +
            " estimated fuel cost (excluding tolls)"
          : "Enter three positive amounts to calculate a trip estimate."}
      </p>
    </details>
  );
}
