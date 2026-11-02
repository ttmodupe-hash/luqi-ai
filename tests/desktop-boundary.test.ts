import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

describe('desktop window boundary', () => {
  it('isolates the renderer and blocks OS protocols and remote navigation', () => {
    let ready: () => void = () => {};
    let open: (value: {url: string}) => {action: string};
    let navigation: (event: {preventDefault: () => void}) => void;
    let preferences: Record<string, unknown> = {};
    let loaded = '';
    const external = vi.fn(async () => {});
    const fake = {
      app: {whenReady: () => ({then: (fn: () => void) => { ready = fn; }}), on: vi.fn()},
      BrowserWindow: class {
        webContents = {
          setWindowOpenHandler: (fn: typeof open) => { open = fn; },
          on: (event: string, fn: typeof navigation) => { if (event === 'will-navigate') navigation = fn; },
        };
        constructor(options: {webPreferences: Record<string, unknown>}) { preferences = options.webPreferences; }
        loadFile(path: string) { loaded = path; }
        once() {}
        on() {}
      },
      ipcMain: {handle: vi.fn()}, shell: {openExternal: external},
    };
    runInNewContext(readFileSync('app/electron/main.js', 'utf8'), {
      require: (name: string) => name === 'electron' ? fake : name === 'path' ? {join: (...parts: string[]) => parts.join('/')} : {},
      process: {env: {}, argv: [], platform: 'linux'}, __dirname: '/desktop', URL,
    });
    ready();
    expect(preferences).toMatchObject({sandbox: true, contextIsolation: true, nodeIntegration: false});
    expect(loaded).toBe('/desktop/ui/index.html');
    for (const url of ['file:///etc/passwd', 'javascript:alert(1)', 'ms-settings:privacy', 'data:text/html,bad', 'malformed']) {
      expect(open!({url})).toEqual({action: 'deny'});
    }
    expect(external).not.toHaveBeenCalled();
    expect(open!({url: 'https://example.invalid/help'})).toEqual({action: 'deny'});
    expect(external).toHaveBeenCalledWith('https://example.invalid/help');
    const event = {preventDefault: vi.fn()};
    navigation!(event);
    expect(event.preventDefault).toHaveBeenCalledOnce();
  });
});

/** Exercise the actual smoke expression, not a duplicate heading assertion. */
async function runDesktopSmoke(heading: string | null, hasShell = true, failEvaluation = false) {
  let ready = () => {};
  const handlers = new Map<string, () => void | Promise<void>>();
  const exit = vi.fn();
  const clearTimeout = vi.fn();
  const fake = {
    app: {whenReady: () => ({then: (fn: () => void) => { ready = fn; }}), on: vi.fn(), exit},
    BrowserWindow: class {
      webContents = {
        on: (event: string, fn: () => void | Promise<void>) => { handlers.set(event, fn); },
        setWindowOpenHandler: vi.fn(),
        executeJavaScript: async (script: string) => {
          if (failEvaluation) throw new Error('Synthetic renderer failure');
          return runInNewContext(script, {document: {querySelector: (selector: string) => {
            if (selector === '#workspace-content main #workspace-title') return heading === null ? null : {textContent: heading};
            if (selector === 'a[aria-label="Luqi workspace home"]') return hasShell ? {} : null;
            return null;
          }}});
        },
      };
      loadFile() {}
      once() {}
      on() {}
    },
    ipcMain: {handle: vi.fn()}, shell: {openExternal: vi.fn()},
  };
  runInNewContext(readFileSync('app/electron/main.js', 'utf8'), {
    require: (name: string) => name === 'electron' ? fake : name === 'path' ? {join: (...parts: string[]) => parts.join('/')} : {},
    process: {env: {}, argv: ['--luqi-smoke-test'], platform: 'linux'}, __dirname: '/desktop', URL,
    setTimeout: vi.fn(() => 1), clearTimeout, console: {log: vi.fn()},
  });
  ready();
  expect(handlers.has('did-finish-load')).toBe(true);
  await handlers.get('did-finish-load')!();
  return {exit, clearTimeout};
}

describe('packaged desktop homepage acceptance', () => {
  it.each(['Knowledge. People.A Stronger Africa.', 'Knowledge. People. A Stronger Africa.', 'Knowledge. People.\nA Stronger Africa.'])('accepts the complete approved heading: %s', async heading => {
    const {exit, clearTimeout} = await runDesktopSmoke(heading);
    expect(exit).toHaveBeenCalledExactlyOnceWith(0);
    expect(clearTimeout).toHaveBeenCalledExactlyOnceWith(1);
  });
  it.each(['A little curiosity.A lot of possibility.', '', null, 'Knowledge. People.A Stronger Africa. extra'])('rejects a stale, missing or different heading: %s', async heading => {
    const {exit} = await runDesktopSmoke(heading);
    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
  });
  it('rejects a missing workspace shell even with the current heading', async () => {
    const {exit} = await runDesktopSmoke('Knowledge. People.A Stronger Africa.', false);
    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
  });
  it('fails closed when the renderer cannot be evaluated', async () => {
    const {exit} = await runDesktopSmoke('Knowledge. People.A Stronger Africa.', true, true);
    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
  });
});
