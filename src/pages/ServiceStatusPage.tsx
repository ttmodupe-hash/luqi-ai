import ApiSystemStatusDashboard from "../components/ApiSystemStatusDashboard";

export default function ServiceStatusPage() {
  return (
    <main className="mx-auto w-full max-w-3xl min-w-0 px-4 py-10 text-slate-100">
      <h1 className="text-3xl font-bold">Luqi service status</h1>
      <p className="mt-3 text-slate-300">
        Understand which parts of Luqi responded to a read-only check. A configured AI connection is not the same as a successful AI reply.
      </p>
      <ApiSystemStatusDashboard humanReadable />
      <section className="my-6 space-y-3 rounded-xl border border-slate-700 bg-slate-950 p-5" aria-labelledby="earlier-ai-evidence">
        <h2 id="earlier-ai-evidence" className="text-xl font-semibold">Earlier verified AI reply</h2>
        <p className="text-slate-300">
          On 27 October 2026, one authenticated Gemini text reply passed a controlled production acceptance test. This is dated evidence of one successful request, not proof that the AI is answering right now or will always be available.
        </p>
        <p className="text-sm text-slate-400">
          This page does not run another paid request or verify OpenAI responses, provider invoices or launch approval.
        </p>
        <a className="inline-block text-teal-200 underline underline-offset-4 hover:text-teal-100"
          href="https://github.com/ttmodupe-hash/luqi-ai/actions/runs/40465090272"
          target="_blank" rel="noopener noreferrer">View dated Gemini test evidence</a>
      </section>
    </main>
  );
}
