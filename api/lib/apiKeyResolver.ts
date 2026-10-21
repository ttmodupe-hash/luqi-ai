/**
 * Resolve the configured Google Gemini key on the server only.
 * Never read a client-supplied key or expose this value to browser code.
 */
export function resolveGeminiApiKey(): string {
  const candidates = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.GOOGLE_GEMINI_API_KEY,
  ];
  return candidates.find((value) => typeof value === "string" && value.trim().length > 0)?.trim() || "";
}
