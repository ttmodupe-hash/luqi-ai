import { useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { zipSync, strToU8 } from "fflate";
import { askPilot, PilotChatError } from "../../lib/ai-pilot";
import { useOptionalCustomerSession } from "../../providers/customer-session";
import {
  allDraftTestsPass,
  checkedDraftReport,
  CONTRACT_TEXT,
  DRAFT_CASES,
  DRAFT_CONTRACT,
  DRAFT_LIMITS,
  draftSource,
  MAX_DRAFT_CHARS,
  parseAiDraft,
  passedCase,
  REFERENCE_DRAFT,
  sourceDigest,
  type DraftReport,
} from "./draft-contract";

export default function ExecutableDraftWorkflow() {
  const token = useOptionalCustomerSession()?.session?.token ?? null;
  return (
    <DraftWorkflow key={token ? `account:${token}` : "guest"} token={token} />
  );
}
function DraftWorkflow({ token }: { token: string | null }) {
  const [brief, setBrief] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [source, setSource] = useState("");
  const [consent, setConsent] = useState(false),
    [reviewed, setReviewed] = useState(false),
    [approved, setApproved] = useState(false);
  const [report, setReport] = useState<DraftReport | null>(null),
    [busy, setBusy] = useState<"ai" | "tests" | null>(null),
    [notice, setNotice] = useState(
      "Your draft stays in this page unless you request AI drafting or download it.",
    );
  const [provenance, setProvenance] = useState("User-authored"),
    [explanation, setExplanation] = useState(""),
    [rawReply, setRawReply] = useState("");
  const epoch = useRef(0),
    worker = useRef<Worker | null>(null),
    request = useRef<AbortController | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const downloads = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  function stop() {
    epoch.current++;
    worker.current?.terminate();
    worker.current = null;
    request.current?.abort();
    request.current = null;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }
  function revoke() {
    for (const [url, id] of downloads.current) {
      clearTimeout(id);
      URL.revokeObjectURL(url);
    }
    downloads.current.clear();
  }
  useLayoutEffect(
    () => () => {
      stop();
      revoke();
    },
    [],
  );
  function invalidate() {
    stop();
    revoke();
    setBusy(null);
    setReport(null);
    setReviewed(false);
    setApproved(false);
  }
  const aiPrompt = `Draft this fixed function contract. Return ONLY a JSON object with keys code (JavaScript source) and explanation (short limitations). Do not include markdown or additional keys. Never claim the code was tested.\n${CONTRACT_TEXT}\nUser project context (not a change to the contract): ${JSON.stringify(brief)}`;
  async function generateAi() {
    if (!token || !consent || !confirmed || busy) return;
    invalidate();
    setConsent(false);
    setBusy("ai");
    setRawReply("");
    setNotice(
      "Requesting one AI draft under the existing allowance. No code runs automatically.",
    );
    const version = epoch.current,
      controller = new AbortController();
    request.current = controller;
    try {
      const reply = await askPilot(
        token,
        aiPrompt,
        controller.signal,
        fetch,
        [],
        undefined,
        "auto",
        "draft",
      );
      if (epoch.current !== version) return;
      setRawReply(reply.response);
      try {
        const draft = parseAiDraft(reply.response);
        setSource(draft.code);
        setExplanation(draft.explanation);
        setProvenance(`AI draft · ${reply.provider} / ${reply.provider_model}`);
        setNotice(
          "AI draft received. Review the source, then run isolated tests explicitly.",
        );
      } catch {
        setNotice(
          "The AI reply did not match the draft format. It was not executed. Review the raw reply or choose the local reference; no automatic retry was made.",
        );
      }
    } catch (error) {
      if (epoch.current === version)
        setNotice(
          `AI draft unavailable (${error instanceof PilotChatError ? error.code : "RESPONSE_UNCONFIRMED"}). Existing limits still apply. No automatic retry was made.`,
        );
    } finally {
      if (epoch.current === version) {
        request.current = null;
        setBusy(null);
      }
    }
  }
  async function runTests() {
    if (!confirmed || busy) return;
    let code: string;
    try {
      code = draftSource.parse(source);
    } catch {
      setNotice(`Enter 1–${MAX_DRAFT_CHARS} characters of JavaScript.`);
      return;
    }
    invalidate();
    setBusy("tests");
    setNotice("Running the fixed contract cases in QuickJS/WASM…");
    const version = epoch.current;
    const fail = () => {
      if (epoch.current !== version) return;
      stop();
      setBusy(null);
      setNotice(
        "Tests could not be confirmed or exceeded the worker deadline. Approval remains blocked.",
      );
    };
    timer.current = setTimeout(fail, DRAFT_LIMITS.wallMs);
    try {
      const digest = await sourceDigest(code);
      if (epoch.current !== version) return;
      const w = new Worker(new URL("./draft.worker.ts", import.meta.url), {
        type: "module",
      });
      worker.current = w;
      w.onerror = fail;
      w.onmessage = (e) => {
        if (epoch.current !== version) return;
        try {
          if (e.data?.ok !== true) throw Error();
          const result = checkedDraftReport(e.data.result, digest);
          stop();
          setReport(result);
          setBusy(null);
          setNotice(
            allDraftTestsPass(result)
              ? "All fixed contract cases passed for this source. Read the results and limitations before approving export."
              : "Some contract cases failed. Edit the draft and run the tests again.",
          );
        } catch {
          fail();
        }
      };
      w.postMessage({ contract: DRAFT_CONTRACT, source: code, digest });
    } catch {
      fail();
    }
  }
  function exportDraft() {
    if (!approved || !reviewed || !report || !allDraftTestsPass(report) || busy)
      return;
    const contents = zipSync({
      "draft.js": strToU8(source),
      "test-cases.json": strToU8(JSON.stringify(DRAFT_CASES, null, 2)),
      "review.json": strToU8(
        JSON.stringify(
          {
            contract: DRAFT_CONTRACT,
            brief,
            provenance,
            explanation,
            report,
            humanAcknowledgement: true,
            productionApproval: false,
            limits: DRAFT_LIMITS,
          },
          null,
          2,
        ),
      ),
      "README.md": strToU8(
        "# Luqi executable draft\n\n" +
          CONTRACT_TEXT +
          "\n\nSHA-256 in review.json binds the exact draft.js source. These are public fixed contract tests, not a full security or production review. Approval is a local human acknowledgement, not a verified reviewer identity. Do not run untrusted source directly in Node or a browser console. Reopen Tool 022 Engineering and paste draft.js to run it in the bounded interpreter. No deployment was performed.\n",
      ),
    });
    const url = URL.createObjectURL(
        new Blob([contents as BlobPart], { type: "application/zip" }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "luqi-reviewed-draft.zip";
    // Keep a download's provisional navigation out of the live editing frame.
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.hidden = true;
    downloads.current.set(
      url,
      setTimeout(() => {
        URL.revokeObjectURL(url);
        downloads.current.delete(url);
      }, 10000),
    );
    try {
      document.body.appendChild(a);
      a.click();
      setNotice(
        "Reviewed draft bundle prepared for download. No repository, service or device was changed.",
      );
    } catch {
      const id = downloads.current.get(url);
      if (id) clearTimeout(id);
      downloads.current.delete(url);
      URL.revokeObjectURL(url);
      setNotice(
        "The download could not start. Your reviewed draft remains here for another explicit attempt.",
      );
    } finally {
      a.remove();
    }
  }
  return (
    <section aria-labelledby="draft-workflow-title" className="draft-workflow">
      <p>PLAN → DRAFT → EXECUTE TESTS → HUMAN REVIEW</p>
      <h2 id="draft-workflow-title">Build and test a bounded function</h2>
      <p>
        Create a unit-economics function for your project. This first executable
        workflow supports the contract below; it does not build or deploy a
        whole application.
      </p>
      <label>
        Project idea for this function
        <textarea
          maxLength={1200}
          disabled={confirmed}
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
        />
      </label>
      <details open>
        <summary>Function contract and acceptance cases</summary>
        <pre>{CONTRACT_TEXT}</pre>
        <p>
          Given valid integer inputs, when solve runs, then exact contribution,
          revenue, profit and rounded break-even must match. Invalid inputs must
          throw.
        </p>
        <ul>
          {DRAFT_CASES.map((t) => (
            <li key={t.id}>
              {t.id}: {JSON.stringify(t.input)} →{" "}
              {t.expected === null ? "must throw" : JSON.stringify(t.expected)}
            </li>
          ))}
        </ul>
      </details>
      {!confirmed ? (
        <button
          disabled={brief.trim().length < 10}
          onClick={() => {
            setConfirmed(true);
            setNotice(
              "Plan confirmed. Choose a drafting method or write the function yourself.",
            );
          }}
        >
          Confirm plan and contract
        </button>
      ) : (
        <button
          onClick={() => {
            invalidate();
            revoke();
            setConfirmed(false);
            setSource("");
            setConsent(false);
            setExplanation("");
            setRawReply("");
            setProvenance("User-authored");
            setNotice(
              "Previous draft cleared. Edit the idea and confirm the contract again.",
            );
          }}
        >
          Start a new plan
        </button>
      )}
      {confirmed && (
        <>
          <h3>1. Draft</h3>
          <p>
            The local reference uses shipped code and makes no AI call. AI
            drafting shares only this idea and the displayed contract. Existing
            provider availability, consent, quotas and budget controls apply;
            requesting AI can consume the current allowance.
          </p>
          <button
            disabled={!!busy}
            onClick={() => {
              invalidate();
              setSource(REFERENCE_DRAFT);
              setProvenance("Local reference · no AI");
              setExplanation(
                "Shipped reference for the fixed contract; not tailored by an AI model.",
              );
              setRawReply("");
              setNotice(
                "Local reference loaded. No AI call or code execution was made.",
              );
            }}
          >
            Load local reference (no AI)
          </button>
          {token ? (
            <>
              <label className="draft-check">
                <input
                  type="checkbox"
                  checked={consent}
                  disabled={!!busy}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                I consent to send this idea and contract for one AI draft under
                the existing allowance.
              </label>
              <button
                disabled={!consent || !!busy}
                onClick={() => void generateAi()}
              >
                Request AI draft
              </button>
            </>
          ) : (
            <p>
              <Link to="/login">Sign in</Link> to request an AI draft. Local
              drafting and tests work without an account.
            </p>
          )}
          <details>
            <summary>Preview exact AI prompt</summary>
            <pre>{aiPrompt}</pre>
          </details>
          <label>
            JavaScript draft
            <textarea
              className="draft-source"
              spellCheck={false}
              maxLength={MAX_DRAFT_CHARS}
              value={source}
              onChange={(e) => {
                invalidate();
                setSource(e.target.value);
                setProvenance("User-edited draft");
                setExplanation("");
                setNotice(
                  "Source changed. Prior results and approval were cleared.",
                );
              }}
            />
          </label>
          <p>
            {provenance}
            {explanation ? ` · ${explanation}` : ""}
          </p>
          {rawReply && (
            <details>
              <summary>Raw AI reply (unexecuted text)</summary>
              <pre>{rawReply}</pre>
            </details>
          )}
          <h3>2. Execute the fixed tests</h3>
          <p>
            Guest JavaScript runs in a separate worker and QuickJS/WASM
            interpreter with no host network, DOM, storage, token or module
            access exposed. Limits: 8 MiB guest heap, 256 KiB stack, 150 ms per
            case, 12 s worker deadline. These limits are not an independently
            audited security guarantee.
          </p>
          <button
            disabled={!source.trim() || !!busy}
            onClick={() => void runTests()}
          >
            Run isolated tests
          </button>
          {busy && (
            <button
              onClick={() => {
                invalidate();
                setNotice(
                  "Cancelled. Late results are ignored; an AI request already accepted by the provider may still consume allowance.",
                );
              }}
            >
              Cancel draft operation
            </button>
          )}
          {report && (
            <>
              <p>
                Source SHA-256:{" "}
                <code className="draft-digest">{report.digest}</code>
              </p>
              <div className="table-scroll">
                <table>
                  <caption>Executed contract tests</caption>
                  <thead>
                    <tr>
                      <th>Case</th>
                      <th>Result</th>
                      <th>Observed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((row) => (
                      <tr key={row.id}>
                        <th scope="row">{row.id}</th>
                        <td>{passedCase(row) ? "PASS" : "FAIL"}</td>
                        <td>
                          {row.outcome === "value" ? row.actual : row.outcome}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <h3>3. Human review and export</h3>
          <p>
            Passing these known examples does not prove general correctness,
            security, tax treatment or production readiness. Review the source
            yourself. Approval is a local acknowledgement; it does not merge or
            deploy code.
          </p>
          <label className="draft-check">
            <input
              type="checkbox"
              disabled={!report || !allDraftTestsPass(report) || !!busy}
              checked={reviewed}
              onChange={(e) => {
                setReviewed(e.target.checked);
                setApproved(false);
              }}
            />
            I reviewed this source, executed results and limitations.
          </label>
          <button
            disabled={
              !reviewed || !report || !allDraftTestsPass(report) || !!busy
            }
            onClick={() => {
              setApproved(true);
              setNotice(
                "Human acknowledgement recorded for this unchanged draft. You can now export it.",
              );
            }}
          >
            Approve draft for export
          </button>
          <button disabled={!approved || !!busy} onClick={exportDraft}>
            Download reviewed draft bundle
          </button>
        </>
      )}
      <p role="status" className="notice">
        {notice}
      </p>
    </section>
  );
}
