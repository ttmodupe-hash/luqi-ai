import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';

export const SOVEREIGN_AGENT_NAME = 'KHORO';
export const SOVEREIGN_AGENT_MEANING =
  'The Digital Council of Wisdom — Inspired by the traditional African Khoro/Kgotla courtyard where thinkers gather to solve problems, settle disputes, and guide the community.';

const FIRST_TIME_STARTER_CARDS = [
  {
    icon: '🏦',
    label: 'How Loan Interest & Debt Traps Work',
    prompt:
      'Explain in simple Rand terms how banks calculate interest on a Home Loan, Car Loan (with a balloon payment), and Credit Card—and how I can save thousands and avoid rogue Debt Counselling (Form 16) traps.'
  },
  {
    icon: '⚖️',
    label: 'Consumer Rights & Ombud Guide',
    prompt:
      'A business sold me defective goods or treated me unfairly. Explain my rights under the Consumer Protection Act (CPA Section 56) and step-by-step how I report them to the Ombudsman or NCC.'
  },
  {
    icon: '📄',
    label: 'Write a Winning CV & Cover Letter',
    prompt:
      'Help me write a clean, professional CV and cover letter tailored for the South African and global job market.'
  },
  {
    icon: '🌍',
    label: 'Economics, Trade & Law Deep-Dive',
    prompt:
      'Break down how global trade inequities, workforce brain drain, and South African legislative updates impact local businesses and workers.'
  },
  {
    icon: '🏛️',
    label: 'SARS Tax, CIPC BizPortal & UIF',
    prompt:
      'Guide me step-by-step on registering a company on the official CIPC BizPortal (for R125 without middlemen), checking SARS Turnover Tax, or claiming UIF.'
  },
  {
    icon: '🗣️',
    label: 'Chat in Sepitori, Zulu, Sotho or English',
    prompt:
      'Eita Khoro! A re bue ka Sepitori, Setswana, isiZulu, goba English—mpuleleori gore o ka nthusa ka eng vandag!'
  }
];

export const HeroAiChatConsole: React.FC = () => {
  const [languageFlow, setLanguageFlow] = useState<string>('🔄 Auto-Detect (Flexible Code-Switching)');
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [voiceActive, setVoiceActive] = useState<boolean>(false);

  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    {
      sender: 'ai',
      text: `Hello & Eita! 👋 Welcome to **Luqi-AI**, powered by **${SOVEREIGN_AGENT_NAME}**.\n\n*In Setswana, Sepedi, Sesotho, and Tshivenda, the **Khoro** is the central gathering courtyard where wisdom, problem-solving, and community protection meet.*\n\nEven if this is your very first time using AI, you can talk to me just like a trusted friend in **English, Sepitori, isiZulu, Sesotho, Setswana, Kiswahili, Yoruba**, or mix them freely. Ask me **anything**—from exposing hidden bank loan interest and fighting consumer disputes, to school/university subjects, macro-economics, coding, or writing a CV!`
    }
  ]);

  const speakResponse = (text: string) => {
    if (!voiceActive || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    const saVoice = voices.find(v => v.lang.includes('en-ZA') || v.lang.includes('af-ZA') || v.lang.includes('zu-ZA'));
    if (saVoice) utterance.voice = saVoice;
    window.speechSynthesis.speak(utterance);
  };

  const handleSendPrompt = async (customPrompt?: string) => {
    const query = (customPrompt ?? inputPrompt).trim();
    if (!query || isLoading) return;

    const updatedHistory = [...messages, { sender: 'user' as const, text: query }];
    setMessages(updatedHistory);
    setInputPrompt('');
    setIsLoading(true);

    const khoroSystemInstruction = `
      You are KHORO (Knowledge, Heuristic Orchestration & Reasoning Overseer), the sovereign super-intelligence brain inside Luqi-AI.
      Cultural Meaning: "Khoro" is the traditional African council courtyard where wisdom, justice, and problem-solving unite.

      CORE DIRECTIVES:
      1. UNRESTRICTED ALL-TOPIC MASTERY: You help first-time AI users, students, consumers, and executives with ANY topic—macro-economics, global trade, constitutional & property law, STEM subjects, software engineering, CVs, health/wellness info, and everyday questions.
      2. MULTI-TURN MEMORY & TYPO RESOLUTION: Always read the conversation history so short follow-ups ("in south africa", "ke ba ba kae?", "and on a car?") connect seamlessly to the previous turn. Decode typos phonetically (e.g., "polotision" = politician).
      3. CONSUMER LAW & FINANCIAL SAVER CHAMPION:
         - Loans & Interest: Explain daily/monthly compounding interest on Home Loans, Car Loans (exposing balloon payment traps), Personal Loans, and Credit Cards with clear Rand figures and tips to slash years off debt.
         - Rogue Debt Counselling Defense: Warn consumers about Form 16 / Form 17.2 traps that lock them at credit bureaus without informed consent, and guide them to report abuse to the National Credit Regulator (NCR: 0860 627 627) or National Consumer Tribunal.
         - Mashonisa Protection: Cite NCA Section 40—retaining a consumer's ID book, bank card, or SASSA card/PIN is a criminal offense.
         - Ombud & CPA Guide: Explain CPA Section 56 (6-month warranty on defective goods) and how to escalate to the Banking Ombud, Credit Ombud, NCC, or ICASA after giving the supplier 20 business days.
         - Official Portals Only: Direct entrepreneurs to official CIPC BizPortal (bizportal.gov.za) and workers to official UIF uFiling so they never get overcharged by middlemen.
      4. FLUID CODE-SWITCHING (${languageFlow}): Naturally mirror the user's language or mix of languages (English, Sepitori, Setswana, isiZulu, Sesotho, Afrikaans, Kiswahili, Yoruba). Never dump internal backend engineering rules into public chat.
    `;

    try {
      const res = await fetch('/api/v1/luqi-core', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_input: query,
          language: languageFlow,
          history: updatedHistory.slice(-12)
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (
          data.response &&
          !data.response.includes('sovereign fallback protocol') &&
          !data.response.includes('1. Core Principles: In general chat')
        ) {
          setMessages(prev => [...prev, { sender: 'ai', text: data.response }]);
          speakResponse(data.response);
          setIsLoading(false);
          return;
        }
      }
      throw new Error('Switch to direct client SDK');
    } catch {
      try {
        const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (process as any).env?.GEMINI_API_KEY;
        const ai = new GoogleGenAI({ apiKey });

        const formattedContents = updatedHistory.slice(-12).map(m => ({
          role: m.sender === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }]
        }));

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: formattedContents,
          config: {
            systemInstruction: khoroSystemInstruction,
            tools: [{ googleSearch: {} }],
            temperature: 0.35
          }
        });

        const reply = response.text || 'Khoro is here with you. Tell me more about what you would like to solve.';
        setMessages(prev => [...prev, { sender: 'ai', text: reply }]);
        speakResponse(reply);
      } catch {
        setMessages(prev => [
          ...prev,
          {
            sender: 'ai',
            text: 'Khoro is online—please check your connection or send your question again so we can sort it out straight.'
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <section className="w-full max-w-4xl mx-auto my-4 space-y-6 font-sans">
      {/* Welcoming Hero Banner with Khoro Cultural Translation */}
      <div className="text-center space-y-2 px-4">
        <span className="inline-block px-3.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
          🌍 Powered by KHORO · The Digital Council of Wisdom
        </span>
        <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">
          Ask Anything. Learn Anything. Protect Your Rights.
        </h1>
        <p className="text-xs md:text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
          {SOVEREIGN_AGENT_MEANING}
        </p>
      </div>

      {/* 6 Beginner-Friendly Starter Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 px-2">
        {FIRST_TIME_STARTER_CARDS.map((card, i) => (
          <button
            key={i}
            onClick={() => handleSendPrompt(card.prompt)}
            className="flex items-center gap-3 p-3.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 rounded-2xl text-left transition group"
          >
            <span className="text-xl">{card.icon}</span>
            <span className="text-xs font-semibold text-slate-200 group-hover:text-white leading-snug">
              {card.label}
            </span>
          </button>
        ))}
      </div>

      {/* Main Khoro Chat Interface */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Flexible Code-Switching Language Selector */}
        <div className="bg-slate-900/80 border-b border-slate-800 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 mr-1 font-semibold">🗣️ Language Flow:</span>
            {[
              '🔄 Auto-Detect (Flexible Code-Switching)',
              'English',
              'Sepitori / English Mix',
              'isiZulu',
              'Sesotho / Setswana',
              'Kiswahili',
              'Yoruba'
            ].map(lang => (
              <button
                key={lang}
                onClick={() => setLanguageFlow(lang)}
                className={`px-2.5 py-1 rounded-lg transition ${
                  languageFlow === lang
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>

          <button
            onClick={() => setVoiceActive(!voiceActive)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
              voiceActive
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800'
            }`}
          >
            {voiceActive ? '🔊 Khoro Voice: ON' : '🔈 Khoro Voice: OFF'}
          </button>
        </div>

        {/* Message Feed (Clean for Public Users — No Confusing Technical Route Badges) */}
        <div className="h-[430px] overflow-y-auto p-5 space-y-4 bg-slate-950">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-2xl rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-none'
                    : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-none'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.text}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-emerald-400 animate-pulse">
                Khoro is deliberating and verifying facts...
              </div>
            </div>
          )}
        </div>

        {/* Simple WhatsApp-Style Input Box */}
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSendPrompt();
          }}
          className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2"
        >
          <input
            type="text"
            value={inputPrompt}
            onChange={e => setInputPrompt(e.target.value)}
            placeholder="Ask Khoro anything in English, Sepitori, Zulu, or any mix of languages..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-6 py-3 rounded-2xl text-sm transition disabled:opacity-50"
          >
            {isLoading ? 'Thinking...' : 'Ask Khoro'}
          </button>
        </form>
      </div>
    </section>
  );
};

export default HeroAiChatConsole;
