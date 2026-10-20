import React, { useState, useEffect, useRef } from 'react';
import HeroAiChatConsole from './HeroAiChatConsole';
import ConsumerRightsAssistant from './ConsumerRightsAssistant';
import {
  MessageSquare,
  FlaskConical,
  GraduationCap,
  CreditCard,
  Sparkles,
  Wifi,
  Smartphone,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Shield,
  Layers,
  Activity,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Zap,
  Globe,
  Radio,
  Clock,
  Terminal,
  Cpu
} from 'lucide-react';
import { Link } from 'react-router';

// ============================================================================
// PUBLIC PLATFORM VIEW — 100% PUBLIC-FACING & PRODUCTION-ISOLATED
// ============================================================================

type ActivePublicTab = 'COMPANION' | 'CONSUMER_SHIELD' | 'STEM_LABS' | 'CERT_ACADEMY' | 'WALLET_SUBSCRIPTION';

export const PublicPlatformView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActivePublicTab>('COMPANION');

  // --------------------------------------------------------------------------
  // Tab 2: 2G-to-6G Experiential STEM Labs State
  // --------------------------------------------------------------------------
  const [gradeLevel, setGradeLevel] = useState<'PRE_SCHOOL' | 'PRIMARY' | 'HIGH_SCHOOL' | 'HIGHER_LEARNING'>('HIGH_SCHOOL');
  const [networkMode, setNetworkMode] = useState<'2G_USSD' | '3G_SVG' | '5G_RUNGE_KUTTA'>('5G_RUNGE_KUTTA');
  
  // 5G/6G Runge-Kutta 4th-Order (RK4) Canvas Physics
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isSimulating, setIsSimulating] = useState(true);
  const [rkGravity, setRkGravity] = useState(9.8);
  const [rkLength, setRkLength] = useState(1.2);
  const [rkDamping, setRkDamping] = useState(0.04);
  const [rkMass, setRkMass] = useState(1.0);
  const simState = useRef({ theta: Math.PI / 4, omega: 0.0 });
  const energyHistory = useRef<{ t: number; ke: number; pe: number; total: number }[]>([]);

  // 2G USSD Dial State
  const [ussdInput, setUssdInput] = useState('*384*77#');
  const [ussdScreen, setUssdScreen] = useState<string>(
    'Luqi STEM Lab (*384#):\n1. Simple Pendulum\n2. Ohm\'s Law\n3. Newton\'s 2nd Law\n4. Ask Luqi AI (SMS)\nReply with 1-4:'
  );
  const [ussdReply, setUssdReply] = useState('');

  // --------------------------------------------------------------------------
  // Tab 3: CertMaster Academy (ITIL 5 + Cisco CCNA/CCNP/CCIP) 4-Scene Player
  // --------------------------------------------------------------------------
  const [currentScene, setCurrentScene] = useState<number>(1);
  const [isPlayingVideo, setIsPlayingVideo] = useState<boolean>(true);
  const [videoSpeed, setVideoSpeed] = useState<number>(1);
  const certCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // --------------------------------------------------------------------------
  // Tab 4: Public Subscription & Token Top-Up Wallet State
  // --------------------------------------------------------------------------
  const [userCredits, setUserCredits] = useState<number>(150);
  const [topupAmount, setTopupAmount] = useState<number>(50);
  const [paymentProvider, setPaymentProvider] = useState<'PAYFAST' | 'MTN_MOMO'>('PAYFAST');
  const [momoPhoneNumber, setMomoPhoneNumber] = useState('0712345678');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccessNotice, setPaymentSuccessNotice] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // Runge-Kutta 4th Order Physics Loop (5G/6G Canvas)
  // --------------------------------------------------------------------------
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.04);
      lastTime = currentTime;

      const canvas = canvasRef.current;
      if (canvas && networkMode === '5G_RUNGE_KUTTA' && isSimulating) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // RK4 derivative calculation for pendulum: d²θ/dt² = -(g/L)sin(θ) - b*ω
          const g = rkGravity;
          const L = rkLength;
          const b = rkDamping;

          const f = (th: number, om: number) => -(g / L) * Math.sin(th) - b * om;

          let { theta, omega } = simState.current;

          // Sub-stepping for RK4 precision
          const steps = 4;
          const subDt = dt / steps;
          for (let s = 0; s < steps; s++) {
            const k1_th = omega;
            const k1_om = f(theta, omega);

            const k2_th = omega + 0.5 * subDt * k1_om;
            const k2_om = f(theta + 0.5 * subDt * k1_th, omega + 0.5 * subDt * k1_om);

            const k3_th = omega + 0.5 * subDt * k2_om;
            const k3_om = f(theta + 0.5 * subDt * k2_th, omega + 0.5 * subDt * k2_om);

            const k4_th = omega + subDt * k3_om;
            const k4_om = f(theta + subDt * k3_th, omega + subDt * k3_om);

            theta += (subDt / 6) * (k1_th + 2 * k2_th + 2 * k3_th + k4_th);
            omega += (subDt / 6) * (k1_om + 2 * k2_om + 2 * k3_om + k4_om);
          }

          simState.current = { theta, omega };

          // Energies
          const h = L * (1 - Math.cos(theta));
          const pe = rkMass * g * h;
          const velocity = L * omega;
          const ke = 0.5 * rkMass * velocity * velocity;
          const total = pe + ke;

          energyHistory.current.push({ t: currentTime, ke, pe, total });
          if (energyHistory.current.length > 120) energyHistory.current.shift();

          // Render on Canvas
          const w = canvas.width;
          const hCanvas = canvas.height;
          ctx.clearRect(0, 0, w, hCanvas);

          // Grid & Pivot
          const originX = w * 0.35;
          const originY = 60;
          const pixelScale = 140;
          const bobX = originX + Math.sin(theta) * (L * pixelScale);
          const bobY = originY + Math.cos(theta) * (L * pixelScale);

          // Background Gradient
          const bgGrad = ctx.createLinearGradient(0, 0, 0, hCanvas);
          bgGrad.addColorStop(0, '#020617');
          bgGrad.addColorStop(1, '#0f172a');
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, w, hCanvas);

          // Top Pivot Mount
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(originX - 40, originY);
          ctx.lineTo(originX + 40, originY);
          ctx.stroke();

          // String
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(originX, originY);
          ctx.lineTo(bobX, bobY);
          ctx.stroke();

          // Pivot pin
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(originX, originY, 6, 0, Math.PI * 2);
          ctx.fill();

          // Pendulum Bob
          const bobRadius = 14 + rkMass * 4;
          const bobGrad = ctx.createRadialGradient(bobX - 4, bobY - 4, 2, bobX, bobY, bobRadius);
          bobGrad.addColorStop(0, '#38bdf8');
          bobGrad.addColorStop(1, '#0284c7');
          ctx.fillStyle = bobGrad;
          ctx.beginPath();
          ctx.arc(bobX, bobY, bobRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#bae6fd';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Velocity Vector (Green arrow)
          const vScale = 25;
          const vx = Math.cos(theta) * velocity * vScale;
          const vy = -Math.sin(theta) * velocity * vScale;
          ctx.strokeStyle = '#4ade80';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(bobX, bobY);
          ctx.lineTo(bobX + vx, bobY + vy);
          ctx.stroke();

          // Real-time Waveform Display (Right side of canvas)
          const graphX = w * 0.65;
          const graphY = 30;
          const graphW = w * 0.32;
          const graphH = hCanvas - 60;

          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1;
          ctx.fillRect(graphX, graphY, graphW, graphH);
          ctx.strokeRect(graphX, graphY, graphW, graphH);

          ctx.fillStyle = '#94a3b8';
          ctx.font = '10px monospace';
          ctx.fillText('ENERGY OSCILLATION (Ek vs Ep)', graphX + 8, graphY + 16);

          if (energyHistory.current.length > 2) {
            const maxEnergy = Math.max(12, ...energyHistory.current.map(e => e.total * 1.2));

            // Kinetic (Green)
            ctx.strokeStyle = '#4ade80';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            energyHistory.current.forEach((pt, idx) => {
              const px = graphX + (idx / 120) * graphW;
              const py = graphY + graphH - (pt.ke / maxEnergy) * (graphH - 30) - 10;
              if (idx === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            });
            ctx.stroke();

            // Potential (Amber)
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            energyHistory.current.forEach((pt, idx) => {
              const px = graphX + (idx / 120) * graphW;
              const py = graphY + graphH - (pt.pe / maxEnergy) * (graphH - 30) - 10;
              if (idx === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            });
            ctx.stroke();

            // Legend
            ctx.fillStyle = '#4ade80';
            ctx.fillText(`Kinetic (Ek): ${ke.toFixed(2)} J`, graphX + 8, graphY + graphH - 24);
            ctx.fillStyle = '#f59e0b';
            ctx.fillText(`Potential (Ep): ${pe.toFixed(2)} J`, graphX + 8, graphY + graphH - 10);
          }
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [networkMode, isSimulating, rkGravity, rkLength, rkDamping, rkMass]);

  // --------------------------------------------------------------------------
  // Tab 3: Cisco Spanning Tree 4-Scene Canvas Video Player
  // --------------------------------------------------------------------------
  useEffect(() => {
    let timer: any;
    if (isPlayingVideo) {
      timer = setInterval(() => {
        setCurrentScene(prev => (prev >= 4 ? 1 : prev + 1));
      }, 5000 / videoSpeed);
    }
    return () => clearInterval(timer);
  }, [isPlayingVideo, videoSpeed]);

  useEffect(() => {
    const canvas = certCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Dark sleek background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    // Switch Nodes
    const rootX = w * 0.5;
    const rootY = 70;
    const sw2X = w * 0.25;
    const sw2Y = 200;
    const sw3X = w * 0.75;
    const sw3Y = 200;

    // Draw Links
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    // Link SW1 to SW2
    ctx.beginPath();
    ctx.moveTo(rootX, rootY + 20);
    ctx.lineTo(sw2X, sw2Y - 20);
    ctx.stroke();

    // Link SW1 to SW3
    ctx.beginPath();
    ctx.moveTo(rootX, rootY + 20);
    ctx.lineTo(sw3X, sw3Y - 20);
    ctx.stroke();

    // Redundant Cross Link SW2 to SW3 (Active scene highlights this port!)
    ctx.lineWidth = 4;
    if (currentScene === 1) {
      ctx.strokeStyle = '#ef4444'; // Blocking
      ctx.setLineDash([6, 6]);
    } else if (currentScene === 2) {
      ctx.strokeStyle = '#f59e0b'; // Listening
      ctx.setLineDash([8, 4]);
    } else if (currentScene === 3) {
      ctx.strokeStyle = '#38bdf8'; // Learning
      ctx.setLineDash([4, 4]);
    } else {
      ctx.strokeStyle = '#10b981'; // Forwarding
      ctx.setLineDash([]);
    }
    ctx.beginPath();
    ctx.moveTo(sw2X + 30, sw2Y);
    ctx.lineTo(sw3X - 30, sw3Y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Switch Boxes
    const drawSwitch = (x: number, y: number, name: string, isRoot: boolean) => {
      ctx.fillStyle = isRoot ? '#1e293b' : '#0f172a';
      ctx.strokeStyle = isRoot ? '#f59e0b' : '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x - 50, y - 25, 100, 50, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(name, x, y - 2);

      ctx.fillStyle = isRoot ? '#f59e0b' : '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText(isRoot ? 'ROOT BRIDGE' : 'NON-ROOT SW', x, y + 14);
    };

    drawSwitch(rootX, rootY, 'Switch-1 (Root)', true);
    drawSwitch(sw2X, sw2Y, 'Switch-2', false);
    drawSwitch(sw3X, sw3Y, 'Switch-3', false);

    // State Marker on Gi0/1
    const markerX = (sw2X + sw3X) / 2;
    const markerY = sw2Y;
    const sceneColors = ['#ef4444', '#f59e0b', '#38bdf8', '#10b981'];
    const sceneLabels = ['BLOCKING (20s)', 'LISTENING (15s)', 'LEARNING (15s)', 'FORWARDING (Active)'];

    ctx.fillStyle = sceneColors[currentScene - 1];
    ctx.beginPath();
    ctx.roundRect(markerX - 65, markerY - 14, 130, 28, 8);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Gi0/1: ${sceneLabels[currentScene - 1]}`, markerX, markerY + 4);
  }, [currentScene]);

  // Handle USSD Simulation
  const handleUssdSend = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = ussdReply.trim();
    if (clean === '1') {
      setUssdScreen(
        'Luqi Edu Pendulum (SMS):\nPeriod T = 2*pi*sqrt(L/g)\nFor L=1.2m, g=9.8m/s2 -> T = 2.20s.\nReply 0 to go back.'
      );
    } else if (clean === '2') {
      setUssdScreen('Luqi Edu Ohm\'s Law:\nV = I * R (Voltage = Current * Resistance)\nFor V=12V, R=4 Ohm -> I = 3A.\nReply 0 to go back.');
    } else if (clean === '3') {
      setUssdScreen('Newton\'s 2nd Law:\nF = m * a (Force = Mass * Accel)\nFor m=5kg, a=2m/s2 -> F = 10N.\nReply 0 to go back.');
    } else if (clean === '4') {
      setUssdScreen('Luqi AI Instant SMS:\nSend your question as SMS to 38477. Zero airtime cost on MTN & Vodacom.\nReply 0 to go back.');
    } else {
      setUssdScreen(
        'Luqi STEM Lab (*384#):\n1. Simple Pendulum\n2. Ohm\'s Law\n3. Newton\'s 2nd Law\n4. Ask Luqi AI (SMS)\nReply with 1-4:'
      );
    }
    setUssdReply('');
  };

  // Handle Top-up
  const handleSimulateTopup = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessingPayment(true);
    setPaymentSuccessNotice(null);

    setTimeout(() => {
      const addedCredits = topupAmount === 50 ? 150 : topupAmount === 150 ? 500 : 3500;
      setUserCredits(prev => prev + addedCredits);
      setIsProcessingPayment(false);
      setPaymentSuccessNotice(
        `Top-up successful! Credited ${addedCredits} Luqi Credits via ${
          paymentProvider === 'PAYFAST' ? 'PayFast (Instant EFT/Card)' : `MTN MoMo (${momoPhoneNumber})`
        }.`
      );
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* 5 Clean Public Navigation Pill Tabs */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <div className="p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-wrap gap-1 shadow-lg shadow-black/40">
          <button
            onClick={() => setActiveTab('COMPANION')}
            className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'COMPANION'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>💬 Ask Khoro (AI Chat)</span>
          </button>

          <button
            onClick={() => setActiveTab('CONSUMER_SHIELD')}
            className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'CONSUMER_SHIELD'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>⚖️ Consumer & Loan Shield</span>
          </button>

          <button
            onClick={() => setActiveTab('STEM_LABS')}
            className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'STEM_LABS'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>🎓 2G-to-6G STEM Labs</span>
          </button>

          <button
            onClick={() => setActiveTab('CERT_ACADEMY')}
            className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'CERT_ACADEMY'
                ? 'bg-purple-500 text-slate-950 shadow-md shadow-purple-500/20 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>🎬 CertMaster Video Academy</span>
          </button>

          <button
            onClick={() => setActiveTab('WALLET_SUBSCRIPTION')}
            className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'WALLET_SUBSCRIPTION'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>💳 Plans & Top-Up</span>
          </button>
        </div>
      </div>

      {/* Main Tab Render Container */}
      <div className="max-w-6xl mx-auto px-4 mt-6">
        {/* ================================================================== */}
        {/* TAB 1: LIVE LUQI-AI & KHORO COMPANION CHAT */}
        {/* ================================================================== */}
        {activeTab === 'COMPANION' && (
          <div className="space-y-6">
            <HeroAiChatConsole />

            {/* Quick Consumer Shield Link */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Facing a consumer dispute or unfair business?</h4>
                  <p className="text-[11px] text-slate-400">Use our zero-hallucination Consumer Rights Legal Shield to draft a CPA Demand Notice in seconds.</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('CONSUMER_SHIELD')}
                className="text-xs px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-semibold border border-amber-500/30 flex items-center gap-1.5 transition"
              >
                <span>Open Legal Defense Shield</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 2: CONSUMER & LOAN SHIELD */}
        {/* ================================================================== */}
        {activeTab === 'CONSUMER_SHIELD' && (
          <div className="space-y-6">
            <ConsumerRightsAssistant />
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 2: 2G-TO-6G EXPERIENTIAL STEM LABS */}
        {/* ================================================================== */}
        {activeTab === 'STEM_LABS' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  2G-to-6G Experiential STEM Labs
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                    ADAPTIVE BANDWIDTH
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Adaptive physics & mathematics simulation for any African connection—from zero-data feature phones (*384#) to 60fps Runge-Kutta 4th Order Canvas.
                </p>
              </div>

              {/* Network Bandwidth Mode Switcher */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <button
                  onClick={() => setNetworkMode('2G_USSD')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${
                    networkMode === '2G_USSD' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📱 2G USSD (*384#)
                </button>
                <button
                  onClick={() => setNetworkMode('3G_SVG')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${
                    networkMode === '3G_SVG' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ⚡ 3G/4G Vector
                </button>
                <button
                  onClick={() => setNetworkMode('5G_RUNGE_KUTTA')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${
                    networkMode === '5G_RUNGE_KUTTA' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🚀 5G/6G Runge-Kutta
                </button>
              </div>
            </div>

            {/* Grade Tier Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <button
                onClick={() => setGradeLevel('PRE_SCHOOL')}
                className={`p-3 rounded-2xl border text-left transition ${
                  gradeLevel === 'PRE_SCHOOL'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-300 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-bold">1. Preschool & Early</div>
                <div className="text-[10px] text-slate-500">Shapes, colors & counts</div>
              </button>
              <button
                onClick={() => setGradeLevel('PRIMARY')}
                className={`p-3 rounded-2xl border text-left transition ${
                  gradeLevel === 'PRIMARY'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-300 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-bold">2. Primary (Gr 4-7)</div>
                <div className="text-[10px] text-slate-500">Circuits & motion</div>
              </button>
              <button
                onClick={() => setGradeLevel('HIGH_SCHOOL')}
                className={`p-3 rounded-2xl border text-left transition ${
                  gradeLevel === 'HIGH_SCHOOL'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-300 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-bold">3. High School (Gr 8-12)</div>
                <div className="text-[10px] text-slate-500">CAPS Physics & Calculus</div>
              </button>
              <button
                onClick={() => setGradeLevel('HIGHER_LEARNING')}
                className={`p-3 rounded-2xl border text-left transition ${
                  gradeLevel === 'HIGHER_LEARNING'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-300 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-bold">4. Higher Learning</div>
                <div className="text-[10px] text-slate-500">University & Engineering</div>
              </button>
            </div>

            {/* Simulation Canvas Display */}
            {networkMode === '5G_RUNGE_KUTTA' && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 font-mono text-amber-400">
                    <Activity className="w-4 h-4" />
                    <span>Runge-Kutta 4th-Order (RK4) Oscillatory Engine</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsSimulating(!isSimulating)}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium flex items-center gap-1.5"
                    >
                      {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{isSimulating ? 'Pause' : 'Resume'}</span>
                    </button>
                    <button
                      onClick={() => {
                        simState.current = { theta: Math.PI / 4, omega: 0 };
                        energyHistory.current = [];
                      }}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>

                <div className="w-full overflow-hidden rounded-2xl border border-slate-800">
                  <canvas ref={canvasRef} width={800} height={360} className="w-full h-auto block bg-slate-950" />
                </div>

                {/* Physics Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-950 border border-slate-800/80 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Gravity (g): <span className="text-white font-mono">{rkGravity.toFixed(1)} m/s²</span></label>
                    <input
                      type="range"
                      min="1.6"
                      max="24.8"
                      step="0.1"
                      value={rkGravity}
                      onChange={e => setRkGravity(parseFloat(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Moon (1.6)</span>
                      <span>Earth (9.8)</span>
                      <span>Jupiter (24.8)</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Length (L): <span className="text-white font-mono">{rkLength.toFixed(2)} m</span></label>
                    <input
                      type="range"
                      min="0.5"
                      max="2.5"
                      step="0.05"
                      value={rkLength}
                      onChange={e => setRkLength(parseFloat(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Mass (m): <span className="text-white font-mono">{rkMass.toFixed(1)} kg</span></label>
                    <input
                      type="range"
                      min="0.2"
                      max="4.0"
                      step="0.1"
                      value={rkMass}
                      onChange={e => setRkMass(parseFloat(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Air Damping (b): <span className="text-white font-mono">{rkDamping.toFixed(3)}</span></label>
                    <input
                      type="range"
                      min="0.00"
                      max="0.20"
                      step="0.005"
                      value={rkDamping}
                      onChange={e => setRkDamping(parseFloat(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3G/4G SVG Vector Mode */}
            {networkMode === '3G_SVG' && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between text-xs font-mono text-sky-400">
                  <span>ULTRA-LIGHT SVG VECTOR MODE (&lt; 2 KB Transfer)</span>
                  <span className="text-slate-400">Zero-buffer for 3G rural networks</span>
                </div>
                <div className="w-full bg-slate-950 rounded-2xl p-4 border border-slate-800 flex items-center justify-center">
                  <svg viewBox="0 0 600 240" className="w-full max-w-xl h-auto">
                    <rect width="100%" height="100%" rx="16" fill="#020617" />
                    <circle cx="150" cy="120" r="50" fill="#0d9488" opacity="0.3" stroke="#14b8a6" strokeWidth="2" />
                    <circle cx="450" cy="120" r="50" fill="#0284c7" opacity="0.3" stroke="#38bdf8" strokeWidth="2" />
                    <line x1="200" y1="120" x2="400" y2="120" stroke="#f59e0b" strokeWidth="3" strokeDasharray="6 4" />
                    <text x="150" y="125" fill="#ffffff" fontSize="15" fontFamily="monospace" fontWeight="bold" textAnchor="middle">V = 12V</text>
                    <text x="450" y="125" fill="#ffffff" fontSize="15" fontFamily="monospace" fontWeight="bold" textAnchor="middle">R = 4Ω</text>
                    <text x="300" y="105" fill="#f59e0b" fontSize="14" fontFamily="monospace" fontWeight="bold" textAnchor="middle">I = 3.00A</text>
                    <text x="300" y="195" fill="#94a3b8" fontSize="12" fontFamily="sans-serif" textAnchor="middle">Ohm's Law: V = I · R · Instant 0.6KB transfer payload</text>
                  </svg>
                </div>
              </div>
            )}

            {/* 2G Offline SMS / USSD Simulation */}
            {networkMode === '2G_USSD' && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg mx-auto space-y-4">
                <div className="text-center space-y-1">
                  <span className="text-xs font-mono text-amber-400">2G FEATURE PHONE USSD EMULATOR</span>
                  <h3 className="text-base font-bold text-white">Dial *384# (Zero Internet Required)</h3>
                </div>

                <div className="bg-emerald-950/40 border-2 border-emerald-500/40 rounded-2xl p-4 font-mono text-emerald-300 text-xs whitespace-pre-wrap leading-relaxed shadow-inner">
                  {ussdScreen}
                </div>

                <form onSubmit={handleUssdSend} className="flex gap-2">
                  <input
                    type="text"
                    value={ussdReply}
                    onChange={e => setUssdReply(e.target.value)}
                    placeholder="Enter choice (1, 2, 3, 4, 0)..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                  >
                    Send
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 3: CERTMASTER ACADEMY (ITIL 5 + CISCO CCNA/CCNP/CCIP) */}
        {/* ================================================================== */}
        {activeTab === 'CERT_ACADEMY' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  CertMaster Academy
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30 font-mono">
                    ITIL® 5 + CISCO CCNA/CCNP/CCIP
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  4-Scene Animated HTML5 Canvas Walkthrough Player and live Cisco CLI configuration guide.
                </p>
              </div>

              {/* Player Speed Controls */}
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setIsPlayingVideo(!isPlayingVideo)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold flex items-center gap-1.5"
                >
                  {isPlayingVideo ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isPlayingVideo ? 'Pause Walkthrough' : 'Play Video'}</span>
                </button>
                <button
                  onClick={() => setVideoSpeed(s => (s === 1 ? 1.5 : s === 1.5 ? 2 : 1))}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-mono"
                >
                  {videoSpeed}x
                </button>
              </div>
            </div>

            {/* 4-Scene Selector Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {[
                { scene: 1, title: 'Scene 1: Blocking', subtitle: '20s Max Age · Discard Frames' },
                { scene: 2, title: 'Scene 2: Listening', subtitle: '15s Forward Delay · BPDU RX/TX' },
                { scene: 3, title: 'Scene 3: Learning', subtitle: '15s Forward Delay · Learn MACs' },
                { scene: 4, title: 'Scene 4: Forwarding', subtitle: 'Active Convergence · Send Data' }
              ].map(item => (
                <button
                  key={item.scene}
                  onClick={() => {
                    setCurrentScene(item.scene);
                    setIsPlayingVideo(false);
                  }}
                  className={`p-3 rounded-2xl border text-left transition ${
                    currentScene === item.scene
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold shadow-md shadow-amber-500/10'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="font-bold">{item.title}</div>
                  <div className="text-[10px] text-slate-500">{item.subtitle}</div>
                </button>
              ))}
            </div>

            {/* Video Canvas Walkthrough */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="w-full overflow-hidden rounded-2xl border border-slate-800">
                <canvas ref={certCanvasRef} width={800} height={280} className="w-full h-auto block" />
              </div>

              {/* Cisco CLI Output Display */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs text-slate-300 space-y-2">
                <div className="flex items-center justify-between text-slate-500 text-[11px] pb-1 border-b border-slate-800">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-amber-400" />
                    Cisco IOS Spanning-Tree Interface State Inspection
                  </span>
                  <span>Port Gi0/1 (VLAN 1)</span>
                </div>
                <div className="text-amber-400 font-bold">
                  Switch# show spanning-tree interface GigabitEthernet0/1 detail
                </div>
                {currentScene === 1 && (
                  <div className="text-rose-400">
                    Port 1 (Gi0/1) of VLAN0001 is blocking (state: BLK)<br />
                    Port path cost 4, designated root 32769.001c.0e82.4a00<br />
                    Timers: message age 0, forward delay 0, hold 0<br />
                    BPDU: sent 0, received 42 · User frames: DROPPED
                  </div>
                )}
                {currentScene === 2 && (
                  <div className="text-amber-400">
                    Port 1 (Gi0/1) of VLAN0001 is listening (state: LIS)<br />
                    Port path cost 4, designated root 32769.001c.0e82.4a00<br />
                    Timers: forward delay 15 (electing designated/root ports)<br />
                    BPDU: sent 12, received 48 · MAC Learning: INACTIVE
                  </div>
                )}
                {currentScene === 3 && (
                  <div className="text-sky-400">
                    Port 1 (Gi0/1) of VLAN0001 is learning (state: LRN)<br />
                    Port path cost 4, designated root 32769.001c.0e82.4a00<br />
                    Timers: forward delay 15 · Populating CAM table source MACs<br />
                    BPDU: sent 19, received 55 · User frames: STILL DROPPED
                  </div>
                )}
                {currentScene === 4 && (
                  <div className="text-emerald-400">
                    Port 1 (Gi0/1) of VLAN0001 is forwarding (state: FWD)<br />
                    Port path cost 4, designated root 32769.001c.0e82.4a00<br />
                    Topology fully converged · User data frames active<br />
                    BPDU: sent 26, received 62 · CAM Entries Active
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 4: PUBLIC SUBSCRIPTION & TOKEN TOP-UP WALLET */}
        {/* ================================================================== */}
        {activeTab === 'WALLET_SUBSCRIPTION' && (
          <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  Public Subscription & Token Wallet
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono">
                    PAYFAST & MTN MOMO
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Top up credits on-demand with no recurring lock-ins. Supported via South African bank EFT, cards, or MTN Mobile Money.
                </p>
              </div>

              {/* Current Wallet Balance Card */}
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                  🪙
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Your Luqi Balance</div>
                  <div className="text-lg font-black text-white">{userCredits} Credits</div>
                </div>
              </div>
            </div>

            {/* 3 Clear Transparent Subscription Tiers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Community Tier */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between hover:border-slate-700 transition space-y-6">
                <div className="space-y-3">
                  <div className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    COMMUNITY
                  </div>
                  <div className="text-3xl font-black text-white">
                    R50 <span className="text-xs text-slate-400 font-normal">/ Pay-As-You-Go</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Ideal for students and learners accessing basic chat and 2G/3G text STEM simulations.
                  </p>
                  <ul className="text-xs text-slate-300 space-y-2 pt-2 border-t border-slate-800">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>150 Luqi Credits</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Zero-rated 2G USSD (*384#) access</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Email & community forum support</span>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => setTopupAmount(50)}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition ${
                    topupAmount === 50
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 hover:bg-slate-700 text-white'
                  }`}
                >
                  Select R50 Pack
                </button>
              </div>

              {/* Professional Tier (Recommended) */}
              <div className="rounded-3xl border-2 border-amber-500/80 bg-gradient-to-b from-amber-500/10 via-slate-900/90 to-slate-900 p-6 flex flex-col justify-between relative shadow-xl shadow-amber-500/10 space-y-6">
                <div className="space-y-3">
                  <div className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold">
                    MOST POPULAR · PROFESSIONAL
                  </div>
                  <div className="text-3xl font-black text-white">
                    R150 <span className="text-xs text-slate-400 font-normal">/ month</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Full access to 5G/6G Runge-Kutta interactive physics labs, real-time voice, and CertMaster CLI.
                  </p>
                  <ul className="text-xs text-slate-200 space-y-2 pt-2 border-t border-slate-800">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>500 Luqi Credits / month</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Full 60fps Runge-Kutta 4th-Order Canvas</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>CertMaster Cisco & ITIL Exam Simulator</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Priority neural voice synthesis</span>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => setTopupAmount(150)}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition ${
                    topupAmount === 150
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950'
                  }`}
                >
                  Select R150 Plan
                </button>
              </div>

              {/* Enterprise Tier */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between hover:border-slate-700 transition space-y-6">
                <div className="space-y-3">
                  <div className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    ENTERPRISE & SCHOOLS
                  </div>
                  <div className="text-3xl font-black text-white">
                    R950 <span className="text-xs text-slate-400 font-normal">/ month</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    High-volume credit capacity for high schools, universities, and commercial engineering teams.
                  </p>
                  <ul className="text-xs text-slate-300 space-y-2 pt-2 border-t border-slate-800">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>3,500 Luqi Credits / month</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>Full LuqiToons 3D generation studio</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>School classroom batch accounts</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>SLA uptime guarantee</span>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => setTopupAmount(950)}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition ${
                    topupAmount === 950
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 hover:bg-slate-700 text-white'
                  }`}
                >
                  Select R950 Pack
                </button>
              </div>
            </div>

            {/* Instant Checkout / Top-Up Modal Form */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 max-w-xl mx-auto space-y-5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-400" />
                Complete Instant Top-Up (R{topupAmount} ZAR)
              </h3>

              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-300 block">Select Payment Channel</label>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setPaymentProvider('PAYFAST')}
                    className={`p-3 rounded-2xl border text-left transition ${
                      paymentProvider === 'PAYFAST'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-bold">PayFast</div>
                    <div className="text-[10px] text-slate-500">Cards, Instant EFT, Zapper</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentProvider('MTN_MOMO')}
                    className={`p-3 rounded-2xl border text-left transition ${
                      paymentProvider === 'MTN_MOMO'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-bold">MTN MoMo</div>
                    <div className="text-[10px] text-slate-500">Mobile Money Wallet</div>
                  </button>
                </div>

                {paymentProvider === 'MTN_MOMO' && (
                  <div className="pt-2">
                    <label className="text-xs text-slate-400 block mb-1">MTN Mobile Number (ZA)</label>
                    <input
                      type="text"
                      value={momoPhoneNumber}
                      onChange={e => setMomoPhoneNumber(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                )}
              </div>

              {paymentSuccessNotice && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                  {paymentSuccessNotice}
                </div>
              )}

              <button
                onClick={handleSimulateTopup}
                disabled={isProcessingPayment}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-2xl text-xs transition disabled:opacity-50"
              >
                {isProcessingPayment
                  ? 'Connecting to Gateway...'
                  : `Authorize R${topupAmount} via ${paymentProvider === 'PAYFAST' ? 'PayFast' : 'MTN MoMo'}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicPlatformView;
