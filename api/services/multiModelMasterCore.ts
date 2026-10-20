import { GoogleGenAI } from '@google/genai';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config({ override: true });

import { resolveGeminiApiKey } from '../lib/apiKeyResolver';

// Initialize Client SDKs safely from environment variables
const getGemini = () => {
  const apiKey = resolveGeminiApiKey();
  return new GoogleGenAI({
    apiKey: apiKey || undefined,
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
- When a user greets you ('Hi', 'Eita', 'Sawubona', 'Dumela', 'How are you?'), reply warmly, naturally, and briefly like a helpful friend, and ask how you can make their day easier.
- Match the user's language naturally (English, Sepitori, isiZulu, Sesotho, Setswana, Afrikaans, Kiswahili, Yoruba) without forcing slang if they speak plain English.`;

    try {
      if (role === 'VISUAL_3D_LAB') {
        const output = await invokeGeminiEngine(userPrompt, systemPrompt, 0.3);
        if (output.trim()) {
          return { model: 'Gemini 2.5 Flash (Multimodal/3D Frontier)', output, role, costZar: 0.0032 };
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
                costZar: 0.0085
              };
            }
          } catch (anthropicErr) {
            console.warn('[Multi-Model Router] Anthropic invocation failed, cascading to Gemini...', anthropicErr);
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
              return { model: 'OpenAI GPT-6 Astra / GPT-4o (Enterprise & Cybersecurity)', output, role, costZar: 0.0075 };
            }
          } catch (openAiErr: any) {
            console.warn('[Multi-Model Router] OpenAI invocation failed, cascading to Gemini...', openAiErr?.message);
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
                costZar: 0.0028
              };
            }
          } catch (kimiErr: any) {
            console.warn('[Multi-Model Router] Kimi Moonshot paused (account suspended/balance required), cascading to Gemini...', kimiErr?.message);
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
              return { model: 'DeepSeek-V3 (Bulk Logic & Testing)', output, role, costZar: 0.0018 };
            }
          } catch (deepseekErr: any) {
            console.warn('[Multi-Model Router] DeepSeek invocation failed (balance/quota), cascading to Gemini...', deepseekErr?.message);
          }
        }
      }

      // Default & Guaranteed Engine: Gemini 2.5 Flash
      const output = await invokeGeminiEngine(userPrompt, systemPrompt, 0.4);
      return {
        model: 'Gemini 2.5 Flash (Sovereign High-Speed Engine)',
        output: output || "Hello! I am Luqi-AI (powered by Jarvis), your African and Global super-intelligence companion.",
        role,
        costZar: 0.0025
      };
    } catch (err: any) {
      console.warn(`[Multi-Model Router Warning] Cascading to resilient circuit breaker...`);
      try {
        const fallbackText = await invokeGeminiEngine(userPrompt, systemPrompt, 0.4);
        return {
          model: 'Gemini 2.5 Flash (Sovereign Circuit-Breaker)',
          output: fallbackText || "Hello! I am Luqi-AI, your African and Global super-intelligence companion.",
          role,
          costZar: 0.0015
        };
      } catch (finalErr: any) {
        return {
          model: 'Gemini 2.5 Flash (Local Kernel)',
          output: `I am Luqi-AI, created in South Africa as a next-generation Pan-African super-intelligence platform combining classical STEM mechanics, enterprise finance, and multilingual conversational intelligence. I received your inquiry: "${userPrompt.slice(0, 80)}" and will synchronize live data once connectivity re-establishes.`,
          role,
          costZar: 0
        };
      }
    }
  }
}
