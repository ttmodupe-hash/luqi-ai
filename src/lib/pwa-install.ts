/** Browser-provided install gesture only. No APK, redirects, storage or network calls. */
export interface BrowserInstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredInstall: BrowserInstallPrompt | null = null;
let installConfirmed = false;
let listening = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

/** Called once at the main workspace import, before navigating to /install. */
export function captureLuqiInstallPrompt() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("beforeinstallprompt", (event: Event) => {
    const candidate = event as BrowserInstallPrompt;
    if (typeof candidate.prompt !== "function") return;
    // The browser owns the installation UI; save its one-use gesture for a click.
    event.preventDefault();
    deferredInstall = candidate;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    installConfirmed = true;
    deferredInstall = null;
    notify();
  });
}

export function subscribeLuqiInstall(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function installPromptAvailable(): boolean { return deferredInstall !== null; }
export function installationObserved(): boolean { return installConfirmed; }

export function isLuqiStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)")?.matches === true
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** Must be called directly from the visitor's click, never automatically. */
export async function requestLuqiInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const candidate = deferredInstall;
  if (!candidate) return "unavailable";
  deferredInstall = null; // Native browser prompts are one-use only.
  notify();
  await candidate.prompt();
  const choice = await candidate.userChoice;
  return choice?.outcome === "accepted" ? "accepted" : "dismissed";
}
