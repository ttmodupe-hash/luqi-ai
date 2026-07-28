/**
 * LUQI AI Analytics
 * =================
 * Wraps PostHog (primary), Google Analytics (fallback), console (dev).
 * Tracks: page views, feature usage, errors, user actions.
 */

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || "";
const GA_ID = import.meta.env.VITE_GA_ID || "";
const isDev = import.meta.env.DEV;

let posthog: any = null;
let _initialized = false;

export async function initAnalytics() {
  if (_initialized) return;
  _initialized = true;

  if (isDev || (!POSTHOG_KEY && !GA_ID)) {
    if (isDev) console.log("[Analytics] Dev mode — logging to console only");
    return;
  }

  if (POSTHOG_KEY) {
    try {
      const { default: ph } = await import("posthog-js");
      posthog = ph;
      posthog.init(POSTHOG_KEY, {
        api_host: "https://app.posthog.com",
        capture_pageview: false,
        loaded: () => {
          console.log("[Analytics] PostHog loaded");
        },
      });
    } catch {
      console.warn("[Analytics] PostHog failed to load");
    }
  }

  if (GA_ID) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(script);
    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).gtag = function () {
      (window as any).dataLayer.push(arguments);
    };
    (window as any).gtag("js", new Date());
    (window as any).gtag("config", GA_ID);
  }
}

export function trackPageView(page: string) {
  if (isDev) {
    console.log("[Analytics] Page view:", page);
    return;
  }
  posthog?.capture("$pageview", { page });
  if (GA_ID && (window as any).gtag) {
    (window as any).gtag("config", GA_ID, { page_path: page });
  }
}

export function trackEvent(event: string, properties?: Record<string, any>) {
  if (isDev) {
    console.log("[Analytics] Event:", event, properties);
    return;
  }
  posthog?.capture(event, properties);
}

export function trackFeatureUsage(
  feature: string,
  action: string,
  details?: Record<string, any>
) {
  trackEvent("feature_usage", { feature, action, ...details });
}

export function identifyUser(userId: string, traits?: Record<string, any>) {
  if (isDev) return;
  posthog?.identify(userId, traits);
}

export function trackError(error: Error, context?: string) {
  trackEvent("app_error", {
    message: error.message,
    stack: error.stack?.slice(0, 500),
    context,
  });
}
