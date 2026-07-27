import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sparkles,
  User,
  Briefcase,
  Heart,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Globe,
  DollarSign,
  GraduationCap,
  Shield,
  Code,
  Brain,
  BarChart3,
  BookOpen,
  Lock,
  MessageSquare,
  Zap,
  Search,
  TrendingUp,
  Cpu,
  ChevronRight,
  Star,
  RotateCcw,
  X,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════ */

interface OnboardingData {
  name: string;
  role: string;
  interests: string[];
  selectedCapabilities: string[];
  completed: boolean;
}

interface Capability {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

interface TutorialStep {
  target: string;
  title: string;
  description: string;
  position: "top" | "bottom" | "left" | "right";
}

/* ═══════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════ */

const STORAGE_KEY = "luqi_onboarding_completed";
const ONBOARDING_DATA_KEY = "luqi_onboarding_data";

const ROLES = [
  "Developer",
  "Data Scientist",
  "Student",
  "Researcher",
  "Business Analyst",
  "Security Engineer",
  "Product Manager",
  "Educator",
  "Other",
];

const INTERESTS = [
  "AI & Machine Learning",
  "Cybersecurity",
  "Finance & Trading",
  "Education",
  "Natural Languages",
  "Data Analysis",
  "Blockchain",
  "Automation",
  "Research",
  "Content Creation",
];

const CAPABILITIES: Capability[] = [
  {
    id: "languages",
    label: "Languages",
    description: "Learn and translate 50+ languages with AI-powered tutoring",
    icon: Globe,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10 border-emerald-500/30",
  },
  {
    id: "finance",
    label: "Finance",
    description: "Real-time crypto prices, portfolio tracking, and market analysis",
    icon: DollarSign,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10 border-amber-500/30",
  },
  {
    id: "education",
    label: "Education",
    description: "Personalized learning paths, assessments, and knowledge base",
    icon: GraduationCap,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10 border-blue-500/30",
  },
  {
    id: "security",
    label: "Security",
    description: "CVE database, threat intelligence, and security auditing tools",
    icon: Shield,
    color: "text-red-400",
    bgColor: "bg-red-500/10 border-red-500/30",
  },
  {
    id: "coding",
    label: "Coding Assistant",
    description: "Code generation, review, debugging, and technical documentation",
    icon: Code,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10 border-cyan-500/30",
  },
  {
    id: "wisdom",
    label: "Wisdom",
    description: "Ancient wisdom, proverbs, and philosophical insights from 17+ traditions",
    icon: Brain,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10 border-purple-500/30",
  },
  {
    id: "analytics",
    label: "Analytics",
    description: "Data visualization, metrics export, and performance insights",
    icon: BarChart3,
    color: "text-rose-400",
    bgColor: "bg-rose-500/10 border-rose-500/30",
  },
  {
    id: "knowledge",
    label: "Knowledge Base",
    description: "AI-powered Q&A, semantic search, and document management",
    icon: BookOpen,
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/10 border-indigo-500/30",
  },
  {
    id: "crypto",
    label: "Crypto Tools",
    description: "AES-256 encryption, hashing, and secure data operations",
    icon: Lock,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10 border-orange-500/30",
  },
  {
    id: "chat",
    label: "AI Chat",
    description: "Conversational AI with multi-module integration and context awareness",
    icon: MessageSquare,
    color: "text-teal-400",
    bgColor: "bg-teal-500/10 border-teal-500/30",
  },
  {
    id: "agent",
    label: "Agent Mesh",
    description: "Deploy AI agents that collaborate and execute complex workflows",
    icon: Zap,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10 border-yellow-500/30",
  },
  {
    id: "search",
    label: "Global Search",
    description: "Search across all modules, documents, and conversations instantly",
    icon: Search,
    color: "text-pink-400",
    bgColor: "bg-pink-500/10 border-pink-500/30",
  },
];

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    target: "sidebar",
    title: "Navigation",
    description: "Access all modules from the sidebar. Each icon opens a powerful capability.",
    position: "right",
  },
  {
    target: "chat",
    title: "AI Chat",
    description: "Start conversations with Luqi. The AI understands context and can invoke any module automatically.",
    position: "bottom",
  },
  {
    target: "search",
    title: "Global Search",
    description: "Press Cmd+K anytime to search across all modules, documents, and conversations.",
    position: "bottom",
  },
  {
    target: "status",
    title: "System Status",
    description: "Monitor real-time system health, module availability, and performance metrics.",
    position: "left",
  },
  {
    target: "profile",
    title: "Your Profile",
    description: "Manage settings, API keys, and preferences from your profile menu.",
    position: "left",
  },
];

/* ═══════════════════════════════════════════════════════════════════
   COMPONENT: StepIndicator
   ═══════════════════════════════════════════════════════════════════ */

function StepIndicator({
  currentStep,
  totalSteps,
}: {
  currentStep: number;
  totalSteps: number;
}) {
  const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
  return (
    <div className="w-full max-w-md mx-auto mb-8">
      <div className="flex items-center justify-between mb-2">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <div key={step} className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                step < currentStep
                  ? "bg-emerald-500 text-white"
                  : step === currentStep
                  ? "bg-neutral-800 border-2 border-emerald-500 text-emerald-400"
                  : "bg-neutral-800 border-2 border-neutral-700 text-neutral-500"
              }`}
            >
              {step < currentStep ? <CheckCircle2 size={16} /> : step}
            </div>
          </div>
        ))}
      </div>
      <div className="relative h-1.5 bg-neutral-800 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-center text-xs text-neutral-500 mt-2">
        Step {currentStep} of {totalSteps}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STEP 1: Welcome + Profile Setup
   ═══════════════════════════════════════════════════════════════════ */

function StepWelcomeProfile({
  data,
  onChange,
}: {
  data: OnboardingData;
  onChange: (data: Partial<OnboardingData>) => void;
}) {
  const toggleInterest = (interest: string) => {
    const current = data.interests;
    if (current.includes(interest)) {
      onChange({ interests: current.filter((i) => i !== interest) });
    } else if (current.length < 5) {
      onChange({ interests: [...current, interest] });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Welcome header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
          <Sparkles size={32} className="text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Welcome to Luqi AI</h2>
        <p className="text-sm text-neutral-400 max-w-sm mx-auto">
          Let&apos;s set up your profile so we can personalize your experience across all modules.
        </p>
      </div>

      {/* Name input */}
      <div className="space-y-2">
        <label className="text-sm text-neutral-300 flex items-center gap-1.5">
          <User size={14} className="text-neutral-500" />
          Your Name
        </label>
        <input
          type="text"
          placeholder="Enter your name"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
        />
      </div>

      {/* Role selection */}
      <div className="space-y-2">
        <label className="text-sm text-neutral-300 flex items-center gap-1.5">
          <Briefcase size={14} className="text-neutral-500" />
          Your Role
        </label>
        <div className="grid grid-cols-3 gap-2">
          {ROLES.map((role) => (
            <button
              key={role}
              onClick={() => onChange({ role })}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                data.role === role
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                  : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600 hover:text-neutral-300"
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Interests */}
      <div className="space-y-2">
        <label className="text-sm text-neutral-300 flex items-center gap-1.5">
          <Heart size={14} className="text-neutral-500" />
          Areas of Interest
          <span className="text-xs text-neutral-500 ml-auto">
            {data.interests.length}/5 selected
          </span>
        </label>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((interest) => {
            const selected = data.interests.includes(interest);
            return (
              <button
                key={interest}
                onClick={() => toggleInterest(interest)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                  selected
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                    : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600"
                }`}
              >
                {selected && <CheckCircle2 size={10} className="inline mr-1" />}
                {interest}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STEP 2: Select Capabilities
   ═══════════════════════════════════════════════════════════════════ */

function StepCapabilities({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto mb-4">
          <Zap size={32} className="text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Choose Your Capabilities</h2>
        <p className="text-sm text-neutral-400 max-w-sm mx-auto">
          Select the modules you want to explore. You can always access all features later.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CAPABILITIES.map((cap) => {
          const isSelected = selected.includes(cap.id);
          const Icon = cap.icon;
          return (
            <button
              key={cap.id}
              onClick={() => onToggle(cap.id)}
              className={`relative flex items-start gap-3 p-4 rounded-xl border text-left transition-all duration-200 group ${
                isSelected
                  ? `${cap.bgColor} ring-1 ring-offset-0 ring-offset-neutral-950`
                  : "bg-neutral-800/50 border-neutral-700 hover:border-neutral-600 hover:bg-neutral-800"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  isSelected ? cap.bgColor : "bg-neutral-700/50"
                }`}
              >
                <Icon size={20} className={isSelected ? cap.color : "text-neutral-400"} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-medium ${
                      isSelected ? "text-white" : "text-neutral-300"
                    }`}
                  >
                    {cap.label}
                  </span>
                  {isSelected && (
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">
                  {cap.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
            {selected.length} selected
          </Badge>
          <button
            onClick={() => selected.forEach((id) => onToggle(id))}
            className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STEP 3: Quick Tutorial
   ═══════════════════════════════════════════════════════════════════ */

function StepTutorial({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [currentTutorialStep, setCurrentTutorialStep] = useState(0);

  const nextStep = () => {
    if (currentTutorialStep < TUTORIAL_STEPS.length - 1) {
      setCurrentTutorialStep((p) => p + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    setCurrentTutorialStep((p) => Math.max(0, p - 1));
  };

  const step = TUTORIAL_STEPS[currentTutorialStep];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mx-auto mb-4">
          <Star size={32} className="text-purple-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Quick Tutorial</h2>
        <p className="text-sm text-neutral-400 max-w-sm mx-auto">
          Here&apos;s a quick walkthrough of the key features to help you get started.
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 justify-center">
        {TUTORIAL_STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === currentTutorialStep
                ? "w-6 bg-purple-500"
                : i < currentTutorialStep
                ? "w-3 bg-purple-500/50"
                : "w-3 bg-neutral-700"
            }`}
          />
        ))}
      </div>

      {/* Tutorial card */}
      <Card className="bg-neutral-900 border-neutral-800">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-purple-400">
                {currentTutorialStep + 1}
              </span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-1">{step.title}</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                {step.description}
              </p>
            </div>
          </div>

          {/* Simulated UI elements for context */}
          <div className="mt-6 p-4 bg-neutral-800/50 rounded-lg border border-neutral-700/50">
            <div className="flex items-center gap-3">
              {step.target === "sidebar" && (
                <div className="flex flex-col gap-2">
                  <div className="w-8 h-8 rounded-lg bg-neutral-700 flex items-center justify-center">
                    <MessageSquare size={14} className="text-neutral-400" />
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center ring-1 ring-emerald-500/50">
                    <Zap size={14} className="text-emerald-400" />
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-neutral-700 flex items-center justify-center">
                    <BarChart3 size={14} className="text-neutral-400" />
                  </div>
                </div>
              )}
              {step.target === "chat" && (
                <div className="flex-1 space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <User size={12} className="text-blue-400" />
                    </div>
                    <div className="bg-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-300">
                      How can I analyze market trends?
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Sparkles size={12} className="text-emerald-400" />
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 text-xs text-emerald-200">
                      I can help with market analysis using the Finance module...
                    </div>
                  </div>
                </div>
              )}
              {step.target === "search" && (
                <div className="flex-1">
                  <div className="flex items-center gap-2 px-3 py-2 bg-neutral-700 rounded-lg">
                    <Search size={14} className="text-neutral-400" />
                    <span className="text-xs text-neutral-400">Search anything...</span>
                    <kbd className="ml-auto px-1.5 py-0.5 bg-neutral-600 rounded text-[10px] text-neutral-300">
                      ⌘K
                    </kbd>
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="px-3 py-1.5 bg-neutral-700/50 rounded text-xs text-neutral-300 flex items-center gap-2">
                      <Zap size={10} className="text-amber-400" /> Finance module
                    </div>
                    <div className="px-3 py-1.5 bg-neutral-700/50 rounded text-xs text-neutral-300 flex items-center gap-2">
                      <Shield size={10} className="text-red-400" /> Security settings
                    </div>
                  </div>
                </div>
              )}
              {step.target === "status" && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs text-emerald-400">Online</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-700 rounded-lg">
                    <Cpu size={12} className="text-neutral-400" />
                    <span className="text-xs text-neutral-400">42%</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-700 rounded-lg">
                    <TrendingUp size={12} className="text-neutral-400" />
                    <span className="text-xs text-neutral-400">142ms</span>
                  </div>
                </div>
              )}
              {step.target === "profile" && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <User size={16} className="text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-white font-medium">Your Profile</p>
                    <p className="text-xs text-neutral-500">Settings, API keys, preferences</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={prevStep}
              disabled={currentTutorialStep === 0}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft size={14} /> Previous
            </button>
            <span className="text-xs text-neutral-500">
              {currentTutorialStep + 1} / {TUTORIAL_STEPS.length}
            </span>
            <button
              onClick={nextStep}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded-lg transition-colors"
            >
              {currentTutorialStep === TUTORIAL_STEPS.length - 1 ? "Finish" : "Next"}
              <ChevronRight size={14} />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STEP 4: Completion
   ═══════════════════════════════════════════════════════════════════ */

function StepCompletion({
  data,
  onGetStarted,
}: {
  data: OnboardingData;
  onGetStarted: () => void;
}) {
  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 text-center">
      <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center mx-auto">
        <CheckCircle2 size={40} className="text-emerald-400" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">
          You&apos;re All Set{data.name ? ", " + data.name : ""}!
        </h2>
        <p className="text-sm text-neutral-400 max-w-sm mx-auto">
          Your profile is configured and {data.selectedCapabilities.length} capabilities are ready to explore.
        </p>
      </div>

      {/* Summary card */}
      <Card className="bg-neutral-900 border-neutral-800 max-w-sm mx-auto">
        <CardContent className="p-5 space-y-4">
          {data.role && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-400">Role</span>
              <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30">
                {data.role}
              </Badge>
            </div>
          )}
          {data.interests.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-400">Interests</span>
              <span className="text-sm text-white">{data.interests.length} selected</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-400">Capabilities</span>
            <span className="text-sm text-white">
              {data.selectedCapabilities.length} enabled
            </span>
          </div>
          <div className="pt-2 border-t border-neutral-800">
            <div className="flex flex-wrap gap-1.5 justify-center">
              {data.selectedCapabilities.slice(0, 6).map((capId) => {
                const cap = CAPABILITIES.find((c) => c.id === capId);
                if (!cap) return null;
                const Icon = cap.icon;
                return (
                  <span
                    key={capId}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] border ${cap.bgColor} ${cap.color}`}
                  >
                    <Icon size={10} />
                    {cap.label}
                  </span>
                );
              })}
              {data.selectedCapabilities.length > 6 && (
                <span className="text-[10px] text-neutral-500 px-1">
                  +{data.selectedCapabilities.length - 6} more
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <div className="space-y-2 max-w-sm mx-auto">
        <p className="text-xs text-neutral-500 uppercase tracking-wider font-medium">
          Pro Tips
        </p>
        {[
          "Press Cmd+K to open global search from anywhere",
          "Use the AI Chat to invoke any module naturally",
          "Check the Status page to monitor system health",
        ].map((tip, i) => (
          <div
            key={i}
            className="flex items-start gap-2 text-left p-2 rounded-lg bg-neutral-800/50 border border-neutral-800"
          >
            <Zap size={12} className="text-amber-400 shrink-0 mt-0.5" />
            <span className="text-xs text-neutral-300">{tip}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={onGetStarted}
        className="inline-flex items-center gap-2 px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20"
      >
        <Sparkles size={18} />
        Get Started
        <ArrowRight size={18} />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN: OnboardingPage
   ═══════════════════════════════════════════════════════════════════ */

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    name: "",
    role: "",
    interests: [],
    selectedCapabilities: ["chat", "search"],
    completed: false,
  });
  const [isVisible, setIsVisible] = useState(false);

  /* Check if onboarding was already completed */
  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    const saved = localStorage.getItem(ONBOARDING_DATA_KEY);
    if (saved) {
      try {
        setData(JSON.parse(saved));
      } catch {
        /* ignore */
      }
    }
    if (!completed) {
      setIsVisible(true);
    }
  }, []);

  const persist = useCallback((partial: Partial<OnboardingData>) => {
    setData((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem(ONBOARDING_DATA_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleCapability = useCallback((id: string) => {
    setData((prev) => {
      const selected = prev.selectedCapabilities.includes(id)
        ? prev.selectedCapabilities.filter((c) => c !== id)
        : [...prev.selectedCapabilities, id];
      const next = { ...prev, selectedCapabilities: selected };
      localStorage.setItem(ONBOARDING_DATA_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const canProceed = () => {
    switch (step) {
      case 1:
        return data.name.trim().length > 0 && data.role.length > 0;
      case 2:
        return data.selectedCapabilities.length > 0;
      case 3:
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (step < 4) {
      setStep((p) => p + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep((p) => p - 1);
    }
  };

  const handleGetStarted = () => {
    const final = { ...data, completed: true };
    setData(final);
    localStorage.setItem(STORAGE_KEY, "true");
    localStorage.setItem(ONBOARDING_DATA_KEY, JSON.stringify(final));
    setIsVisible(false);
  };

  const handleRestart = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ONBOARDING_DATA_KEY);
    setData({
      name: "",
      role: "",
      interests: [],
      selectedCapabilities: ["chat", "search"],
      completed: false,
    });
    setStep(1);
    setIsVisible(true);
  };

  /* If onboarding completed and not visible, show restart option */
  if (!isVisible) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Card className="bg-neutral-900 border-neutral-800 max-w-sm w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Onboarding Complete</h3>
              <p className="text-sm text-neutral-400 mt-1">
                You&apos;ve already completed the setup process.
              </p>
            </div>
            <button
              onClick={handleRestart}
              className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm rounded-lg border border-neutral-700 transition-colors"
            >
              <RotateCcw size={14} />
              Restart Onboarding
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="h-full overflow-auto p-6">
        <div className="max-w-lg mx-auto">
          {/* Close button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={() => {
                localStorage.setItem(STORAGE_KEY, "skipped");
                setIsVisible(false);
              }}
              className="p-2 text-neutral-500 hover:text-white transition-colors"
              title="Skip onboarding"
            >
              <X size={18} />
            </button>
          </div>

          {/* Step indicator */}
          <StepIndicator currentStep={step} totalSteps={4} />

          {/* Step content */}
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-6">
              {step === 1 && (
                <StepWelcomeProfile data={data} onChange={persist} />
              )}
              {step === 2 && (
                <StepCapabilities
                  selected={data.selectedCapabilities}
                  onToggle={toggleCapability}
                />
              )}
              {step === 3 && <StepTutorial onComplete={nextStep} />}
              {step === 4 && (
                <StepCompletion data={data} onGetStarted={handleGetStarted} />
              )}

              {/* Navigation buttons */}
              {step !== 3 && step !== 4 && (
                <div className="flex items-center justify-between mt-8 pt-4 border-t border-neutral-800">
                  <button
                    onClick={prevStep}
                    disabled={step === 1}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    onClick={nextStep}
                    disabled={!canProceed()}
                    className="flex items-center gap-1.5 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-neutral-700 disabled:text-neutral-500 text-white text-sm rounded-lg transition-all"
                  >
                    {step === 4 ? "Finish" : "Continue"}
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}

              {/* Step 3 has its own nav */}
              {step === 3 && (
                <div className="flex items-center justify-center mt-8 pt-4 border-t border-neutral-800">
                  <button
                    onClick={nextStep}
                    className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                  >
                    Skip tutorial
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer hint */}
          <p className="text-center text-xs text-neutral-600 mt-4">
            You can always restart onboarding from your profile settings
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
}
