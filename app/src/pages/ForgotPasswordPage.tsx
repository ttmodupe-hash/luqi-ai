import { Link } from "react-router";
import { ArrowLeft, LockKeyhole } from "lucide-react";

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
      <section className="w-full max-w-md rounded-2xl border border-neutral-700 bg-neutral-800 p-6" aria-labelledby="recovery-title">
        <LockKeyhole className="h-8 w-8 text-cyan-400 mb-4" aria-hidden="true" />
        <h1 id="recovery-title" className="text-xl font-semibold text-white mb-3">Account recovery</h1>
        <p className="text-sm text-gray-300 mb-4">
          Automated password-reset emails are not available yet. Contact your LUQI administrator through your usual verified support channel for help recovering access.
        </p>
        <p className="text-sm text-gray-400 mb-6">
          Your administrator must verify account ownership. Never send your password in a message or screenshot.
        </p>
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400">
          <ArrowLeft size={16} aria-hidden="true" />Back to login
        </Link>
      </section>
    </main>
  );
}
