import { Link } from "react-router";

/**
 * This page deliberately does not initialise the legacy self-healing dashboard.
 * Its old queries poll backend routes that production explicitly retires with
 * SELF_HEALING_PIPELINE_NOT_CONFIGURED (503). Do not advertise simulations as
 * executed GitHub reviews, sandbox tests, or deployments.
 *
 * The route stays available for an honest explanation and working navigation.
 * Re-enable only after independently reviewed server authorization, backend
 * integrations, tests, and a verified release.
 */
export default function SelfHealingUnavailablePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100 sm:px-6">
      <section aria-labelledby="luqi-repair-status-heading" className="mx-auto max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-lg sm:p-10">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-sky-300">Luqi system reliability</p>
        <h1 id="luqi-repair-status-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
          Automated repair is not available
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-300">
          Luqi does not currently run automatic code repairs, sandbox tests,
          GitHub approvals or production deployments from this screen.
          These operations require verified integrations and authorised human review.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          No repair, AI request or deployment has been started. You can return
          to Luqi Chat or the home page using the links below.
        </p>
        <nav aria-label="Continue using Luqi" className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link to="/chat" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300">
            Open Luqi Chat
          </Link>
          <Link to="/" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-600 px-5 py-3 font-semibold text-slate-100 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300">
            Return to Luqi home
          </Link>
        </nav>
      </section>
    </main>
  );
}
