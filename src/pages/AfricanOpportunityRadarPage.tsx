// =====================================================================
// AUTONOMOUS AFRICAN MARKET & TECHNOLOGY SENSING LOOP
// Chief Strategy Officer Agent & Ecosystem Radar for Limitless Telecoms
// =====================================================================

import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router";
import {
  Globe,
  TrendingUp,
  Award,
  Code,
  Sprout,
  Truck,
  Zap,
  Shield,
  Sparkles,
  ArrowRight,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Play,
  Terminal,
  FileText,
  DollarSign,
  Compass,
  Cpu,
  Layers,
  ChevronRight,
  ExternalLink,
  Loader2,
  Radio,
  Bell,
  Clock,
  Pause,
  Eye,
  Flame,
  Filter,
  Copy,
  Download,
  Check,
} from "lucide-react";
import { getAuthHeaders } from "../lib/api";

export default function AfricanOpportunityRadarPage() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<"verticals" | "grants" | "apis" | "agritech" | "logistics">("verticals");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    if (tabParam && ["verticals", "grants", "apis", "agritech", "logistics"].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [location.search]);

  useEffect(() => {
    const handleCustomNav = (e: any) => {
      const detail = e.detail;
      if (detail?.tabKey === "tab" && detail?.tabValue && ["verticals", "grants", "apis", "agritech", "logistics"].includes(detail.tabValue)) {
        setActiveTab(detail.tabValue);
      }
    };
    window.addEventListener("luqi:navigate-tab", handleCustomNav);
    return () => window.removeEventListener("luqi:navigate-tab", handleCustomNav);
  }, []);

  const [radarData, setRadarData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Grant Drafter State
  const [selectedGrant, setSelectedGrant] = useState("tia_seed_fund_q4_2026");
  const [draftedProposal, setDraftedProposal] = useState<any>(null);
  const [isDrafting, setIsDrafting] = useState(false);
  const [copiedProposal, setCopiedProposal] = useState(false);

  // API Wrapper State
  const [selectedApi, setSelectedApi] = useState("Flutterwave");
  const [generatedWrapper, setGeneratedWrapper] = useState<any>(null);
  const [isGeneratingWrapper, setIsGeneratingWrapper] = useState(false);

  // Agritech Satellite Predictor State
  const [agriRegion, setAgriRegion] = useState("Free State, South Africa");
  const [agriCrop, setAgriCrop] = useState("Maize");
  const [agriResult, setAgriResult] = useState<any>(null);
  const [isPredictingAgri, setIsPredictingAgri] = useState(false);

  // Logistics Corridor State
  const [corridorOrigin, setCorridorOrigin] = useState("Durban, South Africa");
  const [corridorDest, setCorridorDest] = useState("Harare, Zimbabwe");
  const [cargoValue, setCargoValue] = useState(65000);
  const [corridorResult, setCorridorResult] = useState<any>(null);
  const [isCalculatingCorridor, setIsCalculatingCorridor] = useState(false);

  const fetchRadar = async () => {
    try {
      const res = await fetch("/api/v1/sensing/radar");
      if (res.ok) {
        const data = await res.json();
        setRadarData(data);
      }
    } catch {
      // Non-fatal
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunAgritech = async (region: string, crop: string) => {
    setIsPredictingAgri(true);
    try {
      const res = await fetch("/api/v1/sensing/agritech-predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region, crop }),
      });
      if (res.ok) {
        const data = await res.json();
        setAgriResult(data);
      }
    } catch {
      // Non-fatal
    } finally {
      setIsPredictingAgri(false);
    }
  };

  const handleCalculateCorridor = async (origin: string, dest: string, val: number) => {
    setIsCalculatingCorridor(true);
    try {
      const res = await fetch("/api/v1/sensing/afcfta-corridor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin, destination: dest, declared_value_usd: val }),
      });
      if (res.ok) {
        const data = await res.json();
        setCorridorResult(data);
      }
    } catch {
      // Non-fatal
    } finally {
      setIsCalculatingCorridor(false);
    }
  };

  // Real-Time Ticker Sidebar State
  const [tickerItems, setTickerItems] = useState<any[]>([]);
  const [isPollingTicker, setIsPollingTicker] = useState(true);
  const [isTickerLoading, setIsTickerLoading] = useState(false);
  const [lastTickerUpdate, setLastTickerUpdate] = useState<Date>(new Date());
  const [tickerFilter, setTickerFilter] = useState<string>("ALL");
  const [tickerFlash, setTickerFlash] = useState(false);

  const fetchTicker = async (silent = false) => {
    if (!silent) setIsTickerLoading(true);
    try {
      const res = await fetch("/api/v1/sensing/ticker");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.items)) {
          setTickerItems(data.items);
          setLastTickerUpdate(new Date());
          setTickerFlash(true);
          setTimeout(() => setTickerFlash(false), 800);
        }
      }
    } catch {
      // Non-fatal
    } finally {
      if (!silent) setIsTickerLoading(false);
    }
  };

  useEffect(() => {
    fetchRadar();
    fetchTicker();
    // Pre-calculate initial agritech and corridor values
    handleRunAgritech("Free State, South Africa", "Maize");
    handleCalculateCorridor("Durban, South Africa", "Harare, Zimbabwe", 65000);
  }, []);

  // Dedicated Polling Interval Effect (every 10 seconds)
  useEffect(() => {
    if (!isPollingTicker) return;
    const interval = setInterval(() => {
      fetchTicker(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [isPollingTicker]);

  const handleScan = async () => {
    setIsScanning(true);
    setNotification(null);
    try {
      const res = await fetch("/api/v1/sensing/run-scan", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setRadarData(data);
        setNotification("Market Sensing Loop complete: 5 African verticals scanned, 3 active grants verified.");
      }
    } catch (err: any) {
      setNotification(`Scan failed: ${err?.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleDraftGrant = async (targetGrantId?: string) => {
    const idToDraft = targetGrantId || selectedGrant || "tia_seed_fund_q4_2026";
    setSelectedGrant(idToDraft);
    setIsDrafting(true);
    setDraftedProposal(null);
    try {
      const res = await fetch("/api/v1/sensing/draft-grant", {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ grant_id: idToDraft }),
      });
      if (res.ok) {
        const data = await res.json();
        setDraftedProposal(data);
        setNotification(`Proposal drafted for ${data.grant_title}! Ready for review.`);
        setTimeout(() => {
          document.getElementById("proposal-draft-preview")?.scrollIntoView({ behavior: "smooth" });
        }, 120);
      } else {
        throw new Error(`Server returned ${res.status}`);
      }
    } catch (err: any) {
      setNotification(`Drafting error: ${err?.message}`);
    } finally {
      setIsDrafting(false);
    }
  };

  const handleCopyProposal = () => {
    if (!draftedProposal) return;
    const text = `# ${draftedProposal.grant_title}
Proposal ID: ${draftedProposal.proposal_id}
Sponsor: ${draftedProposal.sponsor}
Requested Funding: ${draftedProposal.requested_funding}
Status: ${draftedProposal.status}

## Executive Summary
${draftedProposal.executive_summary}

## Technical Architecture Alignment
${draftedProposal.technical_architecture_alignment?.map((a: any) => `- **${a.criterion}**: ${a.luqi_implementation} (${a.readiness})`).join('\n')}

## Proposed Milestones & Deliverables
${draftedProposal.proposed_milestones?.map((m: any) => `- **${m.milestone}**: ${m.deliverable}`).join('\n')}
`;
    navigator.clipboard.writeText(text);
    setCopiedProposal(true);
    setNotification("Full grant proposal copied to clipboard!");
    setTimeout(() => setCopiedProposal(false), 2000);
  };

  const handleDownloadProposal = () => {
    if (!draftedProposal) return;
    const text = `# ${draftedProposal.grant_title}
Proposal ID: ${draftedProposal.proposal_id}
Sponsor: ${draftedProposal.sponsor}
Requested Funding: ${draftedProposal.requested_funding}
Status: ${draftedProposal.status}

## Executive Summary
${draftedProposal.executive_summary}

## Technical Architecture Alignment
${draftedProposal.technical_architecture_alignment?.map((a: any) => `- **${a.criterion}**: ${a.luqi_implementation} (${a.readiness})`).join('\n')}

## Proposed Milestones & Deliverables
${draftedProposal.proposed_milestones?.map((m: any) => `- **${m.milestone}**: ${m.deliverable}`).join('\n')}
`;
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${draftedProposal.proposal_id}_${draftedProposal.grant_id || 'proposal'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setNotification("Proposal downloaded as markdown file!");
  };

  const handleGenerateWrapper = async (apiName: string) => {
    setIsGeneratingWrapper(true);
    setSelectedApi(apiName);
    setGeneratedWrapper(null);
    try {
      const res = await fetch("/api/v1/sensing/generate-api-wrapper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_name: apiName }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedWrapper(data);
      }
    } catch (err: any) {
      setNotification(`Generation error: ${err?.message}`);
    } finally {
      setIsGeneratingWrapper(false);
    }
  };

  const handleDispatchToPipeline = async (title: string, vertical: string, spec: string) => {
    try {
      const res = await fetch("/api/v1/sensing/dispatch-to-pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunity_title: title,
          target_vertical: vertical,
          feature_specification: spec,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setNotification(`Dispatched "${title}" to the 70/30 Self-Healing Pipeline! PR created & halted at Human Gate.`);
      }
    } catch (err: any) {
      setNotification(`Dispatch error: ${err?.message}`);
    }
  };

  const verticals = radarData?.verticals || {};
  const grants = radarData?.grants || [];

  const filteredTickerItems = tickerItems.filter((item) => {
    if (tickerFilter === "ALL") return true;
    const cat = (item.category || "").toLowerCase();
    if (tickerFilter === "FINTECH") return cat.includes("fintech") || cat.includes("township") || cat.includes("settlement");
    if (tickerFilter === "CLIMATE") return cat.includes("climate") || cat.includes("agritech") || cat.includes("resilience");
    if (tickerFilter === "AI INFRA") return cat.includes("ai") || cat.includes("sovereign") || cat.includes("infrastructure");
    if (tickerFilter === "TRADE") return cat.includes("trade") || cat.includes("corridor") || cat.includes("msme");
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-emerald-500 via-teal-500 to-sky-500 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-emerald-500/20">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">African Opportunity Radar</h1>
              <p className="text-xs text-slate-400">Autonomous Market & Tech Sensing Loop &middot; Limitless Telecoms</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleScan}
              disabled={isScanning}
              className="text-xs px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all flex items-center gap-1.5 font-medium disabled:opacity-50"
            >
              {isScanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {isScanning ? "Scanning Ecosystem..." : "Scan African Opportunities"}
            </button>
            <Link
              to="/self-healing"
              className="text-xs px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition font-medium flex items-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400" /> 70/30 Pipeline
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Notification Banner */}
        {notification && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <p className="text-sm text-emerald-200">{notification}</p>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Responsive Grid with Real-Time Ticker Sidebar */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* Main Left Column (Ecosystem & Tools) */}
          <div className="xl:col-span-8 space-y-8">
            {/* Hero Banner */}
            <div className="rounded-3xl border border-slate-800 bg-linear-to-r from-slate-900 via-slate-900/90 to-emerald-950/30 p-6 sm:p-8 relative overflow-hidden shadow-2xl">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" /> 2026 African Tech Ecosystem Loop
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Autonomous Market & Technology Sensing Loop
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Moving beyond basic survival to massive continent-wide infrastructure. LUQI AI proactively monitors African high-growth verticals, auto-drafts grant proposals for open innovation challenges, writes wrappers for sovereign APIs, and converts sensed opportunities into verified pull requests.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
            <div>
              <div className="text-xs text-slate-400">Verticals Monitored</div>
              <div className="text-xl font-bold text-white mt-0.5">5 High-Growth</div>
              <div className="text-[10px] text-emerald-400">+48% Avg YoY Expansion</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Open Grants Detected</div>
              <div className="text-xl font-bold text-emerald-400 mt-0.5">$900K+ Capital</div>
              <div className="text-[10px] text-slate-400">AfCFTA & GSMA Open</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">African APIs Sandbox-Vetted</div>
              <div className="text-xl font-bold text-sky-400 mt-0.5">4 Native Stacks</div>
              <div className="text-[10px] text-slate-400">PAPSS, FLW, Sand, Eskom</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">AfCFTA Tariff Savings</div>
              <div className="text-xl font-bold text-amber-400 mt-0.5">Up to 83.3%</div>
              <div className="text-[10px] text-slate-400">Rules of Origin Optimised</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
          <button
            onClick={() => setActiveTab("verticals")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
              activeTab === "verticals"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            <TrendingUp className="w-4 h-4" /> Growth Verticals
          </button>
          <button
            onClick={() => setActiveTab("grants")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
              activeTab === "grants"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            <Award className="w-4 h-4" /> Grant Hunter & Drafter
          </button>
          <button
            onClick={() => setActiveTab("apis")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
              activeTab === "apis"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            <Code className="w-4 h-4" /> African API Generator
          </button>
          <button
            onClick={() => setActiveTab("agritech")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
              activeTab === "agritech"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            <Sprout className="w-4 h-4" /> Satellite Agritech (NDVI)
          </button>
          <button
            onClick={() => setActiveTab("logistics")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
              activeTab === "logistics"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            <Truck className="w-4 h-4" /> AfCFTA Trade Corridors
          </button>
        </div>

        {/* ── 1. GROWTH VERTICALS TAB ──────────────────────────────── */}
        {activeTab === "verticals" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">High-Growth African Market Verticals (2026 Radar)</h3>
                <p className="text-xs text-slate-400">
                  Real-time opportunity analysis scored by revenue expansion, AfCFTA impact, and LUQI architecture readiness.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Object.values(verticals).map((vert: any) => (
                <div
                  key={vert.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 flex flex-col justify-between hover:border-emerald-500/40 transition group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-400 px-2 py-0.5 rounded-sm bg-emerald-500/10 border border-emerald-500/20">
                        {vert.growth_rate_yoy} YoY
                      </span>
                      <span className="text-xs font-mono text-slate-400">Est. {vert.market_size_2026}</span>
                    </div>

                    <h4 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                      {vert.title}
                    </h4>

                    <div className="space-y-1.5 text-xs text-slate-300">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Key Drivers:</div>
                      <ul className="list-disc list-inside text-slate-400 space-y-1 text-[11px]">
                        {vert.key_drivers?.map((kd: string, i: number) => (
                          <li key={i}>{kd}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="text-[11px] text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                      <strong className="text-emerald-400">LUQI Fit:</strong> {vert.luqi_alignment}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <div className="text-xs">
                      <span className="text-slate-500">Opportunity Score:</span>{" "}
                      <strong className="text-white font-mono">{vert.opportunity_score}/100</strong>
                    </div>

                    <button
                      onClick={() =>
                        handleDispatchToPipeline(
                          vert.title,
                          vert.title.split(" ")[0],
                          `Prototype high-speed adapter for ${vert.leading_infrastructure?.[0] || "African rail"}`
                        )
                      }
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-medium transition"
                    >
                      <Play className="w-3 h-3" /> Prototype in Sandbox
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 2. GRANT HUNTER & DRAFTER TAB ───────────────────────── */}
        {activeTab === "grants" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" /> Active Pan-African Grant Opportunities & Challenge Drafter
                </h3>
                <p className="text-xs text-slate-400">
                  LUQI AI monitors innovation calls, extracts evaluation rubrics, and autonomously generates proposal briefs.
                </p>
              </div>
            </div>

            {/* Grant Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {grants.map((grant: any) => {
                const isSelected = selectedGrant === grant.id;
                return (
                  <div
                    key={grant.id}
                    onClick={() => setSelectedGrant(grant.id)}
                    className={`rounded-2xl border p-5 cursor-pointer transition flex flex-col justify-between ${
                      isSelected
                        ? "border-amber-500/60 bg-amber-950/20 shadow-lg shadow-amber-500/5"
                        : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-amber-400 px-2 py-0.5 rounded-sm bg-amber-500/10 border border-amber-500/20">
                          {grant.funding_amount}
                        </span>
                        <span className="text-[10px] text-slate-500">Deadline: {grant.deadline}</span>
                      </div>

                      <h4 className="text-sm font-bold text-white">{grant.title}</h4>
                      <p className="text-xs text-slate-400">Sponsor: {grant.sponsor}</p>

                      <div className="text-[11px] text-slate-300">
                        <span className="text-slate-500 font-medium">Recommended Subsystem:</span>
                        <div className="text-amber-200 mt-0.5 font-medium">{grant.recommended_feature}</div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-emerald-400 font-semibold">{grant.eligibility_match}% Match</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedGrant(grant.id);
                          handleDraftGrant(grant.id);
                        }}
                        disabled={isDrafting}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 transition disabled:opacity-60"
                      >
                        {isDrafting && selectedGrant === grant.id ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" /> Drafting...
                          </>
                        ) : (
                          <>
                            <FileText className="w-3 h-3" /> Auto-Draft Proposal
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Drafted Proposal Preview */}
            {draftedProposal && (
              <div id="proposal-draft-preview" className="rounded-2xl border border-amber-500/40 bg-slate-900/90 p-6 space-y-5 shadow-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-[10px] uppercase font-mono text-amber-400 tracking-wider">
                      Executive Proposal Draft &middot; {draftedProposal.proposal_id}
                    </span>
                    <h4 className="text-lg font-bold text-white mt-0.5">{draftedProposal.grant_title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Sponsor: {draftedProposal.sponsor} &middot; Funding: {draftedProposal.requested_funding}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {draftedProposal.status}
                    </span>
                    <button
                      onClick={handleCopyProposal}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition"
                    >
                      {copiedProposal ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedProposal ? "Copied" : "Copy Brief"}</span>
                    </button>
                    <button
                      onClick={handleDownloadProposal}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium flex items-center gap-1.5 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .md</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <h5 className="font-semibold text-slate-300 text-xs uppercase tracking-wider mb-1">Executive Summary</h5>
                    <p className="text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
                      {draftedProposal.executive_summary}
                    </p>
                  </div>

                  <div>
                    <h5 className="font-semibold text-slate-300 text-xs uppercase tracking-wider mb-2">Technical Architecture Alignment</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {draftedProposal.technical_architecture_alignment?.map((align: any, i: number) => (
                        <div key={i} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                          <div className="font-semibold text-amber-300 text-[11px]">{align.criterion}</div>
                          <div className="text-slate-400 text-[11px]">{align.luqi_implementation}</div>
                          <div className="text-emerald-400 text-[10px] font-mono">{align.readiness}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-semibold text-slate-300 text-xs uppercase tracking-wider mb-2">Key Milestones & Deliverables</h5>
                    <div className="space-y-2">
                      {draftedProposal.proposed_milestones?.map((m: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                          <span className="font-mono text-amber-400 font-semibold text-[11px]">{m.milestone}</span>
                          <span className="text-slate-300 text-[11px]">{m.deliverable}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() =>
                      handleDispatchToPipeline(
                        draftedProposal.grant_title,
                        "AfCFTA Trade",
                        "Automate PAPSS & AfCFTA Rules of Origin compliance router"
                      )
                    }
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition"
                  >
                    <Play className="w-4 h-4" /> Pass Proposal to 70/30 Coding Pipeline
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 3. AFRICAN API WRAPPER GENERATOR TAB ────────────────── */}
        {activeTab === "apis" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Code className="w-5 h-5 text-sky-400" /> Autonomous African API Integration Generator
                </h3>
                <p className="text-xs text-slate-400">
                  Automatically generates and executes clean, production-grade integration wrappers for African financial and telecom infrastructure.
                </p>
              </div>
            </div>

            {/* API Selector Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { name: "Flutterwave", desc: "Cross-border payments & Mobile Money (M-Pesa, MTN)" },
                { name: "PAPSS", desc: "Pan-African central bank multi-currency net settlement" },
                { name: "Sand Technologies", desc: "Predictive telecom & utility infrastructure telemetry" },
                { name: "EskomSePush", desc: "Live power grid loadshedding telemetry & task throttling" },
              ].map((api) => {
                const active = selectedApi.toLowerCase() === api.name.toLowerCase();
                return (
                  <button
                    key={api.name}
                    onClick={() => handleGenerateWrapper(api.name)}
                    className={`rounded-xl border p-3.5 text-left transition ${
                      active
                        ? "border-sky-500/50 bg-sky-950/30 shadow-lg shadow-sky-500/5"
                        : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
                    }`}
                  >
                    <div className="font-bold text-sm text-white">{api.name}</div>
                    <div className="text-[11px] text-slate-400 mt-1 leading-snug">{api.desc}</div>
                  </button>
                );
              })}
            </div>

            {/* Generated Code Window */}
            {generatedWrapper && (
              <div className="rounded-2xl border border-sky-500/30 bg-slate-900/80 p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-sky-400" /> {generatedWrapper.api_name} Native Client Wrapper
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{generatedWrapper.description}</p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-1 rounded-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                    Sandbox Verified
                  </span>
                </div>

                <pre className="font-mono text-xs text-sky-300 p-4 bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto whitespace-pre-wrap max-h-80">
                  {generatedWrapper.code}
                </pre>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <div className="flex items-center gap-2 text-[11px]">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{generatedWrapper.test_output}</span>
                  </div>

                  <button
                    onClick={() =>
                      handleDispatchToPipeline(
                        `${generatedWrapper.api_name} Integration Wrapper`,
                        "African API",
                        `Deploy validated ${generatedWrapper.api_name} client into backend/integrations`
                      )
                    }
                    className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs flex items-center gap-1.5 transition"
                  >
                    <Play className="w-3.5 h-3.5" /> Deploy to 70/30 Pipeline PR
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 4. SATELLITE AGRITECH (NDVI) TAB ─────────────────────── */}
        {activeTab === "agritech" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Sprout className="w-5 h-5 text-emerald-400" /> Satellite Remote Sensing & Agricultural Yield Engine
                </h3>
                <p className="text-xs text-slate-400">
                  Ingests Normalized Difference Vegetation Index (NDVI) satellite data from Digital Earth Africa to predict yields and drought stress for African smallholder farmers.
                </p>
              </div>
            </div>

            {/* Input Controls */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Target African Region</label>
                  <select
                    value={agriRegion}
                    onChange={(e) => {
                      setAgriRegion(e.target.value);
                      handleRunAgritech(e.target.value, agriCrop);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="Free State, South Africa">Free State, South Africa (Grain Belt)</option>
                    <option value="Rift Valley, Kenya">Rift Valley, Kenya (Highlands)</option>
                    <option value="Kaduna, Nigeria">Kaduna, Nigeria (Savannah Agritech)</option>
                    <option value="Ashanti, Ghana">Ashanti, Ghana (Cocoa & Cassava)</option>
                    <option value="Limpopo, South Africa">Limpopo, South Africa (Citrus & Maize)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Crop Type</label>
                  <select
                    value={agriCrop}
                    onChange={(e) => {
                      setAgriCrop(e.target.value);
                      handleRunAgritech(agriRegion, e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="Maize">Maize (White/Yellow Corn)</option>
                    <option value="Cassava">Cassava (Drought-Resistant Tuber)</option>
                    <option value="Sorghum">Sorghum (Climate-Resilient Grain)</option>
                    <option value="Wheat">Wheat</option>
                    <option value="Soybeans">Soybeans</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => handleRunAgritech(agriRegion, agriCrop)}
                    disabled={isPredictingAgri}
                    className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition"
                  >
                    {isPredictingAgri ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Refresh Satellite Telemetry
                  </button>
                </div>
              </div>
            </div>

            {/* Results Display */}
            {agriResult && (
              <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/80 p-6 space-y-5 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-base font-bold text-white">
                      Satellite Analysis: {agriResult.region} ({agriResult.crop})
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">{agriResult.satellite_feed_source}</span>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Vegetation: {agriResult.vegetation_health_status}
                  </span>
                </div>

                {/* Scorecards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400">NDVI Greenness Index</div>
                    <div className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">
                      {agriResult.satellite_ndvi_index}
                    </div>
                    <div className="text-[10px] text-slate-500">Scale: 0.0 to 1.0 (Photosynthetic activity)</div>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400">Estimated Yield</div>
                    <div className="text-2xl font-extrabold text-white mt-1 font-mono">
                      {agriResult.estimated_yield_tons_per_hectare} <span className="text-xs font-normal text-slate-400">tons/ha</span>
                    </div>
                    <div className="text-[10px] text-emerald-400">+12% Above 5-Year Baseline</div>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400">Drought Stress Risk</div>
                    <div className="text-2xl font-extrabold text-sky-400 mt-1">
                      {agriResult.drought_stress_risk}
                    </div>
                    <div className="text-[10px] text-slate-500">Low seasonal deficit probability</div>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400">Est. Soil Moisture</div>
                    <div className="text-2xl font-extrabold text-amber-400 mt-1 font-mono">
                      {agriResult.soil_moisture_estimate_percentage}%
                    </div>
                    <div className="text-[10px] text-slate-500">Topsoil root zone hydration</div>
                  </div>
                </div>

                {/* Advisory */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Autonomous Agronomist Advisory
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{agriResult.advisory_action}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 5. AFCFTA TRADE CORRIDORS TAB ───────────────────────── */}
        {activeTab === "logistics" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Truck className="w-5 h-5 text-amber-400" /> AfCFTA Intra-African Trade & Freight Corridor Engine
                </h3>
                <p className="text-xs text-slate-400">
                  Calculates cross-border customs latency, border clearance bottlenecks, and tariff reduction under the African Continental Free Trade Area.
                </p>
              </div>
            </div>

            {/* Inputs */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Origin City / Hub</label>
                  <select
                    value={corridorOrigin}
                    onChange={(e) => {
                      setCorridorOrigin(e.target.value);
                      handleCalculateCorridor(e.target.value, corridorDest, cargoValue);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="Durban, South Africa">Durban, South Africa (Port Terminal)</option>
                    <option value="Lagos, Nigeria">Lagos, Nigeria (Apapa Port)</option>
                    <option value="Mombasa, Kenya">Mombasa, Kenya (Kilindini Harbour)</option>
                    <option value="Johannesburg, South Africa">Johannesburg, South Africa (City Deep Dry Port)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Destination City</label>
                  <select
                    value={corridorDest}
                    onChange={(e) => {
                      setCorridorDest(e.target.value);
                      handleCalculateCorridor(corridorOrigin, e.target.value, cargoValue);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="Harare, Zimbabwe">Harare, Zimbabwe</option>
                    <option value="Abidjan, Côte d'Ivoire">Abidjan, Côte d'Ivoire</option>
                    <option value="Kigali, Rwanda">Kigali, Rwanda</option>
                    <option value="Lusaka, Zambia">Lusaka, Zambia</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Declared Cargo Value (USD)</label>
                  <input
                    type="number"
                    value={cargoValue}
                    onChange={(e) => {
                      const v = Number(e.target.value) || 10000;
                      setCargoValue(v);
                      handleCalculateCorridor(corridorOrigin, corridorDest, v);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Corridor Metrics Results */}
            {corridorResult && (
              <div className="rounded-2xl border border-amber-500/30 bg-slate-900/80 p-6 space-y-5 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-base font-bold text-white">
                      Corridor: {corridorResult.origin} &rarr; {corridorResult.destination}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Primary Border Post: {corridorResult.primary_border_post} &middot; {corridorResult.corridor_distance_km} km
                    </span>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Tariff Savings: -{corridorResult.tariff_savings_percentage}%
                  </span>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400">Standard Pre-AfCFTA Tariff</div>
                    <div className="text-xl font-bold text-slate-400 mt-1 line-through">
                      ${corridorResult.standard_tariff_usd.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-500">Historical non-preferential duty</div>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400">AfCFTA Preferential Duty</div>
                    <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">
                      ${corridorResult.afcfta_preferential_tariff_usd.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-emerald-400">Sovereign trade agreement rate</div>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400">Total Net Savings</div>
                    <div className="text-xl font-bold text-amber-400 mt-1 font-mono">
                      +${corridorResult.tariff_savings_usd.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-amber-300">Retained capital per consignment</div>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400">Est. Border Clearance</div>
                    <div className="text-xl font-bold text-sky-400 mt-1 font-mono">
                      {corridorResult.estimated_border_clearance_hours}h
                    </div>
                    <div className="text-[10px] text-slate-500">{corridorResult.primary_border_post} checkpoint</div>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-semibold text-slate-300">Settlement Architecture:</span>{" "}
                    <span className="text-emerald-400">{corridorResult.settlement_rail}</span>
                  </div>

                  <button
                    onClick={() =>
                      handleDispatchToPipeline(
                        `AfCFTA Corridor Optimizer: ${corridorResult.origin} to ${corridorResult.destination}`,
                        "Logistics",
                        `Build automated tariff declaration & PAPSS settlement router for ${corridorResult.primary_border_post}`
                      )
                    }
                    className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
                  >
                    <Play className="w-3.5 h-3.5" /> Dispatch Optimizer into 70/30 Pipeline
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Real-time Ticker Sidebar Widget */}
      <aside className="xl:col-span-4 space-y-6 xl:sticky xl:top-24">
        {/* Live Ticker Card */}
        <div
          className={`rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-sm p-5 shadow-xl transition-all duration-300 ${
            tickerFlash ? "ring-2 ring-emerald-500/50 bg-slate-900" : ""
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                {isPollingTicker && (
                  <span className="absolute w-4 h-4 rounded-full bg-emerald-400/40 animate-ping"></span>
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-emerald-400" /> Live Radar Ticker
                </h3>
                <p className="text-[10px] text-slate-400">
                  {isPollingTicker ? "Auto-polling (10s)" : "Polling paused"} &middot;{" "}
                  {lastTickerUpdate.toLocaleTimeString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsPollingTicker(!isPollingTicker)}
                title={isPollingTicker ? "Pause real-time polling" : "Resume real-time polling"}
                className={`p-1.5 rounded-lg border text-xs transition ${
                  isPollingTicker
                    ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                    : "border-slate-700 text-slate-400 hover:bg-slate-800"
                }`}
              >
                {isPollingTicker ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => fetchTicker(false)}
                disabled={isTickerLoading}
                title="Refresh feed"
                className="p-1.5 rounded-lg border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTickerLoading ? "animate-spin text-emerald-400" : ""}`} />
              </button>
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 py-3 overflow-x-auto no-scrollbar border-b border-slate-800/80">
            {["ALL", "FINTECH", "CLIMATE", "AI INFRA", "TRADE"].map((cat) => (
              <button
                key={cat}
                onClick={() => setTickerFilter(cat)}
                className={`text-[10px] px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition ${
                  tickerFilter === cat
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold"
                    : "bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-800"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Live Ticker Feed Items */}
          <div className="space-y-3 pt-3 max-h-[640px] overflow-y-auto pr-1">
            {filteredTickerItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                {isTickerLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>Polling live opportunities...</span>
                  </div>
                ) : (
                  "No active opportunities matching filter."
                )}
              </div>
            ) : (
              filteredTickerItems.map((item) => (
                <div
                  key={item.id}
                  className="group rounded-xl border border-slate-800/90 bg-slate-950/60 hover:bg-slate-950 hover:border-slate-700 p-3.5 transition-all shadow-xs space-y-2 relative"
                >
                  {/* Top Bar: Urgency badge & Time */}
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wider text-[9px] ${
                          item.urgency === "URGENT"
                            ? "bg-red-500/20 text-red-300 border border-red-500/30"
                            : item.urgency === "NEW"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {item.urgency}
                      </span>
                      <span className="text-slate-400 font-medium">{item.category}</span>
                    </div>
                    <span className="text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" /> {item.time_ago}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="text-xs font-bold text-slate-100 group-hover:text-emerald-300 transition-colors line-clamp-2">
                    {item.title}
                  </h4>

                  {/* Sponsor & Capital */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
                    <span className="text-[11px] text-slate-400 truncate max-w-[150px]">{item.sponsor}</span>
                    <span className="font-mono font-bold text-emerald-400 text-xs">{item.amount}</span>
                  </div>

                  {/* Summary */}
                  <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                    {item.summary}
                  </p>

                  {/* Footer: Viewers & Action */}
                  <div className="flex items-center justify-between pt-1 text-[10px]">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Eye className="w-3 h-3 text-slate-500" />
                      <span>{item.viewers_count || 24} reviewing</span>
                    </span>

                    <button
                      onClick={() => {
                        const gid = item.grant_id || "tia_seed_fund_q4_2026";
                        setSelectedGrant(gid);
                        setActiveTab("grants");
                        handleDraftGrant(gid);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold transition flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-400" /> Draft with AI
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Ecosystem Intelligence Card */}
        <div className="rounded-2xl border border-slate-800 bg-linear-to-br from-slate-900 via-slate-900 to-slate-950 p-5 shadow-lg space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Sovereign Execution Pipeline
            </h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            All opportunities sensed by this radar loop can be directly drafted into compliance proposals or dispatched into the <span className="text-emerald-400 font-semibold">70/30 Self-Healing Pipeline</span> with Docker sandboxes and LangGraph Human Gates.
          </p>
          <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800">
            <span>Active Grants Tracked:</span>
            <span className="font-mono font-bold text-white">6 Calls</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>PAPSS Settlement Readiness:</span>
            <span className="font-mono font-bold text-emerald-400">100% Operational</span>
          </div>
        </div>
      </aside>
    </div>
  </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-xs text-slate-600">
          LUQI AI Autonomous Market & Technology Sensing Loop &middot; Limitless Telecoms 2026
        </div>
      </footer>
    </div>
  );
}
