import { Link } from "react-router";

/**
 * Legacy support component, intentionally not linked from the live app router.
 * The old widget fabricated tickets, replies and billing/SLA statistics if
 * /api/v25/support requests failed. There is currently no authenticated,
 * persistent ticket backend, so never present an interactive ticket form.
 */
export default function SupportPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-10">
      <section className="mx-auto max-w-xl space-y-5" aria-labelledby="support-heading">
        <h1 id="support-heading" className="text-2xl font-semibold">LUQI help and feedback</h1>
        <p>
          Online ticket creation, ticket tracking and reply dashboards are not
          available yet. This page cannot submit or save a support request.
        </p>
        <p>
          For technical bugs, use the public project issue tracker without
          including account details, passwords, tokens or private notes.
          For private questions or forgotten passwords, reply through the
          verified channel used to invite you to the pilot.
        </p>
        <p>Automated password-reset emails are not available.</p>
        <nav className="flex flex-wrap gap-4" aria-label="Help links">
          <Link className="underline underline-offset-4" to="/contact">Help and feedback</Link>
          <Link className="underline underline-offset-4" to="/service-status">Service status</Link>
          <Link className="underline underline-offset-4" to="/start">Getting started</Link>
        </nav>
      </section>
    </main>
  );
}
