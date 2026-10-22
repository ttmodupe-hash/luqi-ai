/** Resolve Gemini credentials only from the server environment. */
export function resolveGeminiApiKey(): string | undefined {
  const possible = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_GENAI_API_KEY,
    process.env.GOOGLE_API_KEY,
  ];
  return possible.find((key) => {
    const value = key?.trim();
    return Boolean(value && value.length >= 20 && !/(placeholder|example|your[-_ ]?key|mock)/i.test(value));
  })?.trim();
}
