// ============================================================================
// Phase 3: Cloudflare Worker Edge Caching Script
// Deploy to Cloudflare Workers for JNB, CPT, and NBO edge PoPs
// 0ms Latency & R0.00 Token Cost for Common Queries & Assets
// ============================================================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cacheKey = new Request(url.toString(), request);
    const cache = caches.default;

    // Check if response exists in Cloudflare Edge Cache
    let response = await cache.match(cacheKey);
    if (response) {
      // Return instant edge response (0ms latency, 0 AI tokens spent)
      const newHeaders = new Headers(response.headers);
      newHeaders.set('X-Luqi-Edge-Cache', 'HIT');
      newHeaders.set('X-Edge-PoP', request.cf?.colo || 'JNB-01');
      return new Response(response.body, { status: response.status, headers: newHeaders });
    }

    // If not cached, fetch from origin server (Railway / Google Cloud Run)
    response = await fetch(request);

    // Only cache successful GET requests for public assets or common FAQs
    if (
      request.method === 'GET' &&
      response.status === 200 &&
      (url.pathname.includes('/api/v1/public') ||
        url.pathname.includes('/api/v1/edge-cache') ||
        url.pathname === '/')
    ) {
      const responseToCache = response.clone();
      const updatedHeaders = new Headers(responseToCache.headers);
      updatedHeaders.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours at the edge
      updatedHeaders.set('X-Luqi-Edge-Cache', 'MISS-CACHED-AT-EDGE');

      const cachedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        headers: updatedHeaders,
      });

      ctx.waitUntil(cache.put(cacheKey, cachedResponse));
    }

    return response;
  },
};
