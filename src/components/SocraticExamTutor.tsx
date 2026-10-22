import React, { useState, useEffect } from "react";
import {
  GraduationCap,
  Cloud,
  Layers,
  Terminal,
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  BookOpen,
  RefreshCw,
  Search,
  Check,
  Award,
  ChevronRight,
  Clock,
  Send,
  Zap,
  Info
} from "lucide-react";

interface QuestionOption {
  key: string;
  text: string;
}

interface SituationalQuestion {
  id: string;
  domain: string;
  domainPercentage?: number;
  task?: string;
  scenario: string;
  question: string;
  options: QuestionOption[];
  correctKey: string;
  rationale: {
    whyCorrect: string;
    distractorAnalysis: Record<string, string>;
  };
  pmbokReference?: string;
  examTrapAlert?: string;
}

export const SocraticExamTutor: React.FC = () => {
  // Domain selection
  const [selectedDomain, setSelectedDomain] = useState<
    "PROJECT_MANAGEMENT_PMP" | "CLOUD_INFRASTRUCTURE" | "SOFTWARE_DEVSECOPS" | "CISCO_NETWORKING"
  >("PROJECT_MANAGEMENT_PMP");

  // Mode: "socratic_quizzer" vs "dynamic_rag_chat"
  const [tutorMode, setTutorMode] = useState<"QUIZZER" | "RAG_CHAT">("QUIZZER");

  // Question state
  const [questions, setQuestions] = useState<SituationalQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState<boolean>(false);

  // Dynamic RAG Query state
  const [chatPrompt, setChatPrompt] = useState<string>(
    "A key stakeholder sends an urgent email directly to a software engineer requesting an unbudgeted feature mid-sprint. What should the Project Manager do next?"
  );
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [chatResponse, setChatResponse] = useState<any>(null);

  // Blueprint mastery state
  const [userStats, setUserStats] = useState<Record<string, { total: number; correct: number }>>({
    People: { total: 4, correct: 3 },
    Process: { total: 6, correct: 5 },
    "Business Environment": { total: 2, correct: 2 },
  });

  const fetchQuestionBank = async () => {
    setIsLoadingQuestion(true);
    try {
      const res = await fetch("/api/v1/exam-tutor/pmp-question-bank");
      if (res.ok) {
        const data = await res.json();
        if (data.questions && data.questions.length > 0) {
          setQuestions(data.questions);
          setCurrentIdx(0);
          setSelectedKey(null);
          setSubmitted(false);
        }
      }
    } catch (err) {
      console.warn("Failed fetching question bank, using fallback:", err);
    } finally {
      setIsLoadingQuestion(false);
    }
  };

  // Load questions on mount
  useEffect(() => {
    fetchQuestionBank();
  }, []);

  const currentQ = questions[currentIdx] || null;

  const handleSelectOption = (key: string) => {
    if (!submitted) {
      setSelectedKey(key);
    }
  };

  const handleSubmitAnswer = () => {
    if (!selectedKey || !currentQ) return;
    setSubmitted(true);

    const isCorrect = selectedKey === currentQ.correctKey;
    const domainKey = currentQ.domain || "Process";

    setUserStats((prev) => {
      const existing = prev[domainKey] || { total: 0, correct: 0 };
      return {
        ...prev,
        [domainKey]: {
          total: existing.total + 1,
          correct: existing.correct + (isCorrect ? 1 : 0),
        },
      };
    });
  };

  const handleNextQuestion = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedKey(null);
      setSubmitted(false);
    } else {
      // Loop or re-fetch
      setCurrentIdx(0);
      setSelectedKey(null);
      setSubmitted(false);
    }
  };

  const handleExecuteRagQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatPrompt.trim()) return;

    setChatLoading(true);
    setChatResponse(null);

    try {
      const res = await fetch("/api/v1/exam-tutor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: chatPrompt }),
      });
      const data = await res.json();
      setChatResponse(data);
    } catch (err: any) {
      setChatResponse({ error: err.message });
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl border border-amber-500/30 bg-linear-to-r from-amber-500/10 via-slate-900 to-slate-900 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
            DYNAMIC DOMAIN-DRIVEN RAG
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
            Enterprise IT & Certification Exam Tutor
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Grounded in official blueprints for PMP (PMBOK 7th Ed), AWS Cloud Solutions Architect, DevSecOps CKA, and Cisco CCNP/CCNA.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
          <button
            onClick={() => setTutorMode("QUIZZER")}
            className={`px-4 py-2 rounded-xl font-bold transition ${
              tutorMode === "QUIZZER"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🎓 Socratic Situational Quizzer
          </button>
          <button
            onClick={() => setTutorMode("RAG_CHAT")}
            className={`px-4 py-2 rounded-xl font-bold transition ${
              tutorMode === "RAG_CHAT"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🔍 Multi-Agent RAG Router
          </button>
        </div>
      </div>

      {/* Blueprint Domain Selector Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {[
          {
            key: "PROJECT_MANAGEMENT_PMP",
            title: "Project Management & Agile",
            exams: "PMP (PMBOK 7), CSM, ITIL",
            icon: BookOpen,
            color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
          },
          {
            key: "CLOUD_INFRASTRUCTURE",
            title: "Cloud & Infrastructure",
            exams: "AWS SAA-C03, Azure, GCP",
            icon: Cloud,
            color: "text-sky-400 border-sky-500/30 bg-sky-500/10",
          },
          {
            key: "SOFTWARE_DEVSECOPS",
            title: "Software & DevSecOps",
            exams: "Kubernetes CKA, Docker, OWASP",
            icon: Shield,
            color: "text-purple-400 border-purple-500/30 bg-purple-500/10",
          },
          {
            key: "CISCO_NETWORKING",
            title: "Cisco & Networking",
            exams: "CCNA 200-301, CCNP 350-401",
            icon: Terminal,
            color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
          },
        ].map((domain) => {
          const Icon = domain.icon;
          const isSelected = selectedDomain === domain.key;
          return (
            <button
              key={domain.key}
              onClick={() => setSelectedDomain(domain.key as any)}
              className={`p-3.5 rounded-2xl border text-left transition relative ${
                isSelected
                  ? "bg-slate-900 border-amber-500 ring-2 ring-amber-500/20 shadow-lg shadow-amber-500/10"
                  : "bg-slate-900/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`p-1.5 rounded-lg border ${domain.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-white text-[11px] truncate">{domain.title}</span>
              </div>
              <p className="text-[10px] text-slate-400">{domain.exams}</p>
            </button>
          );
        })}
      </div>

      {/* ================================================================== */}
      {/* MODE 1: SOCRATIC SITUATIONAL QUIZZER */}
      {/* ================================================================== */}
      {tutorMode === "QUIZZER" && currentQ && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Question Panel (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5 shadow-xl">
              {/* Question Metadata Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                    Question {currentIdx + 1} of {questions.length}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-sm bg-slate-800 text-slate-300 font-mono">
                    {currentQ.domain} {currentQ.domainPercentage ? `(${currentQ.domainPercentage}%)` : ""}
                  </span>
                </div>
                {currentQ.task && (
                  <span className="text-[11px] text-slate-400 font-mono">Task: {currentQ.task}</span>
                )}
              </div>

              {/* Scenario Context */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 font-serif text-sm text-slate-200 leading-relaxed">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Scenario Dilemma:
                </span>
                {currentQ.scenario}
              </div>

              {/* Specific Question Prompt */}
              <h3 className="text-base font-bold text-white leading-snug">
                {currentQ.question}
              </h3>

              {/* Multiple Choice Options */}
              <div className="space-y-2.5">
                {currentQ.options.map((opt) => {
                  const isSelected = selectedKey === opt.key;
                  const isCorrect = currentQ.correctKey === opt.key;

                  let optionStyle = "bg-slate-950/70 border-slate-800 text-slate-200 hover:border-slate-700";

                  if (submitted) {
                    if (isCorrect) {
                      optionStyle = "bg-emerald-950/40 border-emerald-500 text-emerald-200 font-medium";
                    } else if (isSelected && !isCorrect) {
                      optionStyle = "bg-rose-950/40 border-rose-500 text-rose-200";
                    } else {
                      optionStyle = "bg-slate-950/40 border-slate-900 text-slate-500 opacity-60";
                    }
                  } else if (isSelected) {
                    optionStyle = "bg-amber-500/10 border-amber-500 text-amber-300 font-medium";
                  }

                  return (
                    <button
                      key={opt.key}
                      onClick={() => handleSelectOption(opt.key)}
                      disabled={submitted}
                      className={`w-full p-3.5 rounded-2xl border text-left text-xs transition flex items-start gap-3 cursor-pointer ${optionStyle}`}
                    >
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold font-mono text-[11px] shrink-0 ${
                          isSelected
                            ? "bg-amber-500 text-slate-950"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {opt.key}
                      </span>
                      <span className="leading-relaxed pt-0.5">{opt.text}</span>
                    </button>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                {!submitted ? (
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={!selectedKey}
                    className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition disabled:opacity-40"
                  >
                    Submit Answer & Breakdown
                  </button>
                ) : (
                  <button
                    onClick={handleNextQuestion}
                    className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition"
                  >
                    <span>Next Scenario</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={fetchQuestionBank}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reload Bank</span>
                </button>
              </div>
            </div>

            {/* Socratic Deep Breakdown (Revealed upon submit) */}
            {submitted && (
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  {selectedKey === currentQ.correctKey ? (
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <span>Correct! Option {currentQ.correctKey} aligns with official guidelines.</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                      <XCircle className="w-5 h-5 shrink-0" />
                      <span>Incorrect. Option {currentQ.correctKey} is the correct standard choice.</span>
                    </div>
                  )}
                </div>

                {/* Why Correct */}
                <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 block">
                    Underlying Pedagogical Logic:
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {currentQ.rationale?.whyCorrect}
                  </p>
                </div>

                {/* Distractor Analysis */}
                {currentQ.rationale?.distractorAnalysis && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                      Why Other Options Are Traps (Distractor Analysis):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      {Object.entries(currentQ.rationale.distractorAnalysis).map(([key, reason]) => (
                        <div key={key} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                          <span className="font-bold text-rose-400 font-mono mr-1.5">Option {key}:</span>
                          <span className="text-slate-400">{reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Exam Trap Warning */}
                {currentQ.examTrapAlert && (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-400">Exam Trap Alert: </span>
                      {currentQ.examTrapAlert}
                    </div>
                  </div>
                )}

                {/* Citation */}
                {currentQ.pmbokReference && (
                  <div className="text-[10px] text-slate-500 font-mono">
                    Official Reference: {currentQ.pmbokReference}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Blueprint Mastery Meter Sidebar (1 col) */}
          <div className="space-y-4">
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  Blueprint Domain Mastery
                </span>
                <span className="text-[10px] text-slate-400">PMP 7th Edition</span>
              </div>

              {/* Domain Breakdown Bars */}
              <div className="space-y-3">
                {[
                  { domain: "Process", weight: 50, color: "bg-amber-500" },
                  { domain: "People", weight: 42, color: "bg-sky-500" },
                  { domain: "Business Environment", weight: 8, color: "bg-emerald-500" },
                ].map((d) => {
                  const stats = userStats[d.domain] || { total: 0, correct: 0 };
                  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 75;

                  return (
                    <div key={d.domain} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium">
                          {d.domain} <span className="text-slate-500 text-[10px]">({d.weight}%)</span>
                        </span>
                        <span className="font-mono text-white text-[11px] font-bold">
                          {accuracy}% ({stats.correct}/{stats.total})
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                        <div
                          className={`h-full ${d.color} transition-all duration-500`}
                          style={{ width: `${accuracy}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                <span className="font-bold text-amber-400 block">Stateful Tracking Active:</span>
                <p>
                  Questions adapt dynamically to reinforce your lowest-scoring domain (Process baselines & change control).
                </p>
              </div>
            </div>

            {/* Quick Tips Card */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 text-xs space-y-2">
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                Situational Exam Heuristics
              </h4>
              <ul className="space-y-1.5 text-slate-400 text-[11px] list-disc list-inside">
                <li>Never escalate to the sponsor before evaluating impact.</li>
                <li>Never stop an ongoing sprint unless the Sprint Goal is obsolete.</li>
                <li>Halt unauthorized scope before filing change paperwork.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODE 2: MULTI-AGENT RAG ROUTER TESTER */}
      {/* ================================================================== */}
      {tutorMode === "RAG_CHAT" && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5 shadow-xl">
          <div className="border-b border-slate-800 pb-3">
            <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider block">
              Dynamic Multi-Agent Intent Router & Grounded RAG
            </span>
            <h3 className="text-lg font-bold text-white">
              Ask Any Exam or Technical Dilemma
            </h3>
            <p className="text-xs text-slate-400">
              The router agent automatically classifies your query into Cloud, Project Management, DevSecOps, or Cisco Networking, retrieves namespaced vector context, and applies specialized pedagogical directives.
            </p>
          </div>

          {/* Query Form */}
          <form onSubmit={handleExecuteRagQuery} className="space-y-3">
            <textarea
              rows={3}
              value={chatPrompt}
              onChange={(e) => setChatPrompt(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-white focus:outline-hidden focus:border-amber-500"
              placeholder="Ask an exam question (e.g. AWS VPC routing tables, PMP scope creep, OSPF neighbor states)..."
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() =>
                    setChatPrompt("A client wants to add an unbudgeted feature mid-sprint. What should the Project Manager do next?")
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  📋 PMP Scope Creep
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setChatPrompt("How do I make an EC2 instance in a private subnet securely reach the internet in an AWS VPC?")
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  ☁️ AWS VPC NAT Gateway
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setChatPrompt("Why does an OSPF neighbor get stuck in the INIT state?")
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  🌐 Cisco OSPF INIT
                </button>
              </div>

              <button
                type="submit"
                disabled={chatLoading || !chatPrompt.trim()}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {chatLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Routing & Grounding...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Route Query & Explain</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* RAG Response Inspector */}
          {chatResponse && (
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              {/* Routing Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-amber-400">
                    Detected Domain:
                  </span>
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    {chatResponse.domain}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  Expert Persona: <span className="text-white font-bold">{chatResponse.expertTitle}</span>
                </div>
              </div>

              {/* Retrieved Context Chunks */}
              {chatResponse.retrievedContext && chatResponse.retrievedContext.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono space-y-1.5">
                  <span className="text-slate-400 font-bold block flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-sky-400" />
                    Retrieved Vector Context ({chatResponse.vectorNamespace}):
                  </span>
                  {chatResponse.retrievedContext.map((chunk: string, i: number) => (
                    <p key={i} className="text-sky-300/90 pl-2 border-l border-sky-500/30">
                      {chunk}
                    </p>
                  ))}
                </div>
              )}

              {/* Socratic Output */}
              <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-sans pt-1">
                {chatResponse.response || chatResponse.answer}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SocraticExamTutor;
