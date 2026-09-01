import { useState } from "react";
import { Bug, X, Send } from "lucide-react";

export default function ReportBugButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = () => {
    // In production, this would send to an API
    console.log("Bug report:", message);
    setMessage("");
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 w-12 h-12 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center transition-colors"
      >
        <Bug className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Bug className="w-4 h-4 text-red-400" />
          Report a Bug
        </h3>
        <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300">
          <X className="w-4 h-4" />
        </button>
      </div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Describe the issue..."
        className="w-full h-24 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-slate-500 resize-none"
      />
      <button
        onClick={handleSubmit}
        disabled={!message.trim()}
        className="mt-3 w-full py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <Send className="w-3 h-3" />
        Send Report
      </button>
    </div>
  );
}
