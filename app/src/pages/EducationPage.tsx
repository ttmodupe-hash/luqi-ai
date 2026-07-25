import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  CheckCircle2,
  XCircle,
  Lightbulb,
  ArrowRight,
  FlaskConical,
  Calculator,
  Globe,
  Atom,
  Palette,
  Music,
  Code,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

const SUBJECTS = [
  { id: "math", name: "Mathematics", icon: Calculator, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  { id: "science", name: "Science", icon: FlaskConical, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  { id: "history", name: "History", icon: Globe, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  { id: "physics", name: "Physics", icon: Atom, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  { id: "art", name: "Art", icon: Palette, color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/20" },
  { id: "music", name: "Music", icon: Music, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" },
  { id: "programming", name: "Programming", icon: Code, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
];

const LEVELS = [
  { id: "beginner", name: "Beginner", desc: "Just starting out" },
  { id: "intermediate", name: "Intermediate", desc: "Some experience" },
  { id: "advanced", name: "Advanced", desc: "Deep knowledge" },
];

interface StudyPlan {
  subject: string;
  level: string;
  plan: {
    title: string;
    description: string;
    weekly_hours: number;
    modules: Array<{
      name: string;
      topics: string[];
      estimated_hours: number;
    }>;
    resources: string[];
  };
}

interface PracticeQuestion {
  question: string;
  options?: string[];
  correct_answer?: number;
  explanation?: string;
}

export default function EducationPage() {
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [loading, setLoading] = useState(false);

  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [helpTopic, setHelpTopic] = useState<string | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);

  const currentSubject = SUBJECTS.find((s) => s.id === selectedSubject);

  const createStudyPlan = async () => {
    if (!selectedSubject || !selectedLevel) return;
    setLoading(true);
    setStudyPlan(null);
    try {
      const res = await fetch(`${API_BASE}/education/study-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: selectedSubject, level: selectedLevel }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStudyPlan(data.plan ? data : generateMockPlan());
    } catch (e: unknown) {
      setStudyPlan(generateMockPlan());
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async () => {
    if (!selectedSubject || !selectedLevel) return;
    setLoading(true);
    setQuestions([]);
    setSelectedAnswers({});
    setShowResults(false);
    try {
      const res = await fetch(`${API_BASE}/education/questions?subject=${encodeURIComponent(selectedSubject)}&level=${encodeURIComponent(selectedLevel)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setQuestions(data.questions || generateMockQuestions());
    } catch (e: unknown) {
      setQuestions(generateMockQuestions());
    } finally {
      setLoading(false);
    }
  };

  const fetchHelp = async () => {
    if (!selectedSubject) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/education/help?subject=${encodeURIComponent(selectedSubject)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setHelpTopic(data.help || data.tips || getSubjectHelp());
    } catch (e: unknown) {
      setHelpTopic(getSubjectHelp());
    } finally {
      setLoading(false);
    }
  };

  const generateMockPlan = (): StudyPlan => {
    const subjectName = currentSubject?.name || selectedSubject;
    const modules: Array<{ name: string; topics: string[]; estimated_hours: number }> = [];
    if (selectedSubject === "math") {
      modules.push(
        { name: "Foundations", topics: ["Numbers & Operations", "Fractions & Decimals", "Basic Algebra"], estimated_hours: 10 },
        { name: selectedLevel === "beginner" ? "Core Concepts" : "Advanced Topics", topics: selectedLevel === "beginner" ? ["Geometry Basics", "Percentages", "Data Interpretation"] : ["Calculus", "Linear Algebra", "Probability"], estimated_hours: 15 },
        { name: "Applications", topics: ["Problem Solving", "Real-world Math", "Practice Exams"], estimated_hours: 10 }
      );
    } else if (selectedSubject === "programming") {
      modules.push(
        { name: "Basics", topics: ["Variables & Data Types", "Control Flow", "Functions"], estimated_hours: 12 },
        { name: selectedLevel === "beginner" ? "Core" : "Advanced", topics: selectedLevel === "beginner" ? ["Arrays & Objects", "DOM Manipulation", "Events"] : ["Async Programming", "Design Patterns", "Testing"], estimated_hours: 18 },
        { name: "Project", topics: ["Build a real app", "Code Review", "Deployment"], estimated_hours: 15 }
      );
    } else {
      modules.push(
        { name: "Fundamentals", topics: [`${subjectName} basics`, "Core concepts", "Key terminology"], estimated_hours: 10 },
        { name: selectedLevel === "beginner" ? "Building Blocks" : "Deep Dive", topics: selectedLevel === "beginner" ? ["Essential principles", "Common techniques", "Practice exercises"] : ["Advanced theory", "Research methods", "Complex problems"], estimated_hours: 15 },
        { name: "Application", topics: ["Hands-on projects", "Case studies", "Assessment"], estimated_hours: 10 }
      );
    }
    return {
      subject: selectedSubject,
      level: selectedLevel,
      plan: {
        title: `${subjectName} - ${selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1)} Study Plan`,
        description: `A structured plan to master ${subjectName} at the ${selectedLevel} level.`,
        weekly_hours: selectedLevel === "beginner" ? 5 : selectedLevel === "intermediate" ? 8 : 12,
        modules,
        resources: ["Online tutorials", "Practice workbooks", "Video lectures", "Community forums"],
      },
    };
  };

  const generateMockQuestions = (): PracticeQuestion[] => {
    const subjectQs: Record<string, PracticeQuestion[]> = {
      math: [
        { question: "What is the derivative of x²?", options: ["x", "2x", "x²", "2"], correct_answer: 1, explanation: "Using the power rule: d/dx(x^n) = n*x^(n-1). So d/dx(x²) = 2x." },
        { question: "What is the value of π (pi) to 2 decimal places?", options: ["3.12", "3.14", "3.16", "3.18"], correct_answer: 1, explanation: "π ≈ 3.14159..., so to 2 decimal places it's 3.14." },
        { question: "Solve for x: 2x + 5 = 13", options: ["3", "4", "5", "6"], correct_answer: 1, explanation: "2x = 13 - 5 = 8, so x = 4." },
      ],
      programming: [
        { question: "What does 'const' declare in JavaScript?", options: ["A variable that can be reassigned", "A constant reference", "A function", "A class"], correct_answer: 1, explanation: "const declares a variable that cannot be reassigned, though objects/arrays can still be mutated." },
        { question: "What is the time complexity of binary search?", options: ["O(n)", "O(log n)", "O(n²)", "O(1)"], correct_answer: 1, explanation: "Binary search divides the search space in half each time, giving O(log n) complexity." },
        { question: "Which data structure uses LIFO?", options: ["Queue", "Stack", "Array", "Tree"], correct_answer: 1, explanation: "Stack is Last-In-First-Out — the last element added is the first one removed." },
      ],
    };
    return subjectQs[selectedSubject] || [
      { question: `What is a fundamental concept in ${currentSubject?.name || selectedSubject}?`, options: ["Option A", "Option B", "Option C", "Option D"], correct_answer: 0, explanation: "This is a sample question. Connect to the API for real questions." },
      { question: `Which approach is most effective for learning ${currentSubject?.name || selectedSubject}?`, options: ["Reading only", "Practice and application", "Memorization", "Watching videos"], correct_answer: 1, explanation: "Active learning through practice and application leads to better retention." },
    ];
  };

  const getSubjectHelp = (): string => {
    const helpMap: Record<string, string> = {
      math: "Math tip: Start with fundamentals. Practice daily. Use visual aids for geometry. Work through examples step by step.",
      science: "Science tip: Focus on the scientific method. Do hands-on experiments. Connect theory to real-world observations.",
      history: "History tip: Create timelines. Connect events to themes. Use primary sources. Understand cause and effect relationships.",
      physics: "Physics tip: Master the math first. Draw diagrams. Understand units. Practice problem-solving systematically.",
      programming: "Programming tip: Code every day. Start small. Read others' code. Debug by printing values. Use version control.",
    };
    return helpMap[selectedSubject] || "Study tip: Set clear goals. Review regularly. Take breaks. Test yourself actively. Stay consistent.";
  };

  const handleAnswerSelect = (qIndex: number, optionIndex: number) => {
    if (showResults) return;
    setSelectedAnswers((prev) => ({ ...prev, [qIndex]: optionIndex }));
  };

  const score = questions.reduce((acc, q, i) => {
    return acc + (selectedAnswers[i] === q.correct_answer ? 1 : 0);
  }, 0);

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-neutral-800">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <GraduationCap size={20} className="text-emerald-400" />
            <h1 className="text-xl font-bold text-white">Education</h1>
          </div>

          {/* Subject Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-4">
            {SUBJECTS.map((s) => {
              const Icon = s.icon;
              const isActive = selectedSubject === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => { setSelectedSubject(s.id); setStudyPlan(null); setQuestions([]); setHelpTopic(null); setShowResults(false); setSelectedAnswers({}); }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all text-center ${
                    isActive
                      ? `${s.bg} ${s.border} ${s.color}`
                      : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700 hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-xs font-medium">{s.name}</span>
                </button>
              );
            })}
          </div>

          {/* Level Selector */}
          {selectedSubject && (
            <div className="flex gap-2 mb-4">
              {LEVELS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => { setSelectedLevel(l.id); setStudyPlan(null); }}
                  className={`flex-1 flex flex-col items-center p-2 rounded-lg border transition-all ${
                    selectedLevel === l.id
                      ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                      : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700 hover:text-white"
                  }`}
                >
                  <span className="text-xs font-medium">{l.name}</span>
                  <span className="text-[10px] text-neutral-500">{l.desc}</span>
                </button>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          {selectedSubject && selectedLevel && (
            <div className="flex gap-2">
              <Button
                onClick={createStudyPlan}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
                size="sm"
              >
                {loading ? <Sparkles size={14} className="animate-spin mr-1" /> : <BookOpen size={14} className="mr-1" />}
                Study Plan
              </Button>
              <Button
                onClick={fetchQuestions}
                disabled={loading}
                variant="outline"
                className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white"
                size="sm"
              >
                Practice Questions
              </Button>
              <Button
                onClick={fetchHelp}
                disabled={loading}
                variant="outline"
                className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white"
                size="sm"
              >
                <Lightbulb size={14} className="mr-1" />
                Study Tips
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {loading && !studyPlan && questions.length === 0 && !helpTopic && (
            <div className="text-center py-12 text-neutral-500">
              <Sparkles size={32} className="animate-spin mx-auto mb-3" />
              <p>Loading...</p>
            </div>
          )}

          {/* Help Topic */}
          {helpTopic && (
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-amber-400 flex items-center gap-2">
                  <Lightbulb size={16} />
                  Study Tips for {currentSubject?.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-neutral-200 leading-relaxed">{helpTopic}</p>
              </CardContent>
            </Card>
          )}

          {/* Study Plan */}
          {studyPlan && (
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                  <BookOpen size={16} />
                  {studyPlan.plan.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-neutral-300">{studyPlan.plan.description}</p>
                <Badge variant="outline" className="bg-neutral-800 text-neutral-300 border-neutral-700">
                  {studyPlan.plan.weekly_hours} hours/week recommended
                </Badge>

                <div className="space-y-3">
                  {studyPlan.plan.modules.map((mod, i) => (
                    <div key={i} className="bg-neutral-800 rounded-lg p-3 border border-neutral-700">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-cyan-500/10 flex items-center justify-center text-xs text-cyan-400 font-bold">
                          {i + 1}
                        </div>
                        <span className="text-sm font-medium text-white">{mod.name}</span>
                        <span className="text-xs text-neutral-500 ml-auto">{mod.estimated_hours}h</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {mod.topics.map((t, j) => (
                          <span key={j} className="text-xs px-2 py-0.5 rounded-full bg-neutral-700 text-neutral-300">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  {studyPlan.plan.resources.map((r, i) => (
                    <Badge key={i} variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                      {r}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Practice Questions */}
          {questions.length > 0 && (
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-cyan-400 flex items-center gap-2">
                  <BookOpen size={16} />
                  Practice Questions — {currentSubject?.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {questions.map((q, qi) => (
                  <div key={qi} className="space-y-2">
                    <p className="text-sm font-medium text-white">
                      {qi + 1}. {q.question}
                    </p>
                    {q.options && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, oi) => {
                          const isSelected = selectedAnswers[qi] === oi;
                          const isCorrect = q.correct_answer === oi;
                          let btnClass = "bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700 hover:text-white";
                          if (showResults) {
                            if (isCorrect) btnClass = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
                            else if (isSelected && !isCorrect) btnClass = "bg-red-500/10 border-red-500/30 text-red-400";
                          } else if (isSelected) {
                            btnClass = "bg-cyan-500/10 border-cyan-500/30 text-cyan-400";
                          }
                          return (
                            <button
                              key={oi}
                              onClick={() => handleAnswerSelect(qi, oi)}
                              className={`flex items-center gap-2 p-2 rounded-lg border text-sm transition-all ${btnClass}`}
                            >
                              {showResults && isCorrect && <CheckCircle2 size={14} />}
                              {showResults && isSelected && !isCorrect && <XCircle size={14} />}
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {showResults && q.explanation && (
                      <p className="text-xs text-neutral-400 bg-neutral-800 rounded-lg p-2 border border-neutral-700">
                        {q.explanation}
                      </p>
                    )}
                  </div>
                ))}

                <div className="flex items-center justify-between pt-2">
                  {!showResults ? (
                    <Button
                      onClick={() => setShowResults(true)}
                      disabled={Object.keys(selectedAnswers).length === 0}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white"
                      size="sm"
                    >
                      Check Answers
                    </Button>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={
                          score / questions.length >= 0.7
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : score / questions.length >= 0.4
                            ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }
                      >
                        Score: {score}/{questions.length} ({((score / questions.length) * 100).toFixed(0)}%)
                      </Badge>
                      <Button
                        onClick={() => {
                          setSelectedAnswers({});
                          setShowResults(false);
                        }}
                        variant="outline"
                        size="sm"
                        className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                      >
                        Retry
                      </Button>
                    </div>
                  )}
                  <Button
                    onClick={fetchQuestions}
                    variant="ghost"
                    size="sm"
                    className="text-neutral-400 hover:text-white"
                  >
                    <ArrowRight size={14} className="mr-1" /> New Questions
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!selectedSubject && (
            <div className="text-center py-12 text-neutral-500">
              <GraduationCap size={32} className="mx-auto mb-3 opacity-50" />
              <p>Select a subject above to get started with your learning journey.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
