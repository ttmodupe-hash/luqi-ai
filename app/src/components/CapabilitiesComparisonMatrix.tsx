// =====================================================================
// CAPABILITIES & ARCHIVING COMPARISON MATRIX
// Luqi AI Sovereign Engine vs OpenAI (GPT-4o) vs Anthropic (Claude 3.5 Sonnet) vs Traditional Platforms
// =====================================================================

import { useState } from "react";
import {
  Check,
  X,
  AlertTriangle,
  Sparkles,
  Archive,
  Cpu,
  Globe,
  CreditCard,
  GraduationCap,
  Activity,
  ShieldCheck,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router";

interface MatrixRow {
  dimension: string;
  category: string;
  icon: any;
  luqi: {
    status: "full" | "partial" | "none";
    badge: string;
    details: string;
  };
  openai: {
    status: "full" | "partial" | "none";
    badge: string;
    details: string;
  };
  claude: {
    status: "full" | "partial" | "none";
    badge: string;
    details: string;
  };
  traditional: {
    status: "full" | "partial" | "none";
    badge: string;
    details: string;
  };
}

const COMPARISON_DATA: MatrixRow[] = [
  {
    dimension: "Total Mechanical & Cognitive Archiving",
    category: "Archiving & Data Sovereignty",
    icon: Archive,
    luqi: {
      status: "full",
      badge: "Immutable Ledger",
      details: "Complete historical snapshotting, verifiable telemetry ledgers, and local offline school server cache.",
    },
    openai: {
      status: "none",
      badge: "Session Only",
      details: "Ephemeral conversation history; no structured data archiving or local deployment synchronization.",
    },
    claude: {
      status: "none",
      badge: "Transient Window",
      details: "Context window resets; cannot export sovereign verifiable ledgers or sync to local offline nodes.",
    },
    traditional: {
      status: "partial",
      badge: "Fragmented SQL",
      details: "Siloed database records without cognitive state capture or verifiable cryptographic audit logs.",
    },
  },
  {
    dimension: "Zero-Dependency Interactive STEM Labs",
    category: "Science & Education",
    icon: Activity,
    luqi: {
      status: "full",
      badge: "100% Offline Canvas RK4",
      details: "Real-time physics, kinematics, and chemistry simulations running on HTML5 Canvas without internet or external CDNs.",
    },
    openai: {
      status: "none",
      badge: "Code Generation Only",
      details: "Produces raw text code; cannot render zero-dependency real-time interactive physics in chat.",
    },
    claude: {
      status: "partial",
      badge: "Artifacts (Web Only)",
      details: "Requires active cloud connection and Webpack/iframe bundling; no standalone offline physics rig.",
    },
    traditional: {
      status: "partial",
      badge: "Static Videos / Flash",
      details: "Pre-recorded lectures or outdated Flash/heavy applets requiring high-speed broadband.",
    },
  },
  {
    dimension: "Pan-African Languages & Cultural Grounding",
    category: "Multilingual Intelligence",
    icon: Globe,
    luqi: {
      status: "full",
      badge: "11+ Native Dialects",
      details: "Deep linguistic tokenization in Swahili, Yoruba, Zulu, Amharic, Hausa, Afrikaans, French, and Arabic.",
    },
    openai: {
      status: "partial",
      badge: "Machine Translation",
      details: "Token inefficiency on African languages (high token cost, hallucinated idioms, English syntax bias).",
    },
    claude: {
      status: "partial",
      badge: "English / French Bias",
      details: "Strong in French and English, but minimal low-resource Bantu or Afroasiatic language nuances.",
    },
    traditional: {
      status: "none",
      badge: "English Only",
      details: "Curriculum materials locked in European languages with zero vernacular translation.",
    },
  },
  {
    dimension: "Pan-African Payment Rails & USSD Access",
    category: "Fintech & Accessibility",
    icon: CreditCard,
    luqi: {
      status: "full",
      badge: "MTN MoMo, M-Pesa & USSD",
      details: "Native mobile money USSD push payment (*120# prompts), PayFast, Airtel Money, and PAPSS settlement.",
    },
    openai: {
      status: "none",
      badge: "Stripe / Card Only",
      details: "Requires international Visa/Mastercard with USD billing; inaccessible to 80% of African students.",
    },
    claude: {
      status: "none",
      badge: "Stripe / Card Only",
      details: "Strict international credit card gateway; no domestic African currency or mobile-money support.",
    },
    traditional: {
      status: "partial",
      badge: "Bank EFT / Paystack",
      details: "Limited manual bank transfers or rigid card paywalls; lacks real-time automated token credit.",
    },
  },
  {
    dimension: "Curriculum Standards Alignment",
    category: "Pedagogical Rigor",
    icon: GraduationCap,
    luqi: {
      status: "full",
      badge: "CAPS, CBC, WASSCE, CAIE",
      details: "Native alignment with South Africa CAPS (Grades 10-12), Kenya CBC, West Africa WASSCE, and Cambridge IGCSE/A-Levels.",
    },
    openai: {
      status: "partial",
      badge: "Generic Reasoning",
      details: "Understands general physics/math but unaligned to regional assessment rubrics or exam specifications.",
    },
    claude: {
      status: "partial",
      badge: "Standard Socratic",
      details: "Strong academic tone but lacks specific national syllabus guidelines and exam board marking schemes.",
    },
    traditional: {
      status: "partial",
      badge: "Regional Silos",
      details: "Restricted to single textbook publishers with zero dynamic adaptation or personalized remedial loops.",
    },
  },
  {
    dimension: "Generative Intelligent UI in Output",
    category: "Generative UI",
    icon: Layers,
    luqi: {
      status: "full",
      badge: "Live Calculators, Charts, Maps",
      details: "Dynamically embeds interactive calculation sliders, Chart.js time-series graphs, and interactive maps directly in responses.",
    },
    openai: {
      status: "none",
      badge: "Text & Markdown",
      details: "Plain text, Markdown tables, or ASCII art; cannot emit interactive functional web components.",
    },
    claude: {
      status: "partial",
      badge: "Sandboxed React Artifacts",
      details: "Renders in separate side-panel sandbox; does not interleave interactive widgets directly into text flow.",
    },
    traditional: {
      status: "none",
      badge: "Static Forms",
      details: "Static hardcoded web forms with no dynamic AI-driven parameter injection.",
    },
  },
  {
    dimension: "Autonomous Self-Healing & Pre-Flight Daemon",
    category: "Reliability & Resilience",
    icon: ShieldCheck,
    luqi: {
      status: "full",
      badge: "Zero-Downtime Hot Failover",
      details: "Automated 60-second health check daemon, circuit breakers, and sub-second Nginx failover routing.",
    },
    openai: {
      status: "none",
      badge: "Cloud Dependent",
      details: "Frequent live service degradations during peak traffic with no localized client failover.",
    },
    claude: {
      status: "none",
      badge: "Cloud Dependent",
      details: "Rate limiting during peak load; no self-healing local infrastructure fallback.",
    },
    traditional: {
      status: "none",
      badge: "Single Server",
      details: "Vulnerable to server crashes during exam submission spikes with zero automated hot-reload.",
    },
  },
];

export default function CapabilitiesComparisonMatrix() {
  const [selectedFilter, setSelectedFilter] = useState<string>("All");

  const categories = ["All", ...Array.from(new Set(COMPARISON_DATA.map((r) => r.category)))];

  const filteredData =
    selectedFilter === "All"
      ? COMPARISON_DATA
      : COMPARISON_DATA.filter((r) => r.category === selectedFilter);

  const renderBadge = (item: { status: "full" | "partial" | "none"; badge: string; details: string }, isLuqi = false) => {
    let icon = <Check className="w-3.5 h-3.5 text-emerald-400" />;
    let style = "bg-emerald-500/10 border-emerald-500/30 text-emerald-300";

    if (item.status === "partial") {
      icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
      style = "bg-amber-500/10 border-amber-500/30 text-amber-300";
    } else if (item.status === "none") {
      icon = <X className="w-3.5 h-3.5 text-rose-400" />;
      style = "bg-rose-500/10 border-rose-500/30 text-rose-300";
    }

    if (isLuqi) {
      style = "bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border-amber-500/50 text-amber-200 font-bold shadow-sm shadow-amber-500/10";
      icon = <Sparkles className="w-3.5 h-3.5 text-amber-400" />;
    }

    return (
      <div className="space-y-1.5">
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs border ${style}`}>
          {icon}
          <span>{item.badge}</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">{item.details}</p>
      </div>
    );
  };

  return (
    <section className="space-y-6">
      {/* Section Header */}
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Sparkles className="w-3.5 h-3.5" /> Empirical Capability & Archival Benchmarks
        </span>
        <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-100">
          How Luqi AI Outperforms Generic Chatbots
        </h3>
        <p className="text-xs sm:text-sm text-slate-400">
          Designed specifically to bridge sovereign pan-African digital education, offline STEM simulations, verifiable data archiving, and domestic payment channels.
        </p>
      </div>

      {/* Category Pills */}
      <div className="flex items-center justify-center gap-1.5 overflow-x-auto pb-2 scrollbar-none text-xs">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedFilter(cat)}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap ${
              selectedFilter === cat
                ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                : "bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Responsive Comparison Table Container */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 shadow-xl overflow-hidden backdrop-blur">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-xs text-slate-400">
                <th className="py-4 px-4 font-semibold w-[26%]">Capability & Architecture</th>
                <th className="py-4 px-4 font-bold text-amber-300 bg-amber-500/5 border-x border-amber-500/20 w-[28%]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-md bg-gradient-to-br from-amber-500 to-orange-500 text-white font-bold flex items-center justify-center text-[10px]">
                      L
                    </div>
                    <span>Luqi AI Sovereign Core</span>
                  </div>
                </th>
                <th className="py-4 px-4 font-semibold w-[23%] text-slate-300">OpenAI (GPT-4o)</th>
                <th className="py-4 px-4 font-semibold w-[23%] text-slate-300">Claude 3.5 Sonnet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredData.map((row, idx) => {
                const Icon = row.icon;
                return (
                  <tr key={idx} className="hover:bg-slate-850/40 transition-colors">
                    <td className="py-4 px-4 align-top">
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-100 text-sm">{row.dimension}</div>
                          <div className="text-[10px] text-slate-400">{row.category}</div>
                        </div>
                      </div>
                    </td>

                    {/* Luqi AI Column (Highlighted) */}
                    <td className="py-4 px-4 align-top bg-amber-500/[0.03] border-x border-amber-500/20">
                      {renderBadge(row.luqi, true)}
                    </td>

                    {/* OpenAI Column */}
                    <td className="py-4 px-4 align-top">{renderBadge(row.openai)}</td>

                    {/* Claude Column */}
                    <td className="py-4 px-4 align-top">{renderBadge(row.claude)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Footer Callout */}
        <div className="p-4 bg-slate-950/70 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              All simulations run locally in offline environments &middot; Fully compliant with African and international curricula.
            </span>
          </div>

          <Link
            to="/pendulum-lab"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:brightness-110 text-white font-bold text-xs shadow-md shadow-sky-500/20 transition-all"
          >
            <span>Launch Physics Lab Simulator</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
