/**
 * LUQI AI — Welcome Modal (First-Time User Onboarding)
 * =====================================================
 * 3-step onboarding: Welcome -> Choose Interests -> All Set
 */

import { useState, useEffect } from "react";
import { Sparkles, Check, ArrowRight } from "lucide-react";

const INTERESTS = [
  { id: "finance", label: "Finance & Tax", emoji: "💰" },
  { id: "education", label: "Education & NSFAS", emoji: "🎓" },
  { id: "health", label: "Health & Wellness", emoji: "🏥" },
  { id: "business", label: "Business & Tenders", emoji: "🏢" },
  { id: "agriculture", label: "Agriculture", emoji: "🌾" },
  { id: "tech", label: "Technology", emoji: "💻" },
  { id: "government", label: "Government Services", emoji: "🏛️" },
  { id: "energy", label: "Load Shedding & Solar", emoji: "⚡" },
];

export default function WelcomeModal() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (!localStorage.getItem("welcome_seen")) {
      setShow(true);
    }
  }, []);

  const toggleInterest = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const finish = () => {
    localStorage.setItem("welcome_seen", "true");
    if (selected.length > 0) {
      localStorage.setItem("user_interests", JSON.stringify(selected));
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl">
        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center mx-auto">
              <Sparkles size={32} className="text-cyan-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Welcome to LUQI AI</h2>
            <p className="text-muted-foreground">
              Your AI-powered assistant for daily life in South Africa. Explore 90+
              capabilities across finance, education, health, tenders, and more.
            </p>
            <button
              onClick={() => setStep(2)}
              className="w-full py-3 rounded-xl bg-cyan-500 text-black font-semibold hover:bg-cyan-400 transition-colors flex items-center justify-center gap-2"
            >
              Get Started <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* Step 2: Interests */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground text-center">
              What interests you?
            </h2>
            <p className="text-sm text-muted-foreground text-center">
              Select topics to personalise your experience
            </p>
            <div className="grid grid-cols-2 gap-2">
              {INTERESTS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggleInterest(item.id)}
                  className={`p-3 rounded-xl border text-left text-sm transition-all ${
                    selected.includes(item.id)
                      ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                      : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <span className="text-lg mr-2">{item.emoji}</span>
                  {item.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(3)}
              className="w-full py-3 rounded-xl bg-cyan-500 text-black font-semibold hover:bg-cyan-400 transition-colors"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 3: All Set */}
        {step === 3 && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <Check size={32} className="text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">You're All Set!</h2>
            <p className="text-muted-foreground">
              {selected.length > 0
                ? `We've noted your interest in ${selected.length} topics. Let's explore LUQI AI!`
                : "Let's explore everything LUQI AI has to offer!"}
            </p>
            {selected.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {selected.map((id) => {
                  const item = INTERESTS.find((i) => i.id === id);
                  return (
                    <span
                      key={id}
                      className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs"
                    >
                      {item?.emoji} {item?.label}
                    </span>
                  );
                })}
              </div>
            )}
            <button
              onClick={finish}
              className="w-full py-3 rounded-xl bg-cyan-500 text-black font-semibold hover:bg-cyan-400 transition-colors"
            >
              Explore LUQI AI
            </button>
          </div>
        )}

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition-colors ${
                s === step ? "bg-cyan-500" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
