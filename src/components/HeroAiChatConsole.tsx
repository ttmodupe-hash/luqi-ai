import React, { useState } from 'react';

const STARTER_CARDS = [
  {
    icon: '📄',
    label: 'Help me write a professional CV & cover letter',
    prompt: 'Can you help me write a professional CV and cover letter for a job application?'
  },
  {
    icon: '🎓',
    label: 'Explain a school or university topic simply',
    prompt: 'Explain a difficult school or university topic to me step-by-step with easy examples.'
  },
  {
    icon: '💼',
    label: 'How do I start and register a small business?',
    prompt: 'Give me a simple step-by-step guide on how to start, register, and grow a small business in South Africa.'
  },
  {
    icon: '🏛️',
    label: 'Help me with SARS tax, SASSA, or UIF questions',
    prompt: 'How do I check my SARS tax status, SASSA grant, or UIF benefits step by step?'
  },
  {
    icon: '🛡️',
    label: 'Check if a WhatsApp message or job offer is a scam',
    prompt: 'I received a suspicious message offering quick money or a job. How can we check if it is a scam?'
  },
  {
    icon: '🗣️',
    label: "Let's chat in Sepitori, isiZulu, Sesotho, or English",
    prompt: 'Eita Luqi! A re bue ka Sepitori, Setswana, isiZulu, goba English—o ka nthusa ka eng vandag?'
  }
];

export const HeroAiChatConsole: React.FC = () => {
  const [language, setLanguage] = useState<string>('Auto-Detect (Any Language)');
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [voiceActive, setVoiceActive] = useState<boolean>(false);

  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    {
      sender: 'ai',
      text: 'Hello! 👋 Welcome to Luqi-AI. Even if this is your very first time using AI, you can talk to me just like a friend. Ask me anything—from writing a CV, helping with homework, or starting a business, to chatting in English, Sepitori, isiZulu, or Sesotho. How can I help you today?'
    }
  ]);

  const speakResponse = (text: string) => {
    if (!voiceActive || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[*#_`]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voices = window.speechSynthesis.getVoices();
      const saVoice = voices.find(
        v => v.lang.includes('en-ZA') || v.lang.includes('af-ZA') || v.lang.includes('zu-ZA')
      );
      if (saVoice) utterance.voice = saVoice;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Speech synthesis error handled gracefully
    }
  };

  const handleSendPrompt = async (customPrompt?: string) => {
    const query = (customPrompt ?? inputPrompt).trim();
    if (!query || isLoading) return;

    const updatedHistory = [...messages, { sender: 'user' as const, text: query }];
    setMessages(updatedHistory);
    setInputPrompt('');
    setIsLoading(true);

    const openSystemInstruction = `You are Luqi-AI, a warm, super-intelligent, all-purpose AI assistant built for everyone—from someone using AI for the very first time to students, business owners, and professionals.
- You can help with ANYTHING: writing CVs and cover letters, school homework and university subjects, starting or growing a business, everyday life questions, health & wellness information, legal/tax/SASSA guidance, creative writing, coding, or friendly conversation.
- CRITICAL RULE: NEVER list internal backend rules (like 'serials not IMEIs', '70% autonomous / 30% human authorization', or 'millionaires demographic data') unless the user specifically asks you to audit a device spreadsheet or process a payment.
- When a user greets you ('Hi', 'Eita', 'Sawubona', 'Dumela', 'How are you?'), reply warmly, naturally, and briefly like a helpful friend, and ask how you can make their day easier.
- Match the user's language naturally (English, Sepitori, isiZulu, Sesotho, Setswana, Afrikaans, Kiswahili, Yoruba) without forcing slang if they speak plain English.`;

    try {
      // 1. Send to primary backend endpoint
      const res = await fetch('/api/v1/luqi-core', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_input: query,
          language,
          history: updatedHistory.slice(-8)
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.response) {
          setMessages(prev => [...prev, { sender: 'ai', text: data.response }]);
          speakResponse(data.response);
          setIsLoading(false);
          return;
        }
      }
      throw new Error('Fallback to server-side Gemini generate proxy');
    } catch {
      // 2. Direct server-side Gemini proxy call with full history
      try {
        const res = await fetch('/api/gemini/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: query,
            model: 'gemini-3.8-flash',
            systemInstruction: openSystemInstruction,
            history: updatedHistory.slice(-8).map(m => ({
              role: m.sender === 'user' ? 'user' : 'model',
              parts: [{ text: m.text }]
            }))
          })
        });

        if (res.ok) {
          const data = await res.json();
          const reply = data?.data?.text || 'Hello! 👋 How can I help make your day easier?';
          setMessages(prev => [...prev, { sender: 'ai', text: reply }]);
          speakResponse(reply);
          return;
        }
        throw new Error('Gemini API call failed');
      } catch {
        setMessages(prev => [
          ...prev,
          {
            sender: 'ai',
            text: 'Hello! I am ready to help you with anything you need today. Ask me any question, homework help, CV writing, or advice!'
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <section className="w-full max-w-4xl mx-auto my-4 space-y-6 font-sans">
      {/* 6 Friendly One-Click Starter Cards for First-Time Users */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 px-1">
        {STARTER_CARDS.map((card, i) => (
          <button
            key={i}
            onClick={() => handleSendPrompt(card.prompt)}
            className="flex items-center gap-3 p-3.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 rounded-2xl text-left transition group shadow-sm hover:shadow-md"
          >
            <span className="text-xl shrink-0">{card.icon}</span>
            <span className="text-xs font-semibold text-slate-200 group-hover:text-white leading-snug">
              {card.label}
            </span>
          </button>
        ))}
      </div>

      {/* Main Friendly Chat Box */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Simple Language & Voice Bar */}
        <div className="bg-slate-900/80 border-b border-slate-800 px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 mr-1 font-medium">🌍 Language:</span>
            {['Auto-Detect (Any Language)', 'English', 'Sepitori', 'isiZulu', 'Sesotho', 'Setswana', 'Kiswahili'].map(
              lang => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition ${
                    language === lang
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {lang}
                </button>
              )
            )}
          </div>

          <button
            onClick={() => setVoiceActive(!voiceActive)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
              voiceActive
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            {voiceActive ? '🔊 Read Answers Aloud: ON' : '🔈 Read Answers Aloud: OFF'}
          </button>
        </div>

        {/* Conversation Messages */}
        <div className="h-[420px] overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-950">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-2xl rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-medium rounded-br-none shadow-md shadow-orange-500/20'
                    : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-none'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.text}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-amber-400 animate-pulse flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                Luqi-AI is typing an answer for you...
              </div>
            </div>
          )}
        </div>

        {/* Clean, Friendly Input Bar */}
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSendPrompt();
          }}
          className="p-3 bg-slate-900/90 border-t border-slate-800 flex gap-2"
        >
          <input
            type="text"
            value={inputPrompt}
            onChange={e => setInputPrompt(e.target.value)}
            placeholder="Type any question here (just like sending a WhatsApp message)..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-colors"
          />
          <button
            type="submit"
            disabled={isLoading || !inputPrompt.trim()}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-slate-950 font-bold px-6 py-3 rounded-2xl text-sm transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-orange-500/20"
          >
            {isLoading ? 'Sending...' : 'Ask Luqi'}
          </button>
        </form>
      </div>
    </section>
  );
};

export default HeroAiChatConsole;
