import { GoogleGenAI } from '@google/genai';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config({ override: false });

import { resolveGeminiApiKey } from '../lib/apiKeyResolver';

// Initialize Client SDKs safely from environment variables
const getGemini = () => {
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) throw new Error("Gemini API key is not configured");
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};
const getAnthropic = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
const getDeepSeek = () => new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY || '', baseURL: 'https://api.deepseek.com' });
const getKimi = () => new OpenAI({ apiKey: process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY || '', baseURL: 'https://api.moonshot.ai/v1' });
const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '', baseURL: 'https://api.openai.com/v1' });

// Reliable Gemini invocation resolving to active production endpoint (gemini-3.8-flash)
const invokeGeminiEngine = async (contents: any, systemInstruction: string, temperature = 0.5) => {
  const gemini = getGemini();
  try {
    const res = await gemini.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: { systemInstruction, temperature }
    });
    return res.text || '';
  } catch (err: any) {
    const fallbackRes = await gemini.models.generateContent({
      model: 'gemini-flash-latest',
      contents,
      config: { systemInstruction, temperature }
    });
    return fallbackRes.text || '';
  }
};

export type MasterModelRole = 'ARCHITECTURE_REFACTOR' | 'VISUAL_3D_LAB' | 'BULK_COMPUTATION' | 'ENTERPRISE_CYBER' | 'LONG_CONTEXT_KIMI';

export interface MultiModelExecutionResult {
  model: string;
  output: string;
  role: MasterModelRole;
  costZar?: number;
}

export class MultiModelMasterOrchestrator {
  /**
   * Intelligently classifies the incoming prompt to assign the task to the absolute best model.
   */
  public static routeTask(prompt: string): MasterModelRole {
    const lower = prompt.toLowerCase();
    if (
      lower.includes('3d') ||
      lower.includes('svg') ||
      lower.includes('canvas') ||
      lower.includes('pendulum') ||
      lower.includes('lab') ||
      lower.includes('visual') ||
      lower.includes('simulation')
    ) {
      return 'VISUAL_3D_LAB'; // Handled by Gemini
    }
    if (
      lower.includes('refactor') ||
      lower.includes('architecture') ||
      lower.includes('postgresql') ||
      lower.includes('stokvel ledger') ||
      lower.includes('debug') ||
      lower.includes('code')
    ) {
      return 'ARCHITECTURE_REFACTOR'; // Handled by Claude / Code Specialist
    }
    if (
      lower.includes('cybersecurity') ||
      lower.includes('threat') ||
      lower.includes('sars') ||
      lower.includes('tax') ||
      lower.includes('enterprise') ||
      lower.includes('audit')
    ) {
      return 'ENTERPRISE_CYBER'; // Handled by GPT Enterprise
    }
    if (
      lower.includes('kimi') ||
      lower.includes('moonshot') ||
      lower.includes('long context') ||
      lower.includes('synthesis') ||
      lower.includes('translation') ||
      lower.includes('document analysis')
    ) {
      return 'LONG_CONTEXT_KIMI'; // Handled by Kimi Moonshot AI
    }
    return 'BULK_COMPUTATION'; // Handled by DeepSeek / Fast logic tier
  }

  /**
   * Executes the prompt against the designated frontier model with automatic fallback.
   */
  public static async executeDominantModel(
    userPrompt: string,
    roleHint?: MasterModelRole,
    language: string = 'SEPITORI_ENGLISH'
  ): Promise<MultiModelExecutionResult> {
    const role = roleHint || this.routeTask(userPrompt);

    const systemPrompt = `You are Luqi-AI, a warm, super-intelligent, all-purpose AI assistant built for everyone—from someone using AI for the very first time to students, business owners, and professionals.
- You can help with ANYTHING: writing CVs and cover letters, school homework and university subjects, starting or growing a business, everyday life questions, health & wellness information, legal/tax/SASSA guidance, creative writing, coding, or friendly conversation.
- CRITICAL RULE: NEVER list internal backend rules (like 'serials not IMEIs', '70% autonomous / 30% human authorization', or 'millionaires demographic data') unless the user specifically asks you to audit a device spreadsheet or process a payment.
- CONSUMER GUARDIAN & LAW-GUIDER PRINCIPLES:
  1. ABSOLUTE FINANCIAL HONESTY: When users ask about loans (personal, car, home loans, credit cards), explain how compound interest works. In home loans, point out that in the first 7-10 years, almost 80% of payments go to bank interest, and advise on paying extra capital to slash years off debt.
  2. EXPOSE DEBT REVIEW FRAUD: If a user mentions being trapped under debt review or debt counselling scams, warn them about Form 16 traps, the credit bureau lock, and advise reporting rogue agencies to the National Credit Regulator (NCR) at 0860 627 627.
  3. OMBUD CHAMPION: For unfair corporate treatment or banking disputes, give clear, step-by-step action plans to use South African Ombuds (Banking Ombud, Credit Ombud, National Consumer Commission, or ICASA) after giving the company 20 business days to resolve it.
  4. MASHONISA & UNREGISTERED LENDING DEFENSE: If users mention illegal loan sharks (mashonisas) or apps holding their ID books, bank cards, or SASSA cards, cite NCA Section 40. Retaining cards or PINs is a criminal offense and such agreements are unlawful and void. Guide them on safely getting cards back and reporting to SAPS or the NCR.
  5. SASSA, UIF & GOVT RED TAPE PROTECTION: Provide accurate guidance for SASSA grant security and official UIF claims via the Department of Labour U-Filing portal. Warn users never to pay third-party 'agents' for free government forms.
  6. CIPC BIZPORTAL GUIDANCE: When entrepreneurs ask about starting or registering a business, direct them strictly to the official CIPC BizPortal (bizportal.gov.za, R125 official registration fee) to prevent overcharging by predatory agencies.
- When a user greets you ('Hi', 'Eita', 'Sawubona', 'Dumela', 'How are you?'), reply warmly, naturally, and briefly like a helpful friend, and ask how you can make their day easier.
- Match the user's language naturally (English, Sepitori, isiZulu, Sesotho, Setswana, Afrikaans, Kiswahili, Yoruba) without forcing slang if they speak plain English.`;

    try {
      if (role === 'VISUAL_3D_LAB') {
        const output = await invokeGeminiEngine(userPrompt, systemPrompt, 0.3);
        if (output.trim()) {
          return { model: 'Gemini 3.8 Flash (Multimodal)', output, role, };
        }
      }

      if (role === 'ARCHITECTURE_REFACTOR') {
        if (process.env.ANTHROPIC_API_KEY) {
          try {
            const anthropic = getAnthropic();
            const res = await anthropic.messages.create({
              model: 'claude-3-5-sonnet-20241022',
              max_tokens: 4096,
              system: systemPrompt,
              messages: [{ role: 'user', content: userPrompt }]
            });
            const contentBlock = res.content[0];
            const output = contentBlock.type === 'text' ? contentBlock.text : '';
            if (output.trim()) {
              return {
                model: 'Claude 3.5 Sonnet (Agentic Coding & Architecture)',
                output,
                role,
                };
            }
          } catch (anthropicErr) {
            console.warn('[Multi-Model Router] Anthropic unavailable; trying another provider.');
          }
        }
      }

      if (role === 'ENTERPRISE_CYBER') {
        if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-')) {
          try {
            const openai = getOpenAI();
            const res = await openai.chat.completions.create({
              model: 'gpt-4o',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
              ]
            });
            const output = res.choices[0]?.message?.content || '';
            if (output.trim()) {
              return { model: 'OpenAI GPT-4o', output, role, };
            }
          } catch (openAiErr: any) {
            console.warn('[Multi-Model Router] OpenAI unavailable; trying another provider.');
          }
        }
      }

      if (role === 'LONG_CONTEXT_KIMI') {
        const kimiKey = process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY;
        if (kimiKey) {
          try {
            const kimi = getKimi();
            const res = await kimi.chat.completions.create({
              model: 'moonshot-v1-8k',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
              ]
            });
            const output = res.choices[0]?.message?.content || '';
            if (output.trim()) {
              return {
                model: 'Kimi Moonshot AI (Long-Context & Deep Synthesis)',
                output,
                role,
                };
            }
          } catch (kimiErr: any) {
            console.warn('[Multi-Model Router] Kimi unavailable; trying another provider.');
          }
        }
      }

      if (role === 'BULK_COMPUTATION') {
        if (process.env.DEEPSEEK_API_KEY) {
          try {
            const deepseek = getDeepSeek();
            const res = await deepseek.chat.completions.create({
              model: 'deepseek-chat',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
              ]
            });
            const output = res.choices[0]?.message?.content || '';
            if (output.trim()) {
              return { model: 'DeepSeek-V3 (Bulk Logic & Testing)', output, role, };
            }
          } catch (deepseekErr: any) {
            console.warn('[Multi-Model Router] DeepSeek unavailable; trying another provider.');
          }
        }
      }

      // Default live provider, if and only if its credentials work.
      const output = await invokeGeminiEngine(userPrompt, systemPrompt, 0.4);
      if (!output.trim()) throw new Error("Empty AI provider response");
      return { model: 'Gemini 3.8 Flash (or configured Flash alias)', output, role };
    } catch {
      // A missing/failed provider must never be advertised as a live model.
      console.warn('[Multi-Model Router] No configured model produced a valid reply.');
      throw new Error('AI_PROVIDER_UNAVAILABLE');
    }
  }
}
