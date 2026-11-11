import { Link } from 'react-router';
import { ArrowRight, BookOpen, Compass, MessageCircle, NotebookPen, ShieldCheck } from 'lucide-react';
import AiPilotPage from './AiPilotPage';
import { readCapabilityJourney } from '../lib/capability-journey';
import { getPossibilityPlan } from '../lib/possibility-engine';
import '../chat-workspace.css';

/** One companion entry, reusing the real signed-in and budget-gated AI chat.
 * Private notes remain separate and are never silently passed to a provider.
 * This is not a claim of durable AI memory, voice, or autonomous tool execution.
 */
export default function UnifiedCompanionPage() {
  const journey = readCapabilityJourney();
  const plan = journey ? getPossibilityPlan(journey.goal) : null;
  const nextStep = plan && journey
    ? plan.steps.find((_, index) => !journey.completed.includes(index))
    : null;

  return <main className="mx-auto max-w-6xl space-y-6 px-3 py-6 text-slate-100 sm:px-6">
    <header className="rounded-3xl border border-cyan-700/60 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-5 shadow-2xl sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[.19em] text-cyan-300">LUQI · Your AI Companion</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Think, learn and move forward together.</h1>
      <p className="mt-3 max-w-2xl text-slate-200">
        Have a real conversation through LUQI's existing limited, consent-based AI text trial.
        Your private notes and local journey are yours to control—not automatic AI memory.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link to="/companion/notes" className="inline-flex items-center gap-2 rounded-xl border border-slate-500 px-4 py-3 font-semibold text-white hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
          <NotebookPen size={18} aria-hidden="true" /> My private notes <ArrowRight size={16} aria-hidden="true" />
        </Link>
        <Link to="/journey" className="inline-flex items-center gap-2 rounded-xl border border-cyan-500 px-4 py-3 font-semibold text-cyan-100 hover:bg-cyan-900/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
          <Compass size={18} aria-hidden="true" /> My journey <ArrowRight size={16} aria-hidden="true" />
        </Link>
        <Link to="/chat?civic=1" className="inline-flex items-center gap-2 rounded-xl border border-slate-500 px-4 py-3 font-semibold text-white hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
          <BookOpen size={18} aria-hidden="true" /> Source-linked civic research
        </Link>
      </div>
    </header>

    {journey && plan && <section className="rounded-2xl border border-blue-700/60 bg-slate-900 p-4 sm:p-6" aria-label="Your saved capability journey">
      <div className="flex items-center gap-2 text-cyan-300"><Compass size={18} aria-hidden="true" /><h2 className="font-semibold">Your next step</h2></div>
      <p className="mt-2 break-words text-slate-200">Goal: {journey.goal}</p>
      <p className="mt-2 text-sm text-slate-300">{nextStep ? nextStep.title + ': ' + nextStep.detail : 'You marked all four stages complete on this device.'}</p>
      <p className="mt-2 text-xs text-slate-400">This goal is read only from this device and is not included in AI requests. You decide what to share.</p>
      <Link to="/journey" className="mt-3 inline-flex items-center gap-2 text-cyan-200 underline underline-offset-4">Open my journey <ArrowRight size={16} /></Link>
    </section>}

    <section className="rounded-2xl border border-slate-700 bg-slate-950 p-3 sm:p-5" aria-label="AI Companion conversation">
      <div className="mb-3 flex items-center gap-2">
        <MessageCircle size={19} className="text-cyan-300" aria-hidden="true" />
        <h2 className="text-xl font-semibold">Talk with LUQI</h2>
      </div>
      <p className="mb-4 text-sm text-slate-300">AI responses require a signed-in account, explicit provider-processing acknowledgement and available trial capacity. No message is sent until you choose to send it.</p>
      <AiPilotPage embedded workspaceMode />
    </section>
    <p className="flex items-start gap-2 rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-300">
      <ShieldCheck size={18} className="shrink-0 text-cyan-300" aria-hidden="true" />
      Long-term AI memory, automatic follow-ups, voice conversation, avatars and autonomous tool execution are not enabled by this entry page. Private notes can be reviewed and exported separately.
    </p>
  </main>;
}
