import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';

export const SOVEREIGN_AGENT_NAME = 'KHORO';
export const SOVEREIGN_AGENT_MEANING =
  'The Digital Council of Wisdom — Inspired by the traditional African Khoro/Kgotla courtyard where thinkers gather to solve problems, settle disputes, and guide the community.';

const FIRST_TIME_STARTER_CARDS = [
  {
    icon: '🚗',
    label: 'Car Loan Arrears & Repossession Shield',
    prompt:
      'i have not being paying my car for 3 month , can you advise ?'
  },
  {
    icon: '📚',
    label: 'DBE Mother-Tongue Exam Transliterator',
    prompt:
      'How does the Mother-Tongue Exam Transliterator help high school and Matric learners pass Physical Sciences and Maths in their own language?'
  },
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

export const NCA_CAR_ARREARS_SHIELD = `**🚨 KHORO EMERGENCY DEBT SHIELD: NATIONAL CREDIT ACT (NCA) REPOSSESSION PROTECTION**

Do not panic, but act immediately. You have powerful legal protections under South African law that prevent banks and debt collectors from simply taking your car.

### 1. The Bank Cannot Repossess Without a Court Order (Section 130)
Under Section 130 of the National Credit Act (NCA 34 of 2005):
- **No "Self-Help" Repossession:** A bank, tracing agent, or debt collector **CANNOT legally tow or take your vehicle** from your driveway, place of work, or a parking lot without an original **Warrant of Execution (Court Order)** issued by a Magistrate or High Court and delivered in person by an official **Sheriff of the Court**.
- A repo agent with a clipboard, private tow truck, or bank letterhead has **NO legal power** to confiscate your car.

### 2. The 20-Day & Section 129 Notice Rule
- You must be in arrears for at least **20 business days**.
- The bank must send you a formal **Section 129 Letter of Demand** by registered post or agreed electronic delivery.
- You have at least **10 business days** from receiving the Section 129 notice to respond, propose a payment arrangement, or refer the matter to a debt counsellor or the National Financial Ombud Scheme.
- Until those 10 business days expire without resolution, the bank is legally barred from issuing a court summons against you.

### 3. ⚠️ BEWARE THE "VOLUNTARY SURRENDER" (SECTION 127) TRAP
- Rogue repo agents often arrive and tell you: *"Sign this paper to show I inspected the car,"* or *"Sign here so we can hold the car while you sort out the bank."*
- **DO NOT SIGN ANYTHING.** This is almost always a disguised **Section 127 Voluntary Surrender Form**.
- If you sign it, you voluntarily hand over your car, forfeiting all your court protections. The bank will auction your car for pennies on the dollar, and you will still owe the massive remaining shortfall.

### 4. Immediate Action Plan (Do This Today):
1. **Call Your Bank's Distressed Assets / Vehicle Finance Team:** (e.g. WesBank, MFC/Nedbank, Standard Bank, Absa). Request a payment restructure, term extension (e.g. from 54 to 72 months to lower monthly installments), or a temporary payment holiday.
2. **Check Your Credit Life Insurance:** Look at your financing contract. If you suffered retrenchment, reduction in work hours, injury, or illness, your mandatory Credit Life Insurance policy is required by law to pay your car installments for up to 6–12 months!
3. **Keep the Vehicle Parked on Private Property:** Repo agents cannot enter locked private property without a court order.
4. **Escalate Harassment:** If debt collectors intimidate or threaten you, lodge an urgent complaint with the **National Credit Regulator (NCR: 0860 627 627)** and the **National Financial Ombud Scheme (NFO: 0860 800 900)**.`;

/**
 * Clean helper function that renders **bold**, *italic*, headers, and line breaks
 * so users never see raw asterisks in the chat bubbles.
 */
export function renderFormattedText(text: string): React.ReactNode {
  if (!text) return null;

  // Split into lines to preserve paragraphs and bullets
  const lines = text.split('\n');

  return lines.map((line, lineIdx) => {
    // Heading 3: ### Heading
    if (line.startsWith('### ')) {
      return (
        <h4 key={lineIdx} className="text-sm font-extrabold text-amber-400 mt-3 mb-1">
          {parseInlineFormatting(line.replace('### ', ''))}
        </h4>
      );
    }
    // Heading 2: ## Heading
    if (line.startsWith('## ')) {
      return (
        <h3 key={lineIdx} className="text-base font-black text-emerald-400 mt-3 mb-1">
          {parseInlineFormatting(line.replace('## ', ''))}
        </h3>
      );
    }
    // Bullet item: - or *
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return (
        <div key={lineIdx} className="flex items-start gap-2 ml-2 my-0.5">
          <span className="text-emerald-400 font-bold shrink-0">•</span>
          <span className="text-slate-100">{parseInlineFormatting(line.substring(2))}</span>
        </div>
      );
    }
    // Numbered item: 1. or 2.
    const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      return (
        <div key={lineIdx} className="flex items-start gap-2 ml-2 my-0.5">
          <span className="text-cyan-400 font-bold shrink-0">{numMatch[1]}.</span>
          <span className="text-slate-100">{parseInlineFormatting(numMatch[2])}</span>
        </div>
      );
    }

    if (!line.trim()) {
      return <div key={lineIdx} className="h-2" />;
    }

    return (
      <p key={lineIdx} className="my-1 text-slate-100 leading-relaxed">
        {parseInlineFormatting(line)}
      </p>
    );
  });
}

function parseInlineFormatting(str: string): React.ReactNode {
  // Replace **bold** and *italic* safely into React elements
  const parts: React.ReactNode[] = [];
  let remaining = str;
  let keyCounter = 0;

  // Match **bold** or *italic*
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/;

  while (remaining) {
    const match = remaining.match(regex);
    if (!match || match.index === undefined) {
      parts.push(remaining);
      break;
    }

    // Text before match
    if (match.index > 0) {
      parts.push(remaining.substring(0, match.index));
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      const boldText = token.slice(2, -2);
      parts.push(
        <strong key={keyCounter++} className="font-bold text-white">
          {boldText}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      const italicText = token.slice(1, -1);
      parts.push(
        <em key={keyCounter++} className="italic text-slate-300">
          {italicText}
        </em>
      );
    }

    remaining = remaining.substring(match.index + token.length);
  }

  return <>{parts}</>;
}

export const HeroAiChatConsole: React.FC = () => {
  const [languageFlow, setLanguageFlow] = useState<string>('🔄 Auto-Detect (Flexible Code-Switching)');
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [voiceActive, setVoiceActive] = useState<boolean>(false);

  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    {
      sender: 'ai',
      text: `Hello & Eita! 👋 Welcome to **Luqi-AI**, powered by **${SOVEREIGN_AGENT_NAME}**.\n\n*In Setswana, Sepedi, Sesotho, and Tshivenda, the **Khoro** is the central gathering courtyard where wisdom, problem-solving, and community protection meet.*\n\nEven if this is your very first time using AI, you can talk to me just like a trusted friend in **English, Sepitori, isiZulu, Sesotho, Setswana, Kiswahili, Yoruba**, or mix them freely. Ask me **anything**—from exposing hidden bank loan interest and car repossession laws, to DBE mother-tongue matric exam transliterations, macro-economics, or writing a CV!`
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

    const lowerQuery = query.toLowerCase();

    // 1. Critical Immediate Protection: Car Arrears / Vehicle Repossession Shield
    if (
      (lowerQuery.includes('car') || lowerQuery.includes('vehicle') || lowerQuery.includes('motor')) &&
      (lowerQuery.includes('month') || lowerQuery.includes('not pay') || lowerQuery.includes('arrear') || lowerQuery.includes('repossession') || lowerQuery.includes('repo') || lowerQuery.includes('tow'))
    ) {
      setMessages(prev => [...prev, { sender: 'ai', text: NCA_CAR_ARREARS_SHIELD }]);
      speakResponse('Do not panic. You have powerful legal protections under the National Credit Act. The bank cannot take your car without a Court Order.');
      setIsLoading(false);
      return;
    }

    const khoroSystemInstruction = `
      You are KHORO (Knowledge, Heuristic Orchestration & Reasoning Overseer), the sovereign super-intelligence brain inside Luqi-AI.
      Cultural Meaning: "Khoro" is the traditional African council courtyard where wisdom, justice, and problem-solving unite.

      CORE DIRECTIVES:
      1. UNRESTRICTED ALL-TOPIC MASTERY: You help first-time AI users, students, consumers, and executives with ANY topic—macro-economics, global trade, constitutional & property law, STEM subjects, software engineering, CVs, health/wellness info, and everyday questions.
      2. MULTI-TURN MEMORY & TYPO RESOLUTION: Always read the conversation history. Connect short follow-ups to previous turns. Decode phonetic typos intelligently.
      3. CONSUMER LAW & FINANCIAL SAVER CHAMPION:
         - Vehicle & Loan Arrears: Explain National Credit Act Section 129 notice rights (20 business days arrears + 10 business days notice), illegal repossession without a court order & Sheriff warrant, Section 127 voluntary surrender traps, and Credit Life Insurance claims.
         - Loans & Interest: Explain daily/monthly compounding interest on Home Loans, Car Loans (exposing balloon payment traps), Personal Loans, and Credit Cards with clear Rand figures.
         - Rogue Debt Counselling Defense: Warn consumers about Form 16 / Form 17.2 traps.
         - Mashonisa Protection: Cite NCA Section 40—retaining a consumer's ID book, bank card, or SASSA card/PIN is a criminal offense.
         - DBE Mother-Tongue Exam Transliterator: Help students translate and solve DBE exam questions in their mother tongue (Sepitori, Setswana, isiZulu, Sesotho, etc.).
      4. FLUID CODE-SWITCHING (${languageFlow}): Naturally mirror the user's language or mix of languages.
    `;

    try {
      // 2. Try backend API
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
          !data.response.includes('1. Core Principles: In general chat') &&
          data.response.trim().length > 20
        ) {
          setMessages(prev => [...prev, { sender: 'ai', text: data.response }]);
          speakResponse(data.response);
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // Proceed to client SDK
    }

    // 3. Client Gemini SDK Call (no fragile googleSearch tools schema failure)
    try {
      const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (process as any).env?.GEMINI_API_KEY;
      if (apiKey) {
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
            temperature: 0.35
          }
        });

        if (response.text && response.text.trim().length > 15) {
          setMessages(prev => [...prev, { sender: 'ai', text: response.text }]);
          speakResponse(response.text);
          setIsLoading(false);
          return;
        }
      }

      // 4. Server-Side Gemini Proxy Route Fallback
      const proxyRes = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          model: 'gemini-2.5-flash',
          systemInstruction: khoroSystemInstruction
        })
      });
      const proxyData = await proxyRes.json();
      if (proxyData?.data?.text) {
        setMessages(prev => [...prev, { sender: 'ai', text: proxyData.data.text }]);
        speakResponse(proxyData.data.text);
        setIsLoading(false);
        return;
      }
    } catch {
      // Handled below
    }

    // 5. Intelligent domain-tailored answer if completely offline
    let dynamicAnswer = "";
    if (lowerQuery.includes('car') && (lowerQuery.includes('pay') || lowerQuery.includes('month') || lowerQuery.includes('arrear') || lowerQuery.includes('repo') || lowerQuery.includes('sheriff') || lowerQuery.includes('debt'))) {
      dynamicAnswer = `### 🛡️ National Credit Act (NCA) Vehicle Repossession Shield

**1. The Mandatory Section 129 Notice of Default**
Under **Section 129 & Section 130 of the National Credit Act (NCA No. 34 of 2005)**, because you are 3 months (more than 20 business days) in arrears, your credit provider (WesBank, MFC/Nedbank, Standard Bank, Absa, etc.) **cannot take legal action or repossess your vehicle without first delivering a formal Section 129 Notice**.
- The bank must deliver this notice to you and wait at least **10 business days** before they can issue summons or approach a court.
- This notice explicitly advises you of your right to refer the matter to a debt counsellor, an alternative dispute resolution agent, or the **National Financial Ombud Scheme (NFO)** to structure a payment arrangement.

**2. Absolute Prohibition of "Self-Help" Repossession (Tow-Truck Traps)**
- A bank or private debt recovery agent **CANNOT legally seize your vehicle from your driveway, road, or mall parking lot** without a **valid Court Order (Warrant of Execution)** issued by a Magistrate or Judge and served by a registered **Sheriff of the Court** with official identification.
- **CRITICAL WARNING — Do NOT Sign a Section 127 Form:** Rogue repo agents often arrive posing as "inspectors" and trick consumers into signing an "inspection sheet" or "temporary holding slip" that is actually a **Section 127 Voluntary Surrender Form**. Once you sign that form, you voluntarily give up the car and waive your legal protections. Never sign anything without an attorney or court sheriff present!

**3. Immediate Step-by-Step Action Plan**
1. **Contact the Bank's Hardship Desk Immediately:** Call your financier's collections department before they serve summons. Cite Section 129 and propose a restructured installment or temporary payment moratorium.
2. **Keep the Vehicle on Private Property:** A repo agent cannot trespass on private property without a court order.
3. **Lodge an Urgent Dispute with the NFO:** If the bank refuses reasonable terms, lodge an inquiry with the National Financial Ombud Scheme (www.nfosa.co.za) to freeze premature collection litigation.`;
    } else if (lowerQuery.includes('matric') || lowerQuery.includes('exam') || lowerQuery.includes('physics') || lowerQuery.includes('math') || lowerQuery.includes('dbe') || lowerQuery.includes('transliterat')) {
      dynamicAnswer = `### 📚 DBE Matric & High-School Exam Transliteration Bridge
For Department of Basic Education (DBE), IEB, and TVET exam preparation:
- Use the **Mother-Tongue Exam Transliterator** tab to deconstruct complex English exam questions into intuitive Sepitori, Sepedi, isiZulu, Sesotho, or Setswana.
- Review technical terminology side-by-side with official DBE memorandum marking rubrics to secure maximum marks.`;
    } else {
      dynamicAnswer = `Greetings! I am **KHORO**, the boundless cognitive engine powering Luqi-AI. I am ready to collaborate with you on any legal analysis, financial calculations, academic curricula, or strategic engineering problems. What shall we solve together?`;
    }

    setMessages(prev => [...prev, { sender: 'ai', text: dynamicAnswer }]);
    setIsLoading(false);
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

      {/* Starter Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 px-2">
        {FIRST_TIME_STARTER_CARDS.map((card, i) => (
          <button
            key={i}
            onClick={() => handleSendPrompt(card.prompt)}
            className="flex items-center gap-3 p-3.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 rounded-2xl text-left transition group"
          >
            <span className="text-2xl p-2 rounded-xl bg-slate-950 border border-slate-800 group-hover:scale-110 transition shrink-0">
              {card.icon}
            </span>
            <div className="overflow-hidden">
              <span className="font-bold text-xs text-slate-200 block truncate group-hover:text-emerald-400 transition">
                {card.label}
              </span>
              <span className="text-[11px] text-slate-500 line-clamp-1">
                {card.prompt}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Chat Console */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Language Selector */}
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

        {/* Message Feed with renderFormattedText */}
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
                {renderFormattedText(m.text)}
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

        {/* Input Box */}
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSendPrompt();
          }}
          className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputPrompt}
            onChange={e => setInputPrompt(e.target.value)}
            placeholder="Type your question in English, Sepitori, isiZulu, Sesotho, or mix them..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs md:text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 transition"
          />
          <button
            type="submit"
            disabled={!inputPrompt.trim() || isLoading}
            className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold text-xs md:text-sm rounded-2xl transition shrink-0"
          >
            Ask Khoro
          </button>
        </form>
      </div>
    </section>
  );
};

export default HeroAiChatConsole;
