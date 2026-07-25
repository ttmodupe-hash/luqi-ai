import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Monitor,
  Sparkles,
  GitCompare,
  BarChart3,
  Mail,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

const TOOLS = [
  { id: "slack", name: "Slack", category: "communication", best_for: ["Real-time team chat", "Project channels", "Integrations"], pricing: "Freemium" },
  { id: "teams", name: "Microsoft Teams", category: "communication", best_for: ["Microsoft ecosystem", "Video meetings", "Document collaboration"], pricing: "Freemium" },
  { id: "zoom", name: "Zoom", category: "communication", best_for: ["Video meetings", "Webinars", "Large conferences"], pricing: "Freemium" },
  { id: "jira", name: "Jira", category: "project_management", best_for: ["Software teams", "Agile/Scrum", "Bug tracking"], pricing: "Paid" },
  { id: "trello", name: "Trello", category: "project_management", best_for: ["Small teams", "Visual workflows", "Simple projects"], pricing: "Freemium" },
  { id: "asana", name: "Asana", category: "project_management", best_for: ["Marketing teams", "Cross-functional work", "Task tracking"], pricing: "Freemium" },
  { id: "notion", name: "Notion", category: "project_management", best_for: ["Knowledge management", "Small teams", "Documentation"], pricing: "Freemium" },
  { id: "drive", name: "Google Drive", category: "document", best_for: ["Google users", "Collaborative docs", "Storage"], pricing: "Freemium" },
  { id: "dropbox", name: "Dropbox", category: "document", best_for: ["File sync", "Large files", "Creative teams"], pricing: "Freemium" },
  { id: "figma", name: "Figma", category: "design", best_for: ["UI/UX design", "Prototyping", "Design systems"], pricing: "Freemium" },
  { id: "github", name: "GitHub", category: "development", best_for: ["Code repositories", "Open source", "DevOps"], pricing: "Freemium" },
  { id: "vscode", name: "VS Code", category: "development", best_for: ["Code editing", "Debugging", "Extensions"], pricing: "Free" },
  { id: "todoist", name: "Todoist", category: "productivity", best_for: ["Personal tasks", "Quick capture", "Habit tracking"], pricing: "Freemium" },
  { id: "obsidian", name: "Obsidian", category: "productivity", best_for: ["Note-taking", "Knowledge graphs", "PKM"], pricing: "Freemium" },
  { id: "1password", name: "1Password", category: "security", best_for: ["Password management", "Team sharing", "Security alerts"], pricing: "Paid" },
  { id: "bitwarden", name: "Bitwarden", category: "security", best_for: ["Budget security", "Open source", "Cross-platform"], pricing: "Freemium" },
  { id: "toggl", name: "Toggl Track", category: "productivity", best_for: ["Freelancers", "Time tracking", "Reporting"], pricing: "Freemium" },
  { id: "hubspot", name: "HubSpot CRM", category: "crm", best_for: ["Small businesses", "Marketing automation", "Sales pipeline"], pricing: "Freemium" },
  { id: "quickbooks", name: "QuickBooks", category: "finance", best_for: ["Small business accounting", "Invoicing", "Payroll"], pricing: "Paid" },
  { id: "analytics", name: "Google Analytics", category: "analytics", best_for: ["Website analytics", "Traffic analysis", "Free"], pricing: "Free" },
];

interface ToolComparison {
  name: string;
  scores: Record<string, number>;
  total_score: number;
  best_for: string[];
  pros: string[];
  cons: string[];
}

interface ProductivityResult {
  productivity_score: number;
  score_breakdown: Record<string, number>;
  recommendations: string[];
  comparison_to_benchmark: string;
}

interface ToneResult {
  detected_tone: string;
  tone_scores: Record<string, number>;
  suggestions: string[];
  improved_version: string;
  readability_score: number;
}

interface FocusBlock {
  start: string;
  end: string;
  duration_minutes: number;
  rationale: string;
}

export default function WorkspacePage() {
  const [activeTab, setActiveTab] = useState("compare");
  const [loading, setLoading] = useState(false);

  // Tool comparison state
  const [tool1, setTool1] = useState("");
  const [tool2, setTool2] = useState("");
  const [comparison, setComparison] = useState<ToolComparison[] | null>(null);

  // Productivity assessment state
  const [teamSize, setTeamSize] = useState("5");
  const [remoteFreq, setRemoteFreq] = useState("3");
  const [meetingHours, setMeetingHours] = useState("2");
  const [toolCount, setToolCount] = useState("5");
  const [satisfaction, setSatisfaction] = useState("7");
  const [productivityResult, setProductivityResult] = useState<ProductivityResult | null>(null);

  // Email tone state
  const [emailText, setEmailText] = useState("");
  const [toneResult, setToneResult] = useState<ToneResult | null>(null);

  // Focus time state
  const [meetingsInput, setMeetingsInput] = useState("9:00-10:00\n11:00-11:30\n14:00-15:00");
  const [focusBlocks, setFocusBlocks] = useState<FocusBlock[] | null>(null);

  // Tool comparison — all client-side
  const compareTools = async () => {
    if (!tool1 || !tool2) return;
    setLoading(true);
    setComparison(null);
    // Simulate a brief delay for UX
    await new Promise((r) => setTimeout(r, 300));
    setComparison(generateMockComparison(tool1, tool2));
    setLoading(false);
  };

  const generateMockComparison = (t1: string, t2: string): ToolComparison[] => {
    const toolA = TOOLS.find((t) => t.id === t1);
    const toolB = TOOLS.find((t) => t.id === t2);
    if (!toolA || !toolB) return [];

    const dims = ["ease_of_use", "features", "pricing", "integrations", "support", "security"];
    const makeScores = () => {
      const s: Record<string, number> = {};
      dims.forEach((d) => { s[d] = Math.round((3 + Math.random() * 2) * 10) / 10; });
      return s;
    };

    const scoresA = makeScores();
    const scoresB = makeScores();

    return [
      { name: toolA.name, scores: scoresA, total_score: Math.round(Object.values(scoresA).reduce((a, b) => a + b, 0) * 10) / 10, best_for: toolA.best_for, pros: dims.filter((_, i) => i % 2 === 0).map((d) => `Strong ${d}`), cons: [] },
      { name: toolB.name, scores: scoresB, total_score: Math.round(Object.values(scoresB).reduce((a, b) => a + b, 0) * 10) / 10, best_for: toolB.best_for, pros: dims.filter((_, i) => i % 2 === 1).map((d) => `Strong ${d}`), cons: [] },
    ];
  };

  // Productivity assessment — all client-side
  const assessProductivity = async () => {
    setLoading(true);
    setProductivityResult(null);
    // Simulate a brief delay for UX
    await new Promise((r) => setTimeout(r, 300));
    const ts = parseInt(teamSize), rf = parseInt(remoteFreq), mh = parseInt(meetingHours), tc = parseInt(toolCount), sat = parseInt(satisfaction);
    const teamScore = Math.min(10, Math.max(2, 10 - Math.abs(ts - 5)));
    const remoteScore = rf <= 5 ? rf * 2 : 6;
    const meetingScore = Math.max(0, 10 - mh * 2);
    const toolScore = Math.min(10, Math.max(2, 10 - Math.abs(tc - 5)));
    const overall = Math.round((teamScore * 0.1 + remoteScore * 0.15 + meetingScore * 0.2 + toolScore * 0.15 + sat * 0.4) * 10) / 10;
    setProductivityResult({
      productivity_score: overall,
      score_breakdown: { team_size: teamScore, remote_frequency: remoteScore, meeting_hours: meetingScore, tool_count: toolScore, satisfaction: sat },
      recommendations: mh > 3 ? ["Consider reducing meeting hours", "Try async updates instead"] : tc > 8 ? ["Consolidate your tool stack"] : ["Productivity profile looks balanced"],
      comparison_to_benchmark: `Your score of ${overall}/10 is ${overall > 7 ? "above average" : overall > 5 ? "average" : "below average"}`,
    });
    setLoading(false);
  };

  // Email tone analyzer — all client-side
  const analyzeTone = async () => {
    if (!emailText.trim()) return;
    setLoading(true);
    setToneResult(null);
    // Simulate a brief delay for UX
    await new Promise((r) => setTimeout(r, 300));
    const text = emailText.toLowerCase();
    const scores: Record<string, number> = { formal: 0, casual: 0, aggressive: 0, passive: 0, urgent: 0, friendly: 0 };
    const formalWords = ["dear", "sincerely", "regards", "pursuant"];
    const casualWords = ["hey", "hi", "thanks", "cheers", "btw"];
    const aggressiveWords = ["must", "immediately", "fail", "unacceptable"];
    const friendlyWords = ["hope", "great", "happy", "appreciate", "glad"];
    formalWords.forEach((w) => { if (text.includes(w)) scores.formal++; });
    casualWords.forEach((w) => { if (text.includes(w)) scores.casual++; });
    aggressiveWords.forEach((w) => { if (text.includes(w)) scores.aggressive++; });
    friendlyWords.forEach((w) => { if (text.includes(w)) scores.friendly++; });
    const detected = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    setToneResult({
      detected_tone: detected[1] > 0 ? detected[0] : "neutral",
      tone_scores: scores,
      suggestions: scores.aggressive > 0 ? ["Soften imperative language"] : scores.passive > 2 ? ["Be more direct"] : ["Tone looks balanced"],
      improved_version: emailText,
      readability_score: 60,
    });
    setLoading(false);
  };

  // Focus time scheduler — all client-side
  const scheduleFocus = async () => {
    setLoading(true);
    setFocusBlocks(null);
    // Simulate a brief delay for UX
    await new Promise((r) => setTimeout(r, 300));
    const lines = meetingsInput.trim().split("\n").filter((l) => l.includes("-"));
    const meetings = lines.map((line) => {
      const [start, end] = line.trim().split("-");
      return { start: start.trim(), end: end.trim() };
    });
    setFocusBlocks(generateMockFocus(meetings));
    setLoading(false);
  };

  const generateMockFocus = (meetings: Array<{ start: string; end: string }>): FocusBlock[] => {
    const busy: Array<[number, number]> = [];
    meetings.forEach((m) => {
      const [sh, sm] = m.start.split(":").map(Number);
      const [eh, em] = m.end.split(":").map(Number);
      if (sh !== undefined && sm !== undefined && eh !== undefined && em !== undefined) {
        busy.push([sh * 60 + sm, eh * 60 + em]);
      }
    });
    busy.sort((a, b) => a[0] - b[0]);
    const merged: Array<[number, number]> = [];
    busy.forEach(([s, e]) => {
      if (merged.length && s <= merged[merged.length - 1][1] + 15) {
        merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e);
      } else {
        merged.push([s, e]);
      }
    });
    const free: Array<[number, number]> = [];
    let prevEnd = 8 * 60;
    merged.forEach(([s, e]) => {
      if (s - prevEnd >= 90) free.push([prevEnd, s]);
      prevEnd = Math.max(prevEnd, e);
    });
    if (18 * 60 - prevEnd >= 90) free.push([prevEnd, 18 * 60]);
    free.sort((a, b) => (a[0] >= 9 * 60 ? 0 : 1) - (b[0] >= 9 * 60 ? 0 : 1) || b[1] - b[0] - (a[1] - a[0]));
    return free.slice(0, 2).map(([s, e]) => ({
      start: `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`,
      end: `${Math.floor(Math.min(s + 90, e) / 60).toString().padStart(2, "0")}:${(Math.min(s + 90, e) % 60).toString().padStart(2, "0")}`,
      duration_minutes: Math.min(90, e - s),
      rationale: s < 10 * 60 ? "Morning peak energy" : "Afternoon focus window",
    }));
  };

  const getToneIcon = (tone: string) => {
    if (tone === "aggressive") return <TrendingDown size={14} className="text-red-400" />;
    if (tone === "friendly" || tone === "formal") return <TrendingUp size={14} className="text-emerald-400" />;
    return <Minus size={14} className="text-neutral-400" />;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-neutral-800">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Monitor size={20} className="text-purple-400" />
            <h1 className="text-xl font-bold text-white">Digital Workspace</h1>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-neutral-800 border border-neutral-700 flex-wrap h-auto">
              <TabsTrigger value="compare" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-neutral-400 text-xs">
                <GitCompare size={12} className="mr-1" /> Tool Comparison
              </TabsTrigger>
              <TabsTrigger value="productivity" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-neutral-400 text-xs">
                <BarChart3 size={12} className="mr-1" /> Productivity
              </TabsTrigger>
              <TabsTrigger value="tone" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-neutral-400 text-xs">
                <Mail size={12} className="mr-1" /> Email Tone
              </TabsTrigger>
              <TabsTrigger value="focus" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-neutral-400 text-xs">
                <Clock size={12} className="mr-1" /> Focus Time
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(100vh-200px)] mt-4">
              <TabsContent value="compare" className="mt-0">
                <Card className="bg-neutral-900 border-neutral-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-purple-400 flex items-center gap-2">
                      <GitCompare size={16} /> Tool Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Select value={tool1} onValueChange={setTool1}>
                        <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white">
                          <SelectValue placeholder="Select first tool" />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-800 border-neutral-700">
                          {TOOLS.map((t) => (
                            <SelectItem key={t.id} value={t.id} className="text-white hover:bg-neutral-700">{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={tool2} onValueChange={setTool2}>
                        <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white">
                          <SelectValue placeholder="Select second tool" />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-800 border-neutral-700">
                          {TOOLS.map((t) => (
                            <SelectItem key={t.id} value={t.id} className="text-white hover:bg-neutral-700">{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={compareTools} disabled={loading || !tool1 || !tool2} className="bg-purple-600 hover:bg-purple-500 text-white">
                      {loading ? <Sparkles size={16} className="animate-spin mr-1" /> : <GitCompare size={16} className="mr-1" />}
                      Compare
                    </Button>

                    {comparison && comparison.length === 2 && (
                      <div className="space-y-4">
                        {/* Score summary */}
                        <div className="grid grid-cols-2 gap-3">
                          {comparison.map((t) => (
                            <div key={t.name} className="bg-neutral-800 rounded-lg p-3 border border-neutral-700 text-center">
                              <p className="text-xs text-neutral-400">{t.name}</p>
                              <p className="text-2xl font-bold text-white">{t.total_score}</p>
                              <div className="flex flex-wrap gap-1 justify-center mt-1">
                                {t.best_for.slice(0, 2).map((b, i) => (
                                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-700 text-neutral-300">{b}</span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Dimension comparison */}
                        <div className="space-y-2">
                          {Object.keys(comparison[0].scores).map((dim) => {
                            const a = comparison[0].scores[dim];
                            const b = comparison[1].scores[dim];
                            const max = Math.max(a, b, 5);
                            return (
                              <div key={dim}>
                                <div className="flex justify-between text-xs text-neutral-400 mb-1 capitalize">
                                  <span>{dim.replace(/_/g, " ")}</span>
                                  <span>{comparison[0].name}: {a} vs {comparison[1].name}: {b}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(a / max) * 100}%` }} />
                                  </div>
                                  <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${(b / max) * 100}%` }} />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex items-center justify-center gap-4 text-xs">
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-purple-500" />
                            <span className="text-neutral-400">{comparison[0].name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-cyan-500" />
                            <span className="text-neutral-400">{comparison[1].name}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="productivity" className="mt-0">
                <Card className="bg-neutral-900 border-neutral-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-purple-400 flex items-center gap-2">
                      <BarChart3 size={16} /> Productivity Assessment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-neutral-400 mb-1 block">Team Size</label>
                        <Select value={teamSize} onValueChange={setTeamSize}>
                          <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-neutral-800 border-neutral-700">
                            {[1, 2, 3, 5, 8, 12, 20].map((n) => (
                              <SelectItem key={n} value={String(n)} className="text-white hover:bg-neutral-700">{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-neutral-400 mb-1 block">Remote Days/Week</label>
                        <Select value={remoteFreq} onValueChange={setRemoteFreq}>
                          <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-neutral-800 border-neutral-700">
                            {[0, 1, 2, 3, 4, 5].map((n) => (
                              <SelectItem key={n} value={String(n)} className="text-white hover:bg-neutral-700">{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-neutral-400 mb-1 block">Meeting Hours/Day</label>
                        <Select value={meetingHours} onValueChange={setMeetingHours}>
                          <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-neutral-800 border-neutral-700">
                            {[0, 1, 2, 3, 4, 5, 6, 8].map((n) => (
                              <SelectItem key={n} value={String(n)} className="text-white hover:bg-neutral-700">{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-neutral-400 mb-1 block">Tools Used</label>
                        <Select value={toolCount} onValueChange={setToolCount}>
                          <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-neutral-800 border-neutral-700">
                            {[1, 2, 3, 5, 8, 10, 12, 15].map((n) => (
                              <SelectItem key={n} value={String(n)} className="text-white hover:bg-neutral-700">{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-neutral-400 mb-1 block">Satisfaction (1-10)</label>
                        <Select value={satisfaction} onValueChange={setSatisfaction}>
                          <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-neutral-800 border-neutral-700">
                            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                              <SelectItem key={n} value={String(n)} className="text-white hover:bg-neutral-700">{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button onClick={assessProductivity} disabled={loading} className="bg-purple-600 hover:bg-purple-500 text-white">
                      {loading ? <Sparkles size={16} className="animate-spin mr-1" /> : <BarChart3 size={16} className="mr-1" />}
                      Assess Productivity
                    </Button>

                    {productivityResult && (
                      <>
                        <div className="text-center bg-neutral-800 rounded-lg p-4 border border-neutral-700">
                          <p className="text-xs text-neutral-400 mb-1">Productivity Score</p>
                          <p className="text-4xl font-bold text-white">{productivityResult.productivity_score}<span className="text-lg text-neutral-500">/10</span></p>
                          <p className="text-xs text-neutral-400 mt-1">{productivityResult.comparison_to_benchmark}</p>
                        </div>
                        {productivityResult.score_breakdown && (
                          <div className="space-y-2">
                            {Object.entries(productivityResult.score_breakdown).map(([dim, val]) => (
                              <div key={dim}>
                                <div className="flex justify-between text-xs text-neutral-400 mb-1 capitalize">
                                  <span>{dim.replace(/_/g, " ")}</span>
                                  <span>{val as number}/10</span>
                                </div>
                                <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(val as number) * 10}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {productivityResult.recommendations && (
                          <div className="bg-neutral-800/50 rounded-lg p-3 border border-neutral-700">
                            <p className="text-xs text-neutral-400 mb-2 flex items-center gap-1"><Lightbulb size={12} /> Recommendations</p>
                            {productivityResult.recommendations.map((r: string, i: number) => (
                              <p key={i} className="text-xs text-neutral-300 mb-1">• {r}</p>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tone" className="mt-0">
                <Card className="bg-neutral-900 border-neutral-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-purple-400 flex items-center gap-2">
                      <Mail size={16} /> Email Tone Analyzer
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      value={emailText}
                      onChange={(e) => setEmailText(e.target.value)}
                      placeholder="Paste your email here to analyze its tone..."
                      className="min-h-[120px] bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
                    />
                    <Button onClick={analyzeTone} disabled={loading || !emailText.trim()} className="bg-purple-600 hover:bg-purple-500 text-white">
                      {loading ? <Sparkles size={16} className="animate-spin mr-1" /> : <Mail size={16} className="mr-1" />}
                      Analyze Tone
                    </Button>

                    {toneResult && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 bg-neutral-800 rounded-lg p-3 border border-neutral-700">
                          {getToneIcon(toneResult.detected_tone)}
                          <div>
                            <p className="text-xs text-neutral-400">Detected Tone</p>
                            <p className="text-sm font-semibold text-white capitalize">{toneResult.detected_tone}</p>
                          </div>
                          <Badge variant="outline" className="ml-auto bg-neutral-700 text-neutral-300 border-neutral-600">
                            Readability: {toneResult.readability_score}
                          </Badge>
                        </div>

                        {toneResult.tone_scores && (
                          <div className="grid grid-cols-3 gap-2">
                            {Object.entries(toneResult.tone_scores).map(([tone, score]) => (
                              <div key={tone} className="bg-neutral-800 rounded-lg p-2 border border-neutral-700 text-center">
                                <p className="text-lg font-bold text-white">{score as number}</p>
                                <p className="text-[10px] text-neutral-400 capitalize">{tone}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {toneResult.suggestions && toneResult.suggestions.length > 0 && (
                          <div className="space-y-2">
                            {toneResult.suggestions.map((s: string, i: number) => (
                              <div key={i} className="flex items-start gap-2 text-xs text-neutral-300">
                                <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                                {s}
                              </div>
                            ))}
                          </div>
                        )}

                        {toneResult.improved_version && toneResult.improved_version !== emailText && (
                          <div className="bg-neutral-800 rounded-lg p-3 border border-neutral-700">
                            <p className="text-xs text-neutral-400 mb-1">Suggested Improvement</p>
                            <p className="text-sm text-neutral-200">{toneResult.improved_version}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="focus" className="mt-0">
                <Card className="bg-neutral-900 border-neutral-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-purple-400 flex items-center gap-2">
                      <Clock size={16} /> Focus Time Scheduler
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-xs text-neutral-400 mb-1 block">Your Meetings (one per line, format: start-end)</label>
                      <Textarea
                        value={meetingsInput}
                        onChange={(e) => setMeetingsInput(e.target.value)}
                        placeholder="9:00-10:00&#10;11:00-11:30&#10;14:00-15:00"
                        className="min-h-[100px] bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 font-mono text-sm"
                      />
                    </div>
                    <Button onClick={scheduleFocus} disabled={loading} className="bg-purple-600 hover:bg-purple-500 text-white">
                      {loading ? <Sparkles size={16} className="animate-spin mr-1" /> : <Clock size={16} className="mr-1" />}
                      Find Focus Blocks
                    </Button>

                    {focusBlocks && focusBlocks.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-xs text-neutral-400">Suggested Focus Blocks</p>
                        {focusBlocks.map((block, i) => (
                          <div key={i} className="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                  <Clock size={16} className="text-emerald-400" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-white">Focus Block {i + 1}</p>
                                  <p className="text-xs text-neutral-400">{block.rationale}</p>
                                </div>
                              </div>
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                {block.duration_minutes} min
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <div className="bg-neutral-700 rounded px-3 py-1 text-white">{block.start}</div>
                              <span className="text-neutral-500">to</span>
                              <div className="bg-neutral-700 rounded px-3 py-1 text-white">{block.end}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {focusBlocks && focusBlocks.length === 0 && (
                      <div className="text-center py-6 text-neutral-500 text-sm">
                        <AlertTriangle size={20} className="mx-auto mb-2" />
                        No focus blocks found. Try reducing meetings or using shorter meeting times.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
