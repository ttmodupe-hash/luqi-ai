// @vitest-environment jsdom
import React, { Component, Suspense } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { useQueryClient } from '@tanstack/react-query';
import { readFileSync } from 'node:fs';
import { lazyQueryPage as rootLoader } from '../src/providers/lazy-query-page';
import { lazyQueryPage as appLoader } from '../app/src/providers/lazy-query-page';
import { trpc as rootTrpc } from '../src/providers/trpc';
import { trpc as appTrpc } from '../app/src/providers/trpc';

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
for (const [name, loader, trpc] of [['root', rootLoader, rootTrpc], ['app', appLoader, appTrpc]] as const) {
  it(`${name}: does not load until rendered and supplies both real query contexts`, async () => {
    const request = vi.fn(); vi.stubGlobal('fetch', request);
    function Tool() {
      const client = useQueryClient(), utils = trpc.useUtils();
      return <h1>{client && utils ? 'Query tool ready' : 'Missing context'}</h1>;
    }
    const load = vi.fn(async () => ({ default: Tool }));
    const Page = loader(load);
    expect(load).not.toHaveBeenCalled();
    render(<Suspense fallback={<p>Loading fixture</p>}><Page /></Suspense>);
    expect(await screen.findByRole('heading', { name: 'Query tool ready' })).toBeTruthy();
    expect(load).toHaveBeenCalledTimes(1); expect(request).not.toHaveBeenCalled();
  });
  it(`${name}: retains the existing shared cache across route remounts`, async () => {
    const clients: unknown[] = [];
    function Tool() { clients.push(useQueryClient()); return <h1>Mounted fixture</h1>; }
    const Page = loader(async () => ({ default: Tool }));
    const first = render(<Suspense fallback={null}><Page /></Suspense>);
    await screen.findByRole('heading', { name: 'Mounted fixture' }); first.unmount();
    render(<Suspense fallback={null}><Page /></Suspense>);
    await screen.findByRole('heading', { name: 'Mounted fixture' });
    expect(clients.length).toBeGreaterThanOrEqual(2);
    expect(clients.every(client => client === clients[0])).toBe(true);
  });
  it(`${name}: failed imports reach the error boundary without automatic retries`, async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    class Boundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
      state = { failed: false };
      static getDerivedStateFromError() { return { failed: true }; }
      render() { return this.state.failed ? <h1>Load unavailable</h1> : this.props.children; }
    }
    const load = vi.fn(async () => { throw new Error('synthetic download failure'); });
    const Page = loader(load);
    render(<Boundary><Suspense fallback={null}><Page /></Suspense></Boundary>);
    expect(await screen.findByRole('heading', { name: 'Load unavailable' })).toBeTruthy();
    expect(load).toHaveBeenCalledTimes(1);
  });
}
it('both route trees explicitly wrap every known query consumer and retain mirrored loading helpers', () => {
  for (const base of ['src', 'app/src']) {
    const source = readFileSync(`${base}/App.tsx`, 'utf8');
    for (const name of ['LabSimulatorPage', 'SelfHealingPage', 'ExperientialEducationPage']) {
      expect(source).toContain(`const ${name} = lazyQueryPage(() => import("./pages/${name}"));`);
    }
  }
  expect(readFileSync('src/providers/lazy-query-page.tsx', 'utf8')).toBe(readFileSync('app/src/providers/lazy-query-page.tsx', 'utf8'));
});
