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
