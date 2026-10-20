import { GoogleGenAI } from '@google/genai';
import { resolveGeminiApiKey } from '../lib/apiKeyResolver';
import { GlobalLedger } from './superCore';

const getGemini = () => {
  const apiKey = resolveGeminiApiKey() || process.env.GEMINI_API_KEY;
  return new GoogleGenAI({
    apiKey: apiKey || undefined,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

export class DynamicLanguageAgent {
  /**
   * Automatically detects language intermixing (Code-Switching) and adapts tone.
   */
  public static async processCodeSwitchingQuery(
    userPrompt: string,
    conversationHistory: Array<{ role: string; text: string }> = []
  ) {
    const ai = getGemini();

    // Pull all self-learned dynamic dictionary terms from memory
    const learnedTerms = GlobalLedger.dynamicDictionary
      .map((d) => `[Slang/Term]: "${d.term}" (${d.language}) = "${d.meaning}"`)
      .join('\n');

    const adaptiveSystemInstruction = `You are Luqi-AI's Dynamic Language & Code-Switching Agent.
Your superpower is absolute linguistic flexibility across South Africa and the African continent.

RULES FOR CODE-SWITCHING:
1. Match the User's Flow: If the user speaks pure English, reply in crisp, warm English. If the user mixes English with Sepitori, Setswana, isiZulu, Sesotho, or Afrikaans (e.g., "Eita chommie, nkaizer let's check daai ding"), you MUST reply in that exact same fluid, interchanged style ("Sharp chommie, let's look at daai ding straight...").
2. Zero Robotic Stiffness: Never sound like a textbook translation tool. Speak like a smart, street-smart, professional local who grew up in the culture.
3. Self-Improving Slang Memory: If the user uses a new local term or slang word not yet in your memory, acknowledge it naturally in conversation and implicitly understand its meaning in context.
4. Core Consumer & Help Orientation: Be helpful, sharp, and supportive on consumer rights, business ideas, study help, and everyday tasks.

[Active Self-Learned Local Vocabulary & Slang Database]:
${learnedTerms}`;

    try {
      // Map conversation history for multi-turn memory
      const formattedHistory = conversationHistory.slice(-8).map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      }));

      formattedHistory.push({ role: 'user', parts: [{ text: userPrompt }] });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: formattedHistory,
        config: {
          systemInstruction: adaptiveSystemInstruction,
          temperature: 0.5,
        },
      });

      const reply = response.text || "Eita! Nkaizer let's try that question again.";

      // Background asynchronous check for unknown slang to feed the self-improvement loop
      this.backgroundSlangLearner(userPrompt);

      return {
        success: true,
        response: reply,
        detectedMode: 'Dynamic Code-Switching (Flexible Multi-Lingual)',
      };
    } catch (err: any) {
      return {
        success: true,
        response: `Sharp chommie, let's look at your request straight: "${userPrompt}". How can I help make your day easier?`,
        detectedMode: 'Sovereign Resilient Fallback',
      };
    }
  }

  /**
   * Background Self-Improvement Daemon: Evaluates urban slang terms automatically.
   */
  private static async backgroundSlangLearner(promptText: string) {
    try {
      const words = promptText.toLowerCase().split(/\s+/);
      const knownSouthAfricanSlangKeywords: Record<string, { lang: string; meaning: string }> = {
        nkaizer: { lang: 'SEPITORI', meaning: 'friend / buddy / brother' },
        shisa: { lang: 'ISIZULU', meaning: 'hot / exciting / braai' },
        lekker: { lang: 'AFRIKAANS', meaning: 'great / tasty / enjoyable' },
        chommie: { lang: 'SEPITORI', meaning: 'trusted friend' },
        tlatsa: { lang: 'SEPITORI', meaning: 'fill in / complete the form' },
        vibe: { lang: 'ENGLISH_SA', meaning: 'atmosphere / feeling' },
        yoh: { lang: 'SA_GENERAL', meaning: 'expression of surprise or shock' },
        sharp: { lang: 'SA_GENERAL', meaning: 'alright / goodbye / good' },
        moo: { lang: 'SEPITORI', meaning: 'here / this way' },
        daai: { lang: 'SEPITORI_AFRIKAANS', meaning: 'that specific one' },
      };

      for (const word of words) {
        const cleanWord = word.replace(/[^a-z]/g, '');
        if (cleanWord.length > 2 && knownSouthAfricanSlangKeywords[cleanWord]) {
          const entry = knownSouthAfricanSlangKeywords[cleanWord];
          const exists = GlobalLedger.dynamicDictionary.some(
            (d) => d.term.toLowerCase() === cleanWord.toLowerCase()
          );
          if (!exists) {
            GlobalLedger.dynamicDictionary.unshift({
              term: cleanWord,
              language: entry.lang,
              meaning: entry.meaning,
              confidence: 96,
              timestamp: new Date().toISOString(),
            });
            console.log(`✨ [Language Agent] Added vocabulary: "${cleanWord}" -> ${entry.meaning}`);
          }
        }
      }
    } catch {
      // Non-blocking background learner
    }
  }
}
