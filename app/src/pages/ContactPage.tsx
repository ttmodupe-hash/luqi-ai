import { Link } from "react-router";
import { ArrowLeft, Mail, Phone, MapPin } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 max-w-4xl mx-auto space-y-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
      </Link>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="w-6 h-6 text-sky-400" /> Contact & Enterprise Inquiries
        </h1>
        <p className="text-xs text-slate-400">Luqi AI Commercial Licensing & Custom Deployments</p>
      </div>
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center gap-3 text-xs text-slate-300">
          <Mail className="w-4 h-4 text-sky-400" />
          <span>hello@luqi-ai.com / enterprise@luqi-ai.com</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-300">
          <MapPin className="w-4 h-4 text-amber-400" />
          <span>Johannesburg &middot; Cape Town &middot; South Africa</span>
        </div>
      </div>
    </div>
  );
}
