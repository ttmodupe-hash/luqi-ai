// =====================================================================
// IN-MEMORY / MOCKED CACHE
// In-memory cache for AI responses conforming to AI Studio constraints.
// =====================================================================

import { createHash } from "node:crypto";

const memoryCache = new Map<string, { data: string; expiresAt: number }>();

export async function getCachedAIResponse(promptHash: string): Promise<string | null> {
  const item = memoryCache.get(promptHash);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    memoryCache.delete(promptHash);
    return null;
  }
  return item.data;
}

export async function setCachedAIResponse(promptHash: string, data: string, ttlSeconds = 3600): Promise<void> {
  memoryCache.set(promptHash, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export async function closeCache(): Promise<void> {
  memoryCache.clear();
}

export function hashPrompt(input: string): string {
  return createHash("sha256").update(input.trim().toLowerCase()).digest("hex").slice(0, 32);
}
