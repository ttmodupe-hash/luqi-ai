import { useState } from "react";
export default function TripFuel() {
  const [values, setValues] = useState(["145", "7.4", "21.45"]);
  const [km, consumption, price] = values.map(Number);
  const valid = values.every(
    (v) => v.trim() !== "" && Number.isFinite(Number(v)) && Number(v) >= 0,
  );
  const litres = (km * consumption) / 100;
  return (
    <details className="driveFuel">
      <summary>Trip fuel budget</summary>
      <p>
        Enter the road distance and pump price for your journey. Tolls are
        separate.
      </p>
      {["Road distance (km)", "Fuel use (L/100 km)", "Pump price (R/L)"].map(
        (label, i) => (
          <label key={label}>
            {label}
            <input
              type="number"
              min="0"
              step="any"
              value={values[i]}
              onChange={(e) =>
                setValues(values.map((v, j) => (j === i ? e.target.value : v)))
              }
            />
          </label>
        ),
      )}
      <p>
        {valid
          ? litres.toFixed(1) + " L · R" + (litres * price).toFixed(2)
          : "Enter three valid amounts to estimate the trip."}
      </p>
    </details>
  );
}
