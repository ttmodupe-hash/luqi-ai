import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-2xl font-black mb-4">
        404
      </div>
      <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
      <p className="text-xs text-slate-400 max-w-sm mb-6">
        The requested resource is not available or has been moved to another section of Luqi AI.
      </p>
      <Link
        to="/"
        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 inline-flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>
    </div>
  );
}
