import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import {
  Activity,
  ArrowLeft,
  RotateCcw,
  Play,
  Pause,
  Download,
  ExternalLink,
  Sparkles,
  Info,
  CheckCircle,
  HelpCircle,
  Check,
  X,
  Gauge,
  Sliders,
  Maximize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PendulumLabPage() {
  // Physical parameters
  const [gravity, setGravity] = useState<number>(9.81);
  const [lengthMeters, setLengthMeters] = useState<number>(1.5);
  const [massKg, setMassKg] = useState<number>(1.0);
  const [damping, setDamping] = useState<number>(0.0);

  // Simulation controls
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [timeScale, setTimeScale] = useState<number>(1.0);
  const [showVectors, setShowVectors] = useState<boolean>(true);
  const [showTrace, setShowTrace] = useState<boolean>(true);

  // Telemetry state for display
  const [telemetry, setTelemetry] = useState({
    period: 2.46,
    frequency: 0.41,
    angleDeg: 25.0,
    velocity: 0.0,
    height: 0.14,
    ke: 0.0,
    pe: 1.35,
    te: 1.35,
  });

  // Quiz state for Grade 10 learning
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showQuizResults, setShowQuizResults] = useState(false);

  // References for canvas and animation
  const simCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const graphCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Physics dynamic state in refs to prevent closure staleness in animation frames
  const physicsRef = useRef({
    theta: 25 * (Math.PI / 180),
    omega: 0.0,
    isDragging: false,
    historyKE: new Array(240).fill(0),
    historyPE: new Array(240).fill(0),
    historyTE: new Array(240).fill(0),
    pathTrail: [] as { x: number; y: number }[],
    lastTime: performance.now(),
  });

  // Keep param refs synced
  const paramsRef = useRef({
    gravity,
    lengthMeters,
    massKg,
    damping,
    isPaused,
    timeScale,
    showVectors,
    showTrace,
  });

  useEffect(() => {
    paramsRef.current = {
      gravity,
      lengthMeters,
      massKg,
      damping,
      isPaused,
      timeScale,
      showVectors,
      showTrace,
    };
  }, [gravity, lengthMeters, massKg, damping, isPaused, timeScale, showVectors, showTrace]);

  // Main Canvas Animation and Physics Loop
  useEffect(() => {
    let animId: number;

    const simCanvas = simCanvasRef.current;
    const graphCanvas = graphCanvasRef.current;
    if (!simCanvas || !graphCanvas) return;

    const ctx = simCanvas.getContext("2d");
    const graphCtx = graphCanvas.getContext("2d");
    if (!ctx || !graphCtx) return;

    function resize() {
      if (!simCanvas || !graphCanvas) return;
      const dpr = window.devicePixelRatio || 1;
      const simRect = simCanvas.parentElement?.getBoundingClientRect();
      const graphRect = graphCanvas.parentElement?.getBoundingClientRect();

      if (simRect) {
        simCanvas.width = simRect.width * dpr;
        simCanvas.height = simRect.height * dpr;
        ctx?.scale(dpr, dpr);
      }
      if (graphRect) {
        graphCanvas.width = graphRect.width * dpr;
        graphCanvas.height = graphRect.height * dpr;
        graphCtx?.scale(dpr, dpr);
      }
    }

    resize();
    window.addEventListener("resize", resize);

    function loop(currentTime: number) {
      animId = requestAnimationFrame(loop);
      const p = physicsRef.current;
      const cfg = paramsRef.current;

      let dt = (currentTime - p.lastTime) / 1000;
      p.lastTime = currentTime;
      if (dt > 0.1) dt = 0.1;

      // Integrate Physics using 4th Order Runge-Kutta
      if (!cfg.isPaused && !p.isDragging) {
        const steps = 4;
        const subDt = (dt * cfg.timeScale) / steps;
        for (let i = 0; i < steps; i++) {
          const g = cfg.gravity;
          const L = cfg.lengthMeters;
          const m = cfg.massKg;
          const b = cfg.damping;

          const f = (th: number, om: number) => ({
            dTh: om,
            dOm: -(g / L) * Math.sin(th) - (b / m) * om,
          });

          const k1 = f(p.theta, p.omega);
          const k2 = f(p.theta + 0.5 * subDt * k1.dTh, p.omega + 0.5 * subDt * k1.dOm);
          const k3 = f(p.theta + 0.5 * subDt * k2.dTh, p.omega + 0.5 * subDt * k2.dOm);
          const k4 = f(p.theta + subDt * k3.dTh, p.omega + subDt * k3.dOm);

          p.theta += (subDt / 6) * (k1.dTh + 2 * k2.dTh + 2 * k3.dTh + k4.dTh);
          p.omega += (subDt / 6) * (k1.dOm + 2 * k2.dOm + 2 * k3.dOm + k4.dOm);
        }
      }

      // Compute physical quantities
      const L = cfg.lengthMeters;
      const g = cfg.gravity;
      const m = cfg.massKg;

      const linearV = p.omega * L;
      const height = L * (1 - Math.cos(p.theta));
      const pe = m * g * height;
      const ke = 0.5 * m * (linearV * linearV);
      const te = pe + ke;
      const T = 2 * Math.PI * Math.sqrt(L / g);
      const freq = 1 / T;

      // Update waveform histories
      if (!cfg.isPaused) {
        p.historyKE.shift();
        p.historyKE.push(ke);
        p.historyPE.shift();
        p.historyPE.push(pe);
        p.historyTE.shift();
        p.historyTE.push(te);
      }

      // Update display telemetry periodically
      if (Math.random() < 0.25) {
        setTelemetry({
          period: Number(T.toFixed(2)),
          frequency: Number(freq.toFixed(2)),
          angleDeg: Number((p.theta * (180 / Math.PI)).toFixed(1)),
          velocity: Number(Math.abs(linearV).toFixed(2)),
          height: Number(height.toFixed(3)),
          ke: Number(ke.toFixed(2)),
          pe: Number(pe.toFixed(2)),
          te: Number(te.toFixed(2)),
        });
      }

      // 1. Draw Pendulum Rig Canvas
      const simRect = simCanvas?.getBoundingClientRect();
      if (simRect && ctx) {
        ctx.clearRect(0, 0, simRect.width, simRect.height);

        const pivotX = simRect.width / 2;
        const pivotY = 40;
        const ppm = (simRect.height - 90) / 3.0; // scale pixels per meter
        const bobRadius = 14 + m * 2.5;

        const bobX = pivotX + Math.sin(p.theta) * L * ppm;
        const bobY = pivotY + Math.cos(p.theta) * L * ppm;

        // Path trail
        if (cfg.showTrace && !p.isDragging) {
          p.pathTrail.push({ x: bobX, y: bobY });
          if (p.pathTrail.length > 35) p.pathTrail.shift();

          if (p.pathTrail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(p.pathTrail[0].x, p.pathTrail[0].y);
            for (let i = 1; i < p.pathTrail.length; i++) {
              ctx.lineTo(p.pathTrail[i].x, p.pathTrail[i].y);
            }
            ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }

        // Center reference line
        ctx.beginPath();
        ctx.moveTo(pivotX, pivotY);
        ctx.lineTo(pivotX, pivotY + L * ppm);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Angle arc
        ctx.beginPath();
        ctx.arc(pivotX, pivotY, 40, Math.PI / 2, Math.PI / 2 + p.theta, p.theta < 0);
        ctx.strokeStyle = "rgba(245, 158, 11, 0.6)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Pendulum string
        ctx.beginPath();
        ctx.moveTo(pivotX, pivotY);
        ctx.lineTo(bobX, bobY);
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 3;
        ctx.stroke();

        // Top Pivot Mount
        ctx.fillStyle = "#334155";
        ctx.fillRect(pivotX - 35, pivotY - 12, 70, 10);
        ctx.beginPath();
        ctx.arc(pivotX, pivotY, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#f8fafc";
        ctx.fill();

        // Bob Glow & Circle
        const glow = ctx.createRadialGradient(bobX - 4, bobY - 4, 2, bobX, bobY, bobRadius + 10);
        glow.addColorStop(0, "#7dd3fc");
        glow.addColorStop(0.7, "#0284c7");
        glow.addColorStop(1, "rgba(2, 132, 199, 0)");

        ctx.beginPath();
        ctx.arc(bobX, bobY, bobRadius + 10, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(bobX, bobY, bobRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#38bdf8";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Vectors
        if (cfg.showVectors) {
          // Tangent Velocity Vector (Cyan)
          const vScale = 25;
          const vx = -Math.cos(p.theta) * linearV * vScale;
          const vy = Math.sin(p.theta) * linearV * vScale;
          drawArrow(ctx, bobX, bobY, bobX + vx, bobY + vy, "#38bdf8", "v");

          // Restoring Force Vector (Rose)
          const fScale = 15;
          const restoringF = -m * g * Math.sin(p.theta);
          const fx = -Math.cos(p.theta) * restoringF * fScale;
          const fy = Math.sin(p.theta) * restoringF * fScale;
          drawArrow(ctx, bobX, bobY, bobX + fx, bobY + fy, "#f43f5e", "F_net");
        }
      }

      // 2. Draw Energy Graph Canvas
      const gRect = graphCanvas?.getBoundingClientRect();
      if (gRect && graphCtx) {
        const w = gRect.width;
        const h = gRect.height;
        graphCtx.clearRect(0, 0, w, h);

        // Grid lines
        graphCtx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        graphCtx.lineWidth = 1;
        for (let y = 0; y < h; y += 30) {
          graphCtx.beginPath();
          graphCtx.moveTo(0, y);
          graphCtx.lineTo(w, y);
          graphCtx.stroke();
        }

        const padding = 14;
        const plotH = h - padding * 2;
        const len = p.historyKE.length;
        const stepX = w / (len - 1);
        const maxE = Math.max(0.2, te * 1.15);
        const scaleY = plotH / maxE;

        const drawPlot = (data: number[], color: string, width: number, dashed: boolean) => {
          graphCtx.beginPath();
          for (let i = 0; i < data.length; i++) {
            const x = i * stepX;
            const y = h - padding - data[i] * scaleY;
            if (i === 0) graphCtx.moveTo(x, y);
            else graphCtx.lineTo(x, y);
          }
          graphCtx.strokeStyle = color;
          graphCtx.lineWidth = width;
          if (dashed) graphCtx.setLineDash([4, 4]);
          else graphCtx.setLineDash([]);
          graphCtx.stroke();
          graphCtx.setLineDash([]);
        };

        // Plot Total Mechanical Energy (Green dashed)
        drawPlot(p.historyTE, "#10b981", 2, true);

        // Plot Potential Energy (Blue)
        drawPlot(p.historyPE, "#38bdf8", 2.5, false);

        // Plot Kinetic Energy (Rose)
        drawPlot(p.historyKE, "#f43f5e", 2.5, false);
      }
    }

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Helper to draw vector arrows
  function drawArrow(
    c: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string,
    label: string
  ) {
    const headlen = 8;
    const dx = toX - fromX;
    const dy = toY - fromY;
    if (Math.hypot(dx, dy) < 4) return;
    const angle = Math.atan2(dy, dx);

    c.beginPath();
    c.moveTo(fromX, fromY);
    c.lineTo(toX, toY);
    c.strokeStyle = color;
    c.lineWidth = 2.5;
    c.stroke();

    c.beginPath();
    c.moveTo(toX, toY);
    c.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
    c.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
    c.closePath();
    c.fillStyle = color;
    c.fill();

    c.font = "bold 10px monospace";
    c.fillStyle = color;
    c.fillText(label, toX + 6, toY - 6);
  }

  // Pointer Handlers for Interactive Drag & Drop
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = simCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const pivotX = rect.width / 2;
    const pivotY = 40;
    const ppm = (rect.height - 90) / 3.0;
    const p = physicsRef.current;
    const L = paramsRef.current.lengthMeters;

    const bobX = pivotX + Math.sin(p.theta) * L * ppm;
    const bobY = pivotY + Math.cos(p.theta) * L * ppm;
    const dist = Math.hypot(px - bobX, py - bobY);

    if (dist < 35) {
      p.isDragging = true;
      p.omega = 0.0;
      p.pathTrail = [];
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = physicsRef.current;
    if (!p.isDragging) return;
    const canvas = simCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const pivotX = rect.width / 2;
    const pivotY = 40;
    const dx = px - pivotX;
    const dy = py - pivotY;

    let newTh = Math.atan2(dx, Math.max(10, dy));
    newTh = Math.max(-80 * Math.PI / 180, Math.min(80 * Math.PI / 180, newTh));
    p.theta = newTh;
    p.omega = 0.0;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = physicsRef.current;
    if (p.isDragging) {
      p.isDragging = false;
      p.omega = 0.0;
      p.lastTime = performance.now();
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Reset function
  const handleReset = () => {
    const p = physicsRef.current;
    p.theta = 25 * (Math.PI / 180);
    p.omega = 0.0;
    p.pathTrail = [];
    p.historyKE.fill(0);
    p.historyPE.fill(0);
    p.historyTE.fill(0);
    p.lastTime = performance.now();
    setIsPaused(false);
  };

  // Quiz Questions for Grade 10 Physics
  const quizQuestions = [
    {
      id: 1,
      question: "If you double the mass of the pendulum bob, what happens to its period of oscillation T?",
      options: [
        "The period doubles (2T)",
        "The period remains unchanged",
        "The period is cut in half (T/2)",
        "The period increases by √2"
      ],
      correctIndex: 1,
      explanation: "T = 2π√(L/g). Notice mass (m) does not appear anywhere in the period equation! For small angles, mass has zero effect on the period."
    },
    {
      id: 2,
      question: "At which point in the swing does the pendulum bob have maximum Kinetic Energy (Ek)?",
      options: [
        "At the highest point of the swing (maximum displacement)",
        "Halfway between top and bottom",
        "At the lowest point (equilibrium position)",
        "The kinetic energy is always zero"
      ],
      correctIndex: 2,
      explanation: "At the lowest point, potential energy is at its minimum (height h = 0), so by conservation of mechanical energy, all energy is converted to kinetic energy (maximum speed)."
    },
    {
      id: 3,
      question: "If this pendulum is transported from Earth (g = 9.81 m/s²) to the Moon (g = 1.62 m/s²), how does its period change?",
      options: [
        "The period increases (it swings slower)",
        "The period decreases (it swings faster)",
        "The period stays exactly the same",
        "The pendulum cannot swing without atmosphere"
      ],
      correctIndex: 0,
      explanation: "Since T = 2π√(L/g), a smaller gravitational acceleration g in the denominator makes T larger, meaning the pendulum takes more seconds per complete swing (swings slower)."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to="/lab-simulator"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> All STEM Labs
            </Link>
            <span className="text-slate-600">&bull;</span>
            <Badge variant="outline" className="text-amber-400 border-amber-500/30 bg-amber-500/10 text-[11px]">
              Grade 10 Physics
            </Badge>
            <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10 text-[11px]">
              Offline Zero-Dependency
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Activity className="w-7 h-7 text-sky-400" /> Simple Pendulum & Energy Conservation Lab
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
            Real-time interactive physical simulation demonstrating simple harmonic oscillation, gravity dependency, and continuous transformation between kinetic and potential energy.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => setIsPaused(!isPaused)}
            className={isPaused ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-sky-600 hover:bg-sky-500 text-white"}
            size="sm"
          >
            {isPaused ? <Play className="w-4 h-4 mr-1.5" /> : <Pause className="w-4 h-4 mr-1.5" />}
            {isPaused ? "Resume" : "Pause"}
          </Button>

          <Button
            onClick={() => setTimeScale(timeScale === 1.0 ? 0.5 : 1.0)}
            variant="outline"
            size="sm"
            className="text-xs border-slate-700 hover:border-slate-600"
          >
            {timeScale === 1.0 ? "Slow Mo (0.5x)" : "Normal (1x)"}
          </Button>

          <Button
            onClick={handleReset}
            variant="outline"
            size="sm"
            className="text-xs border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
          </Button>

          <a
            href="/pendulum-lab.html"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-sky-500/50 text-xs font-semibold text-sky-400 hover:text-white transition-all shadow-sm"
            title="Open pure single-file offline version"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Standalone HTML
          </a>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT 7 COLS: Simulation Canvas & Real-time Graph */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Simulation Viewport */}
          <Card className="bg-slate-900/60 border-slate-800 shadow-xl overflow-hidden backdrop-blur">
            <CardHeader className="py-3 px-4 border-b border-slate-800/80 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-sky-400" /> Interactive Oscillation Rig
              </CardTitle>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showVectors}
                    onChange={(e) => setShowVectors(e.target.checked)}
                    className="rounded accent-sky-400 cursor-pointer"
                  />
                  <span>Vectors (v, F)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showTrace}
                    onChange={(e) => setShowTrace(e.target.checked)}
                    className="rounded accent-sky-400 cursor-pointer"
                  />
                  <span>Path Trace</span>
                </label>
              </div>
            </CardHeader>
            <CardContent className="p-0 relative">
              <div className="relative w-full h-[360px] bg-gradient-to-b from-slate-950 via-[#0c1322] to-slate-950 overflow-hidden cursor-grab active:cursor-grabbing">
                <canvas
                  ref={simCanvasRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="w-full h-full block touch-none"
                />
                <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-700/60 text-[11px] text-sky-300 backdrop-blur pointer-events-none">
                  Drag and release the glowing cyan pendulum bob to adjust displacement angle &theta;
                </div>
              </div>

              {/* Real-time Telemetry Row */}
              <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-800 border-t border-slate-800 bg-slate-950/70 p-2.5">
                <div className="p-2 text-center">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Period (T)</span>
                  <span className="text-lg font-mono font-bold text-sky-400">{telemetry.period.toFixed(2)}s</span>
                </div>
                <div className="p-2 text-center">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Angle (&theta;)</span>
                  <span className="text-lg font-mono font-bold text-amber-400">{telemetry.angleDeg.toFixed(1)}&deg;</span>
                </div>
                <div className="p-2 text-center">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Velocity (v)</span>
                  <span className="text-lg font-mono font-bold text-slate-200">{telemetry.velocity.toFixed(2)} m/s</span>
                </div>
                <div className="p-2 text-center">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Height (&Delta;h)</span>
                  <span className="text-lg font-mono font-bold text-slate-200">{telemetry.height.toFixed(3)} m</span>
                </div>
                <div className="p-2 text-center col-span-2 sm:col-span-1">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Frequency (f)</span>
                  <span className="text-lg font-mono font-bold text-emerald-400">{telemetry.frequency.toFixed(2)} Hz</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Real-Time Waveform Graph */}
          <Card className="bg-slate-900/60 border-slate-800 shadow-xl overflow-hidden backdrop-blur">
            <CardHeader className="py-3 px-4 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Activity className="w-4 h-4 text-rose-400" /> Real-Time Energy Waveforms: Ek vs Ep vs Em
              </CardTitle>
              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5 font-medium text-rose-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> Kinetic (Ek)
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-sky-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block"></span> Potential (Ep)
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Total (Em)
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative w-full h-[200px] bg-slate-950">
                <canvas ref={graphCanvasRef} className="w-full h-full block" />
              </div>
            </CardContent>
          </Card>

        </div>

        {/* RIGHT 5 COLS: Controls, Sliders, Energy Gauges, & Grade 10 Concepts */}
        <div className="lg:col-span-5 space-y-6">

          {/* Energy Breakdown Gauges */}
          <Card className="bg-slate-900/60 border-slate-800 shadow-xl backdrop-blur">
            <CardHeader className="py-3 px-4 border-b border-slate-800/80">
              <CardTitle className="text-sm font-bold text-slate-200">
                Mechanical Energy Partition
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {/* Kinetic Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-rose-400 font-semibold">Kinetic Energy (Ek = &frac12;mv&sup2;)</span>
                  <span className="font-mono text-rose-400 font-bold">{telemetry.ke.toFixed(2)} J</span>
                </div>
                <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all duration-75"
                    style={{ width: `${Math.min(100, (telemetry.ke / Math.max(0.01, telemetry.te)) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Potential Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-sky-400 font-semibold">Potential Energy (Ep = mgh)</span>
                  <span className="font-mono text-sky-400 font-bold">{telemetry.pe.toFixed(2)} J</span>
                </div>
                <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-500 rounded-full transition-all duration-75"
                    style={{ width: `${Math.min(100, (telemetry.pe / Math.max(0.01, telemetry.te)) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Total Bar */}
              <div className="space-y-1 pt-1 border-t border-slate-800">
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-400 font-bold">Total Mechanical (Em = Ek + Ep)</span>
                  <span className="font-mono text-emerald-400 font-bold">{telemetry.te.toFixed(2)} J</span>
                </div>
                <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-full" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Adjustable Sliders */}
          <Card className="bg-slate-900/60 border-slate-800 shadow-xl backdrop-blur">
            <CardHeader className="py-3 px-4 border-b border-slate-800/80">
              <CardTitle className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" /> Physical Lab Controls & Sliders
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              
              {/* Slider 1: Gravity */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <label className="text-slate-300 font-semibold">Gravitational Acceleration (g)</label>
                  <span className="font-mono text-amber-400 font-bold">{gravity.toFixed(2)} m/s&sup2;</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="25.0"
                  step="0.1"
                  value={gravity}
                  onChange={(e) => setGravity(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex gap-1.5 flex-wrap pt-1">
                  {[
                    { label: "Moon (1.62)", val: 1.62 },
                    { label: "Mars (3.72)", val: 3.72 },
                    { label: "Earth (9.81)", val: 9.81 },
                    { label: "Jupiter (24.79)", val: 24.79 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setGravity(preset.val)}
                      className={`text-[10px] px-2 py-0.5 rounded font-mono transition-all ${
                        Math.abs(gravity - preset.val) < 0.1
                          ? "bg-amber-500 text-slate-950 font-bold"
                          : "bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slider 2: String Length */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <label className="text-slate-300 font-semibold">String Length (L)</label>
                  <span className="font-mono text-sky-400 font-bold">{lengthMeters.toFixed(2)} m</span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="3.0"
                  step="0.05"
                  value={lengthMeters}
                  onChange={(e) => setLengthMeters(parseFloat(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500">
                  Changing length alters the period: T &prop; &radic;L.
                </p>
              </div>

              {/* Slider 3: Bob Mass */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <label className="text-slate-300 font-semibold">Bob Mass (m)</label>
                  <span className="font-mono text-purple-400 font-bold">{massKg.toFixed(2)} kg</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="5.0"
                  step="0.1"
                  value={massKg}
                  onChange={(e) => setMassKg(parseFloat(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500">
                  Changing mass scales kinetic/potential energy, but period T remains unchanged!
                </p>
              </div>

              {/* Slider 4: Damping / Air Resistance */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <label className="text-slate-300 font-semibold">Air Drag Coefficient (b)</label>
                  <span className="font-mono text-slate-400 font-bold">
                    {damping === 0 ? "0.00 (Vacuum)" : damping.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.3"
                  step="0.01"
                  value={damping}
                  onChange={(e) => setDamping(parseFloat(e.target.value))}
                  className="w-full accent-slate-500 cursor-pointer"
                />
              </div>

            </CardContent>
          </Card>

          {/* Grade 10 Physics Theory Notes */}
          <Card className="bg-slate-900/60 border-slate-800 shadow-xl backdrop-blur">
            <CardHeader className="py-3 px-4 border-b border-slate-800/80">
              <CardTitle className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-400" /> Grade 10 Physical Science Alignment
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs text-slate-300 leading-relaxed">
              <p>
                <strong>1. Law of Conservation of Energy:</strong> Mechanical energy cannot be created or destroyed, only transformed between potential (<code className="text-sky-400">Ep = mgh</code>) and kinetic (<code className="text-rose-400">Ek = &frac12;mv&sup2;</code>).
              </p>
              <p>
                <strong>2. Simple Harmonic Motion (SHM):</strong> For small angles (&theta; &lt; 15&deg;), the restoring force is proportional to displacement: <code className="text-amber-400">F_net = -mg sin(&theta;) &asymp; -mg(x/L)</code>.
              </p>
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 font-mono text-[11px] text-amber-300">
                Formula: T = 2&pi; &radic;(L / g)
              </div>
            </CardContent>
          </Card>

        </div>

      </div>

      {/* Grade 10 Knowledge Check Quiz */}
      <Card className="bg-slate-900/60 border-slate-800 shadow-xl backdrop-blur">
        <CardHeader className="py-3 px-4 border-b border-slate-800/80 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-purple-400" /> Grade 10 Concept Mastery Challenge
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowQuizResults(!showQuizResults)}
            className="text-xs border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
          >
            {showQuizResults ? "Hide Answers" : "Check Answers"}
          </Button>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {quizQuestions.map((q) => {
            const userChoice = selectedAnswers[q.id];
            const isAnswered = userChoice !== undefined;
            const isCorrect = userChoice === q.correctIndex;

            return (
              <div key={q.id} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-wider block mb-1">
                    Question {q.id}
                  </span>
                  <p className="text-xs font-semibold text-slate-200">{q.question}</p>
                  <div className="space-y-1.5 mt-2.5">
                    {q.options.map((opt, optIdx) => (
                      <button
                        key={optIdx}
                        onClick={() => setSelectedAnswers({ ...selectedAnswers, [q.id]: optIdx })}
                        className={`w-full text-left p-2 rounded-lg text-[11px] transition-all flex items-center justify-between ${
                          userChoice === optIdx
                            ? "bg-purple-500/20 border border-purple-500/50 text-white font-medium"
                            : "bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400"
                        }`}
                      >
                        <span>{opt}</span>
                        {showQuizResults && optIdx === q.correctIndex && (
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />
                        )}
                        {showQuizResults && userChoice === optIdx && optIdx !== q.correctIndex && (
                          <X className="w-3.5 h-3.5 text-rose-400 shrink-0 ml-1" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {showQuizResults && (
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-400 leading-normal">
                    <strong className={isCorrect ? "text-emerald-400" : "text-amber-400"}>
                      {isCorrect ? "Correct! " : "Review: "}
                    </strong>
                    {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

    </div>
  );
}
