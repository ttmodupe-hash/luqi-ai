import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Link, useSearchParams } from "react-router";
import { useOptionalCustomerSession } from "../../providers/customer-session";
import NetworkVlsmPlanner from "../../components/NetworkVlsmPlanner";
import { calculateIPv4Subnet } from "../../lib/network-planner";
import {
  checkedReviewInput,
  checkedReviewReport,
  REVIEW_LANGUAGES,
  REVIEW_RULES,
  type ReviewLanguage,
  type ReviewReport,
} from "./review-contract";
import { checkedComparison, type ComparisonResult } from "./compute-engine";
import {
  INITIAL_COST_ASSUMPTIONS,
  ILLUSTRATIVE_COST_ASSUMPTIONS,
  planTokenCosts,
  type CostAssumptions,
} from "./cost-planner";
import {
  POINTS,
  designTokens,
  forecast,
  productPlan,
  type ProductPlan,
} from "./planning-engine";
import {
  DEVSECNET_DEMO,
  DEVSECNET_EXAMPLES,
  DEVSECNET_SOURCES,
} from "./reference-examples";
import "./devsecnet.css";
const PANELS = [
  ["product", "S1 · Product & PM"],
  ["design", "S2 · Design"],
  ["engineering", "S3 · Engineering"],
  ["security", "S4 · Security"],
  ["network", "S5 · Network"],
  ["compute", "S6 · Compute & costs"],
] as const;
const emptyPlan = (): ProductPlan => ({
  name: "",
  idea: "",
  audience: "",
  metric: "",
  constraints: "",
  capacity: "13",
  stories: [],
  raid: [],
});
const attempt = <T,>(fn: () => T): T | null => {
  try {
    return fn();
  } catch {
    return null;
  }
};
function Field({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <label>
      {label}
      {multiline ? (
        <textarea
          maxLength={2000}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          maxLength={2000}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
function Json({ value }: { value: unknown }) {
  return <pre>{JSON.stringify(value, null, 2)}</pre>;
}
export default function DevSecNetStudioPage() {
  const identity = useOptionalCustomerSession()?.session?.token ?? null;
  const [params] = useSearchParams(),
    panel = PANELS.some((p) => p[0] === params.get("panel"))
      ? params.get("panel")!
      : "product";
  const [plan, setPlan] = useState<ProductPlan>(emptyPlan),
    [money, setMoney] = useState({ price: "", cost: "", fixed: "", units: "" });
  const [colors, setColors] = useState({
    bg: "#0e2218",
    card: "#163526",
    text: "#f7f5ee",
    accent: "#fbbf24",
  });
  const [source, setSource] = useState(""),
    [language, setLanguage] = useState<ReviewLanguage>("typescript"),
    [report, setReport] = useState<ReviewReport | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null),
    [size, setSize] = useState("500");
  const [cost, setCost] = useState<CostAssumptions>({
    ...INITIAL_COST_ASSUMPTIONS,
  });
  const [ip, setIp] = useState("192.168.10.35"),
    [prefix, setPrefix] = useState("24");
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const worker = useRef<Worker | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    epoch = useRef(0);
  const downloads = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const stop = () => {
    epoch.current++;
    worker.current?.terminate();
    worker.current = null;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const revoke = () => {
    for (const [url, id] of downloads.current) {
      clearTimeout(id);
      URL.revokeObjectURL(url);
    }
    downloads.current.clear();
  };
  useLayoutEffect(() => {
    stop();
    revoke();
    setPlan(emptyPlan());
    setMoney({ price: "", cost: "", fixed: "", units: "" });
    setColors({
      bg: "#0e2218",
      card: "#163526",
      text: "#f7f5ee",
      accent: "#fbbf24",
    });
    setSource("");
    setReport(null);
    setComparison(null);
    setSize("500");
    setCost({ ...INITIAL_COST_ASSUMPTIONS });
    setIp("192.168.10.35");
    setPrefix("24");
    setBusy(false);
    setNotice("");
  }, [identity]);
  useEffect(
    () => () => {
      stop();
      revoke();
    },
    [],
  );
  function save(value: unknown, name: string) {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    downloads.current.set(
      url,
      setTimeout(() => {
        URL.revokeObjectURL(url);
        downloads.current.delete(url);
      }, 10000),
    );
    setNotice("Local download prepared. Review before sharing.");
  }
  function run(kind: "review" | "compare") {
    if (worker.current) return;
    const command = attempt(() =>
      kind === "review"
        ? { kind, ...checkedReviewInput(source, language) }
        : { kind, size: /^\d{2,4}$/.test(size) ? Number(size) : NaN },
    );
    if (
      !command ||
      (kind === "compare" &&
        (!Number.isInteger(Number(size)) ||
          Number(size) < 10 ||
          Number(size) > 3000))
    ) {
      setNotice(
        "Check the input limits: source up to 60,000 characters / 120,000 bytes, or size 10–3000.",
      );
      return;
    }
    stop();
    setBusy(true);
    setNotice("Running locally in an isolated worker…");
    if (kind === "review") setReport(null);
    else setComparison(null);
    const version = epoch.current;
    const fail = () => {
      if (epoch.current !== version) return;
      stop();
      setBusy(false);
      setNotice(
        "Operation could not be confirmed. No source was executed or uploaded.",
      );
    };
    try {
      const w = new Worker(new URL("./devsecnet.worker.ts", import.meta.url), {
        type: "module",
      });
      worker.current = w;
      w.onerror = fail;
      w.onmessage = (e) => {
        if (epoch.current !== version) return;
        try {
          if (e.data?.ok !== true || e.data.kind !== kind) throw Error();
          if (kind === "review") {
            const r = checkedReviewReport(e.data.result);
            if (r.language !== language || r.sourceCharacters !== source.length)
              throw Error();
            setReport(r);
          } else {
            if (
              !checkedComparison(e.data.result) ||
              e.data.result.size !== Number(size)
            )
              throw Error();
            setComparison(e.data.result);
          }
          stop();
          setBusy(false);
          setNotice(
            "Local calculation complete. Read the scope and limitations below.",
          );
        } catch {
          fail();
        }
      };
      timer.current = setTimeout(fail, 12000);
      w.postMessage(command);
    } catch {
      fail();
    }
  }
  const changeSource = (v: string) => {
    stop();
    setBusy(false);
    setSource(v);
    setReport(null);
    setNotice("");
  };
  const patch = (key: keyof ProductPlan, value: unknown) =>
    setPlan((p) => ({ ...p, [key]: value }));
  const draft = attempt(() => productPlan(plan)),
    economics = attempt(() =>
      forecast(money.price, money.cost, money.fixed, money.units),
    );
  const tokens = designTokens(
      colors.bg,
      colors.card,
      colors.text,
      colors.accent,
    ),
    scenario = attempt(() => planTokenCosts(cost));
  const subnet = /^(?:0|[1-9]\d?)$/.test(prefix)
    ? calculateIPv4Subnet(ip, Number(prefix))
    : null;
  let content: ReactNode;
  if (panel === "product")
    content = (
      <>
        <h2>S1 · Product and delivery planning</h2>
        <p>
          Your ideas become a structured draft. Nothing is marked completed
          automatically. No AI calls are made.
        </p>
        <div className="grid">
          {(
            [
              "name",
              "idea",
              "audience",
              "metric",
              "constraints",
              "capacity",
            ] as const
          ).map((key) => (
            <Field
              key={key}
              label={
                {
                  name: "Project name",
                  idea: "Problem and proposed outcome",
                  audience: "People this serves",
                  metric: "Success metric",
                  constraints: "Constraints and exclusions",
                  capacity: "Assumed points per sprint",
                }[key]
              }
              value={plan[key]}
              onChange={(v) => patch(key, v)}
              multiline={key === "idea" || key === "constraints"}
            />
          ))}
        </div>
        <h3>Fibonacci backlog & acceptance criteria</h3>
        <p>
          Points describe relative effort, not hours. Proposed sprints use your
          assumed capacity; oversized stories need refinement.
        </p>
        {plan.stories.map((story, i) => (
          <fieldset key={i}>
            <legend>Story {i + 1}</legend>
            <Field
              label="Capability / story"
              value={story.title}
              onChange={(v) =>
                patch(
                  "stories",
                  plan.stories.map((s, j) =>
                    i === j ? { ...s, title: v } : s,
                  ),
                )
              }
            />
            <label>
              Points
              <select
                value={story.points}
                onChange={(e) =>
                  patch(
                    "stories",
                    plan.stories.map((s, j) =>
                      i === j ? { ...s, points: e.target.value } : s,
                    ),
                  )
                }
              >
                <option value="">Unestimated</option>
                {POINTS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            {(["given", "when", "then"] as const).map((key) => (
              <Field
                key={key}
                label={key[0].toUpperCase() + key.slice(1)}
                value={story[key]}
                onChange={(v) =>
                  patch(
                    "stories",
                    plan.stories.map((s, j) =>
                      i === j ? { ...s, [key]: v } : s,
                    ),
                  )
                }
              />
            ))}
            <button
              onClick={() =>
                patch(
                  "stories",
                  plan.stories.filter((_, j) => j !== i),
                )
              }
            >
              Remove story {i + 1}
            </button>
          </fieldset>
        ))}
        <button
          disabled={plan.stories.length >= 8}
          onClick={() =>
            patch("stories", [
              ...plan.stories,
              { title: "", points: "", given: "", when: "", then: "" },
            ])
          }
        >
          Add story
        </button>
        <h3>RAID register</h3>
        {plan.raid.map((r, i) => (
          <fieldset key={i}>
            <legend>Entry {i + 1}</legend>
            <label>
              Type
              <select
                value={r.kind}
                onChange={(e) =>
                  patch(
                    "raid",
                    plan.raid.map((x, j) =>
                      i === j ? { ...x, kind: e.target.value } : x,
                    ),
                  )
                }
              >
                {["Risk", "Assumption", "Issue", "Dependency"].map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
            <Field
              label="Description"
              value={r.description}
              onChange={(v) =>
                patch(
                  "raid",
                  plan.raid.map((x, j) =>
                    i === j ? { ...x, description: v } : x,
                  ),
                )
              }
            />
            <Field
              label="Responsible owner"
              value={r.owner}
              onChange={(v) =>
                patch(
                  "raid",
                  plan.raid.map((x, j) => (i === j ? { ...x, owner: v } : x)),
                )
              }
            />
            <button
              onClick={() =>
                patch(
                  "raid",
                  plan.raid.filter((_, j) => j !== i),
                )
              }
            >
              Remove entry {i + 1}
            </button>
          </fieldset>
        ))}
        <button
          disabled={plan.raid.length >= 12}
          onClick={() =>
            patch("raid", [
              ...plan.raid,
              { kind: "Risk", description: "", owner: "" },
            ])
          }
        >
          Add RAID entry
        </button>
        <button
          disabled={!draft}
          onClick={() => save(draft, "luqi-product-plan.json")}
        >
          Download PRD, backlog & RAID
        </button>
        {draft && (
          <details>
            <summary>Review structured plan</summary>
            <Json value={draft} />
          </details>
        )}
        <h3>ZAR monetization scenario</h3>
        <p>
          Hypothetical unit economics. Include relevant overhead in your
          assumptions; taxes, fees and real demand are not verified.
        </p>
        <div className="grid">
          {(["price", "cost", "fixed", "units"] as const).map((k) => (
            <Field
              key={k}
              label={
                {
                  price: "Selling price per unit (ZAR)",
                  cost: "Direct cost per unit (ZAR)",
                  fixed: "Fixed costs per period (ZAR)",
                  units: "Assumed units per period",
                }[k]
              }
              value={money[k]}
              onChange={(v) => setMoney({ ...money, [k]: v })}
            />
          ))}
        </div>
        {economics ? (
          <p>
            Break-even units:{" "}
            {economics.breakEvenSales ??
              "No finite break-even with non-positive contribution"}
            . Scenario revenue: R {economics.revenueZar}; scenario profit: R{" "}
            {economics.profitZar}.
          </p>
        ) : (
          <p>
            Enter non-negative amounts with up to two decimals and a whole-unit
            forecast.
          </p>
        )}
      </>
    );
  else if (panel === "design")
    content = (
      <>
        <h2>S2 · Design system preview</h2>
        <p>
          Calculated solid-color contrast, 8px spacing and 48px controls. This
          checks selected pairs, not whole-site WCAG conformance or a guaranteed
          frame rate.
        </p>
        <div className="grid">
          {(Object.keys(colors) as Array<keyof typeof colors>).map((k) => (
            <label key={k}>
              {k}
              <input
                type="color"
                value={colors[k]}
                onChange={(e) => setColors({ ...colors, [k]: e.target.value })}
              />
            </label>
          ))}
        </div>
        <div
          className="design-preview"
          style={
            {
              background: colors.bg,
              color: colors.text,
              "--preview-bg": colors.bg,
              "--preview-accent": colors.accent,
            } as CSSProperties
          }
        >
          <h3 style={{ fontFamily: "Georgia, serif" }}>
            {plan.name || "Your next useful product"}
          </h3>
          <div style={{ background: colors.card, padding: 16 }}>
            {plan.idea ||
              "A clear purpose, readable text and comfortable controls."}
          </div>
          <button
            onClick={() =>
              setNotice(
                "Preview interaction only. No transaction or service was started.",
              )
            }
          >
            Try preview interaction
          </button>
        </div>
        <ul>
          {tokens.pairs.map((p) => (
            <li key={p.name}>
              {p.name}: {p.ratio.toFixed(2)}:1 ·{" "}
              {p.ratio >= 7
                ? "Meets selected 7:1 target"
                : "Below selected 7:1 target"}
            </li>
          ))}
        </ul>
        <p>
          Georgia + system font fallbacks. Spacing: 8, 16, 24, 32, 48, 64px.
          Reduced-motion preferences disable transitions.
        </p>
        <button
          disabled={!tokens.passes}
          onClick={() => save(tokens, "luqi-checked-design-tokens.json")}
        >
          Download checked design tokens
        </button>
      </>
    );
  else if (panel === "engineering")
    content = (
      <>
        <h2>S3 · Engineering reference desk</h2>
        <p>
          Typed examples for human review. They are never executed, deployed or
          substituted for your code. A working application still needs
          authentication, validation, idempotency, transactional writes, tests
          and rollback.
        </p>
        {DEVSECNET_EXAMPLES.map((ex) => (
          <details key={ex.id}>
            <summary>{ex.title}</summary>
            <p>{ex.note}</p>
            <pre>{ex.code}</pre>
            <button
              onClick={() =>
                save(
                  {
                    title: ex.title,
                    note: ex.note,
                    code: ex.code,
                    executed: false,
                  },
                  "luqi-reference-example.json",
                )
              }
            >
              Download reference
            </button>
          </details>
        ))}
        <p>
          <Link to="/chat">Open AI Chat</Link> for an explicitly requested
          review under existing consent and budget controls.
        </p>
      </>
    );
  else if (panel === "security")
    content = (
      <>
        <h2>S4 · Local static review</h2>
        <p>
          JavaScript/TypeScript uses a syntax tree. Python, SQL and network
          snippets use limited text patterns. This is not complete OWASP,
          data-flow, SSRF or privacy analysis, and cannot certify code as
          secure. Do not paste real secrets or personal data.
        </p>
        <label>
          Source language
          <select
            value={language}
            disabled={busy}
            onChange={(e) => {
              setLanguage(e.target.value as ReviewLanguage);
              setReport(null);
            }}
          >
            {REVIEW_LANGUAGES.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
        <label>
          Code to review locally
          <textarea
            maxLength={60000}
            spellCheck={false}
            value={source}
            onChange={(e) => changeSource(e.target.value)}
          />
        </label>
        <button
          disabled={busy || !!source}
          onClick={() => {
            setLanguage("typescript");
            changeSource(DEVSECNET_DEMO);
          }}
        >
          Load synthetic example
        </button>
        <button disabled={busy || !source.trim()} onClick={() => run("review")}>
          Review code locally
        </button>
        <button onClick={() => changeSource("")}>
          Clear code and findings
        </button>
        {report && (
          <>
            <h3>
              {report.status === "syntax-error"
                ? "Syntax could not be parsed"
                : `${report.findings.length} pattern(s) to review`}
            </h3>
            <p>
              Method: {report.method}.{" "}
              {report.status === "syntax-error"
                ? `Check syntax near line ${report.syntaxLine}. No clearance was produced.`
                : "No matching patterns does not mean no vulnerabilities."}
            </p>
            {report.findings.map((f, i) => (
              <article key={i}>
                <h4>
                  Line {f.line}, column {f.column}: {REVIEW_RULES[f.rule].title}
                </h4>
                <p>{REVIEW_RULES[f.rule].detail}</p>
                <p>{REVIEW_RULES[f.rule].action}</p>
              </article>
            ))}
            <button
              onClick={() => save(report, "luqi-source-free-review.json")}
            >
              Download source-free report
            </button>
          </>
        )}
        <p>
          ML-KEM establishes shared secrets; ML-DSA signs. No automatic signing,
          compliance claim or archive migration is made here.{" "}
          <Link to="/vault">Open local archive pilot</Link>
        </p>
      </>
    );
  else if (panel === "network")
    content = (
      <>
        <h2>S5 · Network planning</h2>
        <p>
          Local IPv4 calculations and read-only references. No device
          connection, firewall update, tunnel creation or packet-rate claim.
        </p>
        <div className="grid">
          <Field label="IPv4 address" value={ip} onChange={setIp} />
          <Field
            label="CIDR prefix (0–32)"
            value={prefix}
            onChange={setPrefix}
          />
        </div>
        {subnet ? (
          <Json value={subnet} />
        ) : (
          <p>Enter a valid IPv4 address and prefix.</p>
        )}
        <NetworkVlsmPlanner key={identity ?? "guest"} />
        <Link to="/devsecnet?panel=security">
          Review network configuration text patterns
        </Link>
        <Link to="/devsecnet?panel=engineering">
          Read-only Cisco command references
        </Link>
      </>
    );
  else
    content = (
      <>
        <h2>S6 · Compute and cost planning</h2>
        <p>
          Run two real implementations over generated integers. Nested
          membership search vs Set membership preserves left order. The indexed
          algorithm has expected O(n + m) work and O(m) memory. These are local
          CPU examples, not GPU/HPC or quantum jobs.
        </p>
        <Field
          label="Generated rows per side (10–3000)"
          value={size}
          onChange={(v) => {
            stop();
            setBusy(false);
            setSize(v);
            setComparison(null);
          }}
        />
        <button disabled={busy} onClick={() => run("compare")}>
          Run measured comparison
        </button>
        {comparison && (
          <>
            <p>
              Same results: yes · {comparison.matches} matches. Pair
              comparisons: {comparison.pairComparisons}; Set builds:{" "}
              {comparison.setBuilds}, lookups: {comparison.setLookups}.
            </p>
            <p>
              Observed nested time: {comparison.pairMilliseconds.toFixed(3)} ms;
              indexed time: {comparison.setMilliseconds.toFixed(3)} ms. One run
              on this browser; timers, warm-up and workload affect results.
            </p>
            <button
              onClick={() =>
                save(comparison, "luqi-membership-measurement.json")
              }
            >
              Download measurement
            </button>
          </>
        )}
        <h3>AI token-cost scenario</h3>
        <p>
          Editable assumptions only, not measured traffic, a provider quote or
          live FX. Local share defaults to zero; savings are not promised.
          Include provider-billed reasoning tokens in output assumptions where
          applicable. Storage, tools, cache, taxes and other charges are
          excluded.
        </p>
        <button onClick={() => setCost({ ...ILLUSTRATIVE_COST_ASSUMPTIONS })}>
          Load illustrative assumptions (not current prices)
        </button>
        <div className="grid">
          {(Object.keys(cost) as Array<keyof CostAssumptions>).map((k) => (
            <Field
              key={k}
              label={
                {
                  visitors: "Assumed visitors per period",
                  requestsPerVisitor: "Requests per visitor",
                  localPercent: "Assumed local-only share (%)",
                  inputTokens: "Average input tokens per cloud call",
                  outputTokens: "Average billed output tokens per cloud call",
                  inputRateUsd: "USD per million input tokens",
                  outputRateUsd: "USD per million output tokens",
                  zarPerUsd: "Assumed ZAR per USD",
                  budgetUsd: "Scenario budget USD (optional)",
                }[k]
              }
              value={cost[k]}
              onChange={(v) => setCost({ ...cost, [k]: v })}
            />
          ))}
        </div>
        {scenario ? (
          <>
            <p>
              {scenario.cloudCalls.toLocaleString()} assumed cloud calls.
              Estimated USD {scenario.usd} / R {scenario.zar}.{" "}
              {scenario.overBudget === null
                ? "No scenario budget entered."
                : scenario.overBudget
                  ? "Above your scenario budget."
                  : "Within your scenario budget."}{" "}
              This does not change account limits.
            </p>
            <button
              onClick={() => save(scenario, "luqi-ai-cost-scenario.json")}
            >
              Download assumptions & scenario
            </button>
          </>
        ) : (
          <p>
            Enter valid usage, rates and a positive exchange-rate assumption to
            calculate.
          </p>
        )}
        <Link to="/quantum-lab">
          Quantum simulations & small classical baselines
        </Link>
      </>
    );
  return (
    <main className="luqi-devsecnet">
      <header>
        <Link to="/">← LUQI workspace</Link>
        <p>TOOL 022 · SOVEREIGN DEVSECNET STUDIO</p>
        <h1>Plan. Design. Review. Measure.</h1>
        <p>
          Six practical workstreams, with your decisions at the center. Local
          tools do not make paid AI calls. Drafts stay in page memory until you
          download; changing accounts or leaving clears them.
        </p>
      </header>
      <nav aria-label="Studio workstreams">
        {PANELS.map(([id, title]) => (
          <Link
            key={id}
            to={`/devsecnet?panel=${id}`}
            aria-current={panel === id ? "page" : undefined}
          >
            {title}
          </Link>
        ))}
      </nav>
      <section>{content}</section>
      <section>
        <h2>Resource blueprint · proposals only</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Tier</th>
                <th>Resources to assess</th>
                <th>Cost decision</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1 · Local studio</td>
                <td>Current browser, bounded workers, local JSON exports</td>
                <td>No additional paid service introduced by these tools.</td>
              </tr>
              <tr>
                <td>2 · Managed AI delivery</td>
                <td>
                  Authenticated server-side AI, database, backups, monitoring;
                  measure demand first
                </td>
                <td>
                  Existing caps stay unchanged. Obtain provider/hosting quotes
                  and enter usage assumptions.
                </td>
              </tr>
              <tr>
                <td>3 · HPC / GPU research</td>
                <td>
                  Profile bottleneck, benchmark candidate GPU, assess region,
                  storage and queue needs
                </td>
                <td>
                  Not provisioned. A workload-specific ZAR quote and your
                  approval are required before increasing spend.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Autonomous multi-agent execution, network pushes and fault-tolerant
          quantum hardware are not activated by this planning studio.
        </p>
      </section>
      <footer>
        <p role="status">{notice}</p>
        {busy && (
          <button
            onClick={() => {
              stop();
              setBusy(false);
              setNotice("Cancelled. Late worker replies are ignored.");
            }}
          >
            Cancel local operation
          </button>
        )}
        <h2>Primary technical references</h2>
        {DEVSECNET_SOURCES.map((s) => (
          <a key={s.url} href={s.url} target="_blank" rel="noreferrer">
            {s.title}
          </a>
        ))}
      </footer>
    </main>
  );
}
