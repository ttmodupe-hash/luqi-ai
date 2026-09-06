// =====================================================================
// OPTIONAL REDIS CACHE
// No-ops cleanly when REDIS_URL is not set (today). The moment a Redis
// instance is attached (Railway plugin → REDIS_URL variable), caching
// activates with zero code changes. Used to cache AI chat responses so
// repeated identical questions don't burn provider tokens.
// =====================================================================

import { createHash } from "node:crypto";
import Redis from "ioredis";

let redis: Redis | null = null;
let disabled = false;

function getRedis(): Redis | null {
  if (disabled) return null;
  if (redis) return redis;

  const url = process.env.REDIS_URL;
  if (!url) return null;

  try {
    redis = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => (times > 2 ? null : 500),
    });
    redis.on("error", (err) => {
      console.warn("[Cache] Redis error — caching disabled:", err.message);
      disabled = true;
      try { redis?.disconnect(); } catch { /* ignore */ }
      redis = null;
    });
    return redis;
  } catch {
    return null;
  }
}

export async function getCachedAIResponse(promptHash: string): Promise<string | null> {
  const client = getRedis();
  if (!client) return null;
  try {
    const cached = await client.get(`ai:cache:${promptHash}`);
    return cached ?? null;
  } catch {
    return null;
  }
}

export async function setCachedAIResponse(promptHash: string, data: string, ttlSeconds = 3600): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    await client.set(`ai:cache:${promptHash}`, data, "EX", ttlSeconds);
  } catch {
    // Cache write failure is non-fatal
  }
}

export function hashPrompt(input: string): string {
  return createHash("sha256").update(input.trim().toLowerCase()).digest("hex").slice(0, 32);
}
