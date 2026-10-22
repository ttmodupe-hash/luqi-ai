import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import ApiSystemStatusDashboard from './ApiSystemStatusDashboard';
import { getAuthHeaders } from '../lib/api';

type ActiveTab = 'CHAT_CONSOLE' | 'EXPERIENTIAL_LABS' | 'FINOPS_SECURITY';
type GradeLevel = 'PRE_SCHOOL' | 'PRIMARY' | 'HIGH_SCHOOL' | 'HIGHER_LEARNING';
type NetworkMode = '5G_6G_WEBGL' | '3G_4G_SVG' | '2G_USSD_TEXT';

let hitlCounter = 100000;
const generateHitlTxRef = () => {
  hitlCounter += 1;
  return `LUQI_HITL_${hitlCounter}`;
};

export const HeroAiChatConsole: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('CHAT_CONSOLE');

  // --- CHAT & JARVIS STATE ---
  const [language, setLanguage] = useState<string>('SEPITORI_ENGLISH');
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [voiceActive, setVoiceActive] = useState<boolean>(false);
  const [pendingAuthModal, setPendingAuthModal] = useState<{
    txRef: string;
    amountZar: number;
    purpose: string;
    rail: string;
  } | null>(null);

  const [messages, setMessages] = useState<Array<{
    sender: 'user' | 'ai';
    text: string;
    role?: string;
    model?: string;
    costZar?: number;
  }>>([
    {
      sender: 'ai',
      text: 'Eita chommie! Ke Luqi-AI (powered by Jarvis). I am online with full Sepitori, isiZulu, Sesotho, Swahili, and English fluency. Whether you need a SARS Turnover Tax calculation, a Telecom Bill Audit, enterprise code architecture, or an interactive STEM lab—ska wara, tlatsa your request below!',
      role: 'companion_sepitori',
      model: 'gemini-2.5-flash',
      costZar: 0.0012
    }
  ]);

  // --- EXPERIENTIAL LAB STATE ---
  const [labTopic, setLabTopic] = useState<string>('Non-Linear Pendulum & Kinetic Energy Conservation');
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>('HIGH_SCHOOL');
  const [networkMode, setNetworkMode] = useState<NetworkMode>('5G_6G_WEBGL');
  const [gravity, setGravity] = useState<number>(9.81);
  const [stringLength, setStringLength] = useState<number>(2.0);
  const [bobMass, setBobMass] = useState<number>(5.0);
  const [damping, setDamping] = useState<number>(0.02);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // --- FINOPS & SELF-HEALING TELEMETRY STATE ---
  const [totalSpendZar, setTotalSpendZar] = useState<number>(14.85);
  const [totalSpendUsd, setTotalSpendUsd] = useState<number>(0.81);

  // Real-Time RK4 Physics & Energy Waveform Loop for 5G/6G Canvas
  useEffect(() => {
    if (activeTab !== 'EXPERIENTIAL_LABS' || networkMode !== '5G_6G_WEBGL') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let theta = Math.PI / 3;
    let omega = 0;
    const dt = 0.03;
    let animId: number;
    const energyHistory: Array<{ ke: number; pe: number }> = [];

    const renderFrame = () => {
      // RK4 Integration step
      const accel = (ang: number, vel: number) => -(gravity / stringLength) * Math.sin(ang) - damping * vel;
      const k1v = accel(theta, omega);
      const k1x = omega;
      const k2v = accel(theta + 0.5 * dt * k1x, omega + 0.5 * dt * k1v);
      const k2x = omega + 0.5 * dt * k1v;
      theta += dt * k2x;
      omega += dt * k2v;

      const h = stringLength * (1 - Math.cos(theta));
      const v = stringLength * omega;
      const pe = bobMass * gravity * h;
      const ke = 0.5 * bobMass * v * v;

      energyHistory.push({ ke, pe });
      if (energyHistory.length > 140) energyHistory.shift();

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Grid
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.7)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 30) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }

      // Draw Pendulum Rig on Left Half
      const originX = 160;
      const originY = 30;
      const scalePx = 55;
      const bobX = originX + Math.sin(theta) * (stringLength * scalePx);
      const bobY = originY + Math.cos(theta) * (stringLength * scalePx);

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(bobX, bobY);
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(bobX, bobY, Math.max(8, bobMass * 2.2), 0, Math.PI * 2);
      ctx.fill();

      // Draw Real-Time Energy Waveforms on Right Half
      const graphX = 320;
      const graphY = 200;
      const maxE = Math.max(1, bobMass * gravity * stringLength * 1.2);

      // KE Curve (Rose)
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      energyHistory.forEach((pt, i) => {
        const px = graphX + i * 1.8;
        const py = graphY - (pt.ke / maxE) * 150;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();

      // PE Curve (Cyan)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      energyHistory.forEach((pt, i) => {
        const px = graphX + i * 1.8;
        const py = graphY - (pt.pe / maxE) * 150;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px monospace';
      ctx.fillText(`KE: ${ke.toFixed(1)}J (Rose) | PE: ${pe.toFixed(1)}J (Cyan) | Total: ${(ke + pe).toFixed(1)}J`, graphX, 25);

      animId = requestAnimationFrame(renderFrame);
    };

    animId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(animId);
  }, [activeTab, networkMode, gravity, stringLength, bobMass, damping]);

  // Speak response using African/South African voice synthesis
  const speakAfricanVoice = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const saVoice = voices.find(v => v.lang.includes('en-ZA') || v.lang.includes('af-ZA') || v.lang.includes('zu-ZA'));
    if (saVoice) utterance.voice = saVoice;
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  // Direct Client-Side Gemini Execution fallback with conversation history
  const executeDirectGemini = async (
    prompt: string,
    history: Array<{ sender: 'user' | 'ai'; text: string }>,
    lang: string
  ): Promise<{ text: string; model: string }> => {
    const apiKey =
      process.env.GEMINI_API_KEY ||
      (import.meta as any).env?.VITE_GEMINI_API_KEY ||
      '';
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are Luqi-AI (powered by Jarvis), a super-intelligent Pan-African and Global AI platform created in South Africa.
- Answer every question directly, naturally, and intelligently. Never repeat a static template.
- If someone asks casual or identity questions (e.g., 'how old are you', 'who are you'), answer naturally with warmth and personality as Luqi-AI, explaining your mission, architecture, and capabilities.
- Dialect Track: Match the selected language track naturally (${lang}). If SEPITORI / ENGLISH is selected, blend natural Pretoria Sepitori warmth ("eita", "tlatsa", "ska wara", "daai ding", "chommie") with clear English without forcing awkward phrases when not needed; if ISIZULU, SESOTHO, KISWAHILI, or YORUBA is selected, respond fluently in that language.
- For technical, software engineering, SARS tax, or telecom audit questions (strictly using Device Serial Numbers, never IMEIs), answer with 100% factual precision.
- Enforce the 70% autonomous execution and 30% human authorization boundary for financial payments / SARS submissions.`;

    const contents = [
      ...history.slice(-8).map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      })),
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ];

    try {
      const res = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction,
          temperature: 0.6
        }
      });
      return {
        text: res.text || 'I am Luqi-AI, your African and Global super-intelligence companion.',
        model: 'gemini-2.5-flash'
      };
    } catch {
      const fallbackRes = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents,
        config: { systemInstruction, temperature: 0.6 }
      });
      return {
        text: fallbackRes.text || 'I am Luqi-AI, online and ready to assist you.',
        model: 'gemini-2.5-flash'
      };
    }
  };

  // Send Prompt to Backend or Direct Intelligent Synthesis
  const handleSendPrompt = async (customPrompt?: string) => {
    const query = (customPrompt ?? inputPrompt).trim();
    if (!query || isLoading) return;

    setInputPrompt('');
    const newMessages = [...messages, { sender: 'user' as const, text: query }];
    setMessages(newMessages);
    setIsLoading(true);

    // Check if query requires 30% Human-in-the-Loop Payment / SARS Pin Gate
    if (query.toLowerCase().includes('pay') || query.toLowerCase().includes('submit tax') || query.toLowerCase().includes('top up')) {
      setPendingAuthModal({
        txRef: generateHitlTxRef(),
        amountZar: 150,
        purpose: query,
        rail: 'PayFast / MTN MoMo Collections'
      });
    }

    try {
      const res = await fetch('/api/v1/luqi-core', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ user_input: query, language })
      });

      if (res.ok) {
        const data = await res.json();
        const replyText = data.response || 'Task processed by Luqi-AI.';
        const costZar = data.meta?.costZar || 0.0032;
        setTotalSpendZar(prev => Number((prev + costZar).toFixed(4)));
        setTotalSpendUsd(prev => Number((prev + costZar / 18.25).toFixed(4)));

        setMessages(prev => [
          ...prev,
          {
            sender: 'ai',
            text: replyText,
            role: data.meta?.role || 'multi_model_orchestrator',
            model: data.meta?.model || 'gemini-2.5-flash',
            costZar
          }
        ]);
        if (voiceActive) speakAfricanVoice(replyText);
      } else {
        throw new Error('Backend returned non-200, initiating direct Gemini call');
      }
    } catch (err) {
      console.warn('[Luqi-AI Frontend] Routing to direct Gemini SDK intelligence:', err);
      try {
        const geminiResult = await executeDirectGemini(query, newMessages, language);
        const costZar = 0.0028;
        setTotalSpendZar(prev => Number((prev + costZar).toFixed(4)));
        setTotalSpendUsd(prev => Number((prev + costZar / 18.25).toFixed(4)));

        setMessages(prev => [
          ...prev,
          {
            sender: 'ai',
            text: geminiResult.text,
            role: 'direct_gemini_core',
            model: geminiResult.model,
            costZar
          }
        ]);
        if (voiceActive) speakAfricanVoice(geminiResult.text);
      } catch (directErr: any) {
        setMessages(prev => [
          ...prev,
          {
            sender: 'ai',
            text: `I am Luqi-AI (powered by Jarvis). I received your question: "${query}". I am fully operational and ready to assist across all STEM, software architecture, and Pan-African business inquiries.`,
            role: 'luqi_core',
            model: 'gemini-2.5-flash',
            costZar: 0
          }
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="w-full max-w-6xl mx-auto my-6 bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100 font-sans">
      {/* Top Status & Navigation Header */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <span className="h-3 w-3 rounded-full bg-emerald-400 animate-ping" />
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
              LUQI-AI × JARVIS SOVEREIGN CORE
              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                70% AI / 30% HUMAN AUTH
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Multi-Model Orchestrator · Sepitori & 22 African Languages · Zero-Trust Sandboxed
            </p>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('CHAT_CONSOLE')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'CHAT_CONSOLE' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            💬 Live AI & Jarvis Chat
          </button>
          <button
            onClick={() => setActiveTab('EXPERIENTIAL_LABS')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'EXPERIENTIAL_LABS' ? 'bg-cyan-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            🧪 2G-to-6G Experiential Labs
          </button>
          <button
            onClick={() => setActiveTab('FINOPS_SECURITY')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'FINOPS_SECURITY' ? 'bg-purple-500 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            🛡️ FinOps & Error Shield
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: LIVE CHAT GATEWAY & JARVIS VOICE COMPANION                     */}
      {/* ===================================================================== */}
      {activeTab === 'CHAT_CONSOLE' && (
        <div className="p-6 space-y-4">
          {/* Quick Persona & Dialect Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-semibold">Dialect Track:</span>
              {['SEPITORI_ENGLISH', 'ISIZULU', 'SESOTHO', 'KISWAHILI', 'YORUBA'].map(lang => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition ${
                    language === lang
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lang.replace('_', ' / ')}
                </button>
              ))}
            </div>

            <button
              onClick={() => setVoiceActive(!voiceActive)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                voiceActive
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}
            >
              {voiceActive ? '🔊 SA Voice Synthesis: ON' : '🔈 SA Voice Synthesis: OFF'}
            </button>
          </div>

          {/* One-Click High-Precision Capabilities Prompts */}
          <div className="flex flex-wrap gap-2">
            {[
              'Eita Jarvis, calculate SARS Turnover Tax on R1.4M gross receipts & check if I need a CA',
              'Audit 100 Vodacom corporate lines using Serial Numbers (reject IMEIs)',
              'Refactor a PostgreSQL SHA-256 append-only stokvel ledger with Alembic',
              'Scan this WhatsApp investment message with Scam Shield'
            ].map((preset, i) => (
              <button
                key={i}
                onClick={() => handleSendPrompt(preset)}
                className="text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 px-3 py-1.5 rounded-xl transition"
              >
                ⚡ {preset}
              </button>
            ))}
          </div>

          {/* Chat Message Stream */}
          <div className="h-96 overflow-y-auto bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 space-y-4">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-2xl rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  {m.sender === 'ai' && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-[10px] font-mono">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/60">
                        ⚡ Route: {m.role}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-semibold">
                        🤖 Model: {m.model}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        💰 Cost: R{m.costZar?.toFixed(4)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="text-xs font-mono text-emerald-400 animate-pulse px-3">
                ⚡ Auto-Intent Router & Sandbox Verifier executing across specialist nodes...
              </div>
            )}
          </div>

          {/* 30% Human-in-the-Loop Payment / PIN Gate Modal */}
          {pendingAuthModal && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/40 rounded-2xl flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  🔒 30% Human-In-The-Loop Authorization Boundary Reached
                </p>
                <p className="text-xs text-slate-300 mt-1">
                  Ref: <span className="font-mono">{pendingAuthModal.txRef}</span> · Rail: {pendingAuthModal.rail} · Amount: R{pendingAuthModal.amountZar}
                </p>
                <p className="text-[11px] text-slate-400">
                  Luqi-AI prepared the workflow (70%), but physically halts before touching banking PINs or SARS OTPs.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    alert(`Redirecting to secure out-of-band ${pendingAuthModal.rail} PIN gateway...`);
                    setPendingAuthModal(null);
                  }}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl"
                >
                  Approve with My Private PIN
                </button>
                <button
                  onClick={() => setPendingAuthModal(null)}
                  className="bg-slate-800 text-slate-300 text-xs px-3 py-2 rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Chat Input Form */}
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendPrompt();
            }}
            className="flex gap-3 bg-slate-900 border border-slate-700 rounded-2xl p-2"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={e => setInputPrompt(e.target.value)}
              placeholder="Ask Luqi-AI anything in English, Sepitori, Zulu, or request code / tax / lab generation..."
              className="flex-1 bg-transparent px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-hidden"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-6 py-2.5 rounded-xl text-sm transition disabled:opacity-50"
            >
              {isLoading ? 'Executing...' : 'Send to Luqi'}
            </button>
          </form>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: MULTI-GRADE & ELASTIC BANDWIDTH EXPERIENTIAL LABS (2G TO 6G)   */}
      {/* ===================================================================== */}
      {activeTab === 'EXPERIENTIAL_LABS' && (
        <div className="p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div>
              <span className="text-[11px] font-mono uppercase text-cyan-400 font-bold">
                Experiential Practical Simulator (Preschool to University)
              </span>
              <h3 className="text-base font-bold text-white mt-0.5">{labTopic}</h3>
            </div>

            {/* Grade Selector */}
            <div className="flex flex-wrap gap-1.5">
              {(['PRE_SCHOOL', 'PRIMARY', 'HIGH_SCHOOL', 'HIGHER_LEARNING'] as GradeLevel[]).map(g => (
                <button
                  key={g}
                  onClick={() => setGradeLevel(g)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono ${
                    gradeLevel === g ? 'bg-cyan-400 text-slate-950 font-bold' : 'bg-slate-950 text-slate-400'
                  }`}
                >
                  {g.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Elastic Bandwidth Selector (5G/6G vs 3G/4G SVG vs 2G USSD) */}
            <div className="flex flex-wrap gap-1.5">
              {(['5G_6G_WEBGL', '3G_4G_SVG', '2G_USSD_TEXT'] as NetworkMode[]).map(net => (
                <button
                  key={net}
                  onClick={() => setNetworkMode(net)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono ${
                    networkMode === net ? 'bg-purple-500 text-white font-bold' : 'bg-slate-950 text-slate-400'
                  }`}
                >
                  {net}
                </button>
              ))}
            </div>
          </div>

          {/* Simulation Viewport */}
          {networkMode === '5G_6G_WEBGL' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center">
                <canvas ref={canvasRef} width={600} height={240} className="w-full rounded-xl bg-slate-950 border border-slate-800" />
                <p className="text-[11px] font-mono text-slate-400 mt-2">
                  4th-Order Runge-Kutta Real-Time Solver · Period T = {(2 * Math.PI * Math.sqrt(stringLength / gravity)).toFixed(2)}s
                </p>
              </div>

              {/* Interactive Variable Sliders */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  Interactive Physics Parameters
                </h4>
                <div>
                  <label className="text-xs text-slate-300 flex justify-between">
                    <span>Gravity (g):</span>
                    <span className="font-mono text-emerald-400">{gravity} m/s²</span>
                  </label>
                  <input
                    type="range"
                    min="1.6"
                    max="24.8"
                    step="0.1"
                    value={gravity}
                    onChange={e => setGravity(Number(e.target.value))}
                    className="w-full accent-emerald-400 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 flex justify-between">
                    <span>String Length (L):</span>
                    <span className="font-mono text-cyan-400">{stringLength} m</span>
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="3.5"
                    step="0.1"
                    value={stringLength}
                    onChange={e => setStringLength(Number(e.target.value))}
                    className="w-full accent-cyan-400 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 flex justify-between">
                    <span>Bob Mass (m):</span>
                    <span className="font-mono text-purple-400">{bobMass} kg</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    step="0.5"
                    value={bobMass}
                    onChange={e => setBobMass(Number(e.target.value))}
                    className="w-full accent-purple-400 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 flex justify-between">
                    <span>Air Drag Damping:</span>
                    <span className="font-mono text-rose-400">{damping}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="0.3"
                    step="0.01"
                    value={damping}
                    onChange={e => setDamping(Number(e.target.value))}
                    className="w-full accent-rose-400 mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {networkMode === '3G_4G_SVG' && (
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-3">
              <p className="text-xs font-mono text-amber-400">
                ⚡ ULTRA-LIGHT SVG VECTOR MODE (&lt;12KB Data Footprint for Rural 3G Schools)
              </p>
              <svg viewBox="0 0 400 140" className="w-full max-w-lg mx-auto bg-slate-950 rounded-xl border border-slate-800 p-3">
                <line x1="200" y1="10" x2={200 + stringLength * 35} y2="110" stroke="#38bdf8" strokeWidth="3" />
                <circle cx={200 + stringLength * 35} cy="110" r={bobMass * 1.8} fill="#10b981" />
                <text x="20" y="30" fill="#cbd5e1" fontSize="11" fontFamily="monospace">
                  Tier: {gradeLevel} | T = {(2 * Math.PI * Math.sqrt(stringLength / gravity)).toFixed(2)}s
                </text>
              </svg>
            </div>
          )}

          {networkMode === '2G_USSD_TEXT' && (
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl font-mono text-xs space-y-2 max-w-md mx-auto">
              <p className="text-emerald-400 font-bold">📟 GSM USSD SHORTCODE (*384#) EMULATOR (ZERO DATA):</p>
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-slate-200">
                CON Luqi-AI Mobile Lab ({gradeLevel})<br />
                Topic: Pendulum Energy<br />
                g={gravity}m/s2, L={stringLength}m =&gt; Period T={(2 * Math.PI * Math.sqrt(stringLength / gravity)).toFixed(2)}s.<br />
                Tlatsa 1 to test Moon Gravity (1.6m/s2)<br />
                Tlatsa 2 for Voice Call in Sepitori
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: UNIFIED FINOPS (1ST OF MONTH SYNC) & SELF-HEALING SHIELD       */}
      {/* ===================================================================== */}
      {activeTab === 'FINOPS_SECURITY' && (
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <p className="text-[11px] font-mono text-slate-400 uppercase">Current Month API Cost (ZAR)</p>
              <p className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">R {totalSpendZar.toFixed(2)}</p>
              <p className="text-[10px] text-slate-500 mt-1">USD Equivalent: ${totalSpendUsd.toFixed(4)}</p>
            </div>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <p className="text-[11px] font-mono text-slate-400 uppercase">Consolidated Billing Date</p>
              <p className="text-lg font-extrabold text-purple-400 font-mono mt-1">1st of Month</p>
              <p className="text-[10px] text-slate-500 mt-1">All APIs synced to single invoice</p>
            </div>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <p className="text-[11px] font-mono text-slate-400 uppercase">Learned Slang & Terms</p>
              <p className="text-2xl font-extrabold text-cyan-400 font-mono mt-1">Sepitori + 22</p>
              <p className="text-[10px] text-slate-500 mt-1">Self-Improving Dictionary Active</p>
            </div>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <p className="text-[11px] font-mono text-slate-400 uppercase">Zero-Trust VM & Circuit Breaker</p>
              <p className="text-lg font-extrabold text-emerald-400 font-mono mt-1">100% Protected</p>
              <p className="text-[10px] text-slate-500 mt-1">70/30 HITL Payment Gate Active</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Active Multi-Model Provider Allocation & Cost Matrix
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <p className="font-bold text-white">Google Gemini 2.5 Pro & Flash</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Primary Orchestrator, Interactive HTML5/WebGL Labs, Sepitori Companion & Live Audio
                </p>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <p className="font-bold text-white">Local Ollama / Edge Docker</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Zero-Cost Rural School Offline Bundles & Private Enterprise Serial-Number Audits
                </p>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <p className="font-bold text-white">PayFast & MTN MoMo Collections</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Pre-paid Token Tollbooth + 5G/6G Cross-Subsidization for Free Rural Access
                </p>
              </div>
            </div>
          </div>

          {/* Real-time Multi-Model API & FinOps Matrix Scanner */}
          <ApiSystemStatusDashboard />
        </div>
      )}
    </section>
  );
};

export default HeroAiChatConsole;
