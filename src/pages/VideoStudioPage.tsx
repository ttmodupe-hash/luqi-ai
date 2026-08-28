// =====================================================================
// VIDEO STUDIO PAGE — AI Video Generation with Status Tracking v2
// Projects, language support, status lifecycle, stats dashboard
// =====================================================================

import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Link } from "react-router";
import {
  Film,
  Plus,
  Loader2,
  Clock,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Globe,
  Sparkles,
  BarChart3,
  X,
  Wand2,
  Languages,
} from "lucide-react";

// ── LANGUAGE MAP ────────────────────────────────────────────────────

const LANGUAGE_MAP: Record<string, { name: string; flag: string }> = {
  en: { name: "English", flag: "🇬🇧" },
  zu: { name: "isiZulu", flag: "🇿🇦" },
  xh: { name: "isiXhosa", flag: "🇿🇦" },
  af: { name: "Afrikaans", flag: "🇿🇦" },
  ns: { name: "Sepedi", flag: "🇿🇦" },
  tn: { name: "Setswana", flag: "🇿🇦" },
  st: { name: "Sesotho", flag: "🇿🇦" },
  ts: { name: "Xitsonga", flag: "🇿🇦" },
  ss: { name: "siSwati", flag: "🇿🇦" },
  ve: { name: "Tshivenda", flag: "🇿🇦" },
  nr: { name: "isiNdebele", flag: "🇿🇦" },
  sw: { name: "Kiswahili", flag: "🇰🇪" },
  fr: { name: "Français", flag: "🇫🇷" },
  pt: { name: "Português", flag: "🇵🇹" },
  ha: { name: "Hausa", flag: "🇳🇬" },
  yo: { name: "Yorùbá", flag: "🇳🇬" },
  ig: { name: "Igbo", flag: "🇳🇬" },
  am: { name: "Amharic", flag: "🇪🇹" },
  de: { name: "Deutsch", flag: "🇩🇪" },
  ru: { name: "Русский", flag: "🇷🇺" },
  ja: { name: "日本語", flag: "🇯🇵" },
  zh: { name: "中文", flag: "🇨🇳" },
};

const VALID_LANGUAGES = Object.keys(LANGUAGE_MAP);

// ── STATUS CONFIG ───────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: {
    label: "Pending",
    color: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    icon: <Clock className="w-4 h-4" />,
  },
  PROCESSING: {
    label: "Processing",
    color: "text-sky-400 bg-sky-400/10 border-sky-400/20",
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
  },
  SUCCESS: {
    label: "Success",
    color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    icon: <CheckCircle className="w-4 h-4" />,
  },
  FAILED: {
    label: "Failed",
    color: "text-red-400 bg-red-400/10 border-red-400/20",
    icon: <AlertTriangle className="w-4 h-4" />,
  },
};

// ── TYPES ───────────────────────────────────────────────────────────

interface VideoProject {
  id: number;
  title: string;
  description: string | null;
  prompt: string;
  language: string;
  status: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  progress: number | null;
  errorMessage: string | null;
  durationSeconds: number | null;
  modelUsed: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  processedAt: Date | null;
}

// ── COMPONENTS ──────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
};

const ProgressBar = ({ progress, status }: { progress: number; status: string }) => {
  const color = status === "FAILED" ? "bg-red-500" : status === "SUCCESS" ? "bg-emerald-500" : "bg-sky-500";
  return (
    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
      <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${progress}%` }} />
    </div>
  );
};

// ── MAIN PAGE ───────────────────────────────────────────────────────

export default function VideoStudioPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProjectDetail, setShowProjectDetail] = useState<VideoProject | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterLanguage, setFilterLanguage] = useState<string>("");

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPrompt, setFormPrompt] = useState("");
  const [formLanguage, setFormLanguage] = useState("en");

  // Queries
  const projects = trpc.video.list.useQuery(
    { status: filterStatus as any, language: filterLanguage || undefined, limit: 50 },
    { refetchInterval: 5000 }
  );
  const stats = trpc.video.stats.useQuery(undefined, { refetchInterval: 10000 });

  // Mutations
  const utils = trpc.useUtils();
  const createProject = trpc.video.create.useMutation({ onSuccess: () => { utils.video.list.invalidate(); utils.video.stats.invalidate(); setShowCreateModal(false); resetForm(); } });
  const deleteProject = trpc.video.delete.useMutation({ onSuccess: () => { utils.video.list.invalidate(); utils.video.stats.invalidate(); } });
  const generateVideo = trpc.video.generate.useMutation({ onSuccess: () => { utils.video.list.invalidate(); utils.video.stats.invalidate(); } });
  const markFailed = trpc.video.markFailed.useMutation({ onSuccess: () => utils.video.list.invalidate() });

  const resetForm = () => {
    setFormTitle("");
    setFormDescription("");
    setFormPrompt("");
    setFormLanguage("en");
  };

  const handleCreate = () => {
    if (!formTitle.trim() || !formPrompt.trim()) return;
    createProject.mutate({
      title: formTitle,
      description: formDescription,
      prompt: formPrompt,
      language: formLanguage as any,
    });
  };

  const handleGenerate = (project: VideoProject) => {
    generateVideo.mutate({
      prompt: project.prompt,
      title: project.title,
      language: project.language as any,
      description: project.description ?? undefined,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/20">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Video Studio</h1>
              <p className="text-xs text-slate-400">AI Video Generation with Status Tracking</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-xs px-4 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> New Project
            </button>
            <Link to="/" className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors">Home</Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats Bar */}
        {stats.data && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <div className="text-2xl font-bold text-slate-200">{stats.data.total}</div>
              <div className="text-xs text-slate-500">Total Projects</div>
            </div>
            {stats.data.byStatus.map((s: any) => (
              <div key={s.status} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <div className={`text-2xl font-bold ${
                  s.status === "SUCCESS" ? "text-emerald-400" : s.status === "FAILED" ? "text-red-400" : s.status === "PROCESSING" ? "text-sky-400" : "text-amber-400"
                }`}>{s.count}</div>
                <div className="text-xs text-slate-500">{STATUS_CONFIG[s.status]?.label || s.status}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-500" />
            <span className="text-xs text-slate-400">Filter:</span>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
          </select>
          <select
            value={filterLanguage}
            onChange={(e) => setFilterLanguage(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300"
          >
            <option value="">All Languages</option>
            {VALID_LANGUAGES.map((code) => (
              <option key={code} value={code}>{LANGUAGE_MAP[code]?.flag} {LANGUAGE_MAP[code]?.name}</option>
            ))}
          </select>
          <button
            onClick={() => { setFilterStatus(""); setFilterLanguage(""); }}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400"
          >
            Clear
          </button>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.data && projects.data.length > 0 ? (
            projects.data.map((project: VideoProject) => (
              <div
                key={project.id}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 hover:border-slate-600 transition-all cursor-pointer group"
                onClick={() => setShowProjectDetail(project)}
              >
                <div className="flex items-start justify-between mb-3">
                  <StatusBadge status={project.status} />
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">{LANGUAGE_MAP[project.language]?.flag}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteProject.mutate({ id: project.id }); }}
                      className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-slate-200 mb-1 truncate">{project.title}</h3>
                <p className="text-xs text-slate-500 mb-3 line-clamp-2">{project.description || project.prompt}</p>

                <ProgressBar progress={project.progress ?? 0} status={project.status} />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-slate-600">{project.progress ?? 0}%</span>
                  <span className="text-[10px] text-slate-600">{project.createdAt ? new Date(project.createdAt).toLocaleDateString() : "—"}</span>
                </div>

                {project.status === "PENDING" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleGenerate(project); }}
                    disabled={generateVideo.isPending}
                    className="mt-3 w-full text-xs py-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 transition-colors flex items-center justify-center gap-1.5"
                  >
                    {generateVideo.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Generate with AI
                  </button>
                )}

                {project.status === "FAILED" && project.errorMessage && (
                  <div className="mt-3 text-[10px] text-red-400 bg-red-500/5 rounded p-2 border border-red-500/10">
                    {project.errorMessage}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-16 text-slate-500">
              <Film className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm">No video projects yet. Create your first project!</p>
            </div>
          )}
        </div>
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2"><Plus className="w-5 h-5 text-red-400" /> New Video Project</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-500 hover:text-slate-300"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Title</label>
                <input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="My Educational Video"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-slate-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Description (optional)</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief description of the video..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-slate-500 resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">AI Prompt</label>
                <textarea
                  value={formPrompt}
                  onChange={(e) => setFormPrompt(e.target.value)}
                  placeholder="Describe what the AI should generate: A science lesson about photosynthesis for grade 10 students..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-slate-500 resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block flex items-center gap-1"><Languages className="w-3 h-3" /> Language</label>
                <select
                  value={formLanguage}
                  onChange={(e) => setFormLanguage(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200"
                >
                  {VALID_LANGUAGES.map((code) => (
                    <option key={code} value={code}>{LANGUAGE_MAP[code]?.flag} {LANGUAGE_MAP[code]?.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleCreate}
                disabled={createProject.isPending || !formTitle.trim() || !formPrompt.trim()}
                className="flex-1 text-sm py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {createProject.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Project
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm text-slate-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Detail Modal */}
      {showProjectDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <StatusBadge status={showProjectDetail.status} />
              <button onClick={() => setShowProjectDetail(null)} className="text-slate-500 hover:text-slate-300"><X className="w-5 h-5" /></button>
            </div>

            <h2 className="text-xl font-bold">{showProjectDetail.title}</h2>
            {showProjectDetail.description && <p className="text-sm text-slate-400">{showProjectDetail.description}</p>}

            <div className="rounded-lg bg-slate-800/50 border border-slate-800 p-3">
              <div className="text-xs text-slate-500 mb-1">AI Prompt</div>
              <p className="text-sm text-slate-300">{showProjectDetail.prompt}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-800">
                <div className="text-slate-500 mb-1">Language</div>
                <div className="text-slate-200">{LANGUAGE_MAP[showProjectDetail.language]?.flag} {LANGUAGE_MAP[showProjectDetail.language]?.name}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-800">
                <div className="text-slate-500 mb-1">Created</div>
                <div className="text-slate-200">{showProjectDetail.createdAt ? new Date(showProjectDetail.createdAt).toLocaleString() : "—"}</div>
              </div>
              {showProjectDetail.processedAt && (
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-800">
                  <div className="text-slate-500 mb-1">Processed</div>
                  <div className="text-slate-200">{showProjectDetail.processedAt ? new Date(showProjectDetail.processedAt).toLocaleString() : "—"}</div>
                </div>
              )}
              {showProjectDetail.modelUsed && (
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-800">
                  <div className="text-slate-500 mb-1">Model</div>
                  <div className="text-slate-200">{showProjectDetail.modelUsed}</div>
                </div>
              )}
            </div>

            <ProgressBar progress={showProjectDetail.progress ?? 0} status={showProjectDetail.status} />

            {showProjectDetail.status === "PENDING" && (
              <button
                onClick={() => { handleGenerate(showProjectDetail); setShowProjectDetail(null); }}
                disabled={generateVideo.isPending}
                className="w-full text-sm py-2 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 border border-sky-500/30 transition-colors flex items-center justify-center gap-2"
              >
                {generateVideo.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                Generate Video with AI
              </button>
            )}

            {showProjectDetail.errorMessage && (
              <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10 text-sm text-red-400">
                <AlertTriangle className="w-4 h-4 inline mr-2" />
                {showProjectDetail.errorMessage}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
