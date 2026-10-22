import React, { useState } from 'react';
import { Scale, BookOpen, CheckCircle, ShieldAlert, Sparkles, Send, ArrowRight } from 'lucide-react';

export default function KhoroLegalExplorer() {
  const [userQuery, setUserQuery] = useState('key concepts of south african criminal law : crw1501 can you asssit ?');
  const [loading, setLoading] = useState(false);
  const [chatBubble, setChatBubble] = useState<string>('');
  const [referenceBox, setReferenceBox] = useState<string[]>([]);
  const [legalConcepts, setLegalConcepts] = useState<string[]>([]);
  const [nextSteps, setNextSteps] = useState<string>('');
  const [disclaimer, setDisclaimer] = useState<string>('');

  const executeKhoroQuery = async (queryToRun?: string) => {
    const q = queryToRun || userQuery;
    if (!q.trim() || loading) return;

    setLoading(true);
    setChatBubble('');
    setReferenceBox([]);
    setLegalConcepts([]);
    setNextSteps('');
    setDisclaimer('');

    try {
      const res = await fetch('/api/khoro-legal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userQuery: q }),
      });

      const data = await res.json();
      const parsedData = typeof data.apiResponse === 'string' ? JSON.parse(data.apiResponse) : (data.data || data);

      // Distribute the content explicitly to UI state
      setChatBubble(parsedData.cultural_greeting + " " + parsedData.core_answer_summary);
      setReferenceBox(parsedData.statutory_or_case_references || []);
      setLegalConcepts(parsedData.key_legal_concepts || []);
      setNextSteps(parsedData.next_recommended_steps || '');
      setDisclaimer(parsedData.disclaimer || '');
    } catch (e: any) {
      setChatBubble("Eita! Khoro legal node encountered a temporary connectivity delay. Standby while the Kgotla reconnects.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Khoro Legal & Educational Concept Explorer
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                UNISA & RSA Law
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Structured criminal law (CRW1501), civil procedure, consumer protection & constitutional concepts.
            </p>
          </div>
        </div>
      </div>

      {/* Preset Quick Chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          "CRW1501: Four elements of criminal liability",
          "Dolus Eventualis vs Culpa (S v Burger / Chretien)",
          "Grounds of Justification (Private Defence / Necessity)",
          "Consumer Protection Act (CPA) s55 & s56 defective goods"
        ].map((chip) => (
          <button
            key={chip}
            onClick={() => {
              setUserQuery(chip);
              executeKhoroQuery(chip);
            }}
            className="text-[11px] px-3 py-1.5 rounded-full bg-slate-950 text-slate-300 border border-slate-800 hover:border-amber-500/50 hover:text-amber-300 transition"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Query Bar */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
          placeholder="Ask Khoro about CRW1501, South African law, case law citations, or consumer rights..."
          className="flex-1 bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-hidden focus:border-amber-500/50"
          onKeyDown={(e) => e.key === 'Enter' && executeKhoroQuery()}
        />
        <button
          onClick={() => executeKhoroQuery()}
          disabled={loading || !userQuery.trim()}
          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2 transition"
        >
          {loading ? (
            <span>Consulting...</span>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Explore</span>
            </>
          )}
        </button>
      </div>

      {/* Output Display */}
      {chatBubble && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Main Chat Bubble */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs leading-relaxed text-slate-200">
            <div className="text-[11px] font-semibold text-amber-400 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Khoro Knowledge Synthesizer
            </div>
            <p className="text-slate-300">{chatBubble}</p>
          </div>

          {/* Key Legal Concepts */}
          {legalConcepts.length > 0 && (
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
              <h4 className="text-xs font-bold text-slate-300 mb-2.5 flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                Fundamental Legal Concepts Breakdown
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {legalConcepts.map((concept, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-sky-400 font-bold">•</span>
                    <span>{concept}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Statutory & Case Law References Box */}
          {referenceBox.length > 0 && (
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
              <h4 className="text-xs font-bold text-slate-300 mb-2.5 flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                Authoritative Statutory & Case Law Precedents
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {referenceBox.map((ref, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-mono text-[11px]">
                    ⚖️ {ref}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Steps */}
          {nextSteps && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2.5">
              <ArrowRight className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <strong className="block text-amber-300">Recommended Study & Exam Action:</strong>
                {nextSteps}
              </div>
            </div>
          )}

          {/* Compliance Disclaimer */}
          {disclaimer && (
            <div className="p-3 rounded-xl bg-slate-950 border border-red-900/30 text-[11px] text-slate-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
              <span>{disclaimer}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
