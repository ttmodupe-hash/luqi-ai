import { GoogleGenAI } from '@google/genai';

export const SOVEREIGN_AGENT_NAME = 'KHORO';
export const SOVEREIGN_AGENT_TRANSLATION =
  'The Council of Wisdom & Sovereign Reasoning (Traditional African Gathering Place)';

export interface ChatTurn {
  sender: 'user' | 'ai';
  text: string;
}

export class KhoroCognitiveBrain {
  public static getCarArrearsShieldResponse(): string {
    return (
      `**🚨 KHORO EMERGENCY DEBT SHIELD: NATIONAL CREDIT ACT (NCA) REPOSSESSION PROTECTION**\n\n` +
      `Do not panic, but act immediately. You have powerful legal protections under South African law that prevent banks and debt collectors from simply taking your car.\n\n` +
      `### 1. The Bank Cannot Repossess Without a Court Order (Section 130)\n` +
      `Under Section 130 of the National Credit Act (NCA 34 of 2005):\n` +
      `- **No "Self-Help" Repossession:** A bank, tracing agent, or debt collector **CANNOT legally tow or take your vehicle** from your driveway, place of work, or a parking lot without an original **Warrant of Execution (Court Order)** issued by a Magistrate or High Court and delivered in person by an official **Sheriff of the Court**.\n` +
      `- A repo agent with a clipboard, private tow truck, or bank letterhead has **NO legal power** to confiscate your car.\n\n` +
      `### 2. The 20-Day & Section 129 Notice Rule\n` +
      `- You must be in arrears for at least **20 business days**.\n` +
      `- The bank must send you a formal **Section 129 Letter of Demand** by registered post or agreed electronic delivery.\n` +
      `- You have at least **10 business days** from receiving the Section 129 notice to respond, propose a payment arrangement, or refer the matter to a debt counsellor or the National Financial Ombud Scheme.\n` +
      `- Until those 10 business days expire without resolution, the bank is legally barred from issuing a court summons against you.\n\n` +
      `### 3. ⚠️ BEWARE THE "VOLUNTARY SURRENDER" (SECTION 127) TRAP\n` +
      `- Rogue repo agents often arrive and tell you: *"Sign this paper to show I inspected the car,"* or *"Sign here so we can hold the car while you sort out the bank."*\n` +
      `- **DO NOT SIGN ANYTHING.** This is almost always a disguised **Section 127 Voluntary Surrender Form**.\n` +
      `- If you sign it, you voluntarily hand over your car, forfeiting all your court protections. The bank will auction your car for pennies on the dollar, and you will still owe the massive remaining shortfall.\n\n` +
      `### 4. Immediate Action Plan (Do This Today):\n` +
      `1. **Call Your Bank's Distressed Assets / Vehicle Finance Team:** (e.g. WesBank, MFC/Nedbank, Standard Bank, Absa). Request a payment restructure, term extension (e.g. from 54 to 72 months to lower monthly installments), or a temporary payment holiday.\n` +
      `2. **Check Your Credit Life Insurance:** Look at your financing contract. If you suffered retrenchment, reduction in work hours, injury, or illness, your mandatory Credit Life Insurance policy is required by law to pay your car installments for up to 6–12 months!\n` +
      `3. **Keep the Vehicle Parked on Private Property:** Repo agents cannot enter locked private property without a court order.\n` +
      `4. **Escalate Harassment:** If debt collectors intimidate or threaten you, lodge an urgent complaint with the **National Credit Regulator (NCR: 0860 627 627)** and the **National Financial Ombud Scheme (NFO: 0860 800 900)**.`
    );
  }

  public static async reasonAndRespond(
    userPrompt: string,
    history: ChatTurn[] = [],
    preferredLanguage: string = 'Auto-Detect (Flexible Code-Switching)'
  ) {
    const lower = (userPrompt || '').toLowerCase();

    // Immediate authoritative detection for car arrears / repossession queries
    if (
      (lower.includes('car') || lower.includes('vehicle') || lower.includes('motor')) &&
      (lower.includes('month') || lower.includes('not pay') || lower.includes('arrear') || lower.includes('repossession') || lower.includes('repo') || lower.includes('tow'))
    ) {
      return {
        agentName: SOVEREIGN_AGENT_NAME,
        translation: SOVEREIGN_AGENT_TRANSLATION,
        response: this.getCarArrearsShieldResponse()
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const systemInstruction = `
      You are ${SOVEREIGN_AGENT_NAME} (${SOVEREIGN_AGENT_TRANSLATION}), the hyper-intelligent sovereign brain and voice companion powering Luqi-AI.
      
      COGNITIVE & CULTURAL IDENTITY:
      - Name Meaning: "Khoro" represents the traditional African council courtyard (Khoro / Kgotla / Khorong in Setswana, Sepedi, Sesotho, and Tshivenda) where community wisdom, problem-solving, justice, and guidance come together. You embody this spirit—bringing together multi-model intelligence (architecture, law, finance, STEM education) to help people thrive without hustle.
      - Tone: Warm, brilliant, street-smart yet deeply authoritative ("chommie", "ska wara", "daai ding"), respectful, and uncompromisingly on the side of the everyday user.

      OPERATIONAL PROTOCOLS:
      1. MULTI-TURN MEMORY & TYPO RESOLUTION: Read conversation history. Connect short follow-ups to previous turns. Decode phonetic typos intelligently using context.
      2. CONSUMER & FINANCIAL PROTECTOR:
         - Vehicle & Home Loan Arrears: Explain National Credit Act (NCA) Section 129 notice rights (20 business days arrears + 10 business days notice), illegal repossession without a court order & Sheriff warrant, Section 127 voluntary surrender traps, and Credit Life Insurance claims.
         - Interest Calculations: Break down compounding interest on home/car/personal loans and credit cards in plain Rand terms.
         - Expose Form 16 / Form 17.2 Debt Review scams, illegal Mashonisa card-retention (NCA Section 40 criminal offense), and CPA Section 56 6-month implied warranty rights.
         - Guide users step-by-step on escalating to the National Financial Ombud (NFO), NCR (0860 627 627), or NCC.
      3. UNIVERSAL MASTERY: Effortlessly handle macro-economics, global trade, constitutional law, software architecture, DBE matric curricula, and career guidance.
      4. FLUID CODE-SWITCHING (${preferredLanguage}): Mirror the user's exact language flow (English, Sepitori, Setswana, isiZulu, Sesotho, Afrikaans, Kiswahili, Yoruba) naturally.
    `;

    // Multi-turn context window
    const contents = history.slice(-12).map(turn => ({
      role: turn.sender === 'user' ? 'user' : 'model',
      parts: [{ text: turn.text }]
    }));

    if (contents.length === 0 || contents[contents.length - 1].parts[0].text !== userPrompt) {
      contents.push({ role: 'user', parts: [{ text: userPrompt }] });
    }

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents,
          config: {
            systemInstruction,
            temperature: 0.35
          }
        });

        if (response.text && response.text.trim().length > 15) {
          return {
            agentName: SOVEREIGN_AGENT_NAME,
            translation: SOVEREIGN_AGENT_TRANSLATION,
            response: response.text
          };
        }
      } catch (err: any) {
        console.warn('Khoro cognitive brain primary call note:', err?.message);
      }
    }

    // Dynamic, domain-accurate fallback instead of static placeholder
    if (lower.includes('debt') || lower.includes('loan') || lower.includes('interest') || lower.includes('bank')) {
      return {
        agentName: SOVEREIGN_AGENT_NAME,
        translation: SOVEREIGN_AGENT_TRANSLATION,
        response:
          `**KHORO FINANCIAL ADVICE & NCA RIGHTS**\n\n` +
          `In South Africa, all credit agreements are strictly regulated under the National Credit Act (NCA 34 of 2005).\n\n` +
          `- **Section 129 Notice Rights:** Credit providers cannot institute court summons until you have been in arrears for 20 business days and given 10 business days written notice.\n` +
          `- **Illegal Seizures:** No debt collector or bank agent can confiscate your assets without a certified Court Order and Sheriff of the Court.\n` +
          `- **Credit Life Insurance:** Check if your loan agreement includes mandatory credit life insurance which covers installments in the event of income loss or illness.\n` +
          `- **Help Desk:** Contact the National Financial Ombud Scheme (NFO) at 0860 800 900 or the NCR at 0860 627 627.`
      };
    }

    return {
      agentName: SOVEREIGN_AGENT_NAME,
      translation: SOVEREIGN_AGENT_TRANSLATION,
      response:
        `Hello & Eita! KHORO has analyzed your query: "${userPrompt}".\n\n` +
        `I am fully equipped to break down South African law, financial calculations, academic concepts, or technical systems. Please specify the exact scenario details so we can deliver a precise, step-by-step solution.`
    };
  }
}
