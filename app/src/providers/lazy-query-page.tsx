import { lazy, type ComponentType } from 'react';

/** Keep the existing query client/cache, but download it only with its tools.
 * Both imports begin together on first render. RouteLoadBoundary still owns
 * loading/errors; there is no prefetch, custom retry or API request here.
 */
export function lazyQueryPage(loadPage: () => Promise<{ default: ComponentType }>) {
  return lazy(async () => {
    const [page, { TRPCProvider }] = await Promise.all([loadPage(), import('./trpc')]);
    const Page = page.default;
    return { default: function DeferredQueryPage() {
      return <TRPCProvider><Page /></TRPCProvider>;
    } };
  });
}
