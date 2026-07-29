import { useState, useEffect } from "react";
import {
  Dna,
  FlaskConical,
  Sparkles,
  History,
  BarChart3,
  ChevronRight,
  ChevronDown,
  Beaker,
  BookOpen,
  Microscope,
  Atom,
  Zap,
  Loader2,
  AlertTriangle,
  Filter,
} from "lucide-react";

/* ─── types ─── */
interface Lab {
  id: number;
  title: string;
  tier: string;
  subject: string;
  source: string;
  superpowers: string[];
  sandbox_type: string;
  materials: string[];
  procedure: string;
  sepitori?: string;
  generation?: number;
  created_at?: string;
}

interface LogEntry {
  id: number;
  action: string;
  lab_title: string;
  lab_id: number;
  details: string;
  created_at: string;
}

interface Stats {
  total_labs: number;
  total_evolutions: number;
  subjects: string[];
  tiers: string[];
}

/* ─── mock data (fallback) ─── */
const MOCK_LABS: Lab[] = [
  {
    id: 1,
    title: "Kinetic Energy Radiative Flux Matrix",
    tier: "High School Level",
    subject: "Physics",
    source: "German Abitur MINT & US AP Physics Core Alignment",
    superpowers: ["DE", "US"],
    sandbox_type: "thermal",
    materials: [
      "2x Empty aluminum cans",
      "1x Matte black charcoal powder",
      "1x Shiny aluminum foil",
    ],
    procedure:
      "1. Coat one can with charcoal powder (matte black surface).\n2. Wrap the other with aluminum foil (shiny reflective surface).\n3. Fill both with equal amounts of hot water (60°C).\n4. Record temperature every 2 minutes for 20 minutes.\n5. Plot cooling curves and compare radiative heat loss.",
    sepitori:
      "Re cheka mofuthu wa letsatsi le mahlasedi re sebelisa di-can tse pedi, e ntsho le e shiny. O tlo bona efe e gowfelang pele bafethu.",
    generation: 1,
    created_at: "2026-07-20T08:00:00Z",
  },
  {
    id: 2,
    title: "Electrochemical Energy Density Mapping",
    tier: "High School Level",
    subject: "Chemistry",
    source: "German MINT Applied Chemistry × US AP Chem",
    superpowers: ["DE", "US", "CN"],
    sandbox_type: "chemistry",
    materials: [
      "1x White vinegar (acetic acid)",
      "1x Baking soda (NaHCO₃)",
      "1x Empty plastic bottle",
      "1x Balloon",
    ],
    procedure:
      "1. Pour 100ml vinegar into the bottle.\n2. Spoon 2 tablespoons baking soda into balloon via funnel.\n3. Stretch balloon over bottle mouth without spilling.\n4. Lift balloon to release soda — observe inflation.\n5. Measure balloon circumference to estimate CO₂ yield.",
    sepitori:
      "Re dira chemical reaction ka household items. Vinegar le baking soda di bopa gas e lebotse.",
    generation: 2,
    created_at: "2026-07-21T10:30:00Z",
  },
  {
    id: 3,
    title: "Photovoltaic Quantum Harvesting Array",
    tier: "Primary Level",
    subject: "Energy",
    source: "Japanese SSH Energy Studies × German Fraunhofer",
    superpowers: ["JP", "DE", "US"],
    sandbox_type: "thermal",
    materials: [
      "1x Old CD/DVD disc",
      "1x Copper tape",
      "1x Alligator clips",
      "1x Multimeter",
    ],
    procedure:
      "1. Apply copper tape in parallel lines across the CD surface.\n2. Connect alligator clips to tape ends.\n3. Set multimeter to DC voltage mode.\n4. Expose to sunlight — record voltage output.\n5. Test at different angles to find optimal harvest position.",
    sepitori:
      "Re dira solar cell ya DIY ka disc ya CD. Solar energy ke free gore ka Mzansi re na le letsatsi le telele.",
    generation: 2,
    created_at: "2026-07-22T14:00:00Z",
  },
  {
    id: 4,
    title: "Quantum Wave Mechanical Oscillations",
    tier: "Advanced Varsity Level",
    subject: "Physics",
    source: "Tokyo SSH Framework × Russian MIPT × Cambridge Tripos",
    superpowers: ["JP", "RU", "UK"],
    sandbox_type: "gravity",
    materials: [
      "1x Symmetrical heavy mass pendulum string array",
      "1x Manual tracking chronograph rule",
    ],
    procedure:
      "1. Suspend the massive anchor point to guarantee rigid structural linear limits.\n2. Execute oscillations strictly under a 15-degree amplitude displacement vector.\n3. Time 10 full cycles and compute mean period.\n4. Derive local g from T = 2π√(L/g).",
    sepitori:
      "Re dabolola dipalo tsa pendulum re sebelisa tateo le boima. Cheka gore nako ya go swaya e a tshwana naa.",
    generation: 3,
    created_at: "2026-07-23T09:15:00Z",
  },
  {
    id: 5,
    title: "Biological Micro-Structure Optical Analysis",
    tier: "High School Level",
    subject: "Biology",
    source: "UK Cambridge Biology (9700) × Russian MIPT Biophysics",
    superpowers: ["UK", "RU"],
    sandbox_type: "biology",
    materials: [
      "1x Smartphone with camera",
      "1x Water droplet (lens)",
      "1x Glass slide",
      "1x Leaf or onion skin sample",
    ],
    procedure:
      "1. Place sample on glass slide.\n2. Add single water droplet on top (acts as convex lens).\n3. Position smartphone camera directly above droplet.\n4. Adjust distance until image is sharp.\n5. Capture photos of cell structures visible through DIY microscope.",
    sepitori:
      "Re tsoma maanakana a go tshwana ka microscope wa DIY. Ka mahlaahla a megala, o ka bona diphatlha tsa go bopegilega.",
    generation: 3,
    created_at: "2026-07-24T11:45:00Z",
  },
];

const MOCK_LOG: LogEntry[] = [
  {
    id: 1,
    action: "seed",
    lab_title: "Kinetic Energy Radiative Flux Matrix",
    lab_id: 1,
    details: "Seeded initial lab from German Abitur × US AP Physics alignment",
    created_at: "2026-07-20T08:00:00Z",
  },
  {
    id: 2,
    action: "evolve",
    lab_title: "Electrochemical Energy Density Mapping",
    lab_id: 2,
    details: "Evolution vector #1: DE/US/CN superpower chemistry synthesis",
    created_at: "2026-07-21T10:30:00Z",
  },
  {
    id: 3,
    action: "evolve",
    lab_title: "Photovoltaic Quantum Harvesting Array",
    lab_id: 3,
    details: "Evolution vector #2: JP/DE/US energy harvesting from SSH/Fraunhofer",
    created_at: "2026-07-22T14:00:00Z",
  },
  {
    id: 4,
    action: "evolve",
    lab_title: "Quantum Wave Mechanical Oscillations",
    lab_id: 4,
    details: "Evolution vector #3: Advanced pendulum from Tokyo/MIPT/Cambridge",
    created_at: "2026-07-23T09:15:00Z",
  },
  {
    id: 5,
    action: "evolve",
    lab_title: "Biological Micro-Structure Optical Analysis",
    lab_id: 5,
    details: "Evolution vector #4: DIY microscope from Cambridge Biology + MIPT",
    created_at: "2026-07-24T11:45:00Z",
  },
];

const MOCK_STATS: Stats = {
  total_labs: 5,
  total_evolutions: 4,
  subjects: ["Physics", "Chemistry", "Energy", "Biology"],
  tiers: ["Primary Level", "High School Level", "Advanced Varsity Level"],
};

const API_URL = import.meta.env.VITE_API_URL || "";

/* ─── helpers ─── */
function subjectIcon(subject: string) {
  switch (subject.toLowerCase()) {
    case "physics":
      return <Atom className="w-4 h-4" />;
    case "chemistry":
      return <FlaskConical className="w-4 h-4" />;
    case "biology":
      return <Microscope className="w-4 h-4" />;
    case "math":
    case "mathematics":
      return <BookOpen className="w-4 h-4" />;
    case "energy":
      return <Zap className="w-4 h-4" />;
    default:
      return <Beaker className="w-4 h-4" />;
  }
}

function tierBadgeColor(tier: string) {
  if (tier.includes("Primary")) return "bg-green-500/10 text-green-600 border-green-500/20";
  if (tier.includes("High School")) return "bg-blue-500/10 text-blue-600 border-blue-500/20";
  if (tier.includes("Varsity")) return "bg-purple-500/10 text-purple-600 border-purple-500/20";
  return "bg-gray-500/10 text-gray-600 border-gray-500/20";
}

/* ─── page component ─── */
export default function OmniLabEvolverPage() {
  const [activeTab, setActiveTab] = useState<"labs" | "log" | "stats">("labs");
  const [labs, setLabs] = useState<Lab[]>(MOCK_LABS);
  const [log, setLog] = useState<LogEntry[]>(MOCK_LOG);
  const [stats, setStats] = useState<Stats>(MOCK_STATS);
  const [selectedLab, setSelectedLab] = useState<Lab | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evolving, setEvolving] = useState(false);
  const [evolutionResult, setEvolutionResult] = useState<string | null>(null);

  // Fetch labs on mount
  useEffect(() => {
    fetchLabs();
    fetchLog();
    fetchStats();
  }, []);

  async function fetchLabs(tier?: string, subject?: string) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (tier) params.set("tier", tier);
      if (subject && subject !== "all") params.set("subject", subject);
      const res = await fetch(`${API_URL}/api/v25/omnilab/evolver/labs?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.labs.length > 0) {
          setLabs(data.labs);
        }
        // else keep mock data
      }
    } catch {
      // Keep mock data on error
    } finally {
      setLoading(false);
    }
  }

  async function fetchLog() {
    try {
      const res = await fetch(`${API_URL}/api/v25/omnilab/evolver/log`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.log.length > 0) setLog(data.log);
      }
    } catch {
      // Keep mock data
    }
  }

  async function fetchStats() {
    try {
      const res = await fetch(`${API_URL}/api/v25/omnilab/evolver/stats`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setStats(data);
      }
    } catch {
      // Keep mock data
    }
  }

  async function triggerEvolution() {
    setEvolving(true);
    setEvolutionResult(null);
    try {
      const res = await fetch(`${API_URL}/api/v25/omnilab/evolver/evolve`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setEvolutionResult(`Evolved: ${data.lab?.title || "New curriculum lab"}`);
          await fetchLabs();
          await fetchLog();
          await fetchStats();
        } else {
          setEvolutionResult("Evolution cycle completed (returned to start)");
        }
      } else {
        // Fallback: simulate evolution with mock data
        setEvolutionResult("Demo mode: Evolution would cycle to next vector here");
      }
    } catch {
      setEvolutionResult("Demo mode: Backend unavailable — evolution simulated");
    } finally {
      setEvolving(false);
    }
  }

  const filteredLabs =
    subjectFilter === "all"
      ? labs
      : labs.filter((l) => l.subject.toLowerCase() === subjectFilter.toLowerCase());

  const uniqueSubjects = [...new Set(labs.map((l) => l.subject))];

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 bg-background">
      {/* Header */}
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Dna className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">OmniLab Evolver</h1>
              <p className="text-sm text-muted-foreground">
                Autonomous STEM curriculum evolution engine
              </p>
            </div>
          </div>
          <button
            onClick={triggerEvolution}
            disabled={evolving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 text-white font-medium hover:bg-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {evolving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {evolving ? "Evolving..." : "Trigger Evolution"}
          </button>
        </div>

        {evolutionResult && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-700 text-sm">
            <Sparkles className="w-4 h-4" />
            {evolutionResult}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-lg bg-muted border border-border">
          {[
            { id: "labs" as const, label: "Curriculum Labs", icon: FlaskConical },
            { id: "log" as const, label: "Evolution Log", icon: History },
            { id: "stats" as const, label: "Statistics", icon: BarChart3 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ─── Curriculum Labs Tab ─── */}
        {activeTab === "labs" && (
          <div className="space-y-4">
            {/* Subject filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <button
                onClick={() => setSubjectFilter("all")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  subjectFilter === "all"
                    ? "bg-cyan-500 text-white"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                All
              </button>
              {uniqueSubjects.map((s) => (
                <button
                  key={s}
                  onClick={() => setSubjectFilter(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    subjectFilter === s
                      ? "bg-cyan-500 text-white"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Labs grid */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredLabs.map((lab) => (
                  <LabCard
                    key={lab.id}
                    lab={lab}
                    isSelected={selectedLab?.id === lab.id}
                    onToggle={() =>
                      setSelectedLab(selectedLab?.id === lab.id ? null : lab)
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Evolution Log Tab ─── */}
        {activeTab === "log" && (
          <div className="space-y-3">
            {log.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    entry.action === "seed"
                      ? "bg-green-500/10"
                      : entry.action === "evolve"
                      ? "bg-cyan-500/10"
                      : "bg-amber-500/10"
                  }`}
                >
                  {entry.action === "seed" ? (
                    <Sparkles className="w-4 h-4 text-green-600" />
                  ) : entry.action === "evolve" ? (
                    <Dna className="w-4 h-4 text-cyan-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {entry.lab_title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {entry.details}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(entry.created_at).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${
                    entry.action === "seed"
                      ? "bg-green-500/10 text-green-600"
                      : entry.action === "evolve"
                      ? "bg-cyan-500/10 text-cyan-600"
                      : "bg-amber-500/10 text-amber-600"
                  }`}
                >
                  {entry.action}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ─── Statistics Tab ─── */}
        {activeTab === "stats" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              label="Total Labs"
              value={stats.total_labs}
              icon={<FlaskConical className="w-5 h-5 text-cyan-600" />}
            />
            <StatCard
              label="Total Evolutions"
              value={stats.total_evolutions}
              icon={<Dna className="w-5 h-5 text-purple-600" />}
            />
            <StatCard
              label="Subjects Covered"
              value={stats.subjects.length}
              icon={<BookOpen className="w-5 h-5 text-green-600" />}
            />
            <div className="sm:col-span-2 lg:col-span-3 p-4 rounded-lg border border-border bg-card">
              <h3 className="text-sm font-medium text-foreground mb-3">Subjects</h3>
              <div className="flex flex-wrap gap-2">
                {stats.subjects.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-xs font-medium text-foreground"
                  >
                    {subjectIcon(s)}
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2 lg:col-span-3 p-4 rounded-lg border border-border bg-card">
              <h3 className="text-sm font-medium text-foreground mb-3">Tiers</h3>
              <div className="flex flex-wrap gap-2">
                {stats.tiers.map((t) => (
                  <span
                    key={t}
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${tierBadgeColor(t)}`}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Lab Card ─── */
function LabCard({
  lab,
  isSelected,
  onToggle,
}: {
  lab: Lab;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-accent/50 transition-colors"
      >
        <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
          {subjectIcon(lab.subject)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {lab.title}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${tierBadgeColor(
                lab.tier
              )}`}
            >
              {lab.tier}
            </span>
            <span className="text-xs text-muted-foreground">{lab.subject}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {lab.source}
          </p>
        </div>
        <div className="flex-shrink-0">
          {isSelected ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {isSelected && (
        <div className="px-4 pb-4 border-t border-border">
          <div className="pt-3 space-y-3">
            {/* Superpowers */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Standards:</span>
              {lab.superpowers.map((sp) => (
                <span
                  key={sp}
                  className="px-2 py-0.5 rounded bg-muted text-[10px] font-mono font-medium"
                >
                  {sp}
                </span>
              ))}
            </div>

            {/* Materials */}
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-1.5">
                Materials
              </h4>
              <ul className="space-y-1">
                {lab.materials.map((m, i) => (
                  <li
                    key={i}
                    className="text-xs text-muted-foreground flex items-start gap-1.5"
                  >
                    <span className="text-cyan-500 mt-0.5">•</span>
                    {m}
                  </li>
                ))}
              </ul>
            </div>

            {/* Procedure */}
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-1.5">
                Procedure
              </h4>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed bg-muted p-3 rounded-lg">
                {lab.procedure}
              </pre>
            </div>

            {/* SePitori */}
            {lab.sepitori && (
              <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">
                    SePitori
                  </span>
                </div>
                <p className="text-xs text-amber-700 italic leading-relaxed">
                  &ldquo;{lab.sepitori}&rdquo;
                </p>
              </div>
            )}

            {/* Generation */}
            {lab.generation && (
              <div className="text-xs text-muted-foreground">
                Generation {lab.generation} •{" "}
                {lab.created_at
                  ? new Date(lab.created_at).toLocaleDateString()
                  : ""}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Stat Card ─── */
function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
