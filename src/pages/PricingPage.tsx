import { useState, useEffect } from "react";
import { trpc } from "@/providers/trpc";
import { Link } from "react-router";
import {
  Coins,
  ShieldCheck,
  CheckCircle,
  CreditCard,
  Plus,
  Loader2,
  Film,
  Zap,
  Cpu,
  Clock,
  ArrowRight,
  AlertCircle,
  Check,
  Play,
  RotateCcw,
} from "lucide-react";

export default function PricingPage() {
  const balance = trpc.video.getBalance.useQuery();
  const pricing = trpc.video.getSubscriptionTiers.useQuery();
  const utils = trpc.useUtils();

  // Async Job Queue State
  const [jobPrompt, setJobPrompt] = useState("Reconcile 4-quarter balance sheet and extract variance anomalies");
  const [taskType, setTaskType] = useState("data_reconciliation");
  const [isSubmittingJob, setIsSubmittingJob] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [jobResult, setJobResult] = useState<any>(null);
  const [jobError, setJobError] = useState<string | null>(null);

  // Webhook Test State
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);

  const topupMutation = trpc.video.topupCredits.useMutation({
    onSuccess: () => {
      utils.video.getBalance.invalidate();
    },
  });

  // Polling active async task
  useEffect(() => {
    if (!activeTaskId || jobStatus === "SUCCESS" || jobStatus === "FAILURE") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/jobs/${activeTaskId}`);
        if (!res.ok) return;
        const data = await res.json();
        setJobStatus(data.status);
        if (data.status === "SUCCESS") {
          setJobResult(data.result);
          utils.video.getBalance.invalidate();
          clearInterval(interval);
        } else if (data.status === "FAILURE") {
          setJobError(data.error || "Execution failed");
          clearInterval(interval);
        }
      } catch (err: any) {
        console.error("Polling error:", err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTaskId, jobStatus, utils]);

  const handleDispatchJob = async () => {
    setIsSubmittingJob(true);
    setJobError(null);
    setJobResult(null);
    setJobStatus("QUEUED");
    try {
      const res = await fetch("/api/v1/jobs/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: jobPrompt,
          task_type: taskType,
          user_email: "guest@luqi.ai",
          required_tokens: 5,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setJobError(data.detail || "Job submission failed");
        setJobStatus("FAILURE");
        setIsSubmittingJob(false);
        return;
      }

      setActiveTaskId(data.task_id);
      utils.video.getBalance.invalidate();
    } catch (err: any) {
      setJobError(err?.message || "Failed to submit job");
      setJobStatus("FAILURE");
    } finally {
      setIsSubmittingJob(false);
    }
  };

  const handleSimulatePayFast = async () => {
    setIsSimulatingPayment(true);
    setPaymentNotice(null);
    try {
      const res = await fetch("/api/v1/billing/payfast/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          m_payment_id: `pf_${Date.now()}`,
          amount_gross: "50.00",
          payment_status: "COMPLETE",
          custom_str1: "guest@luqi.ai",
          custom_int1: 250,
        }),
      });
      const data = await res.json();
      setPaymentNotice(`PayFast ITN processed! Credited ${data.credited || 250} Luqi Credits (ZAR payment confirmed).`);
      utils.video.getBalance.invalidate();
    } catch {
      setPaymentNotice("PayFast simulation failed.");
    } finally {
      setIsSimulatingPayment(false);
    }
  };

  const handleSimulateStripe = async () => {
    setIsSimulatingPayment(true);
    setPaymentNotice(null);
    try {
      const res = await fetch("/api/v1/billing/stripe/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "checkout.session.completed",
          data: {
            object: {
              id: `cs_${Date.now()}`,
              customer_email: "guest@luqi.ai",
              amount_total: 1000,
              metadata: { tokens: 200 },
            },
          },
        }),
      });
      await res.json();
      setPaymentNotice("Stripe Checkout Webhook processed! Credited 200 Luqi Credits (USD payment confirmed).");
      utils.video.getBalance.invalidate();
    } catch {
      setPaymentNotice("Stripe simulation failed.");
    } finally {
      setIsSimulatingPayment(false);
    }
  };


  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Luqi Credit Plans</h1>
              <p className="text-xs text-slate-400">Safe commercial pricing with 50%+ profit margin protection</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              Balance: <span className="text-amber-400 font-bold">{balance.data?.credits ?? 150}</span> Credits
            </div>
            <Link to="/video-studio" className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300">
              Video Studio
            </Link>
            <Link to="/" className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300">
              Home
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        {/* Banner */}
        <div className="rounded-3xl border border-amber-500/30 bg-linear-to-r from-amber-500/10 via-orange-500/5 to-slate-900 p-8 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
            <ShieldCheck className="w-4 h-4" /> Margin Protected Architecture
          </div>
          <h2 className="text-2xl font-black text-slate-100">
            Why Generative Video Requires Luqi Virtual Credits
          </h2>
          <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
            Running ElevenLabs voiceovers (~$0.06/1k chars) and WAN 2.1 720p video generation ($0.25/second) creates high variable costs. Offering an "unlimited" subscription tier leads to rapid insolvency. Our Virtual Credit System charges <strong>10 Credits ($0.50) per second</strong>, ensuring a guaranteed 50%+ profit margin on every rendered second.
          </p>
        </div>

        {/* Quick Packs */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Quick Top-Up Credit Packs</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pricing.data?.packs?.map((pack: any) => (
              <div key={pack.id} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                <div>
                  <h4 className="text-base font-bold text-slate-100">{pack.label}</h4>
                  <div className="text-3xl font-extrabold text-amber-400 mt-2">
                    ${pack.priceUsd}{" "}
                    <span className="text-xs font-normal text-slate-500">/ R{pack.priceZar} ZAR</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Valid for {Math.floor(pack.credits / 10)} seconds of 3D video generation + voiceover.
                  </p>
                </div>
                <button
                  onClick={() => topupMutation.mutate({ credits: pack.credits, packId: pack.id })}
                  disabled={topupMutation.isPending}
                  className="mt-6 w-full py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  {topupMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Purchase {pack.credits} Credits
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Subscription Tiers */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Monthly Creator & Studio Subscriptions</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {pricing.data?.tiers?.map((tier: any) => (
              <div
                key={tier.id}
                className={`p-6 rounded-2xl bg-slate-900 border ${
                  tier.recommended ? "border-amber-500/50 shadow-lg shadow-amber-500/10" : "border-slate-800"
                } flex flex-col justify-between`}
              >
                <div>
                  {tier.recommended && (
                    <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 mb-3 inline-block">
                      Recommended
                    </span>
                  )}
                  <h4 className="text-base font-bold text-slate-100">{tier.name}</h4>
                  <div className="text-2xl font-black text-slate-100 mt-2">
                    ${tier.priceUsd} <span className="text-xs font-normal text-slate-500">/ mo</span>
                  </div>
                  <div className="text-xs text-amber-400 font-medium mt-1">
                    {tier.monthlyCredits.toLocaleString()} Luqi Credits
                  </div>
                  <ul className="mt-4 space-y-2 text-xs text-slate-400">
                    {tier.features.map((f: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={() => topupMutation.mutate({ credits: tier.monthlyCredits, packId: tier.id })}
                  className="mt-6 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                >
                  Activate {tier.name}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Asynchronous Job Queue (Celery + Redis) Live Execution Engine ─── */}
        <div className="rounded-3xl border border-indigo-500/30 bg-slate-900/80 p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  Asynchronous Multi-Agent Queue (Celery + Redis)
                </h3>
                <p className="text-xs text-slate-400">
                  Non-blocking background execution with pre-deducted token billing guard
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Queue Active
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Cost: 5 Luqi Credits
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">
                  Heavy Agent Task Prompt
                </label>
                <textarea
                  value={jobPrompt}
                  onChange={(e) => setJobPrompt(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
                  placeholder="Describe multi-tab workbook, general ledger reconciliation, or video batch..."
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Task Type
                  </label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
                  >
                    <option value="data_reconciliation">Financial Ledger Reconciliation (CrewAI / GenAI)</option>
                    <option value="workbook_audit">Multi-Tab Workbook Forensic Audit</option>
                    <option value="heavy_agent_crew">Multi-Agent Market Intelligence Gathering</option>
                    <option value="video_render_batch">Batch WAN 2.1 Video Rendering Task</option>
                  </select>
                </div>

                <div className="pt-5">
                  <button
                    onClick={handleDispatchJob}
                    disabled={isSubmittingJob || (activeTaskId !== null && jobStatus !== "SUCCESS" && jobStatus !== "FAILURE")}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                  >
                    {isSubmittingJob ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    Dispatch Task (-5 Credits)
                  </button>
                </div>
              </div>

              {jobError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{jobError}</span>
                </div>
              )}
            </div>

            {/* Task Monitor */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Flight Recorder Status:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-sm text-[10px] ${
                      jobStatus === "SUCCESS"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : jobStatus === "PROCESSING" || jobStatus === "QUEUED"
                        ? "bg-amber-500/20 text-amber-300 animate-pulse"
                        : jobStatus === "FAILURE"
                        ? "bg-rose-500/20 text-rose-300"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {jobStatus || "IDLE"}
                  </span>
                </div>

                {activeTaskId && (
                  <div className="text-[11px] font-mono text-slate-400 bg-slate-900 p-2 rounded-lg break-all">
                    Task ID: <span className="text-indigo-400">{activeTaskId}</span>
                  </div>
                )}

                {jobResult && (
                  <div className="mt-2 space-y-2">
                    <div className="text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Engine:</span>
                      <span className="text-emerald-400 font-semibold">{jobResult.framework || "Google-GenAI"}</span>
                    </div>
                    <div className="max-h-36 overflow-y-auto text-[11px] text-slate-300 bg-slate-900/90 p-2.5 rounded-lg whitespace-pre-wrap font-mono leading-relaxed border border-slate-800">
                      {jobResult.output}
                    </div>
                  </div>
                )}

                {!jobResult && !jobError && (
                  <div className="py-8 text-center text-xs text-slate-500">
                    Submit a job to observe the asynchronous Celery queue and token deduction ledger.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Payment Gateway Webhook Integrations (PayFast & Stripe) ─── */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  Automated Payment Webhook Handlers
                </h3>
                <p className="text-xs text-slate-400">
                  Instant balance refilling via South African PayFast ITN and Global Stripe Webhooks
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PayFast Card */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-100">PayFast Instant Transaction Notification (ITN)</h4>
                  <p className="text-[11px] text-slate-400">Targeting South Africa & Gauteng users (ZAR)</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  ZAR Gateway
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Endpoint: <code className="text-amber-400">/api/v1/billing/payfast/webhook</code>.
                Validates MD5 signature, updates database transaction to <span className="text-emerald-400 font-semibold">COMPLETE</span>, and credits tokens.
              </p>
              <button
                onClick={handleSimulatePayFast}
                disabled={isSimulatingPayment}
                className="w-full py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                {isSimulatingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Simulate R50 PayFast ITN Payment (+250 Credits)
              </button>
            </div>

            {/* Stripe Card */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-100">Stripe Global Webhooks</h4>
                  <p className="text-[11px] text-slate-400">International Card & Subscription Refills (USD)</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Global USD
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Endpoint: <code className="text-blue-400">/api/v1/billing/stripe/webhook</code>.
                Listens for <span className="text-blue-300 font-mono">checkout.session.completed</span>, refilling user tokens automatically on monthly renewal.
              </p>
              <button
                onClick={handleSimulateStripe}
                disabled={isSimulatingPayment}
                className="w-full py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                {isSimulatingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                Simulate $10 Stripe Checkout (+200 Credits)
              </button>
            </div>
          </div>

          {paymentNotice && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{paymentNotice}</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

