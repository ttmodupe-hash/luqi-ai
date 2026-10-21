import { useMemo, useState } from "react";
import { diagnoseSimpleLan, type NetworkNode } from "@/lib/academy/masteryEngine";
import { simulateDirectHostPing } from "@/lib/academy/packetJourney";

/** Interactive CCNA learning lab: simplified single-LAN model, not an IOS or packet emulator. */
export default function VisualNetworkingLab() {
  const [firstIp, setFirstIp] = useState("192.168.10.10");
  const [secondIp, setSecondIp] = useState("192.168.10.20");
  const [prefix, setPrefix] = useState(24);
  const [connected, setConnected] = useState(true);
  const [showExplanation, setShowExplanation] = useState(false);
  const [traceStep, setTraceStep] = useState(0);
  const [prediction, setPrediction] = useState<"yes" | "no" | "">("");
  const nodes: NetworkNode[] = useMemo(() => [
    { id: "pc1", name: "PC 1", ipv4: firstIp, maskBits: prefix },
    { id: "pc2", name: "PC 2", ipv4: secondIp, maskBits: prefix },
  ], [firstIp, secondIp, prefix]);
  const issues = diagnoseSimpleLan(nodes, connected ? [{ from: "pc1", to: "pc2" }] : [], "pc1", "pc2");
  const reachable = issues.length === 0;
  const journey = simulateDirectHostPing(nodes[0], nodes[1], connected);
  const predictionCorrect = prediction !== "" && (prediction === "yes") === reachable;
  return <section aria-label="CCNA visual networking practice" className="rounded-2xl border border-sky-500/30 bg-slate-900 p-5 space-y-4">
    <div><h2 className="text-xl font-bold text-white">CCNA Visual Lab: Why can't these PCs communicate?</h2><p className="text-sm text-slate-300">Change the network, predict the outcome, then reveal the explanation. This models one directly connected IPv4 LAN only—not a real packet capture or Cisco IOS emulator.</p></div>
    <svg viewBox="0 0 640 170" role="img" aria-label={connected ? "Two computers connected by an Ethernet link" : "Two computers with a disconnected Ethernet link"} className="w-full max-w-2xl rounded-lg bg-slate-950">
      <rect x="30" y="40" width="150" height="80" rx="10" fill="#164e63" stroke="#38bdf8" strokeWidth="2"/>
      <rect x="460" y="40" width="150" height="80" rx="10" fill="#164e63" stroke="#38bdf8" strokeWidth="2"/>
      <text x="105" y="73" textAnchor="middle" fill="white" fontSize="18">PC 1</text>
      <text x="105" y="97" textAnchor="middle" fill="white" fontSize="12">{firstIp}</text>
      <text x="535" y="73" textAnchor="middle" fill="white" fontSize="18">PC 2</text>
      <text x="535" y="97" textAnchor="middle" fill="white" fontSize="12">{secondIp}</text>
      {connected ? <line x1="180" y1="80" x2="460" y2="80" stroke="#34d399" strokeWidth="5"/> : <>
        <line x1="180" y1="80" x2="300" y2="80" stroke="#fb7185" strokeWidth="5"/>
        <line x1="340" y1="80" x2="460" y2="80" stroke="#fb7185" strokeWidth="5"/>
      </>}
      <text x="320" y="132" textAnchor="middle" fill="#cbd5e1" fontSize="14">{connected ? "Ethernet link connected" : "Ethernet link disconnected"}</text>
    </svg>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <label className="text-sm text-slate-200">PC 1 IPv4<input aria-label="PC 1 IPv4" value={firstIp} onChange={e => {setFirstIp(e.target.value);setShowExplanation(false);setPrediction("");setTraceStep(0);}} className="block mt-1 w-full rounded bg-slate-950 border border-slate-700 p-2"/></label>
      <label className="text-sm text-slate-200">PC 2 IPv4<input aria-label="PC 2 IPv4" value={secondIp} onChange={e => {setSecondIp(e.target.value);setShowExplanation(false);setPrediction("");}} className="block mt-1 w-full rounded bg-slate-950 border border-slate-700 p-2"/></label>
      <label className="text-sm text-slate-200">Subnet prefix
        <select value={prefix} onChange={e => {setPrefix(Number(e.target.value));setShowExplanation(false);setPrediction("");}} className="block mt-1 w-full rounded bg-slate-950 border border-slate-700 p-2">
          <option value={16}>/16</option><option value={24}>/24</option><option value={25}>/25</option><option value={26}>/26</option><option value={30}>/30</option>
        </select>
      </label>
    </div>
    <label className="flex items-center gap-2 text-sm text-slate-200"><input type="checkbox" checked={connected} onChange={e => {setConnected(e.target.checked);setShowExplanation(false);setPrediction("");}}/>Ethernet link connected</label>
    <div className="space-y-2"><p className="font-semibold text-white">Predict: Can PC 1 reach PC 2 in this simplified LAN?</p>
      <div className="flex gap-3"><button type="button" aria-pressed={prediction==="yes"} onClick={()=>{setPrediction("yes");setShowExplanation(false);}} className={`rounded-lg border px-4 py-2 ${prediction==="yes"?"border-sky-400 bg-sky-900":"border-slate-600"}`}>Yes</button><button type="button" aria-pressed={prediction==="no"} onClick={()=>{setPrediction("no");setShowExplanation(false);}} className={`rounded-lg border px-4 py-2 ${prediction==="no"?"border-sky-400 bg-sky-900":"border-slate-600"}`}>No</button></div>
      <button type="button" disabled={!prediction} onClick={()=>setShowExplanation(true)} className="rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white disabled:opacity-50">Check prediction and explain</button>
    </div>
    <div className="rounded-xl border border-indigo-500/30 bg-slate-950 p-4 space-y-3">
      <h3 className="font-semibold text-indigo-200">Visual packet journey: ARP → ICMP</h3>
      <p className="text-xs text-slate-400">Illustrative sequence for an empty ARP cache. Click Next to follow each step. No real packets are generated.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={()=>setTraceStep(0)} className="rounded border border-slate-600 px-3 py-2 text-xs">Restart</button>
        <button type="button" disabled={traceStep>=journey.length} onClick={()=>setTraceStep(s=>Math.min(s+1,journey.length))} className="rounded bg-indigo-600 px-3 py-2 text-xs text-white disabled:opacity-50">Next event</button>
        <span className="self-center text-xs text-slate-400">{traceStep} / {journey.length} events</span>
      </div>
      <ol className="space-y-2" aria-live="polite">
        {journey.slice(0,traceStep).map(event=><li key={event.step} className="rounded bg-slate-900 p-3 text-sm text-slate-200"><span className="font-semibold text-indigo-300">Step {event.step} · {event.actor} · {event.protocol}</span><p className="mt-1">{event.explanation}</p></li>)}
      </ol>
      {traceStep===0 && <p className="text-xs text-slate-400">Predict what happens first, then advance the trace.</p>}
    </div>
    {showExplanation && <div role="status" className="rounded-lg bg-slate-950 border border-slate-700 p-4 space-y-2">
      <p className={predictionCorrect?"text-emerald-300":"text-amber-300"}>{predictionCorrect?"Your prediction matches the model.":"Your prediction does not match the model. Try adjusting the topology."}</p>
      <p className="text-sm text-white">{reachable?"Both PCs have a connected path and their IPv4 addresses fall within the same configured subnet.":"Communication fails this simplified check because:"}</p>
      {issues.map(issue=><p key={issue} className="text-sm text-slate-300">• {issue}</p>)}
      <p className="text-xs text-slate-400">Reasoning challenge: explain what changes when you alter the prefix length. This exercise does not model ARP, switches, VLANs, gateways, routing, host-address restrictions or actual packets.</p>
    </div>}
  </section>;
}
