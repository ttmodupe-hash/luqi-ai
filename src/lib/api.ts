let configuredApiKey = "";

export function getApiKey(): string {
  return configuredApiKey;
}

export function setApiKey(value: string): void {
  configuredApiKey = typeof value === "string" ? value.trim() : "";
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("luqi:api-key-updated", { detail: { key: configuredApiKey } }));
  }
}

export function clearApiKey(): void {
  setApiKey("");
}

export function validateApiKey(value: string): boolean {
  const key = typeof value === "string" ? value.trim() : "";
  return key.length >= 20 && !/placeholder|your[-_ ]?key|example|mock/i.test(key);
}

export function getAuthHeaders(extra: HeadersInit = {}): Record<string, string> {
  const headers: Record<string, string> = {};
  if (extra instanceof Headers) {
    extra.forEach((value, key) => { headers[key] = value; });
  } else if (Array.isArray(extra)) {
    for (const [key, value] of extra) headers[key] = value;
  } else if (extra) {
    Object.assign(headers, extra);
  }
  const key = getApiKey();
  if (key && !Object.keys(headers).some((name) => name.toLowerCase() === "x-api-key")) {
    headers["X-API-KEY"] = key;
  }
  return headers;
}
