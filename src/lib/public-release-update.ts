/**
 * Detect a changed public Vite boot script without credentials, accounts,
 * stored customer data, paid inference or automatic reload.
 * A new index.html is fetched only in the active tab when a bounded check runs.
 */
export type PublicReleaseState = 'current' | 'update-available' | 'unverified';
export const PUBLIC_RELEASE_CHECK_COOLDOWN_MS = 120_000;
export const PUBLIC_RELEASE_CHECK_TIMEOUT_MS = 5_000;
const MAX_PUBLIC_INDEX_BYTES = 32_768;
const BOOT_PATH = /^\/assets\/index-[A-Za-z0-9_-]+\.js$/;

function validPublicBoot(src: string | null, origin: string): string | null {
  if (!src || !/^https?:\/\//.test(origin)) return null;
  try {
    const url = new URL(src, origin);
    return url.origin === origin && !url.search && !url.hash && BOOT_PATH.test(url.pathname)
      ? url.pathname : null;
  } catch { return null; }
}

export function currentPublicBoot(doc: Document, origin: string): string | null {
  for (const script of Array.from(doc.querySelectorAll<HTMLScriptElement>('script[type="module"][src]'))) {
    const boot = validPublicBoot(script.getAttribute('src'), origin);
    if (boot) return boot;
  }
  return null;
}

export function servedPublicBoot(html: string, origin: string): string | null {
  if (typeof html !== 'string' || html.length > MAX_PUBLIC_INDEX_BYTES) return null;
  const scripts = html.match(/<script\b[^>]*>/gi) || [];
  for (const tag of scripts) {
    if (!/\btype\s*=\s*(['"])module\1/i.test(tag)) continue;
    const src = tag.match(/\bsrc\s*=\s*(['"])([^'"]+)\1/i);
    const boot = validPublicBoot(src?.[2] || null, origin);
    if (boot) return boot;
  }
  return null;
}

/** Unknown network/server state is never called a broken or updated release. */
export async function checkPublicRelease(
  doc: Document,
  origin: string,
  fetcher: typeof fetch,
): Promise<PublicReleaseState> {
  const current = currentPublicBoot(doc, origin);
  if (!current || typeof fetcher !== 'function') return 'unverified';
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), PUBLIC_RELEASE_CHECK_TIMEOUT_MS);
  try {
    const response = await fetcher(origin + '/index.html', {
      method: 'GET', cache: 'no-store', credentials: 'omit', redirect: 'error',
      referrerPolicy: 'no-referrer',
      headers: { Accept: 'text/html', 'Cache-Control': 'no-cache' },
      signal: controller.signal,
    });
    if (!response.ok || response.redirected ||
        response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'text/html')
      return 'unverified';
    const reportedLength = Number(response.headers.get('content-length') || 0);
    if (reportedLength > MAX_PUBLIC_INDEX_BYTES) return 'unverified';
    const html = await response.text();
    const served = servedPublicBoot(html, origin);
    return !served ? 'unverified' : served === current ? 'current' : 'update-available';
  } catch {
    return 'unverified'; // Offline or unreachable: do not claim a newer build.
  } finally { clearTimeout(deadline); }
}
