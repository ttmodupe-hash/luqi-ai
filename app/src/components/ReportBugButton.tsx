/**
 * LUQI AI — Floating Bug Report Button
 * =====================================
 * Allows users to quickly report issues from any page.
 */

import { useState } from "react";
import { useNavigate } from "react-router";
import { Bug, X } from "lucide-react";

export default function ReportBugButton() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-cyan-500 text-black shadow-lg hover:bg-cyan-400 transition-all flex items-center justify-center active:scale-95"
        title="Report a bug"
      >
        {open ? <X size={20} /> : <Bug size={20} />}
      </button>

      {/* Quick actions popover */}
      {open && (
        <div className="fixed bottom-20 right-6 z-40 bg-card border border-border rounded-xl shadow-xl p-3 space-y-2 w-52">
          <button
            onClick={() => { navigate("/contact"); setOpen(false); }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent text-sm transition-colors"
          >
            🐛 Report a Bug
          </button>
          <button
            onClick={() => { navigate("/contact"); setOpen(false); }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent text-sm transition-colors"
          >
            💡 Feature Request
          </button>
          <button
            onClick={() => { navigate("/privacy"); setOpen(false); }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent text-sm transition-colors"
          >
            🔒 Privacy Policy
          </button>
          <button
            onClick={() => { navigate("/terms"); setOpen(false); }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent text-sm transition-colors"
          >
            📄 Terms of Service
          </button>
        </div>
      )}
    </>
  );
}
