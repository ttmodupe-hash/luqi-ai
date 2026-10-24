/**
 * Retired, unmetered Gemini adapter.
 *
 * Public legacy routes are already blocked by legacyAiRoutes.ts. Keep a second
 * boundary here so an internal caller or future route cannot bypass the pilot's
 * authenticated, persistent spending gateway. Do not construct an SDK client,
 * read credentials, log user input, retry, or manufacture successful output.
 *
 * The result shapes below preserve compatibility for dormant callers only.
 * No method returns a successful result. Reintroduction requires a separately
 * reviewed, authenticated and budgeted implementation, not an environment flag.
 */

export class LegacyGeminiUnavailableError extends Error {
  readonly code = 'AI_LEGACY_ROUTE_DISABLED';
  readonly status = 503;

  constructor() {
    super('This legacy AI capability is unavailable. Use the authenticated text trial for supported text requests.');
    this.name = 'LegacyGeminiUnavailableError';
  }
}

interface LegacyTextResult {
  text: string;
  model: string;
  groundingMetadata: {
    groundingChunks?: Array<{
      web?: { title?: string; uri?: string };
      maps?: { title?: string; uri?: string; placeId?: string };
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  } | null;
}

interface LegacyImageResult {
  status: string;
  imageUrl: string;
  model: string;
  prompt: string;
}

interface LegacyVideoResult {
  status: string;
  model: string;
  prompt: string;
  operationId?: string;
  videoUrl?: string;
  simulatedDurationSeconds?: number;
  aspectRatio?: '16:9' | '9:16';
}

interface LegacyTranscriptResult {
  transcript: string;
  model: string;
}

interface LegacySpeechResult {
  audioBase64: string | null;
  mimeType?: string;
  voice: string;
  fallbackToBrowserSynth?: boolean;
}

export class GeminiService {
  // Deliberately do not destructure or inspect input, including its getters.
  static async generateText(_input: {
    prompt: string;
    model?: string;
    systemInstruction?: string;
    grounding?: 'none' | 'search' | 'maps';
    history?: Array<{ role: 'user' | 'model'; parts: unknown[] }>;
    imageBase64?: string;
    mimeType?: string;
  }): Promise<LegacyTextResult> {
    throw new LegacyGeminiUnavailableError();
  }

  static async generateImage(_input: {
    prompt: string;
    model?: string;
    aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  }): Promise<LegacyImageResult> {
    throw new LegacyGeminiUnavailableError();
  }

  static async generateVideo(_input: {
    prompt: string;
    model?: string;
    aspectRatio?: '16:9' | '9:16';
  }): Promise<LegacyVideoResult> {
    throw new LegacyGeminiUnavailableError();
  }

  static async transcribeAudio(_input: {
    audioBase64: string;
    mimeType?: string;
  }): Promise<LegacyTranscriptResult> {
    throw new LegacyGeminiUnavailableError();
  }

  static async synthesizeSpeech(_input: {
    text: string;
    voiceName?: string;
  }): Promise<LegacySpeechResult> {
    throw new LegacyGeminiUnavailableError();
  }
}
