/** Opt-in model metadata GETs only. Never generates content or enables billing. */
import { PILOT_MODELS } from "./pilotModels";

type Provider = keyof typeof PILOT_MODELS;
export type MetadataStatus = "key_missing" | "key_format_invalid" |
  "metadata_accessible" | "authentication_rejected" | "permission_denied" |
  "model_unavailable" | "rate_limited" | "provider_error" |
  "unexpected_response" | "network_error";
export interface MetadataResult {
  provider: Provider;
  model: string;
  status: MetadataStatus;
  // Supporting identifier comparison only, not cryptographic project binding.
  // No key fragments, configured identifiers or project names are returned.
  key_identifier: "not_checked" | "matched" | "mismatched" | "invalid_configuration" | "unavailable";
}

export function checkKeyIdentifier(provider: Provider, env: NodeJS.ProcessEnv): MetadataResult["key_identifier"] {
  const configured = env[`LUQI_PILOT_${provider.toUpperCase()}_KEY_IDENTIFIERS`];
  if (configured === undefined) return "not_checked";
  const identifiers = configured.split(",");
  // Operators copy the four-character masked identifiers visible in the
  // intended provider project. Empty, wildcard and oversized lists are errors.
  if (identifiers.length > 20 || !identifiers.every(value => /^[A-Za-z0-9_-]{4}$/.test(value))) {
    return "invalid_configuration";
  }
  const key = env[provider === "gemini" ? "LUQI_PILOT_GEMINI_API_KEY" : "LUQI_PILOT_OPENAI_API_KEY"];
  if (!key || key.length < 4 || key.length > 2048 || /[^\x21-\x7e]/.test(key)) return "unavailable";
  return identifiers.includes(key.slice(-4)) ? "matched" : "mismatched";
}

const PROVIDERS = {
  gemini: {
    key: "LUQI_PILOT_GEMINI_API_KEY",
    url: `https://generativelanguage.googleapis.com/v1beta/models/${PILOT_MODELS.gemini}`,
  },
  openai: {
    key: "LUQI_PILOT_OPENAI_API_KEY",
    url: `https://api.openai.com/v1/models/${PILOT_MODELS.openai}`,
  },
} as const;

async function readBoundedJson(response: Response): Promise<unknown> {
  if (!response.body) throw new Error("Missing body");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16_384) throw new Error("Response too large");
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } finally {
    try { await reader.cancel(); } catch { /* Never log provider errors. */ }
    reader.releaseLock();
  }
}

async function checkProvider(
  provider: Provider, env: NodeJS.ProcessEnv, fetcher: typeof fetch,
): Promise<MetadataResult> {
  const model = PILOT_MODELS[provider];
  const key_identifier = checkKeyIdentifier(provider, env);
  const result = (status: MetadataStatus): MetadataResult => ({ provider, model, status, key_identifier });
  const key = env[PROVIDERS[provider].key];
  if (!key) return result("key_missing");
  // Don't guess validity by provider prefixes. Reject whitespace/control chars
  // locally rather than silently repairing a credential pasted incorrectly.
  if (key.length > 2048 || /[^\x21-\x7e]/.test(key)) return result("key_format_invalid");

  let response: Response;
  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (provider === "gemini") headers["x-goog-api-key"] = key;
    else headers.Authorization = `Bearer ${key}`;
    response = await fetcher(PROVIDERS[provider].url, {
      method: "GET", headers, redirect: "error", cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // Error messages, bodies, headers and keys must never reach logs.
    return result("network_error");
  }
  if (response.status !== 200) {
    try { await response.body?.cancel(); } catch { /* Sanitized status only. */ }
    const statuses: Record<number, MetadataStatus> = {
      401: "authentication_rejected", 403: "permission_denied",
      404: "model_unavailable", 429: "rate_limited",
    };
    return result(statuses[response.status] ?? "provider_error");
  }
  try {
    const data = await readBoundedJson(response);
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return result("unexpected_response");
    }
    const info = data as Record<string, unknown>;
    const valid = provider === "gemini"
      ? info.name === `models/${model}` &&
        Array.isArray(info.supportedGenerationMethods) &&
        info.supportedGenerationMethods.includes("generateContent")
      : info.id === model && info.object === "model";
    return result(valid ? "metadata_accessible" : "unexpected_response");
  } catch {
    return result("unexpected_response");
  }
}

/** No network activity by default; independent of paid-inference flags.
 * A metadata success does NOT prove generation access, billing balance, price,
 * provider spend caps, or request compatibility. Runs once per process startup.
 */
export async function checkPilotCredentials(
  env: NodeJS.ProcessEnv = process.env, fetcher: typeof fetch = fetch,
): Promise<MetadataResult[]> {
  if (env.LUQI_AI_CREDENTIAL_CHECK_ENABLED !== "true") return [];
  return Promise.all((["gemini", "openai"] as const)
    .map(provider => checkProvider(provider, env, fetcher)));
}
