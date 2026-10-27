import ApiSystemStatusDashboard from "../components/ApiSystemStatusDashboard";
export default function ServiceStatusPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-slate-100">
      <h1 className="text-3xl font-bold">Service status</h1>
      <p className="mt-3 text-slate-300">
        Read-only checks for the Luqi runtime, storage and AI pilot
        configuration.
      </p>
      <ApiSystemStatusDashboard />
    </main>
  );
}
