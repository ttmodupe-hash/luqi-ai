import { useState } from "react";
import { GraduationCap, Hammer, AlertTriangle } from "lucide-react";
import { trpc } from "@/providers/trpc";

type Trade = "electrician" | "fitter_and_turner" | "plumber" | "bricklayer" |
  "solar_technician" | "software_dev" | "data_analyst";

export default function VocationalSkillsPage() {
  const trades = trpc.omegaTrades.list.useQuery();
  const [trade, setTrade] = useState<Trade>("solar_technician");
  const [selected, setSelected] = useState<string[]>([]);
  const skills = trpc.omegaTrades.skills.useQuery({ trade });
  const gaps = trpc.omegaTrades.gap.useQuery({ trade, selectedSkills: selected });
  const toggle = (name: string) => {
    setSelected((previous) => previous.includes(name)
      ? previous.filter((value) => value !== name) : [...previous, name]);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-3">
          <div className="flex items-center gap-2 text-amber-300">
            <GraduationCap className="h-5 w-5" /> LUQI Vocational Academy
          </div>
          <h1 className="text-3xl font-bold">Explore your practical skills pathway</h1>
          <p className="max-w-3xl text-slate-300 text-sm leading-6">
            A self-reflection checklist for Southern African technical and digital trades,
            adapted from the OMEGA educational skills registry.
          </p>
          <p role="note" className="rounded-xl border border-amber-800 bg-amber-950/20 p-4 text-xs leading-5 text-amber-200">
            <AlertTriangle className="inline-block h-4 w-4 mr-2" />
            Checklist completion is not a certificate, verified competence or evidence of
            live hiring demand. A qualified TVET institution or assessor must verify practical work.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-5">
          <div className="space-y-2">
            <label htmlFor="trade" className="block text-sm font-semibold">Choose a learning pathway</label>
            <select id="trade" value={trade}
              onChange={(event) => { setTrade(event.target.value as Trade); setSelected([]); }}
              className="w-full max-w-lg rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm">
              {trades.data?.map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
              {!trades.data && <option value={trade}>{trade.replaceAll("_", " ")}</option>}
            </select>
          </div>
          <div>
            <h2 className="text-lg font-bold">{skills.data?.title || "Loading skills…"}</h2>
            <p className="mt-1 text-xs text-slate-400">
              Select only skills you believe you have learned. Independent practical assessment
              is still required.
            </p>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {skills.data?.skills.map((skill) => (
              <label key={skill}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-700 bg-slate-950/80 p-3 text-sm">
                <input type="checkbox" checked={selected.includes(skill)}
                  onChange={() => toggle(skill)}
                  className="accent-amber-500 h-4 w-4" />
                <span>{skill}</span>
              </label>
            ))}
          </div>
        </section>

        {gaps.data && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-5">
            <div className="flex items-center gap-3">
              <Hammer className="h-5 w-5 text-amber-300"/>
              <h2 className="text-xl font-bold">Your practice roadmap</h2>
            </div>
            <p className="text-sm text-slate-300">
              Self-reported checklist completion:
              <strong className="ml-2 text-amber-300">{gaps.data.checklistCompletionPercent}%</strong>
              {" "}({gaps.data.selfReportedSkills} of {gaps.data.requiredSkills} listed topics).
            </p>
            <div aria-hidden="true" className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-amber-500" style={{ width: `${gaps.data.checklistCompletionPercent}%` }} />
            </div>
            {gaps.data.practicePlan.length === 0 ? (
              <p className="text-sm text-slate-300">
                All listed topics selected. Ask an accredited assessor to evaluate practical
                evidence; a completed checklist does not establish competence.
              </p>
            ) : (
              <ol className="space-y-3">
                {gaps.data.practicePlan.map((item, i) => (
                  <li key={item.skill} className="rounded-xl border border-slate-700 p-4">
                    <p className="text-sm font-semibold">{i + 1}. {item.skill}</p>
                    <p className="mt-2 text-xs leading-6 text-slate-300">{item.exercise}</p>
                  </li>
                ))}
              </ol>
            )}
            <p className="text-xs text-slate-400 leading-5">{gaps.data.note}</p>
            <p className="text-xs text-slate-400">
              Source: <a href="https://github.com/ttmodupe-hash/omega-super-ai/blob/main/core/skill_engine.py"
                target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-300">
                OMEGA Super AI education registry
              </a>
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
