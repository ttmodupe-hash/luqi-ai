// @ts-nocheck
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  FlaskConical,
  Loader2,
  RotateCcw,
  Shield,
  Globe,
  BookOpen,
  Play,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { Link } from "react-router";

// ── TYPES ───────────────────────────────────────────────────────────

interface Variable {
  name: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  description: string;
}

interface Formula {
  name: string;
  expression: string;
  unit: string;
  description: string;
}

interface SafetyBound {
  variable: string;
  min: number;
  max: number;
  message: string;
}

interface LabBlueprint {
  slug: string;
  title: string;
  description: string;
  subject: string;
  difficulty: string;
  durationMinutes: number;
  variables: Variable[];
  formulas: Formula[];
  safetyBounds: SafetyBound[];
  practicalSteps: string[];
  governingLaws: string[];
}

interface SimulationResult {
  blueprintSlug: string;
  title: string;
  variables: Record<string, number>;
  results: { name: string; value: number; unit: string; description: string }[];
  safety: { safe: boolean; violations: string[] };
  timestamp: number;
}

// ── MAIN PAGE ───────────────────────────────────────────────────────

export default function LabSimulatorPage() {
  const [selectedFramework, setSelectedFramework] = useState("SOUTH_AFRICA_CAPS");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("EN");
  const [activeLab, setActiveLab] = useState<LabBlueprint | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, number>>({});
  const [simulationResults, setSimulationResults] = useState<SimulationResult | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [uiStrings, setUiStrings] = useState<Record<string, string>>({
    "ui.controls": "Controls",
    "ui.procedure": "Procedure",
    "ui.results": "Results",
    "ui.governing_laws": "Governing Laws",
    "ui.current_state": "Current State",
    "ui.safety_protocols": "Safety Protocols Active",
    "ui.all_safe": "All parameters within safe bounds",
    "ui.back_to_labs": "← Back to Labs",
    "ui.reset_defaults": "Reset to Defaults",
    "ui.dismiss": "Dismiss",
    "ui.no_labs_match": "No labs match the selected filters.",
  });

  // ── QUERIES ───────────────────────────────────────────────────────

  const frameworks = trpc.labs.listFrameworks.useQuery();
  const labs = trpc.labs.list.useQuery({});
  const languages = trpc.labs.listLanguages.useQuery();
  const frameworkLanguages = trpc.labs.getFrameworkLanguages.useQuery(
    { frameworkKey: selectedFramework },
    { enabled: !!selectedFramework }
  );

  const blueprint = trpc.labs.getBlueprint.useQuery(
    { slug: activeLab?.slug || "" },
    { enabled: !!activeLab }
  );

  // ── TRANSLATION ───────────────────────────────────────────────────

  const uiKeys = [
    "ui.controls", "ui.procedure", "ui.results", "ui.governing_laws",
    "ui.current_state", "ui.safety_protocols", "ui.all_safe",
    "ui.back_to_labs", "ui.reset_defaults", "ui.dismiss", "ui.no_labs_match",
  ];

  const translateUI = trpc.labs.translateUI.useQuery(
    { keys: uiKeys, lang: selectedLanguage },
    { enabled: selectedLanguage !== "EN" }
  );

  useEffect(() => {
    if (selectedLanguage === "EN") {
      setUiStrings({
        "ui.controls": "Controls",
        "ui.procedure": "Procedure",
        "ui.results": "Results",
        "ui.governing_laws": "Governing Laws",
        "ui.current_state": "Current State",
        "ui.safety_protocols": "Safety Protocols Active",
        "ui.all_safe": "All parameters within safe bounds",
        "ui.back_to_labs": "← Back to Labs",
        "ui.reset_defaults": "Reset to Defaults",
        "ui.dismiss": "Dismiss",
        "ui.no_labs_match": "No labs match the selected filters.",
      });
      return;
    }
    if (translateUI.data) {
      setUiStrings(translateUI.data);
    }
  }, [selectedLanguage, translateUI.data]);

  const t = (key: string, fallback?: string) => uiStrings[key] || fallback || key;

  // ── MUTATIONS ─────────────────────────────────────────────────────

  const runSim = trpc.labs.runSimulation.useMutation({
    onSuccess: (data) => setSimulationResults(data),
  });

  // ── HANDLERS ──────────────────────────────────────────────────────

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleVariableChange = useCallback(
    (name: string, value: number) => {
      setVariableValues((prev) => {
        const next = { ...prev, [name]: value };
        if (blueprint.data) {
          if (timerRef.current) {
            clearTimeout(timerRef.current);
          }
          timerRef.current = setTimeout(() => {
            runSim.mutate({ slug: blueprint.data.slug, variables: next });
          }, 150);
        }
        return next;
      });
    },
    [blueprint.data, runSim]
  );

  const handleReset = useCallback(() => {
    if (blueprint.data) {
      const initial: Record<string, number> = {};
      for (const v of blueprint.data.variables) {
        initial[v.name] = v.defaultValue;
      }
      setVariableValues(initial);
      setSimulationResults(null);
      setActiveStep(0);
    }
  }, [blueprint.data]);

  // ── EFFECTS ───────────────────────────────────────────────────────

  useEffect(() => {
    if (blueprint.data) {
      const initial: Record<string, number> = {};
      for (const v of blueprint.data.variables) {
        initial[v.name] = v.defaultValue;
      }
      setVariableValues(initial);
      setSimulationResults(null);
      setActiveStep(0);
      runSim.mutate({ slug: blueprint.data.slug, variables: initial });
    }
  }, [blueprint.data]);

  // ── FILTERED LABS ─────────────────────────────────────────────────

  const filteredLabs = useMemo(() => {
    if (!labs.data) return [];
    return labs.data.filter((lab: LabBlueprint) => {
      if (selectedSubject && lab.subject !== selectedSubject) return false;
      if (selectedDifficulty && lab.difficulty !== selectedDifficulty) return false;
      return true;
    });
  }, [labs.data, selectedSubject, selectedDifficulty]);

  // ── RENDER ────────────────────────────────────────────────────────

  if (activeLab && blueprint.data) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        {/* Lab Header */}
        <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveLab(null)}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
              >
                {t("ui.back_to_labs")}
              </button>
              <div>
                <h1 className="text-lg font-bold tracking-tight">{blueprint.data.title}</h1>
                <p className="text-xs text-slate-400">{blueprint.data.subject} • {blueprint.data.difficulty}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger className="w-[140px] text-xs">
                  <Globe className="w-3 h-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(frameworkLanguages.data || []).map((lang: any) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Controls Panel */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FlaskConical className="w-4 h-4" />
                    {t("ui.controls")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {blueprint.data.variables.map((v) => (
                    <div key={v.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-slate-400">
                          {v.label} ({v.unit})
                        </label>
                        <span className="text-sm font-mono text-sky-400">
                          {variableValues[v.name]?.toFixed(v.step < 1 ? 2 : 0) ?? v.defaultValue}
                        </span>
                      </div>
                      <Slider
                        value={[variableValues[v.name] ?? v.defaultValue]}
                        onValueChange={([val]) => handleVariableChange(v.name, val)}
                        min={v.min}
                        max={v.max}
                        step={v.step}
                        className="w-full"
                      />
                      <p className="text-[10px] text-slate-600">{v.description}</p>
                    </div>
                  ))}
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="w-full text-xs"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    {t("ui.reset_defaults")}
                  </Button>
                </CardContent>
              </Card>

              {/* Safety Panel */}
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    {t("ui.safety_protocols")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {simulationResults?.safety.safe ? (
                    <div className="flex items-center gap-2 text-emerald-400 text-xs">
                      <CheckCircle className="w-4 h-4" />
                      {t("ui.all_safe")}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {simulationResults?.safety.violations.map((v, i) => (
                        <div key={i} className="flex items-center gap-2 text-amber-400 text-xs">
                          <AlertTriangle className="w-4 h-4" />
                          {v}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Results Panel */}
            <div className="lg:col-span-2 space-y-4">
              {/* Current State */}
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{t("ui.current_state")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(variableValues).map(([key, value]) => {
                      const v = blueprint.data.variables.find((x) => x.name === key);
                      return (
                        <div key={key} className="rounded-lg bg-slate-800/50 p-3">
                          <div className="text-xs text-slate-500">{v?.label || key}</div>
                          <div className="text-lg font-mono text-sky-400">
                            {value?.toFixed(2) ?? "—"}
                          </div>
                          <div className="text-[10px] text-slate-600">{v?.unit}</div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Results */}
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{t("ui.results")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {runSim.isPending ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
                    </div>
                  ) : simulationResults ? (
                    <div className="space-y-3">
                      {simulationResults.results.map((r) => (
                        <div
                          key={r.name}
                          className="flex items-center justify-between rounded-lg bg-slate-800/50 p-3"
                        >
                          <div>
                            <div className="text-sm font-medium text-slate-200">{r.name}</div>
                            <div className="text-xs text-slate-500">{r.description}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-mono text-emerald-400">
                              {r.value.toFixed(4)}
                            </div>
                            <div className="text-xs text-slate-500">{r.unit}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500 text-sm">
                      Run a simulation to see results
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Procedure */}
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{t("ui.procedure")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {blueprint.data.practicalSteps.map((step, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveStep(i)}
                        className={`w-full text-left rounded-lg p-3 transition-all ${
                          activeStep === i
                            ? "bg-sky-500/10 border border-sky-500/20"
                            : "bg-slate-800/50 border border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              activeStep === i
                                ? "bg-sky-500 text-white"
                                : "bg-slate-700 text-slate-400"
                            }`}
                          >
                            {i + 1}
                          </span>
                          <span className="text-sm text-slate-300">{step}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Governing Laws */}
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{t("ui.governing_laws")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {blueprint.data.governingLaws.map((law, i) => (
                      <div
                        key={i}
                        className="rounded-lg bg-slate-800/50 p-3 text-sm text-slate-300 font-mono"
                      >
                        {law}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── LAB LIST VIEW ─────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Lab Simulator</h1>
              <p className="text-xs text-slate-400">Interactive STEM Labs with Real Calculations</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="w-[140px] text-xs">
                <Globe className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(frameworkLanguages.data || []).map((lang: any) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Link
              to="/"
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
            >
              Home
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={selectedFramework} onValueChange={setSelectedFramework}>
            <SelectTrigger className="w-[220px] text-xs">
              <SelectValue placeholder="Select Framework" />
            </SelectTrigger>
            <SelectContent>
              {(frameworks.data || []).map((fw: any) => (
                <SelectItem key={fw.key} value={fw.key}>
                  {fw.flag} {fw.countryName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-[160px] text-xs">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Subjects</SelectItem>
              <SelectItem value="Physics">Physics</SelectItem>
              <SelectItem value="Chemistry">Chemistry</SelectItem>
              <SelectItem value="Biology">Biology</SelectItem>
              <SelectItem value="Engineering">Engineering</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
            <SelectTrigger className="w-[140px] text-xs">
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Levels</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Labs Grid */}
        {labs.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
          </div>
        ) : filteredLabs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLabs.map((lab: LabBlueprint) => (
              <Card
                key={lab.slug}
                className="bg-slate-900/50 border-slate-800 hover:border-slate-600 transition-all cursor-pointer group"
                onClick={() => setActiveLab(lab)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        lab.difficulty === "beginner"
                          ? "border-emerald-500/30 text-emerald-400"
                          : lab.difficulty === "intermediate"
                          ? "border-amber-500/30 text-amber-400"
                          : "border-red-500/30 text-red-400"
                      }`}
                    >
                      {lab.difficulty}
                    </Badge>
                    <span className="text-xs text-slate-500">{lab.subject}</span>
                  </div>
                  <CardTitle className="text-base mt-2 group-hover:text-sky-400 transition-colors">
                    {lab.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-400 line-clamp-2">{lab.description}</p>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-slate-600">
                      {lab.variables.length} variables • {lab.formulas.length} formulas
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-sky-400 hover:text-sky-300"
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Start Lab
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-500">
            <FlaskConical className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm">{t("ui.no_labs_match")}</p>
          </div>
        )}
      </main>
    </div>
  );
}
