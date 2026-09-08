/**
 * LUQI AI — Vocational & Technical Academy
 * =========================================
 * TVET-style trade upskilling: real logic-gate simulator (live boolean
 * computation), trade tracks with competency checkpoints, and IndexedDB
 * persistence so progress survives zero-data. No pretend 3D — real logic.
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loadLocalState, saveLocalState } from "@/lib/localDb";
import {
  Zap,
  Cpu,
  Wrench,
  Droplets,
  Flame,
  Code2,
  CheckCircle2,
  Clock,
  Award,
  BookOpen,
  ToggleLeft,
  ToggleRight,
  Target,
  GraduationCap,
  Info,
  RotateCcw,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────── */
/* LOGIC LAB — real boolean computation                                  */
/* ──────────────────────────────────────────────────────────────────── */

type GateType = "AND" | "OR" | "XOR" | "NAND" | "NOR" | "NOT";

const GATES: Record<GateType, { label: string; eval: (a: boolean, b: boolean) => boolean; desc: string }> = {
  AND: { label: "AND", eval: (a, b) => a && b, desc: "Output is ON only when BOTH inputs are ON" },
  OR: { label: "OR", eval: (a, b) => a || b, desc: "Output is ON when AT LEAST ONE input is ON" },
  XOR: { label: "XOR", eval: (a, b) => a !== b, desc: "Output is ON when inputs DIFFER" },
  NAND: { label: "NAND", eval: (a, b) => !(a && b), desc: "Output is OFF only when BOTH inputs are ON (universal gate)" },
  NOR: { label: "NOR", eval: (a, b) => !(a || b), desc: "Output is ON only when BOTH inputs are OFF" },
  NOT: { label: "NOT", eval: (a) => !a, desc: "Inverts the single input — ON becomes OFF, OFF becomes ON" },
};

const SINGLE_INPUT: GateType[] = ["NOT"];

interface Challenge {
  id: string;
  prompt: string;
  a: boolean;
  b: boolean;
  target: boolean;
  answer: GateType;
  hint: string;
}

const CHALLENGES: Challenge[] = [
  { id: "CH-1", prompt: "A greenhouse pump must run only when the tank has water AND the sun is up.", a: true, b: true, target: true, answer: "AND", hint: "Both conditions must be true together." },
  { id: "CH-2", prompt: "A borehole alarm should sound when EITHER the pressure drops OR the float switch trips.", a: true, b: false, target: true, answer: "OR", hint: "Any one condition is enough." },
  { id: "CH-3", prompt: "A stairway light toggles when the two switches DISAGREE.", a: true, b: false, target: true, answer: "XOR", hint: "Different positions = light on." },
  { id: "CH-4", prompt: "A safety cut-off must turn OFF only when temperature AND pressure are both high.", a: true, b: true, target: false, answer: "NAND", hint: "The output is the opposite of AND." },
  { id: "CH-5", prompt: "A backup generator starts only when grid power AND solar are BOTH absent.", a: false, b: false, target: true, answer: "NOR", hint: "Output ON requires both OFF." },
];

function LogicLab() {
  const [gate, setGate] = useState<GateType>("AND");
  const [inputA, setInputA] = useState(true);
  const [inputB, setInputB] = useState(false);
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [challengeGate, setChallengeGate] = useState<GateType | null>(null);
  const [solved, setSolved] = useState<Record<string, boolean>>({});

  const single = SINGLE_INPUT.includes(gate);
  const output = useMemo(() => GATES[gate].eval(inputA, inputB), [gate, inputA, inputB]);
  const challenge = CHALLENGES[challengeIdx];
  const challengeOutput = challengeGate ? GATES[challengeGate].eval(challenge.a, challenge.b) : null;
  const challengeSolved = challengeOutput !== null && challengeOutput === challenge.target && challengeGate === challenge.answer;

  const truthRows: [boolean, boolean][] = single ? [[true, true], [false, false]] : [[true, true], [true, false], [false, true], [false, false]];

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Playground */}
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Cpu className="h-5 w-5 text-cyan-400" /> Logic Gate Playground
            </CardTitle>
            <CardDescription>Real boolean computation — toggle inputs, watch the output</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={gate} onValueChange={(v) => setGate(v as GateType)}>
              <SelectTrigger className="bg-neutral-800 border-neutral-700"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-neutral-900 border-neutral-700">
                {(Object.keys(GATES) as GateType[]).map((g) => (
                  <SelectItem key={g} value={g}>{g} — {GATES[g].desc}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center justify-center gap-6 py-4">
              <button
                onClick={() => setInputA(!inputA)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${inputA ? "bg-cyan-500/20 border-cyan-500" : "bg-neutral-800 border-neutral-700"}`}
              >
                {inputA ? <ToggleRight className="h-8 w-8 text-cyan-400" /> : <ToggleLeft className="h-8 w-8 text-neutral-500" />}
                <span className="text-xs text-neutral-300">Input A: {inputA ? "ON" : "OFF"}</span>
              </button>
              {!single && (
                <button
                  onClick={() => setInputB(!inputB)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${inputB ? "bg-cyan-500/20 border-cyan-500" : "bg-neutral-800 border-neutral-700"}`}
                >
                  {inputB ? <ToggleRight className="h-8 w-8 text-cyan-400" /> : <ToggleLeft className="h-8 w-8 text-neutral-500" />}
                  <span className="text-xs text-neutral-300">Input B: {inputB ? "ON" : "OFF"}</span>
                </button>
              )}
              <div className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${output ? "bg-emerald-500/20 border-emerald-500" : "bg-neutral-800 border-neutral-700"}`}>
                <div className={`w-8 h-8 rounded-full ${output ? "bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.7)]" : "bg-neutral-600"}`} />
                <span className="text-xs text-neutral-300">Output: {output ? "ON" : "OFF"}</span>
              </div>
            </div>

            {/* Truth table */}
            <div className="rounded-lg overflow-hidden border border-neutral-800">
              <table className="w-full text-sm">
                <thead className="bg-neutral-800">
                  <tr>
                    <th className="py-2 px-3 text-left text-neutral-400">A</th>
                    {!single && <th className="py-2 px-3 text-left text-neutral-400">B</th>}
                    <th className="py-2 px-3 text-left text-neutral-400">Output</th>
                  </tr>
                </thead>
                <tbody>
                  {truthRows.map(([a, b], i) => {
                    const out = GATES[gate].eval(a, b);
                    const isCurrent = a === inputA && (single || b === inputB);
                    return (
                      <tr key={i} className={`border-t border-neutral-800 ${isCurrent ? "bg-cyan-500/10" : ""}`}>
                        <td className="py-2 px-3 text-white">{a ? "1" : "0"}</td>
                        {!single && <td className="py-2 px-3 text-white">{b ? "1" : "0"}</td>}
                        <td className={`py-2 px-3 font-bold ${out ? "text-emerald-400" : "text-neutral-500"}`}>{out ? "1" : "0"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Circuit Challenges */}
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Target className="h-5 w-5 text-amber-400" /> Circuit Challenges
            </CardTitle>
            <CardDescription>Pick the gate that makes the scenario work — real trade reasoning</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Select value={String(challengeIdx)} onValueChange={(v) => { setChallengeIdx(Number(v)); setChallengeGate(null); }}>
                <SelectTrigger className="bg-neutral-800 border-neutral-700 flex-1"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-neutral-900 border-neutral-700">
                  {CHALLENGES.map((c, i) => (
                    <SelectItem key={c.id} value={String(i)}>
                      {c.id} {solved[c.id] ? "✓ " : ""}— Challenge {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30 ml-2">
                {Object.keys(solved).length}/{CHALLENGES.length} solved
              </Badge>
            </div>

            <div className="bg-neutral-800 rounded-lg p-4">
              <p className="text-sm text-neutral-200">{challenge.prompt}</p>
              <p className="text-xs text-neutral-500 mt-2">Inputs: A={challenge.a ? "ON" : "OFF"}, B={challenge.b ? "ON" : "OFF"} → required output: <span className="text-amber-400 font-bold">{challenge.target ? "ON" : "OFF"}</span></p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(GATES) as GateType[]).map((g) => (
                <Button
                  key={g}
                  variant="outline"
                  onClick={() => setChallengeGate(g)}
                  className={challengeGate === g ? "border-cyan-500 bg-cyan-500/10 text-cyan-400" : "border-neutral-700"}
                >
                  {g}
                </Button>
              ))}
            </div>

            {challengeGate && (
              <div className={`rounded-lg p-4 text-center ${challengeOutput === challenge.target && challengeGate === challenge.answer ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
                <p className="text-sm">Your gate outputs: <span className="font-bold">{challengeOutput ? "ON" : "OFF"}</span> (required: <span className="font-bold">{challenge.target ? "ON" : "OFF"}</span>)</p>
                {challengeSolved ? (
                  <div className="mt-2">
                    <p className="text-emerald-400 font-bold">Correct — challenge solved!</p>
                    <Button size="sm" className="mt-2 bg-emerald-600 hover:bg-emerald-500" onClick={() => {
                      setSolved((prev) => ({ ...prev, [challenge.id]: true }));
                      if (challengeIdx < CHALLENGES.length - 1) { setChallengeIdx(challengeIdx + 1); setChallengeGate(null); }
                    }}>
                      Next Challenge
                    </Button>
                  </div>
                ) : (
                  <p className="text-red-400 text-sm mt-1">Not quite — {challenge.hint}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-neutral-900 border-neutral-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-neutral-400">
              These gates are the exact logic inside every electrical control panel, PLC, and microcontroller you will meet in trade work. NAND and NOR are called "universal gates" because any circuit can be built from just one of them.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/* TRADE TRACKS — competency checkpoints, persisted locally              */
/* ──────────────────────────────────────────────────────────────────── */

interface TrackModule {
  id: string;
  title: string;
  hours: number;
  checkpoints: string[];
}

interface TradeTrack {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  description: string;
  saqci_note: string;
  modules: TrackModule[];
}

const TRACKS: TradeTrack[] = [
  {
    id: "TRK-ELEC",
    name: "Electrical Installation",
    icon: Zap,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
    description: "Domestic wiring, distribution boards, fault finding, and safety testing for residential work.",
    saqci_note: "Aligns with TVET Electrical Installation N1–N3 and EW-IRE registration pathways in SA.",
    modules: [
      { id: "EL-1", title: "Safety, PPE & Isolation Procedures", hours: 8, checkpoints: ["Lockout/tagout demonstrated", "Prove dead before touch — every time", "RCD operation explained"] },
      { id: "EL-2", title: "Circuits, Voltage, Current & Ohm's Law", hours: 10, checkpoints: ["V=IR applied to real loads", "Series vs parallel measured", "Logic gates recognised in control panels"] },
      { id: "EL-3", title: "Wiring Systems & Containment", hours: 12, checkpoints: ["Cable sizing for 20A/32A circuits", "Conduit and trunking installed to code", "Earthing continuity tested"] },
      { id: "EL-4", title: "Fault Finding & Certification", hours: 10, checkpoints: ["Insulation resistance test performed", "Fault loop impedance understood", "Test certificate completed correctly"] },
    ],
  },
  {
    id: "TRK-PLUMB",
    name: "Plumbing & Water Systems",
    icon: Droplets,
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    description: "Water supply, drainage, tank systems, and leak diagnostics for domestic and rural installations.",
    saqci_note: "Aligns with TVET Plumbing N1–N3 and municipal water bylaws in SA.",
    modules: [
      { id: "PL-1", title: "Water Supply Principles & Pressure", hours: 8, checkpoints: ["Head pressure calculated", "Backflow prevention explained", "Mains vs tank feed compared"] },
      { id: "PL-2", title: "Pipework, Joints & Materials", hours: 12, checkpoints: ["Copper, PEX and HDPE jointed correctly", "Pressure test passed at 1.5x working", "Leak path traced methodically"] },
      { id: "PL-3", title: "Tanks, Pumps & Rain Harvesting", hours: 10, checkpoints: ["Tank sized for household demand", "Pump primed and non-return fitted", "First-flush diverter installed"] },
      { id: "PL-4", title: "Drainage & Sanitation", hours: 8, checkpoints: ["Falls and gradients set correctly", "Traps and vents explained", "Blockage cleared and prevented"] },
    ],
  },
  {
    id: "TRK-WELD",
    name: "Welding & Fabrication",
    icon: Flame,
    color: "text-orange-400",
    bgColor: "bg-orange-500/20",
    description: "MMA and MIG welding, metal preparation, joint design, and structural repair work.",
    saqci_note: "Aligns with TVET Welding N1–N3 and AWS/CSWIP awareness pathways.",
    modules: [
      { id: "WD-1", title: "Safety, Equipment & Arc Striking", hours: 6, checkpoints: ["PPE and fume control used", "Arc struck consistently", "Electrode angles correct"] },
      { id: "WD-2", title: "MMA (Stick) Welding — Flat Position", hours: 14, checkpoints: ["Bead profile consistent", "No undercut or slag inclusion", "Plate edge preparation done"] },
      { id: "WD-3", title: "MIG Welding & Joint Types", hours: 12, checkpoints: ["Wire feed and gas set correctly", "Butt, lap and fillet joints completed", "Distortion controlled"] },
      { id: "WD-4", title: "Cutting, Grinding & Repair Work", hours: 10, checkpoints: ["Oxy/plasma cut to line", "Crack repaired with root pass", "Work inspected and documented"] },
    ],
  },
  {
    id: "TRK-CODE",
    name: "Software & Automation Skills",
    icon: Code2,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20",
    description: "Practical coding for trades: automation scripts, PLC-style logic, and digital record keeping.",
    saqci_note: "Supports the digital components of modern TVET and Industry 4.0 readiness.",
    modules: [
      { id: "CD-1", title: "Logic, Gates & Boolean Thinking", hours: 6, checkpoints: ["Truth tables built from scenarios", "AND/OR/XOR applied to pump and alarm logic", "Logic Lab challenges completed"] },
      { id: "CD-2", title: "Scripts for the Workshop", hours: 10, checkpoints: ["A measurement log script written", "Spreadsheet-to-report automation done", "Error handling explained"] },
      { id: "CD-3", title: "Sensors, Data & Dashboards", hours: 10, checkpoints: ["Sensor reading interpreted", "Threshold alarm configured", "Dashboard built for a real metric"] },
      { id: "CD-4", title: "Digital Records & Certification", hours: 8, checkpoints: ["Work documented digitally", "Photo + measurement record kept", "Client handover pack produced"] },
    ],
  },
];

function TradeTracks() {
  const [track, setTrack] = useState<TradeTrack>(TRACKS[0]);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadLocalState<Record<string, boolean>>("vocational-progress").then((saved) => {
      if (saved) setDone(saved);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) saveLocalState("vocational-progress", done);
  }, [done, loaded]);

  const toggleCheckpoint = useCallback((key: string) => {
    setDone((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const totalCheckpoints = useMemo(() => TRACKS.reduce((acc, t) => acc + t.modules.reduce((a, m) => a + m.checkpoints.length, 0), 0), []);
  const doneCount = useMemo(() => Object.values(done).filter(Boolean).length, [done]);
  const trackDone = useMemo(() => track.modules.reduce((a, m) => a + m.checkpoints.filter((c) => done[`${m.id}:${c}`]).length, 0), [track, done]);
  const trackTotal = useMemo(() => track.modules.reduce((a, m) => a + m.checkpoints.length, 0), [track]);

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {TRACKS.map((t) => {
          const Icon = t.icon;
          const tDone = t.modules.reduce((a, m) => a + m.checkpoints.filter((c) => done[`${m.id}:${c}`]).length, 0);
          const tTotal = t.modules.reduce((a, m) => a + m.checkpoints.length, 0);
          return (
            <Card
              key={t.id}
              onClick={() => setTrack(t)}
              className={`cursor-pointer transition-all ${track.id === t.id ? "ring-2 ring-cyan-500 bg-neutral-900" : "bg-neutral-900 border-neutral-800 hover:border-neutral-700"}`}
            >
              <CardContent className="p-4">
                <div className={`w-10 h-10 rounded-xl ${t.bgColor} flex items-center justify-center mb-3`}>
                  <Icon className={`h-5 w-5 ${t.color}`} />
                </div>
                <p className="font-semibold text-white text-sm">{t.name}</p>
                <p className="text-xs text-neutral-500 mt-1">{tDone}/{tTotal} checkpoints</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-white">
                <track.icon className={`h-5 w-5 ${track.color}`} /> {track.name}
              </CardTitle>
              <CardDescription className="mt-1">{track.description}</CardDescription>
            </div>
            <Badge variant="outline" className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
              {trackDone}/{trackTotal} complete
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-neutral-500">{track.saqci_note}</p>
          {track.modules.map((m) => {
            const mDone = m.checkpoints.filter((c) => done[`${m.id}:${c}`]).length;
            return (
              <div key={m.id} className="bg-neutral-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-4 w-4 text-cyan-400" />
                    <p className="font-medium text-white">{m.title}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-neutral-700 text-neutral-400 text-xs">
                      <Clock className="h-3 w-3 mr-1" />{m.hours}h
                    </Badge>
                    <Badge variant="outline" className={mDone === m.checkpoints.length ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs" : "bg-neutral-700 text-neutral-400 text-xs"}>
                      {mDone}/{m.checkpoints.length}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  {m.checkpoints.map((cp) => {
                    const key = `${m.id}:${cp}`;
                    const checked = !!done[key];
                    return (
                      <button
                        key={key}
                        onClick={() => toggleCheckpoint(key)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors ${checked ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-neutral-900 border border-transparent hover:border-neutral-700"}`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${checked ? "bg-emerald-500 border-emerald-500" : "border-neutral-600"}`}>
                          {checked && <CheckCircle2 className="h-3 w-3 text-white" />}
                        </div>
                        <span className={`text-sm ${checked ? "text-emerald-300 line-through" : "text-neutral-300"}`}>{cp}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="bg-neutral-900 border-neutral-800">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-6 w-6 text-cyan-400" />
            <div>
              <p className="text-sm font-medium text-white">Total progress across all tracks</p>
              <p className="text-xs text-neutral-500">Saved on this device — works offline</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-cyan-400">{doneCount}<span className="text-sm text-neutral-500">/{totalCheckpoints}</span></span>
            {doneCount > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setDone({})} className="text-neutral-500 hover:text-red-400">
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/* MAIN PAGE                                                             */
/* ──────────────────────────────────────────────────────────────────── */

export default function VocationalPage() {
  const [tab, setTab] = useState("tracks");

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/20 rounded-xl">
              <Wrench className="h-8 w-8 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Vocational & Technical Academy</h1>
              <p className="text-neutral-400 text-sm">TVET-aligned trade skills — real logic, real checkpoints, works offline</p>
            </div>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList className="bg-neutral-900 border border-neutral-800 p-1">
            <TabsTrigger value="tracks" className="data-[state=active]:bg-neutral-800">
              <Award className="h-4 w-4 mr-2" /> Trade Tracks
            </TabsTrigger>
            <TabsTrigger value="logic" className="data-[state=active]:bg-neutral-800">
              <Cpu className="h-4 w-4 mr-2" /> Logic Lab
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tracks">
            <TradeTracks />
          </TabsContent>
          <TabsContent value="logic">
            <LogicLab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
