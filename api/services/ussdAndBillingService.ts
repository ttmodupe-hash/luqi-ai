// =====================================================================
// USSD SHORTCODE ROUTER & PAN-AFRICAN MOBILE MONEY BILLING ENGINE
// =====================================================================
// 1. GSM USSD Shortcode Routing (*384#) for rural feature phones
// 2. Pan-African Mobile Money (Safaricom M-Pesa, MTN MoMo, Orange Money)
// 3. Cross-Subsidization Tier Controller (Premium 5G/6G funds 2G/3G free tier)
// =====================================================================

import { getGeminiClient, orchestrateRequest } from "./orchestrator";

export interface UssdSessionState {
  sessionId: string;
  phoneNumber: string;
  currentMenuState: "MAIN_MENU" | "CHOOSE_LEVEL" | "LESSON_VIEW";
  selectedTopic?: string;
  selectedGrade?: string;
  updatedAt: number;
}

export interface PaymentRequest {
  phoneNumber: string;
  networkRail: "MPESA" | "MTN_MOMO" | "ORANGE_MONEY" | "CARD";
  amount: number;
  currency: string;
}

export class UssdAndBillingService {
  private ussdSessions: Map<string, UssdSessionState> = new Map();
  private userTiers: Map<string, { tier: "FREE_TIER" | "PREMIUM_5G_6G"; validUntil: Date }> = new Map();

  constructor() {
    // Seed default demo premium user
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 1);
    this.userTiers.set("+254700000000", { tier: "PREMIUM_5G_6G", validUntil: expiry });
  }

  // ─── 1. GSM USSD Shortcode Router (*384#) ───
  public async handleUssdRequest(params: {
    sessionId: string;
    phoneNumber: string;
    text: string;
  }): Promise<{ message: string; isFinal: boolean; currentMenu: string }> {
    const { sessionId, phoneNumber, text } = params;
    const inputs = text ? text.split("*").filter(Boolean) : [];
    const latestInput = inputs[inputs.length - 1] || "";

    let session = this.ussdSessions.get(sessionId);
    if (!session) {
      session = {
        sessionId,
        phoneNumber,
        currentMenuState: "MAIN_MENU",
        updatedAt: Date.now(),
      };
      this.ussdSessions.set(sessionId, session);
    }

    // State 1: MAIN_MENU
    if (session.currentMenuState === "MAIN_MENU" && inputs.length === 0) {
      const message =
        "CON Welcome to AfriLearn Mobile Labs (*384#)\nSelect Grade Level:\n1. Primary School\n2. High School\n3. Higher Education";
      return { message, isFinal: false, currentMenu: "CHOOSE_LEVEL" };
    }

    // State 2: CHOOSE_LEVEL
    if (session.currentMenuState === "MAIN_MENU" || inputs.length === 1) {
      const grades: Record<string, string> = {
        "1": "Primary School",
        "2": "High School",
        "3": "Higher Education",
      };
      const grade = grades[latestInput] || "General Science";
      session.selectedGrade = grade;
      session.currentMenuState = "CHOOSE_LEVEL";
      this.ussdSessions.set(sessionId, session);

      const message = `CON [${grade}]\nSelect Concept:\n1. Photosynthesis\n2. Gravitational Acceleration\n3. Compound Interest & PAPSS\n4. Ohm's Law`;
      return { message, isFinal: false, currentMenu: "LESSON_VIEW" };
    }

    // State 3: LESSON_VIEW
    const topics: Record<string, string> = {
      "1": "Photosynthesis (Light/Dark Reaction)",
      "2": "Gravitational Acceleration (g = 9.81 m/s²)",
      "3": "Compound Interest & Trade (A = P(1+r/n)^nt)",
      "4": "Ohm's Law (V = IR, P = VI)",
    };
    const topic = topics[latestInput] || "Universal Science Law";

    let compressedLesson = "";
    try {
      const gemini = await getGeminiClient();
      if (gemini) {
        const res = await gemini.models.generateContent({
          model: "gemini-3.8-flash",
          contents: `Provide an experiential science summary of "${topic}" under 120 characters for a USSD feature phone screen.`,
          config: {
            systemInstruction: "You are an SMS text transmitter. Output strictly under 120 characters. No markdown.",
            temperature: 0.1,
          },
        });
        compressedLesson = (res.text || "").trim().replace(/\n/g, " ");
      }
    } catch {
      // Offline fallback
      compressedLesson = `${topic}: Core law governed by direct proportionality. Test formulas on feature phones free.`;
    }

    if (!compressedLesson || compressedLesson.length < 5) {
      compressedLesson = `${topic}: Fundamental law verified. Practice daily via *384#.`;
    }

    // Ensure within 150 characters
    if (compressedLesson.length > 140) {
      compressedLesson = compressedLesson.slice(0, 137) + "...";
    }

    const message = `END ${topic}:\n${compressedLesson}\n(Free rural SMS sponsored by 5G Subscribers)`;

    // Clean up session
    this.ussdSessions.delete(sessionId);
    return { message, isFinal: true, currentMenu: "TERMINATED" };
  }

  // ─── 2. Pan-African Mobile Money Billing Router ───
  public async initiateCollectionPrompt(request: PaymentRequest): Promise<{
    paymentReferenceId: string;
    status: string;
    instructions: string;
    networkRail: string;
    amount: number;
    currency: string;
  }> {
    const internalTxId = `TX_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    let instructions = "";
    switch (request.networkRail) {
      case "MPESA":
        instructions = `STK Push dispatched to ${request.phoneNumber}. Check your phone and enter M-Pesa PIN to complete payment of ${request.currency} ${request.amount}.`;
        break;
      case "MTN_MOMO":
        instructions = `MTN MoMo prompt sent to ${request.phoneNumber}. Dial *170# or approve the MoMo prompt with your PIN.`;
        break;
      case "ORANGE_MONEY":
        instructions = `Orange Money authorization requested for ${request.phoneNumber}. Dial #144# to approve payment.`;
        break;
      default:
        instructions = `Card / Bank authorization initiated for ${request.phoneNumber}.`;
        break;
    }

    // Automatically simulate immediate activation for testing convenience
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 1);
    this.userTiers.set(request.phoneNumber, { tier: "PREMIUM_5G_6G", validUntil: expiry });

    return {
      paymentReferenceId: internalTxId,
      status: "PENDING_USER_INPUT",
      instructions,
      networkRail: request.networkRail,
      amount: request.amount,
      currency: request.currency,
    };
  }

  public getUserTier(phoneNumber: string): { tier: "FREE_TIER" | "PREMIUM_5G_6G"; validUntil?: string } {
    const data = this.userTiers.get(phoneNumber);
    if (!data) {
      return { tier: "FREE_TIER" };
    }
    return {
      tier: data.tier,
      validUntil: data.validUntil.toISOString(),
    };
  }
}

export const ussdAndBillingService = new UssdAndBillingService();
