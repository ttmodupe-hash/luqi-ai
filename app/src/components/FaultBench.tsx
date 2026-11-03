import { useState } from "react";
import "./fault-bench.css";

const loads = [24, 12, 4] as const;
type Joint = "resting" | "seated" | "jammed" | "stripped";

function CircuitBench() {
  const [load, setLoad] = useState<number>(12);
  const [state, setState] = useState<"open" | "running" | "tripped">("open");
  const demand = 12 / load;
  const running = state === "running";
  return (
    <>
      <div className="faultDiagram">
        <svg
          viewBox="0 0 330 108"
          role="img"
          aria-label={
            running
              ? "Closed circuit with current flowing"
              : "Open circuit with no current flowing"
          }
        >
          <g
            fill="none"
            stroke={running ? "#77e5b5" : "#94b0b6"}
            strokeWidth="4"
            strokeLinejoin="round"
          >
            <path d="M45 65V32H106 M144 32H182l6 -7 8 14 8 -14 8 14 8 -7h48v50H45v-9" />
            <path d={running ? "M106 32h38" : "M106 32l34 -18"} />
            <path d="M31 65h28M38 73h14" />
          </g>
          <g fill="#eaf2ef" fontSize="11" fontFamily="system-ui">
            <text x="16" y="101">
              12 V
            </text>
            <text x="88" y="59">
              Trip switch
            </text>
            <text x="178" y="59">
              Load · {load} Ω
            </text>
          </g>
        </svg>
      </div>
      <label>
        Choose the load{" "}
        <select
          value={load}
          onChange={(e) => {
            setLoad(Number(e.target.value));
            if (running) setState("open");
          }}
        >
          {loads.map((r) => (
            <option value={r} key={r}>
              {r} Ω
            </option>
          ))}
        </select>
      </label>
      <p>
        Predict the current. This ideal 12 V source has a model switch that
        trips immediately above 2 A.
      </p>
      <div className="benchActions">
        <button
          type="button"
          disabled={state !== "open"}
          onClick={() => setState(demand > 2 ? "tripped" : "running")}
        >
          Test circuit
        </button>
        <button
          type="button"
          disabled={state === "open"}
          onClick={() => setState("open")}
        >
          {state === "tripped" ? "Reset trip switch" : "Open switch"}
        </button>
      </div>
      <div role="status" className="benchResult">
        <strong>
          {state === "open"
            ? "Switch open"
            : running
              ? "Current flowing"
              : "Switch tripped"}
        </strong>
        {state === "open"
          ? "The meter reads 0 A. Test the circuit to see whether the switch stays closed."
          : running
            ? "12 V ÷ " +
              load +
              " Ω = " +
              demand +
              " A. The switch stays closed."
            : "The load demanded 3 A, above the 2 A model limit. Opening the switch brought current to 0 A. Try a higher resistance, then reset and test."}
      </div>
      <small>
        Classroom DC model. Real protection has device-specific trip curves.{" "}
        <a
          href="https://openstax.org/books/college-physics/pages/20-2-ohms-law-resistance-and-simple-circuits"
          target="_blank"
          rel="noreferrer"
        >
          Read about Ohm’s law ↗
        </a>
      </small>
    </>
  );
}

function ThreadBench() {
  const [pitch, setPitch] = useState("1.0");
  const [state, setState] = useState<Joint>("resting");
  const feedback = {
    resting: [
      "Ready to align",
      "The practice socket has a 1.0 mm pitch. Compare the spacing, then try the fit.",
    ],
    seated: [
      "Threads engaged",
      "Both threads advance 1.0 mm per turn in this model. The bolt seats smoothly.",
    ],
    jammed: [
      "Thread mismatch",
      "The bolt binds. Back it out and compare the two pitches, or explore what forcing it does in this simulation.",
    ],
    stripped: [
      "Threads stripped",
      "Forcing the mismatched practice part damaged its threads. Replace the virtual part before trying another fit.",
    ],
  }[state];
  const x =
    state === "seated"
      ? 118
      : state === "jammed" || state === "stripped"
        ? 86
        : 54;
  const spacing = pitch === "1.0" ? 9 : 13;
  return (
    <>
      <div className="faultDiagram">
        <svg
          viewBox="0 0 330 108"
          role="img"
          aria-label={"Thread cross-section · " + feedback[0]}
        >
          <path d="M174 22h103v20H174M174 66h103v20H174" fill="#4f7180" />
          {Array.from({ length: 10 }, (_, i) => (
            <path
              key={i}
              d={
                "M" +
                (177 + i * 9) +
                " 41l4 6 4 -6 M" +
                (177 + i * 9) +
                " 67l4 -6 4 6"
              }
              fill="#a4c5ce"
            />
          ))}
          <g
            transform={"translate(" + x + " 0)"}
            fill={state === "stripped" ? "#edaa82" : "#77e5b5"}
          >
            <path d="M0 32h16v45H0zM16 47h65v14H16z" />
            {state !== "stripped" &&
              Array.from({ length: Math.floor(59 / spacing) }, (_, i) => (
                <path
                  key={i}
                  d={
                    "M" +
                    (19 + i * spacing) +
                    " 47l4 -6 4 6 M" +
                    (19 + i * spacing) +
                    " 61l4 6 4 -6"
                  }
                />
              ))}
          </g>
          <g fill="#eaf2ef" fontSize="11" fontFamily="system-ui">
            <text x="34" y="100">
              Practice bolt
            </text>
            <text x="179" y="100">
              Socket · 1.0 mm pitch
            </text>
          </g>
        </svg>
      </div>
      <label>
        Choose bolt pitch{" "}
        <select
          value={pitch}
          disabled={state !== "resting"}
          onChange={(e) => setPitch(e.target.value)}
        >
          <option value="1.0">1.0 mm</option>
          <option value="1.5">1.5 mm</option>
        </select>
      </label>
      <p>
        Pitch is the spacing between threads. What happens when the bolt and
        socket have different spacing?
      </p>
      <div className="benchActions">
        {state === "resting" ? (
          <button
            type="button"
            onClick={() => setState(pitch === "1.0" ? "seated" : "jammed")}
          >
            Try the fit
          </button>
        ) : (
          <button type="button" onClick={() => setState("resting")}>
            {state === "stripped" ? "Replace practice part" : "Back out bolt"}
          </button>
        )}
        {state === "jammed" && (
          <button type="button" onClick={() => setState("stripped")}>
            Simulate forcing it
          </button>
        )}
      </div>
      <div className="benchResult" role="status">
        <strong>{feedback[0]}</strong>
        {feedback[1]}
      </div>
      <small>
        Illustrated training model. Both parts have the same nominal diameter.
        No torque or strength rating is inferred.
      </small>
    </>
  );
}

export default function FaultBench() {
  const [mode, setMode] = useState<"circuit" | "thread">("circuit");
  return (
    <section className="faultBench" aria-labelledby="bench-title">
      <header>
        <small>PRACTICAL SCIENCE · INTERACTIVE</small>
        <h2 id="bench-title">Fault bench</h2>
        <p>
          Make a prediction, test it, then repair the model. Each experiment
          runs on this device.
        </p>
      </header>
      <div
        className="benchModes"
        role="group"
        aria-label="Choose an experiment"
      >
        <button
          type="button"
          aria-pressed={mode === "circuit"}
          onClick={() => setMode("circuit")}
        >
          01 · DC circuit
        </button>
        <button
          type="button"
          aria-pressed={mode === "thread"}
          onClick={() => setMode("thread")}
        >
          02 · Thread fit
        </button>
      </div>
      {mode === "circuit" ? <CircuitBench /> : <ThreadBench />}
    </section>
  );
}
