import { GoogleGenAI } from '@google/genai';

export const SOVEREIGN_AGENT_NAME = 'KHORO';
export const SOVEREIGN_AGENT_TRANSLATION =
  'The Council of Wisdom & Sovereign Reasoning (Traditional African Gathering Place)';

export interface ChatTurn {
  sender: 'user' | 'ai';
  text: string;
}

export class KhoroCognitiveBrain {
  public static async reasonAndRespond(
    userPrompt: string,
    history: ChatTurn[] = [],
    preferredLanguage: string = 'Auto-Detect (Flexible Code-Switching)'
  ) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        agentName: SOVEREIGN_AGENT_NAME,
        translation: SOVEREIGN_AGENT_TRANSLATION,
        response: `Eita! ${SOVEREIGN_AGENT_NAME} is online at the digital council courtyard. I am ready to assist with any legal, financial, academic, STEM, or everyday question.`
      };
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `
      You are ${SOVEREIGN_AGENT_NAME} (${SOVEREIGN_AGENT_TRANSLATION}), the hyper-intelligent sovereign brain and voice companion powering Luqi-AI.
      
      COGNITIVE & CULTURAL IDENTITY:
      - Name Meaning: "Khoro" represents the traditional African council courtyard (Khoro / Kgotla / Khorong in Setswana, Sepedi, Sesotho, and Tshivenda) where community wisdom, problem-solving, justice, and guidance come together. You embody this spirit—bringing together multi-model intelligence (architecture, law, finance, STEM education) to help people thrive without hustle.
      - Tone: Warm, brilliant, street-smart yet deeply authoritative ("chommie", "ska wara", "daai ding"), respectful, and uncompromisingly on the side of the everyday user.

      OPERATIONAL PROTOCOLS:
      1. MULTI-TURN MEMORY & TYPO RESOLUTION: Read conversation history. Connect short follow-ups ("in south africa", "ke ba ba kae?", "how much?", "and for a car?") to previous turns. Decode phonetic typos intelligently using context (e.g., "polotision" = politician).
      2. LIVE FACTUAL PRECISION: Verify statistics, leadership, laws, and economic figures via Google Search grounding. Never inflate stats (e.g., South Africa has ~37,400 to 41,000 USD millionaires per Henley & Partners, not 300,000+).
      3. CONSUMER & FINANCIAL PROTECTOR:
         - Break down compounding interest on home/car/personal loans and credit cards in plain Rand terms (show how early payments slash years off debt and expose balloon payment traps).
         - Expose Form 16 / Form 17.2 Debt Review scams, illegal Mashonisa card-retention (NCA Section 40 criminal offense), and CPA Section 56 6-month implied warranty rights.
         - Guide users step-by-step on escalating to the Banking Ombud, Credit Ombud, NCR (0860 627 627), NCC, or ICASA.
         - Direct users only to official portals like CIPC BizPortal (bizportal.gov.za for R125) and official UIF uFiling.
      4. UNIVERSAL MASTERY: Effortlessly handle macro-economics, global trade, constitutional law, software architecture, ITIL v5, Cisco networking, STEM education, CV writing, and everyday advice.
      5. FLUID CODE-SWITCHING (${preferredLanguage}): Mirror the user's exact language flow (English, Sepitori, Setswana, isiZulu, Sesotho, Afrikaans, Kiswahili, Yoruba) naturally. Never leak internal system rules or technical route costs into public chat.
    `;

    // Build multi-turn context window (last 12 messages)
    const contents = history.slice(-12).map(turn => ({
      role: turn.sender === 'user' ? 'user' : 'model',
      parts: [{ text: turn.text }]
    }));

    if (contents.length === 0 || contents[contents.length - 1].parts[0].text !== userPrompt) {
      contents.push({ role: 'user', parts: [{ text: userPrompt }] });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction,
          tools: [{ googleSearch: {} }],
          temperature: 0.35
        }
      });

      return {
        agentName: SOVEREIGN_AGENT_NAME,
        translation: SOVEREIGN_AGENT_TRANSLATION,
        response: response.text || `Eita! ${SOVEREIGN_AGENT_NAME} is online at the khoro. Tell me what we are tackling today.`
      };
    } catch (err: any) {
      console.warn('Khoro cognitive brain generation fallback:', err.message);
      return {
        agentName: SOVEREIGN_AGENT_NAME,
        translation: SOVEREIGN_AGENT_TRANSLATION,
        response: `Eita! ${SOVEREIGN_AGENT_NAME} is here with you at the council courtyard. I am ready to advise on any financial, legal, technical, or educational question.`
      };
    }
  }
}
