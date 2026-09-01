import { useState, useEffect } from "react";
import { X } from "lucide-react";

export default function WelcomeModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem("luqi_welcome_seen");
    if (!hasSeen) {
      setOpen(true);
      localStorage.setItem("luqi_welcome_seen", "true");
    }
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Welcome to LUQI AI</h3>
          <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-slate-400">
          Your African-first AI education platform. Explore labs, learn STEM, and build your future.
        </p>
        <button
          onClick={() => setOpen(false)}
          className="w-full py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
