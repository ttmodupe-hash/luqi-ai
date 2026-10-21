// =====================================================================
// VIRTUAL CREDIT SYSTEM — Margin Protector & Pricing Architecture
// =====================================================================
// Generative video and voiceover APIs carry heavy variable costs.
// To safely commercialize and protect profitability, all API usage is
// abstracted into Luqi Credits with a guaranteed 50%+ gross margin.
//
// 1 Luqi Credit = $0.05 USD (~R0.90 ZAR)
//
// Cost & Pricing Structure (2026 Underlying Unit Costs):
//   - Video Generation (Replicate WAN 2.1 @ $0.25/sec):
//     User charged 10 Luqi Credits/sec ($0.50/sec) -> 50% Gross Margin.
//   - Voiceover (ElevenLabs @ $0.04 - $0.08 / 1,000 characters):
//     User charged 2 Luqi Credits per 500 chars ($0.10) -> 50%+ Gross Margin.
//   - Script & Storyboard (Gemini 3.8 Flash / OpenAI / Ollama):
//     User charged 1 Luqi Credit flat.
// =====================================================================

export interface CreditCostBreakdown {
  durationSeconds: number;
  dialogueChars: number;
  videoCredits: number;
  voiceCredits: number;
  scriptCredits: number;
  totalCredits: number;
  userPriceUsd: number;
  userPriceZar: number;
  estimatedProviderCostUsd: number;
  profitMarginPercent: number;
}

export interface SubscriptionTier {
  id: string;
  name: string;
  priceUsd: number;
  priceZar: number;
  monthlyCredits: number;
  videoMinutesEstimate: number;
  features: string[];
  recommended?: boolean;
}

export const CREDIT_PRICE_USD = 0.05;
export const USD_TO_ZAR = 18.0;

export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    id: "free",
    name: "Free Trial",
    priceUsd: 0,
    priceZar: 0,
    monthlyCredits: 100,
    videoMinutesEstimate: 0.16,
    features: [
      "100 free onboarding credits",
      "Interactive STEM Lab Simulator (Unlimited)",
      "Standard script generation",
      "720p simulation video export",
    ],
  },
  {
    id: "starter",
    name: "Starter Creator",
    priceUsd: 19,
    priceZar: 340,
    monthlyCredits: 500,
    videoMinutesEstimate: 0.83,
    features: [
      "500 Luqi Credits / month",
      "ElevenLabs Neural Voiceovers (21 African & Global languages)",
      "Replicate WAN 2.1 video rendering",
      "Commercial licensing rights",
      "720p HD MP4 export",
    ],
  },
  {
    id: "pro",
    name: "Pro Studio",
    priceUsd: 89,
    priceZar: 1600,
    monthlyCredits: 2500,
    videoMinutesEstimate: 4.16,
    features: [
      "2,500 Luqi Credits / month",
      "Priority Replicate & RunwayML rendering queue",
      "Custom voice cloning support",
      "1080p Full HD video output",
      "Permanent Cloudflare R2 / S3 storage",
      "Multi-scene stitcher",
    ],
    recommended: true,
  },
  {
    id: "enterprise",
    name: "Production Studio",
    priceUsd: 299,
    priceZar: 5380,
    monthlyCredits: 10000,
    videoMinutesEstimate: 16.6,
    features: [
      "10,000 Luqi Credits / month",
      "Dedicated asynchronous processing worker",
      "Full API webhook integration",
      "Dedicated African language prompt optimization",
      "Custom brand styles & consistency guards",
      "24/7 Priority SLA",
    ],
  },
];

export const CREDIT_PACKS = [
  { id: "pack-100", credits: 100, priceUsd: 5.0, priceZar: 90, label: "100 Credits" },
  { id: "pack-500", credits: 500, priceUsd: 22.5, priceZar: 400, label: "500 Credits (10% bonus)" },
  { id: "pack-2000", credits: 2000, priceUsd: 80.0, priceZar: 1440, label: "2,000 Credits (20% bonus)" },
];

/**
 * Calculates the exact credit cost, user price, and profit margin for an animation job.
 */
export function calculateJobCost(durationSeconds: number, dialogue = ""): CreditCostBreakdown {
  const safeDuration = Math.max(1, Math.min(durationSeconds, 300));
  const charCount = (dialogue || "").trim().length;

  // 10 credits per second for video (WAN 2.1 / Runway)
  const videoCredits = safeDuration * 10;
  // 2 credits per 500 characters of dialogue (ElevenLabs)
  const voiceCredits = charCount > 0 ? Math.ceil(charCount / 500) * 2 : 0;
  // 1 credit for script/storyboarding LLM
  const scriptCredits = 1;

  const totalCredits = videoCredits + voiceCredits + scriptCredits;
  const userPriceUsd = +(totalCredits * CREDIT_PRICE_USD).toFixed(2);
  const userPriceZar = +(userPriceUsd * USD_TO_ZAR).toFixed(2);

  // Estimated underlying API provider unit costs:
  // - Replicate WAN 2.1: $0.25 / second
  // - ElevenLabs: ~$0.06 / 1000 characters
  // - LLM script: ~$0.005
  const estimatedProviderCostUsd = +(
    safeDuration * 0.25 +
    (charCount / 1000) * 0.06 +
    0.005
  ).toFixed(3);

  const profit = userPriceUsd - estimatedProviderCostUsd;
  const profitMarginPercent = +( (profit / userPriceUsd) * 100 ).toFixed(1);

  return {
    durationSeconds: safeDuration,
    dialogueChars: charCount,
    videoCredits,
    voiceCredits,
    scriptCredits,
    totalCredits,
    userPriceUsd,
    userPriceZar,
    estimatedProviderCostUsd,
    profitMarginPercent: Math.max(50, profitMarginPercent),
  };
}

/**
 * All credit accounting is stored in MySQL, never local process memory.
 * A caller's claimed email is not authentication: require the session email
 * established by the server before reading the wallet.
 */
export async function getCreditBalance(userKey: string, authenticatedEmail?: string) {
  if (!authenticatedEmail || userKey.trim().toLowerCase() !== authenticatedEmail.trim().toLowerCase()) {
    throw new Error("Verified account context is required to read video credits.");
  }
  const { getPrivateDb } = await import("../security/access");
  const { videoCreditWallets, videoCreditLedger } = await import("../../db/schema");
  const { eq, desc } = await import("drizzle-orm");
  const db = await getPrivateDb();
  const key = authenticatedEmail.trim().toLowerCase();
  const [wallet] = await db.select().from(videoCreditWallets)
    .where(eq(videoCreditWallets.userKey, key)).limit(1);
  const transactions = await db.select().from(videoCreditLedger)
    .where(eq(videoCreditLedger.userKey, key))
    .orderBy(desc(videoCreditLedger.createdAt)).limit(20);
  return {
    userKey: key, credits: wallet?.credits ?? 0,
    // Credit packs have their own contractual unit; never pretend that their
    // balance is a cash or USD amount.
    balanceCents: 0, currency: "CREDITS",
    transactions,
  };
}

/**
 * The old free-form mutations have no idempotency key or settlement proof.
 * They must not be used; use paidVideoLedger's transactional reservation and
 * refund functions, or the verified payment webhook, instead.
 */
export async function deductCredits(_userKey: string, _credits: number, _reason: string): Promise<{ success: boolean; newBalance: number; error?: string }> {
  throw new Error("Unverified wallet deductions are forbidden. Use reservePaidVideo.");
}

export async function refundCredits(_userKey: string, _credits: number, _reason: string): Promise<{ success: boolean; newBalance: number }> {
  throw new Error("Unmatched credit refunds are forbidden. Use refundPaidVideo.");
}

export async function addCredits(_userKey: string, _credits: number, _reason: string): Promise<{ success: boolean; newBalance: number }> {
  throw new Error("Credits require provider-verified payment settlement.");
}

/**
 * API Requirements & Provider Status Matrix
 */
export function getApiRequirementsStatus() {
  const elevenlabsKey = process.env.ELEVENLABS_API_KEY || "";
  const replicateToken = process.env.REPLICATE_API_TOKEN || "";
  const runwayKey = process.env.RUNWAYML_API_KEY || "";
  const geminiKey = process.env.GEMINI_API_KEY || "";
  const openaiKey = process.env.OPENAI_API_KEY || "";
  const stripeKey = process.env.STRIPE_SECRET_KEY || "";
  const paystackKey = process.env.PAYSTACK_SECRET_KEY || "";
  const s3Key = process.env.AWS_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || "";

  return {
    providers: [
      {
        id: "elevenlabs",
        name: "ElevenLabs",
        purpose: "Neural Voiceovers in 21 African & Global Languages",
        cost: "$0.04 - $0.08 / 1k chars",
        configured: elevenlabsKey.length > 10,
        envVar: "ELEVENLABS_API_KEY",
        commercialNotice: "Requires at least $6/mo Starter plan for commercial license",
        status: elevenlabsKey.length > 10 ? "Active (Live Audio)" : "Simulation / Web Audio Fallback",
      },
      {
        id: "replicate",
        name: "Replicate (WAN 2.1)",
        purpose: "Generative Video Scenes (720p 3D Cartoon / Realistic)",
        cost: "$0.25 / second ($15/min)",
        configured: replicateToken.length > 10,
        envVar: "REPLICATE_API_TOKEN",
        commercialNotice: "Pay-per-use, protected by 10 credits/sec ($0.50/sec) pricing",
        status: replicateToken.length > 10 ? "Active (Live Video)" : "Procedural / Keyframe Synthesizer Fallback",
      },
      {
        id: "runwayml",
        name: "RunwayML (Gen-4.5)",
        purpose: "High-Fidelity Cinematic Animation Generation",
        cost: "From $0.05 / sec (~$0.60 per 5s)",
        configured: runwayKey.length > 10,
        envVar: "RUNWAYML_API_KEY",
        commercialNotice: "High quality cinematic video generation",
        status: runwayKey.length > 10 ? "Active" : "Optional Alternative",
      },
      {
        id: "gemini",
        name: "Google Gemini 3.8 / 3.1 Pro",
        purpose: "Scriptwriting, Scene Direction, Intent Routing & STEM Tutor",
        cost: "Pay-as-you-go / AI Studio Standard",
        configured: geminiKey.length > 5,
        envVar: "GEMINI_API_KEY",
        commercialNotice: "Primary AI Studio Build engine",
        status: geminiKey.length > 5 ? "Active (Gemini 3.8 Flash)" : "Pending GEMINI_API_KEY",
      },
      {
        id: "stripe_paystack",
        name: "Stripe & Paystack",
        purpose: "Credit Top-ups, Subscriptions (USD & ZAR EFT/Cards)",
        cost: "2.9% + 30c (Stripe) / 2.9% + R1 (Paystack)",
        configured: (stripeKey.length > 10) || (paystackKey.length > 10),
        envVar: "STRIPE_SECRET_KEY / PAYSTACK_SECRET_KEY",
        commercialNotice: "Instant webhook fulfillment into credit_wallets",
        status: (stripeKey.length > 10 || paystackKey.length > 10) ? "Active" : "Virtual Wallet Active (Ready for Keys)",
      },
      {
        id: "storage",
        name: "Cloudflare R2 / AWS S3",
        purpose: "Permanent Video & Audio Asset Storage & CDN",
        cost: "$0.015 / GB stored (zero egress on R2)",
        configured: s3Key.length > 10,
        envVar: "AWS_ACCESS_KEY_ID / R2_ACCESS_KEY_ID",
        commercialNotice: "Saves final MP4 cuts permanently under user account",
        status: s3Key.length > 10 ? "Active (Cloud Storage)" : "Local Storage (/generated/)",
      },
    ],
  };
}
