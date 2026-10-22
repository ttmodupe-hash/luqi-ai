/**
 * Browser-only API credential helper.
 * No credentials are bundled into the client or sent to third-party origins.
 * Key checks here are syntactic only; the server always decides authorization.
 */
const STORAGE_KEY = "luqi_api_key";

export function getApiKey(): string {
  try { return window.sessionStorage.getItem(STORAGE_KEY) ?? ""; }
  catch { return ""; }
}

export function validateApiKey(key: string): boolean {
  return typeof key === "string" && key.trim().length >= 12;
}

export function setApiKey(value: string): void {
  const key = value.trim();
  if (!key) return clearApiKey();
  try {
    window.sessionStorage.setItem(STORAGE_KEY, key);
    window.dispatchEvent(new CustomEvent("luqi:api-key-updated", { detail: { key: "[UPDATED]" } }));
  } catch { /* unavailable storage: auth remains server-enforced */ }
}

export function clearApiKey(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("luqi:api-key-updated", { detail: { key: "" } }));
  } catch { /* unavailable storage */ }
}

export function getAuthHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const key = getApiKey();
  return key ? { ...extra, "X-API-KEY": key } : { ...extra };
}
