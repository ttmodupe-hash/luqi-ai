/**
 * LUQI AI — 404 Not Found
 * ========================
 * Friendly error page for unknown routes.
 */

import { useNavigate } from "react-router";
import { Home, ArrowLeft, Search } from "lucide-react";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center p-4">
      <div className="text-center max-w-md space-y-6">
        {/* 404 */}
        <div className="text-8xl font-bold text-cyan-500/20">404</div>

        <div>
          <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
          <p className="text-neutral-400">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-cyan-500 text-black font-medium hover:bg-cyan-400 transition-colors"
          >
            <Home size={18} />
            Go Home
          </button>
          <button
            onClick={() => navigate("/search")}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white hover:border-cyan-500/50 transition-colors"
          >
            <Search size={18} />
            Search LUQI AI
          </button>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white hover:border-cyan-500/50 transition-colors"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>
        </div>

        <p className="text-xs text-neutral-600">
          If you believe this is an error, please{" "}
          <button onClick={() => navigate("/contact")} className="text-cyan-500 hover:underline">
            contact us
          </button>
          .
        </p>
      </div>
    </div>
  );
}
