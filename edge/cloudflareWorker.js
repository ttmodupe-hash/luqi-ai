// Legacy route Worker: forward to the configured origin without shared caching.
// Do not deploy on a workers.dev/custom-domain origin without first reviewing
// its routing. This file does not configure an origin or enable a deployment.

function privateResponse(response) {
  // Preserve the origin stream and runtime response metadata without buffering.
  const forwarded = new Response(response.body, response);
  const headers = forwarded.headers;
  headers.set('Cache-Control', 'no-store');
  headers.set('CDN-Cache-Control', 'no-store');
  headers.set('Cloudflare-CDN-Cache-Control', 'no-store');
  headers.set('X-Luqi-Edge-Cache', 'BYPASS');
  // The previous implementation invented a Johannesburg PoP when unknown.
  headers.delete('X-Edge-PoP');
  return forwarded;
}

export default {
  async fetch(request) {
    try {
      // Never read old shared entries, including entries produced by the old
      // forced-public policy. Do not follow redirects with account credentials.
      const response = await fetch(request, { cache: 'no-store', redirect: 'manual' });
      return privateResponse(response);
    } catch {
      // Do not disclose URLs, credentials or origin diagnostics on failure.
      return privateResponse(new Response(JSON.stringify({
        code: 'ORIGIN_UNAVAILABLE',
        message: 'The origin is temporarily unavailable.',
      }), { status: 502, headers: { 'Content-Type': 'application/json' } }));
    }
  },
};
