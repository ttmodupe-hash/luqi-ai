import { Link } from "react-router";
import { ArrowLeft, Shield } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 max-w-4xl mx-auto space-y-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
      </Link>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6 text-amber-400" /> Terms of Service
        </h1>
        <p className="text-xs text-slate-400">Luqi AI Commercial & Educational Usage Policies</p>
      </div>
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-4 leading-relaxed">
        <p>1. <strong>Virtual Credits & Pricing:</strong> All generative video and voice execution is billed via Luqi Credits. Credits are deducted atomically prior to rendering and refunded in case of job failure.</p>
        <p>2. <strong>Commercial Licensing:</strong> Pro and Studio subscribers receive commercial licensing rights for all synthesized audio and video outputs.</p>
        <p>3. <strong>Data Archiving:</strong> The platform maintains mechanical flight logs and cognitive memory ledgers for auditability and verification.</p>
      </div>
    </div>
  );
}
