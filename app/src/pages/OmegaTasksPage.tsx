import { useEffect, useRef, useState } from "react";
import { Layers3, LockKeyhole, RefreshCw } from "lucide-react";
import OmegaSubmissionForm from "../components/OmegaSubmissionForm";
import OmegaLocalCalculators from "../components/OmegaLocalCalculators";
import OmegaDomainGuide from "../components/OmegaDomainGuide";
import { ConversationError, signIn } from "../lib/private-conversations";
import { useCustomerSession } from "../providers/customer-session";
import {
  omegaClient,
  OmegaError,
  taskLabels,
  taskTitle,
  type OmegaStatus,
  type OmegaTask,
  type OmegaDraft,
  type OmegaSubmission,
} from "../lib/omega-tasks";
import "../omega-tasks.css";

function TaskResult({ task }: { task: OmegaTask }) {
  if (task.state !== "completed" || !task.result)
    return <p>No completed result is available for this task.</p>;
  return (
    <div className="omega-result">
      {task.handler === "travel.budget" ? (
        <>
          <p className="omega-result-number">
            {task.result.currency} {task.result.total}
          </p>
          <p>Total of the supplied amounts</p>
        </>
      ) : (
        <>
          <p className="omega-result-number">
            {task.result.needsService
              ? "Service is due"
              : "Service is not yet due"}
          </p>
          <dl>
            <dt>
              {task.result.kmRemaining < 0
                ? "Distance overdue"
                : "Distance remaining"}
            </dt>
            <dd>{Math.abs(task.result.kmRemaining).toLocaleString()} km</dd>
            <dt>Service due date</dt>
            <dd>{task.result.serviceDueDate}</dd>
            <dt>Distance threshold reached</dt>
            <dd>{task.result.overdueByKm ? "Yes" : "No"}</dd>
            <dt>Date threshold reached</dt>
            <dd>{task.result.overdueByDate ? "Yes" : "No"}</dd>
          </dl>
        </>
      )}
      <p>{task.result.notice}</p>
    </div>
  );
}
const formatTime = (value: string) => new Date(value).toLocaleString();

export default function OmegaTasksPage() {
  const { session, acceptSession, signOut: signOutShared } = useCustomerSession();
  const authenticatedHere = useRef(false);
  const previousToken = useRef<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<OmegaStatus | null>(null);
  const [tasks, setTasks] = useState<OmegaTask[]>([]);
  const [selected, setSelected] = useState<OmegaTask | null>(null);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [submission, setSubmission] = useState<OmegaSubmission | null>(null);
  const [submissionUncertain, setSubmissionUncertain] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const epoch = useRef(0),
    locked = useRef(false);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (selected) detailHeading.current?.focus();
  }, [selected]);
  useEffect(
    () => () => {
      epoch.current++;
    },
    [],
  );

  function clearSession() {
    epoch.current++;
    locked.current = false;
    previousToken.current = null; signOutShared();
    setEmail("");
    setPassword("");
    setStatus(null);
    setTasks([]);
    setSelected(null);
    setMore(false);
    setBusy(false);
    setConfirm(false);
    setConfirmRemove(false);
    setUncertain(false);
    setSubmission(null);
    setSubmissionUncertain(false);
    setNotice("");
  }
  async function run(
    action: (current: () => boolean) => Promise<void>,
    mutation?: "cancel" | "submit" | "remove",
  ) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setNotice("");
    const version = epoch.current,
      current = () => epoch.current === version;
    try {
      await action(current);
    } catch (error) {
      if (!current()) return;
      if (
        (error instanceof OmegaError || error instanceof ConversationError) &&
        error.status === 401
      ) {
        clearSession();
        setNotice(
          "Sign-in failed or your session expired. Please sign in again.",
        );
      } else if (error instanceof ConversationError && error.status === 429 && error.retryAfter) {
        setNotice("Too many sign-in attempts. Wait " + error.retryAfter + " seconds before trying again. We will not retry automatically.");
      } else if (mutation === "submit") {
        setSubmissionUncertain(true);
        setNotice(error instanceof OmegaError && error.status === 429
          ? "The task limit was reached. No new task was confirmed. Review saved tasks or contact your operator. No automatic retry was made."
          : "Submission could not be confirmed. Check saved tasks or retry this same submission. No automatic retry was made.");
      } else if (mutation === "remove") {
        setSelected(null);
        setConfirmRemove(false);
        setUncertain(true);
        setNotice("Task removal could not be confirmed. Refresh saved tasks before taking another action. We have not retried automatically.");
      } else if (mutation === "cancel") {
        setSelected(null);
        setConfirm(false);
        setUncertain(true);
        setNotice(
          "Cancellation could not be confirmed. Refresh tasks before taking another action. No automatic retry was made.",
        );
      } else {
        setNotice(
          error instanceof OmegaError && error.status === 404
            ? "This task is no longer available to this account. Refresh tasks."
            : "Unable to verify task information. Please try again. No task outcome has been confirmed.",
        );
      }
    } finally {
      if (current()) {
        locked.current = false;
        setBusy(false);
        setPassword("");
      }
    }
  }
  async function refresh(token: string, current: () => boolean) {
    setStatus(null);
    setTasks([]);
    setSelected(null);
    setMore(false);
    setConfirm(false);
    setConfirmRemove(false);
    const api = omegaClient(token),
      fresh = await api.status();
    if (!current()) return;
    setStatus(fresh);
    if (fresh.intake === "disabled") {
      setUncertain(false);
      return;
    }
    const result = await api.list();
    if (!current()) return;
    setTasks(result.tasks);
    setMore(result.tasks.length === 20);
    setUncertain(false);
    setNotice(
      "Task information refreshed. Status changes appear when you refresh.",
    );
  }
  // A sign-in from Notes or Chat also unlocks this account-owned task view.
  useEffect(() => {
    const token = session?.token ?? null;
    if (token === previousToken.current) return;
    const wasSignedIn = previousToken.current !== null;
    previousToken.current = token;
    if (!token) {
      if (wasSignedIn) {
        epoch.current++; locked.current = false;
        setStatus(null); setTasks([]); setSelected(null); setMore(false); setBusy(false);
        setConfirm(false); setConfirmRemove(false); setUncertain(false);
        setSubmission(null); setSubmissionUncertain(false); setEmail(''); setPassword(''); setNotice('');
      }
      return;
    }
    if (authenticatedHere.current) { authenticatedHere.current = false; return; }
    void run(current => refresh(token, current));
  }, [session?.token]);

  function prepareSubmission(draft: OmegaDraft) {
    if (busy || locked.current || uncertain || submission || status?.intake !== "configured" ||
        !status.handlers.includes(draft.handler)) return;
    try {
      setSubmission({ ...draft, idempotencyKey: crypto.randomUUID() });
      setSubmissionUncertain(false);
      setNotice("");
    } catch {
      setNotice("Unable to prepare a protected submission. No request was sent.");
    }
  }
  function confirmSubmission() {
    if (!session || !submission || uncertain || status?.intake !== "configured" ||
        !status.handlers.includes(submission.handler)) return;
    const input = submission;
    void run(async current => {
      const result = await omegaClient(session.token).submit(input);
      if (!current()) return;
      setSubmission(null);
      setSubmissionUncertain(false);
      setFormVersion(value => value + 1);
      setSelected(result.task);
      setConfirm(false);
      setTasks(previous => previous.map(saved => saved.id === result.task.id ? result.task : saved));
      setNotice(result.created
        ? "Task saved to the queue. It has not run. An operator must run a worker. Refresh tasks to update history."
        : "This submission already exists. Its saved status is shown.");
    }, "submit");
  }
  function openTask(id: string) {
    if (!session) return;
    setSelected(null);
    setConfirm(false);
    setConfirmRemove(false);
    void run(async (current) => {
      const result = await omegaClient(session.token).get(id);
      if (current()) {
        setSelected(result.task);
        setTasks((previous) =>
          previous.map((task) => (task.id === id ? result.task : task)),
        );
      }
    });
  }

  return (
    <main className="omega-page">
      <header className="omega-heading">
        <p className="luqi-eyebrow">
          <Layers3 size={16} aria-hidden="true" /> YOUR OMEGA WORKSPACE
        </p>
        <h1>Tasks, with a clear record.</h1>
        <p>Review your saved calculations, their status and their results.</p>
        <p className="omega-muted">
          This dashboard does not start workers or generate AI responses.
        </p>
      </header>
      <OmegaLocalCalculators />
      <OmegaDomainGuide />
      {notice && (
        <p role="status" className="omega-notice">
          {notice}
        </p>
      )}
      {!session ? (
        <div className="omega-entry">
          <form
            className="omega-panel omega-signin"
            onSubmit={(event) => {
              event.preventDefault();
              void run(async (current) => {
                const account = await signIn(email, password);
                if (!current()) return;
                setPassword("");
                authenticatedHere.current = true; acceptSession(account);
                await refresh(account.token, current);
              });
            }}
          >
            <LockKeyhole size={24} aria-hidden="true" />
            <h2>Sign in to your task history</h2>
            <p>Use your existing LUQI account.</p>
            <label>
              Email
              <input
                type="email"
                autoComplete="username"
                maxLength={254}
                required
                disabled={busy}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                required
                disabled={busy}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <button className="luqi-primary" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
            <p className="omega-muted">
              Your LUQI account stays signed in across customer tools in this tab. Reloading or signing out ends the session.
              Account recovery requires your LUQI administrator.
            </p>
          </form>
          <section
            className="omega-explainer"
            aria-label="Available calculation types"
          >
            <p className="luqi-eyebrow">TWO FOCUSED CALCULATIONS</p>
            <h2>
              Useful numbers.
              <br />
              Visible progress.
            </h2>
            <h3>Travel budget</h3>
            <p>
              Add supplied amounts in a single currency. No live prices or
              exchange rates.
            </p>
            <h3>Vehicle service schedule</h3>
            <p>
              Review dates and distance against your supplied service intervals.
              Follow manufacturer instructions and a mechanic’s advice.
            </p>
            <p className="omega-muted">
              Availability is checked after sign-in. Autonomous agents and the
              other Omega modules are still in development.
            </p>
          </section>
        </div>
      ) : (
        <>
          <div className="omega-toolbar">
            <span>{session.user.email}</span>
            <button className="luqi-secondary" onClick={clearSession}>
              Sign out
            </button>
            <button
              className="luqi-secondary"
              disabled={busy}
              onClick={() =>
                void run((current) => refresh(session.token, current))
              }
            >
              <RefreshCw size={16} aria-hidden="true" /> Refresh tasks
            </button>
          </div>
          <section
            className="omega-availability omega-panel"
            aria-label="Task availability"
            aria-busy={busy}
          >
            <span className="omega-badge">
              {!status
                ? "Not verified"
                : status.intake === "disabled"
                  ? "Intake disabled"
                  : "Intake configured"}
            </span>
            <h2>
              {!status
                ? busy
                  ? "Checking task availability"
                  : "Task availability is not verified"
                : status.intake === "disabled"
                  ? "Tasks are not enabled yet"
                  : "Worker activity is not verified"}
            </h2>
            <p>
              {!status
                ? "Use Refresh tasks to check again if the request fails."
                : status.intake === "disabled"
                  ? "Task history and new submissions are unavailable while intake is disabled. No worker execution is enabled by this page."
                  : "Saved tasks require an operator to run a worker. A queued task is not a promise of execution. There is no automatic refresh."}
            </p>
          </section>
          {((status?.intake === "configured" && status.handlers.length > 0) || submission) && (
            <OmegaSubmissionForm key={formVersion}
              handlers={status?.intake === "configured" ? status.handlers : submission ? [submission.handler] : []}
              disabled={busy || uncertain || status?.intake !== "configured" || (submission !== null && !status.handlers.includes(submission.handler))}
              submission={submission} ambiguous={submissionUncertain}
              onReview={prepareSubmission}
              onEdit={() => { if (!busy && !submissionUncertain) setSubmission(null); }}
              onConfirm={confirmSubmission}
            />
          )}
          {status?.intake === "configured" && (
            <div className="omega-workbench">
              <section
                className="omega-panel"
                aria-label="Saved tasks"
                aria-busy={busy}
              >
                <h2>Saved tasks</h2>
                <p className="omega-muted">
                  Ordered by task reference, not creation time. Only your
                  account’s tasks are shown.
                </p>
                {!tasks.length && (
                  <p>
                    {busy
                      ? "Loading tasks…"
                      : notice.startsWith("Unable")
                        ? "Task history could not be loaded."
                        : "No saved tasks to show."}
                  </p>
                )}
                <ul className="omega-task-list">
                  {tasks.map((task) => (
                    <li key={task.id}>
                      <button
                        disabled={busy || uncertain}
                        aria-pressed={selected?.id === task.id}
                        onClick={() => openTask(task.id)}
                      >
                        <span>{taskTitle(task)}</span>
                        <span className="omega-badge">
                          {taskLabels[task.state]}
                        </span>
                        <small>{formatTime(task.createdAt)}</small>
                        <small className="omega-reference">{task.id}</small>
                      </button>
                    </li>
                  ))}
                </ul>
                {more && (
                  <button
                    className="luqi-secondary"
                    disabled={busy || uncertain}
                    onClick={() =>
                      void run(async (current) => {
                        const result = await omegaClient(session.token).list(
                          tasks.at(-1)?.id,
                        );
                        if (!current()) return;
                        setTasks((previous) => [
                          ...previous,
                          ...result.tasks.filter(
                            (task) =>
                              !previous.some((saved) => saved.id === task.id),
                          ),
                        ]);
                        setMore(result.tasks.length === 20);
                      })
                    }
                  >
                    More tasks
                  </button>
                )}
              </section>
              <section
                className="omega-panel omega-detail"
                aria-label="Task details"
                aria-busy={busy}
              >
                {!selected ? (
                  <>
                    <h2>A closer look</h2>
                    <p>
                      Select a task to see its latest stored status and result.
                    </p>
                  </>
                ) : (
                  <>
                    <span className="omega-badge">
                      {taskLabels[selected.state]}
                    </span>
                    <h2 ref={detailHeading} tabIndex={-1}>
                      {taskTitle(selected)}
                    </h2>
                    <p className="omega-reference">{selected.id}</p>
                    <dl>
                      <dt>Created</dt>
                      <dd>{formatTime(selected.createdAt)}</dd>
                      <dt>Last saved update</dt>
                      <dd>{formatTime(selected.updatedAt)}</dd>
                      <dt>Attempts</dt>
                      <dd>
                        {selected.attempts} of {selected.maxAttempts}
                      </dd>
                    </dl>
                    <h3>Saved result</h3>
                    <TaskResult task={selected} />
                    {selected.nextRunAt && (
                      <p>
                        Eligible to retry after {formatTime(selected.nextRunAt)}
                        . Execution still requires an operator.
                      </p>
                    )}
                    {selected.error && (
                      <p>
                        A worker attempt did not finish successfully. No
                        successful result is confirmed here.
                      </p>
                    )}
                    <details>
                      <summary>Supplied inputs</summary>
                      {selected.handler === "travel.budget" ? (
                        <p>
                          {selected.payload.currency}:{" "}
                          {selected.payload.amounts.join(" + ")}
                        </p>
                      ) : (
                        <dl>
                          <dt>Current distance</dt>
                          <dd>{selected.payload.odometerKm} km</dd>
                          <dt>Last service distance</dt>
                          <dd>{selected.payload.lastServiceKm} km</dd>
                          <dt>Last service date</dt>
                          <dd>{selected.payload.lastServiceDate}</dd>
                          <dt>Assessment date</dt>
                          <dd>{selected.payload.today}</dd>
                          <dt>Service interval</dt>
                          <dd>
                            {selected.payload.intervalKm} km or{" "}
                            {selected.payload.intervalDays} days
                          </dd>
                        </dl>
                      )}
                    </details>
                    <button
                      className="luqi-secondary"
                      disabled={busy}
                      onClick={() => openTask(selected.id)}
                    >
                      Refresh selected task
                    </button>
                    {["pending", "retry_wait"].includes(selected.state) &&
                      !confirm && (
                        <button
                          ref={cancelButton}
                          className="luqi-secondary"
                          disabled={busy || uncertain}
                          onClick={() => setConfirm(true)}
                        >
                          Cancel task
                        </button>
                      )}
                    {selected.state === "running" && (
                      <p>
                        A running task cannot be cancelled from this dashboard.
                      </p>
                    )}
                    {["completed", "failed", "cancelled"].includes(selected.state) &&
                      !confirmRemove && (
                        <button
                          className="luqi-secondary"
                          disabled={busy || uncertain || submissionUncertain}
                          onClick={() => { setConfirm(false); setConfirmRemove(true); }}
                        >
                          Remove saved task
                        </button>
                      )}
                    {confirmRemove && (
                      <section className="omega-confirm" aria-label="Confirm saved task removal">
                        <h3>Remove this finished task from LUQI?</h3>
                        <p>
                          This permanently removes the selected finished record from
                          active task storage and frees a queue slot. Backups can
                          retain copies until their retention period ends. Running,
                          queued and uncertain tasks cannot be removed this way.
                        </p>
                        <button
                          className="luqi-secondary"
                          disabled={busy}
                          onClick={() => setConfirmRemove(false)}
                        >
                          Keep saved task
                        </button>
                        <button
                          className="luqi-primary"
                          disabled={busy || uncertain || submissionUncertain}
                          onClick={() => {
                            const id = selected.id;
                            void run(async current => {
                              const response = await omegaClient(session.token).removeFinished(id);
                              if (!current()) return;
                              if (!response.removed || response.id !== id) return;
                              setSelected(null);
                              setTasks(previous => previous.filter(item => item.id !== id));
                              setConfirmRemove(false);
                              setNotice("Finished task removed from active storage. Backup copies may remain until the retention period ends.");
                            }, "remove");
                          }}
                        >
                          Confirm removal
                        </button>
                      </section>
                    )}
                    {confirm && (
                      <section
                        className="omega-confirm"
                        aria-label="Confirm task cancellation"
                      >
                        <h3>Cancel this queued task?</h3>
                        <p>
                          The saved record will remain. Cancellation may fail if
                          a worker has already claimed it.
                        </p>
                        <button
                          autoFocus
                          className="luqi-secondary"
                          disabled={busy}
                          onClick={() => {
                            setConfirm(false);
                            requestAnimationFrame(() =>
                              cancelButton.current?.focus(),
                            );
                          }}
                        >
                          Keep task
                        </button>
                        <button
                          className="luqi-primary"
                          disabled={busy || uncertain}
                          onClick={() => {
                            const id = selected.id;
                            void run(async (current) => {
                              const result = await omegaClient(
                                session.token,
                              ).cancel(id);
                              if (!current()) return;
                              setSelected(result.task);
                              setTasks((previous) =>
                                previous.map((task) =>
                                  task.id === id ? result.task : task,
                                ),
                              );
                              setConfirm(false);
                              setNotice(
                                "Task cancellation confirmed. The saved record has been retained.",
                              );
                            }, "cancel");
                          }}
                        >
                          Confirm cancellation
                        </button>
                      </section>
                    )}
                  </>
                )}
              </section>
            </div>
          )}
          <p className="omega-muted omega-privacy">
            Signing out clears this page; it does not delete saved tasks.
            When intake is enabled, you can explicitly remove finished task records; pending and uncertain work is protected, and backups may retain copies. Storage administrators can access task records. Unconfirmed submission inputs stay only in page memory; check saved tasks before starting another after leaving or reloading.
          </p>
        </>
      )}
    </main>
  );
}
