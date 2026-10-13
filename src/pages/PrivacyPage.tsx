import { Link } from "react-router";
import { ArrowLeft, Lock } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 max-w-4xl mx-auto space-y-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
      </Link>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Lock className="w-6 h-6 text-emerald-400" /> Privacy & POPIA Policy
        </h1>
        <p className="text-xs text-slate-400">South African POPIA & Global Data Protection Compliance</p>
      </div>
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-4 leading-relaxed">
        <p>1. <strong>Data Minimization:</strong> Luqi AI processes user prompts and task inputs solely for generating requested educational simulations, voiceovers, and animation cuts.</p>
        <p>2. <strong>Credential Redaction:</strong> All system loggers automatically redact sensitive tokens, passwords, and private headers.</p>
        <p>3. <strong>Storage & Encryption:</strong> Checkpoints and cognitive memories are stored in dedicated persistent volumes.</p>
      </div>
    </div>
  );
}
