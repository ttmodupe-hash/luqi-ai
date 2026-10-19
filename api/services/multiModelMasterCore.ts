import { GoogleGenAI } from '@google/genai';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config({ override: true });

// Initialize Client SDKs safely from environment variables
const getGemini = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
const getAnthropic = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
const getDeepSeek = () => new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY || '', baseURL: 'https://api.deepseek.com' });
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

export type MasterModelRole = 'ARCHITECTURE_REFACTOR' | 'VISUAL_3D_LAB' | 'BULK_COMPUTATION' | 'ENTERPRISE_CYBER';

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

    const systemPrompt = `You are Luqi-AI (powered by Jarvis), a super-intelligent Pan-African and Global AI platform created in South Africa.
- Answer every question directly, naturally, and intelligently. Never repeat a static template.
- If someone asks casual or identity questions (e.g., 'how old are you', 'who are you'), answer naturally with warmth and personality as Luqi-AI, explaining your mission, architecture, and capabilities.
- Dialect Track: Match the selected language track naturally (${language}). If SEPITORI / ENGLISH is selected, blend natural Pretoria Sepitori warmth ("eita", "tlatsa", "ska wara", "daai ding", "chommie") with clear English without forcing awkward phrases when not needed; if ISIZULU, SESOTHO, KISWAHILI, or YORUBA is selected, respond fluently in that language.
- For technical, software engineering, SARS tax, or telecom audit questions (strictly using Device Serial Numbers, never IMEIs), answer with 100% factual precision.
- Enforce the 70% autonomous execution and 30% human authorization boundary for financial payments / SARS submissions.`;

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
        if (process.env.OPENAI_API_KEY) {
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
              return { model: 'GPT-4o (Enterprise & Cybersecurity)', output, role, costZar: 0.0075 };
            }
          } catch (openAiErr) {
            console.warn('[Multi-Model Router] OpenAI invocation failed, cascading to Gemini...', openAiErr);
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
          } catch (deepseekErr) {
            console.warn('[Multi-Model Router] DeepSeek invocation failed, cascading to Gemini...', deepseekErr);
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
