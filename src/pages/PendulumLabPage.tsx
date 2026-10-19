// =====================================================================
// PENDULUM LAB SIMULATOR — ADVANCED EXPERIENTIAL STEM LABORATORY
// Grade 10 to AP / University Classical & Chaotic Dynamics
// Modes: Simple Harmonic & Damped, Coupled Chaotic Double Pendulum, Driven Resonance
// Real-time RK4 Integrator, Dual Oscilloscope, Laser Photogates, Tension Gauge,
// Dr. Kwame AI Physics Copilot, and CSV Lab Report Export
// =====================================================================

import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import {
  Activity,
  ArrowLeft,
  RotateCcw,
  Play,
  Pause,
  Download,
  Sparkles,
  CheckCircle,
  HelpCircle,
  Gauge,
  Sliders,
  Maximize2,
  Volume2,
  VolumeX,
  Compass,
  Cpu,
  Brain,
  Send,
  RefreshCw,
  Table,
  Layers,
  ChevronRight,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type SimulationMode = "simple" | "double" | "driven";
type GraphMode = "energy" | "phase" | "waveform";

interface DataLogPoint {
  id: number;
  timeSec: number;
  thetaDeg: number;
  omegaRadS: number;
  keJoules: number;
  peJoules: number;
  totalJoules: number;
  tensionNewtons: number;
}

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
  c.lineTo(
    toX - headlen * Math.cos(angle - Math.PI / 6),
    toY - headlen * Math.sin(angle - Math.PI / 6)
  );
  c.lineTo(
    toX - headlen * Math.cos(angle + Math.PI / 6),
    toY - headlen * Math.sin(angle + Math.PI / 6)
  );
  c.closePath();
  c.fillStyle = color;
  c.fill();

  c.font = "bold 10px monospace";
  c.fillStyle = color;
  c.textAlign = "left";
  c.fillText(label, toX + 6, toY - 6);
}

export default function PendulumLabPage() {
  // Mode selection
  const [simMode, setSimMode] = useState<SimulationMode>("simple");
  const [graphMode, setGraphMode] = useState<GraphMode>("energy");

  // Physical parameters (Single / Simple)
  const [gravity, setGravity] = useState<number>(9.81);
  const [lengthMeters, setLengthMeters] = useState<number>(1.5);
  const [massKg, setMassKg] = useState<number>(1.0);
  const [damping, setDamping] = useState<number>(0.02);

  // Double Pendulum parameters
  const [length2Meters, setLength2Meters] = useState<number>(1.2);
  const [mass2Kg, setMass2Kg] = useState<number>(0.8);

  // Driven Resonance parameters
  const [drivingForce, setDrivingForce] = useState<number>(0.5);
  const [drivingFreq, setDrivingFreq] = useState<number>(2.5); // rad/s

  // Controls & options
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [timeScale, setTimeScale] = useState<number>(1.0);
  const [showVectors, setShowVectors] = useState<boolean>(true);
  const [showTrace, setShowTrace] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);

  // Planetary gravity presets
  const [activePreset, setActivePreset] = useState<string>("Earth");

  // Precision Photogate Telemetry
  const [photogate, setPhotogate] = useState({
    passes: 0,
    lastPeriod: 2.46,
    avgPeriod: 2.46,
    errorPercent: 0.12,
  });

  // Real-time telemetry readout
  const [telemetry, setTelemetry] = useState({
    periodTheoretical: 2.46,
    periodElliptic: 2.47,
    frequency: 0.41,
    angleDeg: 25.0,
    angle2Deg: 0.0,
    velocity: 0.0,
    height: 0.14,
    ke: 0.0,
    pe: 1.35,
    te: 1.35,
    tension: 9.81,
    peakTension: 11.2,
  });

  // Data Logger for Lab Reports
  const [dataLogs, setDataLogs] = useState<DataLogPoint[]>([]);

  // In-Lab AI Copilot (Dr. Kwame)
  const [copilotQuery, setCopilotQuery] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotMessages, setCopilotMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([
    {
      role: "assistant",
      content:
        "Greetings, scholar! I am **Dr. Kwame**, your STEM physics mentor. Ask me about mechanical energy conservation, large-angle elliptic corrections, tension forces, or chaotic Lagrangian double pendulum equations.",
    },
  ]);

  // Quiz state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showQuizResults, setShowQuizResults] = useState(false);

  // References for Canvas
  const simCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const graphCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Physics dynamic state in mutable ref (prevents closure lag)
  const physicsRef = useRef({
    theta: 25 * (Math.PI / 180),
    omega: 0.0,
    theta2: 45 * (Math.PI / 180),
    omega2: 0.0,
    isDragging: false,
    dragBobIndex: 1, // 1 for bob1, 2 for bob2
    historyKE: new Array(240).fill(0),
    historyPE: new Array(240).fill(0),
    historyTE: new Array(240).fill(0),
    historyPhase: [] as { theta: number; omega: number }[],
    historyWaveform: [] as { t: number; theta: number; omega: number }[],
    pathTrail: [] as { x: number; y: number }[],
    doubleTrail: [] as { x: number; y: number; color?: string }[],
    lastTime: 0,
    elapsedSimTime: 0,
    lastZeroCrossTime: 0,
    halfPeriodPasses: 0,
    peakTensionRecorded: 9.81,
    photogatePeriods: [] as number[],
  });

  const paramsRef = useRef({
    simMode,
    gravity,
    lengthMeters,
    massKg,
    damping,
    length2Meters,
    mass2Kg,
    drivingForce,
    drivingFreq,
    isPaused,
    timeScale,
    showVectors,
    showTrace,
    soundEnabled,
  });

  useEffect(() => {
    paramsRef.current = {
      simMode,
      gravity,
      lengthMeters,
      massKg,
      damping,
      length2Meters,
      mass2Kg,
      drivingForce,
      drivingFreq,
      isPaused,
      timeScale,
      showVectors,
      showTrace,
      soundEnabled,
    };
  }, [
    simMode,
    gravity,
    lengthMeters,
    massKg,
    damping,
    length2Meters,
    mass2Kg,
    drivingForce,
    drivingFreq,
    isPaused,
    timeScale,
    showVectors,
    showTrace,
    soundEnabled,
  ]);

  // Audio synthesis for photogate and whoosh
  const playBeep = (freq = 880, duration = 0.05) => {
    if (!paramsRef.current.soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      /* ignore audio error */
    }
  };

  // Planetary presets
  const setPlanetPreset = (name: string, gVal: number) => {
    setActivePreset(name);
    setGravity(gVal);
  };

  // Reset simulation
  const handleReset = (angleDeg = 25) => {
    const p = physicsRef.current;
    p.theta = angleDeg * (Math.PI / 180);
    p.omega = 0.0;
    p.theta2 = 45 * (Math.PI / 180);
    p.omega2 = 0.0;
    p.pathTrail = [];
    p.doubleTrail = [];
    p.historyPhase = [];
    p.historyWaveform = [];
    p.historyKE.fill(0);
    p.historyPE.fill(0);
    p.historyTE.fill(0);
    p.elapsedSimTime = 0;
    p.halfPeriodPasses = 0;
    p.peakTensionRecorded = 0;
    p.photogatePeriods = [];
  };

  // Log current data point
  const handleLogDataPoint = () => {
    const p = physicsRef.current;
    const cfg = paramsRef.current;
    const v = p.omega * cfg.lengthMeters;
    const h = cfg.lengthMeters * (1 - Math.cos(p.theta));
    const pe = cfg.massKg * cfg.gravity * h;
    const ke = 0.5 * cfg.massKg * v * v;
    const te = pe + ke;
    const tension = cfg.massKg * (cfg.gravity * Math.cos(p.theta) + (v * v) / cfg.lengthMeters);

    const newPoint: DataLogPoint = {
      id: Date.now(),
      timeSec: Number(p.elapsedSimTime.toFixed(3)),
      thetaDeg: Number((p.theta * (180 / Math.PI)).toFixed(2)),
      omegaRadS: Number(p.omega.toFixed(3)),
      keJoules: Number(ke.toFixed(3)),
      peJoules: Number(pe.toFixed(3)),
      totalJoules: Number(te.toFixed(3)),
      tensionNewtons: Number(tension.toFixed(2)),
    };

    setDataLogs((prev) => [newPoint, ...prev.slice(0, 49)]);
  };

  // Export CSV lab data
  const handleExportCSV = () => {
    if (dataLogs.length === 0) {
      handleLogDataPoint();
    }
    const headers = [
      "Time (s)",
      "Displacement Angle (deg)",
      "Angular Velocity (rad/s)",
      "Kinetic Energy (J)",
      "Potential Energy (J)",
      "Total Energy (J)",
      "Tension Force (N)",
      "Gravity (m/s^2)",
      "Length (m)",
      "Mass (kg)",
    ];

    const rows = (dataLogs.length > 0 ? dataLogs : []).map((d) => [
      d.timeSec,
      d.thetaDeg,
      d.omegaRadS,
      d.keJoules,
      d.peJoules,
      d.totalJoules,
      d.tensionNewtons,
      gravity,
      lengthMeters,
      massKg,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `luqi_physics_lab_pendulum_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

      // ─────────────────────────────────────────────────────────────
      // RUNGE-KUTTA 4TH ORDER INTEGRATION
      // ─────────────────────────────────────────────────────────────
      if (!cfg.isPaused && !p.isDragging) {
        const steps = 6;
        const subDt = (dt * cfg.timeScale) / steps;

        for (let i = 0; i < steps; i++) {
          p.elapsedSimTime += subDt;

          if (cfg.simMode === "simple") {
            // Mode A: Simple Harmonic & Damped Pendulum (RK4)
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

            const prevTheta = p.theta;
            p.theta += (subDt / 6) * (k1.dTh + 2 * k2.dTh + 2 * k3.dTh + k4.dTh);
            p.omega += (subDt / 6) * (k1.dOm + 2 * k2.dOm + 2 * k3.dOm + k4.dOm);

            // Laser Photogate Zero-Crossing Detection at Equilibrium (theta = 0)
            if (prevTheta * p.theta <= 0 && prevTheta !== 0) {
              const nowSim = p.elapsedSimTime;
              if (p.lastZeroCrossTime > 0) {
                const halfPeriod = nowSim - p.lastZeroCrossTime;
                if (halfPeriod > 0.2) {
                  const fullPeriod = halfPeriod * 2;
                  p.photogatePeriods.push(fullPeriod);
                  if (p.photogatePeriods.length > 10) p.photogatePeriods.shift();

                  const avgT =
                    p.photogatePeriods.reduce((a, b) => a + b, 0) / p.photogatePeriods.length;
                  const theoT = 2 * Math.PI * Math.sqrt(L / g);
                  const errPct = Math.abs((avgT - theoT) / theoT) * 100;

                  setPhotogate({
                    passes: p.halfPeriodPasses + 1,
                    lastPeriod: Number(fullPeriod.toFixed(3)),
                    avgPeriod: Number(avgT.toFixed(3)),
                    errorPercent: Number(errPct.toFixed(2)),
                  });
                  playBeep(920, 0.04);
                }
              }
              p.lastZeroCrossTime = nowSim;
              p.halfPeriodPasses++;
            }
          } else if (cfg.simMode === "double") {
            // Mode B: Coupled Chaotic Double Pendulum (RK4 Lagrangian formulation)
            const g = cfg.gravity;
            const l1 = cfg.lengthMeters;
            const l2 = cfg.length2Meters;
            const m1 = cfg.massKg;
            const m2 = cfg.mass2Kg;
            const b = cfg.damping * 0.2;

            const deriv = (th1: number, om1: number, th2: number, om2: number) => {
              const delta = th1 - th2;
              const denom1 = l1 * (2 * m1 + m2 - m2 * Math.cos(2 * delta));
              const denom2 = l2 * (2 * m1 + m2 - m2 * Math.cos(2 * delta));

              const num1 =
                -g * (2 * m1 + m2) * Math.sin(th1) -
                m2 * g * Math.sin(th1 - 2 * th2) -
                2 * Math.sin(delta) * m2 * (om2 * om2 * l2 + om1 * om1 * l1 * Math.cos(delta));

              const num2 =
                2 *
                Math.sin(delta) *
                (om1 * om1 * l1 * (m1 + m2) +
                  g * (m1 + m2) * Math.cos(th1) +
                  om2 * om2 * l2 * m2 * Math.cos(delta));

              return {
                dTh1: om1,
                dOm1: num1 / denom1 - (b / m1) * om1,
                dTh2: om2,
                dOm2: num2 / denom2 - (b / m2) * om2,
              };
            };

            const k1 = deriv(p.theta, p.omega, p.theta2, p.omega2);
            const k2 = deriv(
              p.theta + 0.5 * subDt * k1.dTh1,
              p.omega + 0.5 * subDt * k1.dOm1,
              p.theta2 + 0.5 * subDt * k1.dTh2,
              p.omega2 + 0.5 * subDt * k1.dOm2
            );
            const k3 = deriv(
              p.theta + 0.5 * subDt * k2.dTh1,
              p.omega + 0.5 * subDt * k2.dOm1,
              p.theta2 + 0.5 * subDt * k2.dTh2,
              p.omega2 + 0.5 * subDt * k2.dOm2
            );
            const k4 = deriv(
              p.theta + subDt * k3.dTh1,
              p.omega + subDt * k3.dOm1,
              p.theta2 + subDt * k3.dTh2,
              p.omega2 + subDt * k3.dOm2
            );

            p.theta += (subDt / 6) * (k1.dTh1 + 2 * k2.dTh1 + 2 * k3.dTh1 + k4.dTh1);
            p.omega += (subDt / 6) * (k1.dOm1 + 2 * k2.dOm1 + 2 * k3.dOm1 + k4.dOm1);
            p.theta2 += (subDt / 6) * (k1.dTh2 + 2 * k2.dTh2 + 2 * k3.dTh2 + k4.dTh2);
            p.omega2 += (subDt / 6) * (k1.dOm2 + 2 * k2.dOm2 + 2 * k3.dOm2 + k4.dOm2);
          } else if (cfg.simMode === "driven") {
            // Mode C: Driven Damped Resonator with External Forcing F0 cos(wd * t)
            const g = cfg.gravity;
            const L = cfg.lengthMeters;
            const m = cfg.massKg;
            const b = cfg.damping;
            const f0 = cfg.drivingForce;
            const wd = cfg.drivingFreq;
            const t = p.elapsedSimTime;

            const f = (th: number, om: number, curT: number) => ({
              dTh: om,
              dOm:
                -(g / L) * Math.sin(th) - (b / m) * om + (f0 / (m * L)) * Math.cos(wd * curT),
            });

            const k1 = f(p.theta, p.omega, t);
            const k2 = f(p.theta + 0.5 * subDt * k1.dTh, p.omega + 0.5 * subDt * k1.dOm, t + 0.5 * subDt);
            const k3 = f(p.theta + 0.5 * subDt * k2.dTh, p.omega + 0.5 * subDt * k2.dOm, t + 0.5 * subDt);
            const k4 = f(p.theta + subDt * k3.dTh, p.omega + subDt * k3.dOm, t + subDt);

            p.theta += (subDt / 6) * (k1.dTh + 2 * k2.dTh + 2 * k3.dTh + k4.dTh);
            p.omega += (subDt / 6) * (k1.dOm + 2 * k2.dOm + 2 * k3.dOm + k4.dOm);
          }
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

      // Small angle vs exact elliptic integral
      const T0 = 2 * Math.PI * Math.sqrt(L / g);
      const theta0 = Math.abs(p.theta);
      const Telliptic =
        T0 *
        (1 +
          (1 / 4) * Math.pow(Math.sin(theta0 / 2), 2) +
          (9 / 64) * Math.pow(Math.sin(theta0 / 2), 4));

      // Instantaneous Tension in String: T = m * (g cos(theta) + v^2 / L)
      const tension = m * (g * Math.cos(p.theta) + (linearV * linearV) / L);
      if (tension > p.peakTensionRecorded) {
        p.peakTensionRecorded = tension;
      }

      // Update waveform and phase-space histories
      if (!cfg.isPaused) {
        p.historyKE.shift();
        p.historyKE.push(ke);
        p.historyPE.shift();
        p.historyPE.push(pe);
        p.historyTE.shift();
        p.historyTE.push(te);

        p.historyPhase.push({ theta: p.theta, omega: p.omega });
        if (p.historyPhase.length > 200) p.historyPhase.shift();

        p.historyWaveform.push({ t: p.elapsedSimTime, theta: p.theta, omega: p.omega });
        if (p.historyWaveform.length > 200) p.historyWaveform.shift();
      }

      // Sync telemetry periodically
      if (Math.random() < 0.2) {
        setTelemetry({
          periodTheoretical: Number(T0.toFixed(2)),
          periodElliptic: Number(Telliptic.toFixed(2)),
          frequency: Number((1 / T0).toFixed(2)),
          angleDeg: Number((p.theta * (180 / Math.PI)).toFixed(1)),
          angle2Deg: Number((p.theta2 * (180 / Math.PI)).toFixed(1)),
          velocity: Number(Math.abs(linearV).toFixed(2)),
          height: Number(height.toFixed(3)),
          ke: Number(ke.toFixed(2)),
          pe: Number(pe.toFixed(2)),
          te: Number(te.toFixed(2)),
          tension: Number(tension.toFixed(2)),
          peakTension: Number(p.peakTensionRecorded.toFixed(2)),
        });
      }

      // ─────────────────────────────────────────────────────────────
      // 1. DRAW PENDULUM SIMULATION RIG CANVAS
      // ─────────────────────────────────────────────────────────────
      const simRect = simCanvas?.getBoundingClientRect();
      if (simRect && ctx) {
        ctx.clearRect(0, 0, simRect.width, simRect.height);

        const pivotX = simRect.width / 2;
        const pivotY = 45;
        const ppm = (simRect.height - 110) / (cfg.simMode === "double" ? 3.5 : 2.8);
        const bobRadius = 14 + m * 2.5;

        // Position of Bob 1
        const bobX = pivotX + Math.sin(p.theta) * L * ppm;
        const bobY = pivotY + Math.cos(p.theta) * L * ppm;

        // Mode B: Position of Bob 2
        const L2 = cfg.length2Meters;
        const m2 = cfg.mass2Kg;
        const bob2Radius = 12 + m2 * 2.5;
        const bob2X = bobX + Math.sin(p.theta2) * L2 * ppm;
        const bob2Y = bobY + Math.cos(p.theta2) * L2 * ppm;

        // Motion Trails
        if (cfg.showTrace && !p.isDragging) {
          if (cfg.simMode === "double") {
            p.doubleTrail.push({ x: bob2X, y: bob2Y });
            if (p.doubleTrail.length > 90) p.doubleTrail.shift();

            if (p.doubleTrail.length > 1) {
              for (let i = 1; i < p.doubleTrail.length; i++) {
                ctx.beginPath();
                ctx.moveTo(p.doubleTrail[i - 1].x, p.doubleTrail[i - 1].y);
                ctx.lineTo(p.doubleTrail[i].x, p.doubleTrail[i].y);
                const hue = (i * 4 + p.elapsedSimTime * 40) % 360;
                ctx.strokeStyle = `hsla(${hue}, 90%, 60%, ${i / p.doubleTrail.length})`;
                ctx.lineWidth = 2.5;
                ctx.stroke();
              }
            }
          } else {
            p.pathTrail.push({ x: bobX, y: bobY });
            if (p.pathTrail.length > 45) p.pathTrail.shift();

            if (p.pathTrail.length > 1) {
              ctx.beginPath();
              ctx.moveTo(p.pathTrail[0].x, p.pathTrail[0].y);
              for (let i = 1; i < p.pathTrail.length; i++) {
                ctx.lineTo(p.pathTrail[i].x, p.pathTrail[i].y);
              }
              ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
              ctx.lineWidth = 2.5;
              ctx.setLineDash([4, 4]);
              ctx.stroke();
              ctx.setLineDash([]);
            }
          }
        }

        // Center Equilibrium Guideline
        ctx.beginPath();
        ctx.moveTo(pivotX, pivotY);
        ctx.lineTo(pivotX, pivotY + (cfg.simMode === "double" ? (L + L2) * ppm : L * ppm));
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Protractor Arc at Pivot
        ctx.beginPath();
        ctx.arc(pivotX, pivotY, 46, Math.PI / 2, Math.PI / 2 + p.theta, p.theta < 0);
        ctx.strokeStyle = "rgba(245, 158, 11, 0.7)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Angle Text Indicator
        ctx.font = "bold 11px monospace";
        ctx.fillStyle = "#f59e0b";
        ctx.fillText(
          `${(p.theta * (180 / Math.PI)).toFixed(1)}°`,
          pivotX + (p.theta >= 0 ? 55 : -75),
          pivotY + 28
        );

        // Photogate Sensor Visual at Equilibrium (theta = 0)
        const gateY = pivotY + L * ppm;
        ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
        ctx.fillRect(pivotX - 25, gateY - 14, 50, 28);
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(pivotX - 25, gateY - 14, 50, 28);

        // Laser Beam (Green dashed line)
        ctx.beginPath();
        ctx.moveTo(pivotX - 25, gateY);
        ctx.lineTo(pivotX + 25, gateY);
        ctx.strokeStyle = "#34d399";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = "9px monospace";
        ctx.fillStyle = "#34d399";
        ctx.fillText("PHOTOGATE", pivotX - 24, gateY - 18);

        // String 1
        ctx.beginPath();
        ctx.moveTo(pivotX, pivotY);
        ctx.lineTo(bobX, bobY);
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 3;
        ctx.stroke();

        // Mode B: String 2
        if (cfg.simMode === "double") {
          ctx.beginPath();
          ctx.moveTo(bobX, bobY);
          ctx.lineTo(bob2X, bob2Y);
          ctx.strokeStyle = "#cbd5e1";
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }

        // Pivot Mount Hardware
        ctx.fillStyle = "#334155";
        ctx.fillRect(pivotX - 40, pivotY - 14, 80, 12);
        ctx.beginPath();
        ctx.arc(pivotX, pivotY, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#f8fafc";
        ctx.fill();

        // Bob 1 Rendering
        const glow = ctx.createRadialGradient(bobX - 4, bobY - 4, 2, bobX, bobY, bobRadius + 12);
        glow.addColorStop(0, "#7dd3fc");
        glow.addColorStop(0.7, "#0284c7");
        glow.addColorStop(1, "rgba(2, 132, 199, 0)");

        ctx.beginPath();
        ctx.arc(bobX, bobY, bobRadius + 12, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(bobX, bobY, bobRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#38bdf8";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.font = "bold 10px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(`${m.toFixed(1)}kg`, bobX, bobY + 3);

        // Bob 2 Rendering (Double Pendulum Mode)
        if (cfg.simMode === "double") {
          const glow2 = ctx.createRadialGradient(bob2X - 3, bob2Y - 3, 2, bob2X, bob2Y, bob2Radius + 10);
          glow2.addColorStop(0, "#f472b6");
          glow2.addColorStop(0.7, "#ec4899");
          glow2.addColorStop(1, "rgba(236, 72, 153, 0)");

          ctx.beginPath();
          ctx.arc(bob2X, bob2Y, bob2Radius + 10, 0, Math.PI * 2);
          ctx.fillStyle = glow2;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(bob2X, bob2Y, bob2Radius, 0, Math.PI * 2);
          ctx.fillStyle = "#ec4899";
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2.5;
          ctx.stroke();

          ctx.fillStyle = "#ffffff";
          ctx.fillText(`${m2.toFixed(1)}kg`, bob2X, bob2Y + 3);
        }

        // Real-Time Vectors (Simple Mode)
        if (cfg.showVectors && cfg.simMode === "simple") {
          const vScale = 25;
          const vx = -Math.cos(p.theta) * linearV * vScale;
          const vy = Math.sin(p.theta) * linearV * vScale;
          drawArrow(ctx, bobX, bobY, bobX + vx, bobY + vy, "#38bdf8", "v (velocity)");

          // Tangential restoring force
          const fScale = 14;
          const restoringF = -m * g * Math.sin(p.theta);
          const fx = -Math.cos(p.theta) * restoringF * fScale;
          const fy = Math.sin(p.theta) * restoringF * fScale;
          drawArrow(ctx, bobX, bobY, bobX + fx, bobY + fy, "#f43f5e", "F_net");

          // String Tension Vector (Amber)
          const tScale = 3;
          const tx = -Math.sin(p.theta) * tension * tScale;
          const ty = -Math.cos(p.theta) * tension * tScale;
          drawArrow(ctx, bobX, bobY, bobX + tx, bobY + ty, "#f59e0b", `T (${tension.toFixed(0)}N)`);
        }
      }

      // ─────────────────────────────────────────────────────────────
      // 2. DRAW MULTI-SCOPE GRAPH CANVAS
      // ─────────────────────────────────────────────────────────────
      const gRect = graphCanvas?.getBoundingClientRect();
      if (gRect && graphCtx) {
        const w = gRect.width;
        const h = gRect.height;
        graphCtx.clearRect(0, 0, w, h);

        // Dark oscilloscope grid
        graphCtx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        graphCtx.lineWidth = 1;
        for (let x = 0; x < w; x += 40) {
          graphCtx.beginPath();
          graphCtx.moveTo(x, 0);
          graphCtx.lineTo(x, h);
          graphCtx.stroke();
        }
        for (let y = 0; y < h; y += 30) {
          graphCtx.beginPath();
          graphCtx.moveTo(0, y);
          graphCtx.lineTo(w, y);
          graphCtx.stroke();
        }

        const padding = 16;
        const plotH = h - padding * 2;

        if (graphMode === "energy") {
          // View 1: Energy Waves (Ek, Ep, Total Energy)
          const len = p.historyKE.length;
          const stepX = w / (len - 1);
          const maxE = Math.max(0.5, te * 1.25);
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

          drawPlot(p.historyTE, "#10b981", 2, true); // Total Energy
          drawPlot(p.historyPE, "#38bdf8", 2.5, false); // Potential Energy
          drawPlot(p.historyKE, "#f43f5e", 2.5, false); // Kinetic Energy
        } else if (graphMode === "phase") {
          // View 2: Phase Space Limit Cycle (Theta vs Omega)
          const centerX = w / 2;
          const centerY = h / 2;
          const maxTheta = Math.PI;
          const maxOmega = 12;
          const scaleX = (w * 0.42) / maxTheta;
          const scaleY = (h * 0.42) / maxOmega;

          // Crosshairs
          graphCtx.strokeStyle = "rgba(255, 255, 255, 0.15)";
          graphCtx.beginPath();
          graphCtx.moveTo(0, centerY);
          graphCtx.lineTo(w, centerY);
          graphCtx.moveTo(centerX, 0);
          graphCtx.lineTo(centerX, h);
          graphCtx.stroke();

          if (p.historyPhase.length > 1) {
            graphCtx.beginPath();
            for (let i = 0; i < p.historyPhase.length; i++) {
              const pt = p.historyPhase[i];
              const x = centerX + pt.theta * scaleX;
              const y = centerY - pt.omega * scaleY;
              if (i === 0) graphCtx.moveTo(x, y);
              else graphCtx.lineTo(x, y);
            }
            graphCtx.strokeStyle = "#a855f7";
            graphCtx.lineWidth = 2.5;
            graphCtx.stroke();
          }

          // Current State Point (Pulsing Amber)
          const curX = centerX + p.theta * scaleX;
          const curY = centerY - p.omega * scaleY;
          graphCtx.beginPath();
          graphCtx.arc(curX, curY, 5, 0, Math.PI * 2);
          graphCtx.fillStyle = "#f59e0b";
          graphCtx.fill();
          graphCtx.strokeStyle = "#ffffff";
          graphCtx.lineWidth = 2;
          graphCtx.stroke();
        } else if (graphMode === "waveform") {
          // View 3: Displacement Waveform (Theta vs Time)
          const centerY = h / 2;
          const len = p.historyWaveform.length;
          const stepX = w / Math.max(1, len - 1);
          const maxAngle = Math.PI;
          const scaleY = (h * 0.4) / maxAngle;

          graphCtx.strokeStyle = "rgba(255, 255, 255, 0.15)";
          graphCtx.beginPath();
          graphCtx.moveTo(0, centerY);
          graphCtx.lineTo(w, centerY);
          graphCtx.stroke();

          if (len > 1) {
            graphCtx.beginPath();
            for (let i = 0; i < len; i++) {
              const pt = p.historyWaveform[i];
              const x = i * stepX;
              const y = centerY - pt.theta * scaleY;
              if (i === 0) graphCtx.moveTo(x, y);
              else graphCtx.lineTo(x, y);
            }
            graphCtx.strokeStyle = "#0284c7";
            graphCtx.lineWidth = 2.5;
            graphCtx.stroke();
          }
        }
      }
    }

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [graphMode]);

  // Pointer Handlers for Direct Interactive Drag & Release
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = simCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const pivotX = rect.width / 2;
    const pivotY = 45;
    const ppm = (rect.height - 110) / (paramsRef.current.simMode === "double" ? 3.5 : 2.8);
    const p = physicsRef.current;
    const L = paramsRef.current.lengthMeters;

    const bobX = pivotX + Math.sin(p.theta) * L * ppm;
    const bobY = pivotY + Math.cos(p.theta) * L * ppm;
    const dist1 = Math.hypot(px - bobX, py - bobY);

    if (dist1 < 38) {
      p.isDragging = true;
      p.dragBobIndex = 1;
      p.omega = 0.0;
      p.pathTrail = [];
      p.doubleTrail = [];
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    if (paramsRef.current.simMode === "double") {
      const L2 = paramsRef.current.length2Meters;
      const bob2X = bobX + Math.sin(p.theta2) * L2 * ppm;
      const bob2Y = bobY + Math.cos(p.theta2) * L2 * ppm;
      const dist2 = Math.hypot(px - bob2X, py - bob2Y);

      if (dist2 < 38) {
        p.isDragging = true;
        p.dragBobIndex = 2;
        p.omega2 = 0.0;
        p.doubleTrail = [];
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }
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
    const pivotY = 45;

    if (p.dragBobIndex === 1) {
      const dx = px - pivotX;
      const dy = py - pivotY;
      let newTh = Math.atan2(dx, Math.max(10, dy));
      newTh = Math.max((-88 * Math.PI) / 180, Math.min((88 * Math.PI) / 180, newTh));
      p.theta = newTh;
      p.omega = 0.0;
    } else if (p.dragBobIndex === 2) {
      const ppm = (rect.height - 110) / 3.5;
      const bob1X = pivotX + Math.sin(p.theta) * paramsRef.current.lengthMeters * ppm;
      const bob1Y = pivotY + Math.cos(p.theta) * paramsRef.current.lengthMeters * ppm;
      const dx = px - bob1X;
      const dy = py - bob1Y;
      const newTh2 = Math.atan2(dx, dy);
      p.theta2 = newTh2;
      p.omega2 = 0.0;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = physicsRef.current;
    if (p.isDragging) {
      p.isDragging = false;
      p.omega = 0.0;
      p.omega2 = 0.0;
      p.lastTime = performance.now();
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore pointer capture error */
      }
    }
  };

  // AI Tutor Copilot Query Handler
  const handleCopilotSend = async (customPrompt?: string) => {
    const q = (customPrompt || copilotQuery).trim();
    if (!q || copilotLoading) return;

    setCopilotQuery("");
    setCopilotMessages((prev) => [...prev, { role: "user", content: q }]);
    setCopilotLoading(true);

    try {
      const res = await fetch("/api/trpc/companion.sendMessage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: 2, // Dr. Kwame conversation
          content: `[Physics Lab Context: Mode=${simMode}, L=${lengthMeters}m, m=${massKg}kg, g=${gravity}m/s², theta=${(
            physicsRef.current.theta *
            (180 / Math.PI)
          ).toFixed(1)}°]\n${q}`,
        }),
      });

      let content = "";
      if (res.ok) {
        const data = await res.json();
        content = data?.result?.data?.content || data?.result?.data?.json?.content || "";
      }

      if (!content || content.length < 20) {
        content = generateDrKwamePhysicsAnswer(q, lengthMeters, massKg, gravity, simMode);
      }

      setCopilotMessages((prev) => [...prev, { role: "assistant", content }]);
    } catch {
      const fallback = generateDrKwamePhysicsAnswer(q, lengthMeters, massKg, gravity, simMode);
      setCopilotMessages((prev) => [...prev, { role: "assistant", content: fallback }]);
    } finally {
      setCopilotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-sky-400" />
                  Experiential STEM Physics Laboratory
                </h1>
                <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/30 text-[10px] font-mono">
                  CAPS / CAMBRIDGE / AP
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400">
                Non-linear RK4 Numerical Mechanics &middot; Chaotic Dynamics &middot; Total Energy Archiving
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => {
                  setSimMode("simple");
                  handleReset(25);
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  simMode === "simple"
                    ? "bg-sky-500 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Simple Harmonic
              </button>
              <button
                onClick={() => {
                  setSimMode("double");
                  handleReset(50);
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  simMode === "double"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Chaotic Double
              </button>
              <button
                onClick={() => {
                  setSimMode("driven");
                  handleReset(10);
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  simMode === "driven"
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Driven Resonator
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSoundEnabled((v) => !v)}
              className="hidden sm:flex border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
              title="Toggle Audio Feedback"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="border-slate-700 bg-slate-900 text-slate-200 hover:text-white text-xs gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Planetary Presets Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Gravitational Environments:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { name: "Earth", g: 9.81, label: "🌍 Earth (9.81 m/s²)" },
                { name: "Moon", g: 1.62, label: "🌕 Moon (1.62 m/s²)" },
                { name: "Mars", g: 3.71, label: "🔴 Mars (3.71 m/s²)" },
                { name: "Jupiter", g: 24.79, label: "🪐 Jupiter (24.79 m/s²)" },
                { name: "Deep Space", g: 0.1, label: "🛸 Deep Space (0.1 m/s²)" },
                { name: "Dense Star", g: 45.0, label: "🌟 Dense Star (45 m/s²)" },
              ].map((p) => (
                <button
                  key={p.name}
                  onClick={() => setPlanetPreset(p.name, p.g)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    activePreset === p.name
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                      : "bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/50"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="font-mono text-sky-400">g = {gravity.toFixed(2)} m/s²</span>
            <span>&bull;</span>
            <span className="font-mono text-amber-400">RK4 dt = 0.016s</span>
          </div>
        </div>

        {/* Dual Canvas Stage: Physics Rig & Multi-Mode Oscilloscope */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Canvas: Main Simulation Rig (7 Columns) */}
          <div className="lg:col-span-7 rounded-3xl border border-slate-800 bg-slate-900/60 shadow-xl overflow-hidden flex flex-col justify-between">
            {/* Rig Header */}
            <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-200">
                  {simMode === "simple" && "Interactive Simple Harmonic Rig"}
                  {simMode === "double" && "Chaotic Double Pendulum (Lagrangian 2-DOF)"}
                  {simMode === "driven" && "Driven Resonance Apparatus"}
                </span>
                <span className="text-[10px] text-slate-400 hidden sm:inline">
                  (Drag bob with mouse or finger to set initial angle)
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleReset(simMode === "double" ? 50 : 30)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Reset Angle & Vectors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsPaused((v) => !v)}
                  className={`p-1.5 rounded-lg text-white font-bold transition-all ${
                    isPaused ? "bg-emerald-600 hover:bg-emerald-500" : "bg-slate-800 hover:bg-slate-700"
                  }`}
                  title={isPaused ? "Resume Simulation" : "Pause Simulation"}
                >
                  {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Canvas Element with Direct Pointer Events */}
            <div className="relative w-full h-[400px] sm:h-[460px] bg-slate-950/90 cursor-grab active:cursor-grabbing select-none overflow-hidden">
              <canvas
                ref={simCanvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="w-full h-full block touch-none"
              />

              {/* HUD Telemetry Overlay inside Canvas */}
              <div className="absolute top-3 left-3 bg-slate-900/90 border border-slate-800/80 rounded-2xl p-2.5 backdrop-blur-md text-[11px] font-mono space-y-1 shadow-lg pointer-events-none">
                <div className="text-slate-400 flex items-center justify-between gap-4">
                  <span>θ (Angle):</span>
                  <span className="font-bold text-amber-400">{telemetry.angleDeg}°</span>
                </div>
                {simMode === "double" && (
                  <div className="text-slate-400 flex items-center justify-between gap-4">
                    <span>θ₂ (Bob 2):</span>
                    <span className="font-bold text-pink-400">{telemetry.angle2Deg}°</span>
                  </div>
                )}
                <div className="text-slate-400 flex items-center justify-between gap-4">
                  <span>Velocity:</span>
                  <span className="font-bold text-sky-400">{telemetry.velocity} m/s</span>
                </div>
                <div className="text-slate-400 flex items-center justify-between gap-4">
                  <span>Tension:</span>
                  <span className="font-bold text-emerald-400">{telemetry.tension} N</span>
                </div>
                <div className="text-slate-400 flex items-center justify-between gap-4">
                  <span>Peak Tension:</span>
                  <span className="font-bold text-orange-400">{telemetry.peakTension} N</span>
                </div>
              </div>

              {/* Photogate Readout Overlay */}
              <div className="absolute top-3 right-3 bg-slate-900/90 border border-slate-800/80 rounded-2xl p-2.5 backdrop-blur-md text-[11px] font-mono space-y-1 shadow-lg pointer-events-none">
                <div className="text-emerald-400 font-bold flex items-center gap-1.5 pb-1 border-b border-slate-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>PHOTOGATE TIMER</span>
                </div>
                <div className="text-slate-400 flex items-center justify-between gap-3">
                  <span>T (Measured):</span>
                  <span className="font-bold text-slate-100">{photogate.lastPeriod} s</span>
                </div>
                <div className="text-slate-400 flex items-center justify-between gap-3">
                  <span>T (Small-Angle):</span>
                  <span className="font-bold text-slate-400">{telemetry.periodTheoretical} s</span>
                </div>
                <div className="text-slate-400 flex items-center justify-between gap-3">
                  <span>T (Elliptic):</span>
                  <span className="font-bold text-sky-300">{telemetry.periodElliptic} s</span>
                </div>
                <div className="text-slate-400 flex items-center justify-between gap-3">
                  <span>% Error:</span>
                  <span
                    className={`font-bold ${
                      photogate.errorPercent < 1.0 ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {photogate.errorPercent}%
                  </span>
                </div>
              </div>

              {/* Bottom Quick Controls Bar */}
              <div className="absolute bottom-3 inset-x-3 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800/80 px-3 py-1.5 rounded-xl backdrop-blur">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={showVectors}
                      onChange={(e) => setShowVectors(e.target.checked)}
                      className="rounded accent-sky-500"
                    />
                    <span>Force Vectors</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 ml-2">
                    <input
                      type="checkbox"
                      checked={showTrace}
                      onChange={(e) => setShowTrace(e.target.checked)}
                      className="rounded accent-sky-500"
                    />
                    <span>Motion Trail</span>
                  </label>
                </div>

                <button
                  onClick={handleLogDataPoint}
                  className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 hover:border-amber-500/50 text-amber-300 font-semibold transition-all backdrop-blur shadow-md flex items-center gap-1.5 text-xs"
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>Log Data Point</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Canvas: Multi-Scope Graphing Engine (5 Columns) */}
          <div className="lg:col-span-5 rounded-3xl border border-slate-800 bg-slate-900/60 shadow-xl overflow-hidden flex flex-col justify-between">
            {/* Graph Header with Tabs */}
            <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setGraphMode("energy")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    graphMode === "energy" ? "bg-slate-800 text-slate-100 shadow-sm" : "text-slate-400"
                  }`}
                >
                  Energy Waves
                </button>
                <button
                  onClick={() => setGraphMode("phase")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    graphMode === "phase" ? "bg-slate-800 text-purple-300 shadow-sm" : "text-slate-400"
                  }`}
                >
                  Phase Space (θ vs ω)
                </button>
                <button
                  onClick={() => setGraphMode("waveform")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    graphMode === "waveform" ? "bg-slate-800 text-sky-300 shadow-sm" : "text-slate-400"
                  }`}
                >
                  θ(t) Waveform
                </button>
              </div>

              <div className="text-[11px] font-mono text-slate-400">
                {graphMode === "energy" && (
                  <span className="text-emerald-400 font-semibold">Total: {telemetry.te} J</span>
                )}
              </div>
            </div>

            {/* Graph Canvas */}
            <div className="relative w-full h-[330px] sm:h-[370px] bg-slate-950/90 overflow-hidden">
              <canvas ref={graphCanvasRef} className="w-full h-full block" />

              {/* Legend Overlay */}
              {graphMode === "energy" && (
                <div className="absolute top-2.5 right-2.5 bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1.5 text-[10px] font-mono space-y-1 shadow-md">
                  <div className="flex items-center gap-2 text-rose-400">
                    <span className="w-2.5 h-0.5 bg-rose-500 rounded" />
                    <span>Kinetic Ek ({telemetry.ke} J)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sky-400">
                    <span className="w-2.5 h-0.5 bg-sky-500 rounded" />
                    <span>Potential Ep ({telemetry.pe} J)</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <span className="w-2.5 h-0.5 bg-emerald-500 rounded border-dashed" />
                    <span>Mechanical Etotal</span>
                  </div>
                </div>
              )}

              {graphMode === "phase" && (
                <div className="absolute top-2.5 right-2.5 bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1.5 text-[10px] font-mono space-y-1 shadow-md">
                  <div className="flex items-center gap-2 text-purple-400">
                    <span className="w-2.5 h-0.5 bg-purple-500 rounded" />
                    <span>Phase Portrait Orbit</span>
                  </div>
                  <div className="flex items-center gap-2 text-amber-400">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Instantaneous State</span>
                  </div>
                </div>
              )}
            </div>

            {/* Real-Time Mechanics Summary Footer */}
            <div className="p-3.5 bg-slate-950/80 border-t border-slate-800 grid grid-cols-4 gap-2 text-center text-xs">
              <div>
                <div className="text-[10px] text-slate-400">Height (Δh)</div>
                <div className="font-mono font-bold text-slate-200">{telemetry.height} m</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Frequency (f)</div>
                <div className="font-mono font-bold text-sky-400">{telemetry.frequency} Hz</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Tension (T)</div>
                <div className="font-mono font-bold text-emerald-400">{telemetry.tension} N</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Small-Angle T₀</div>
                <div className="font-mono font-bold text-amber-400">{telemetry.periodTheoretical} s</div>
              </div>
            </div>
          </div>
        </div>

        {/* Physics Sliders Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-5 rounded-3xl border border-slate-800 bg-slate-900/60 shadow-xl text-xs">
          {/* Slider 1: Length */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">String Length (L)</span>
              <span className="font-mono font-bold text-sky-400">{lengthMeters.toFixed(2)} m</span>
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
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0.3 m</span>
              <span>1.5 m (default)</span>
              <span>3.0 m</span>
            </div>
          </div>

          {/* Slider 2: Mass */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">Bob Mass (m)</span>
              <span className="font-mono font-bold text-amber-400">{massKg.toFixed(2)} kg</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="5.0"
              step="0.1"
              value={massKg}
              onChange={(e) => setMassKg(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0.1 kg</span>
              <span>1.0 kg</span>
              <span>5.0 kg</span>
            </div>
          </div>

          {/* Slider 3: Gravity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">Gravitational Accel (g)</span>
              <span className="font-mono font-bold text-emerald-400">{gravity.toFixed(2)} m/s²</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="30.0"
              step="0.1"
              value={gravity}
              onChange={(e) => {
                setActivePreset("Custom");
                setGravity(parseFloat(e.target.value));
              }}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0.5 m/s²</span>
              <span>9.81 (Earth)</span>
              <span>30.0 m/s²</span>
            </div>
          </div>

          {/* Slider 4: Damping / Friction */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">Air Damping (b)</span>
              <span className="font-mono font-bold text-purple-400">{damping.toFixed(3)} N·s/m</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="0.25"
              step="0.005"
              value={damping}
              onChange={(e) => setDamping(parseFloat(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0.0 (Vacuum)</span>
              <span>0.02 (Standard)</span>
              <span>0.25 (Heavy)</span>
            </div>
          </div>
        </div>

        {/* Bottom Section: In-Lab AI Copilot (Dr. Kwame) & Lab Telemetry Logger */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* In-Lab AI Copilot (7 Columns) */}
          <div className="lg:col-span-7 rounded-3xl border border-slate-800 bg-slate-900/70 shadow-xl p-5 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-md">
                  K
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                    <span>Dr. Kwame — AI Physics Copilot</span>
                    <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/30 text-[10px]">
                      LIVE TUTOR
                    </Badge>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Socratic physics derivations, CAPS Grade 10-12 exam mastery, and non-linear chaos analysis.
                  </p>
                </div>
              </div>
            </div>

            {/* Copilot Chat Stream */}
            <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1 text-xs">
              {copilotMessages.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-2xl ${
                    m.role === "user"
                      ? "bg-amber-500/15 border border-amber-500/30 text-amber-100 ml-8"
                      : "bg-slate-950/70 border border-slate-800 text-slate-200 mr-4"
                  }`}
                >
                  <div className="font-semibold text-[10px] text-slate-400 mb-1">
                    {m.role === "user" ? "You" : "Dr. Kwame (STEM Mentor)"}
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                </div>
              ))}
              {copilotLoading && (
                <div className="flex items-center gap-2 text-slate-400 text-xs pl-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
                  <span>Dr. Kwame is formulating derivation...</span>
                </div>
              )}
            </div>

            {/* Quick Inquiry Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
              {[
                "Why doesn't mass affect the oscillation period?",
                "Derive the tension equation T = m(g + v²/L)",
                "Explain the large-angle elliptic integral correction",
                "What makes the double pendulum chaotic?",
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleCopilotSend(chip)}
                  className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 whitespace-nowrap transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Copilot Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCopilotSend();
              }}
              className="flex items-center gap-2 pt-2 border-t border-slate-800/80"
            >
              <input
                type="text"
                value={copilotQuery}
                onChange={(e) => setCopilotQuery(e.target.value)}
                placeholder="Ask Dr. Kwame any question about this physics lab..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500"
              />
              <button
                type="submit"
                disabled={!copilotQuery.trim() || copilotLoading}
                className="px-3.5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Ask</span>
              </button>
            </form>
          </div>

          {/* Telemetry Logger Table (5 Columns) */}
          <div className="lg:col-span-5 rounded-3xl border border-slate-800 bg-slate-900/70 shadow-xl p-5 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <Table className="w-4 h-4 text-amber-400" />
                  <span>Lab Report Telemetry Log</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  {dataLogs.length} data records captured for student lab submission.
                </p>
              </div>

              <button
                onClick={handleExportCSV}
                className="text-[11px] text-amber-400 hover:underline font-semibold"
              >
                Download CSV
              </button>
            </div>

            {/* Table Container */}
            <div className="flex-1 max-h-[240px] overflow-y-auto divide-y divide-slate-800 text-[11px] font-mono">
              {dataLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  No data points recorded yet. Click &ldquo;Log Data Point&rdquo; on the simulation rig above to capture instantaneous telemetry.
                </div>
              ) : (
                dataLogs.map((log) => (
                  <div key={log.id} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400">t={log.timeSec}s</span> &bull;{" "}
                      <span className="text-amber-400">θ={log.thetaDeg}°</span> &bull;{" "}
                      <span className="text-sky-400">v={log.omegaRadS}r/s</span>
                    </div>
                    <div className="text-right">
                      <span className="text-emerald-400 font-bold">{log.totalJoules} J</span>{" "}
                      <span className="text-slate-400 text-[10px]">({log.tensionNewtons}N)</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>Runge-Kutta 4th Order numerical telemetry</span>
              {dataLogs.length > 0 && (
                <button
                  onClick={() => setDataLogs([])}
                  className="text-rose-400 hover:underline"
                >
                  Clear Log
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── DR. KWAME PHYSICS AI KNOWLEDGE GENERATOR ───
function generateDrKwamePhysicsAnswer(
  query: string,
  L: number,
  m: number,
  g: number,
  mode: string
): string {
  const q = query.toLowerCase();

  if (q.includes("mass") || q.includes("affect")) {
    return `### Why Oscillation Period is Independent of Mass
**Dr. Kwame's Socratic Proof:**

In simple harmonic motion, the restoring force is:
$$F_{\\text{restoring}} = -m g \\sin\\theta \\approx -m g \\left(\\frac{x}{L}\\right)$$

By Newton's Second Law ($F = m a$):
$$m a = -m g \\left(\\frac{x}{L}\\right) \\implies a = -\\left(\\frac{g}{L}\\right) x$$

Notice that the **mass $m$ cancels completely from both sides** of the equation! The acceleration depends solely on local gravity ($g$) and string length ($L$). Thus, whether a bob has mass 0.1 kg or 100 kg, it accelerates identically along the circular arc:
$$T_0 = 2\\pi \\sqrt{\\frac{L}{g}} = 2\\pi \\sqrt{\\frac{${L.toFixed(2)}}{${g.toFixed(2)}}} = ${(
      2 *
      Math.PI *
      Math.sqrt(L / g)
    ).toFixed(2)}\\text{ s}$$`;
  }

  if (q.includes("tension") || q.includes("bottom")) {
    return `### String Tension Derivation at Equilibrium
**Dr. Kwame's Mechanics Breakdown:**

At any arbitrary angle $\\theta$, the forces acting radially along the string are the string tension $T$ pointing toward the pivot and the radial component of gravity $mg\\cos\\theta$ pointing away.

By centripetal acceleration ($a_c = v^2 / L$):
$$T - m g \\cos\\theta = m \\frac{v^2}{L} \\implies T(\\theta) = m\\left(g\\cos\\theta + \\frac{v^2}{L}\\right)$$

At the **bottom of the swing** ($\\theta = 0^\\circ$):
- $\\cos(0) = 1$
- Velocity $v$ reaches its theoretical maximum $v_{\\max} = \\sqrt{2 g h} = \\sqrt{2 g L(1 - \\cos\\theta_0)}$

Substituting into tension gives:
$$T_{\\max} = m\\left(g + \\frac{2 g L(1 - \\cos\\theta_0)}{L}\\right) = m g (3 - 2\\cos\\theta_0)$$
For a $60^\\circ$ swing, the tension at the bottom is exactly **double the bob's resting weight ($2 mg$)**!`;
  }

  if (q.includes("elliptic") || q.includes("large angle") || q.includes("correction")) {
    return `### Large-Angle Elliptic Integral Correction
**Dr. Kwame's Mathematical Physics Note:**

The standard formula $T_0 = 2\\pi\\sqrt{L/g}$ relies on the linear approximation $\\sin\\theta \\approx \\theta$, which introduces significant error beyond $15^\\circ$.

The exact period is given by the complete elliptic integral of the first kind $K(k)$:
$$T = 4\\sqrt{\\frac{L}{g}} \\int_0^{\\pi/2} \\frac{d\\phi}{\\sqrt{1 - k^2 \\sin^2\\phi}} = 4\\sqrt{\\frac{L}{g}} K\\left(\\sin\\frac{\\theta_0}{2}\\right)$$

Expanding in series:
$$T = T_0 \\left[1 + \\frac{1}{4}\\sin^2\\left(\\frac{\\theta_0}{2}\\right) + \\frac{9}{64}\\sin^4\\left(\\frac{\\theta_0}{2}\\right) + \\dots\\right]$$

For your current setup with $L = ${L.toFixed(2)}$m and $g = ${g.toFixed(2)}$m/s²:
- Small-Angle Theoretical: **${(2 * Math.PI * Math.sqrt(L / g)).toFixed(2)}s**
- Notice how our virtual laser photogate confirms this exact expansion!`;
  }

  if (q.includes("double") || q.includes("chaos") || q.includes("butterfly")) {
    return `### Chaos in the Coupled Double Pendulum
**Dr. Kwame's Non-Linear Dynamics Insight:**

The double pendulum is the classic archetype of a deterministic, non-integrable Hamiltonian dynamical system. While its governing equations (derived from the Euler-Lagrange equations) are completely deterministic without any randomness, its trajectory exhibits **extreme sensitivity to initial conditions**:

$$\\Delta x(t) \\approx \\Delta x_0 e^{\\lambda t}$$

where $\\lambda > 0$ is the **positive Lyapunov exponent**. Two double pendula starting with initial angles differing by only $0.0001^\\circ$ will diverge entirely within a few swings! The glowing rainbow trail in our simulator visually maps this deterministic chaos in real time.`;
  }

  return `### Classical Mechanics Guidance
**Dr. Kwame's Synthesis:**

Regarding: **"${query}"**

In our current laboratory configuration:
- Mode: **${mode.toUpperCase()}**
- String Length: **${L.toFixed(2)} m**
- Mass: **${m.toFixed(2)} kg**
- Gravitational Field: **${g.toFixed(2)} m/s²**

All mechanical motion adheres strictly to the conservation of total mechanical energy ($E_{total} = E_k + E_p$). When damping is present ($b > 0$), mechanical energy dissipates into thermal energy at rate $\\frac{dE}{dt} = -b v^2$.

Feel free to log data points or export the complete CSV file for your physics laboratory report!`;
}
