import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProjectVaultRequestError, projectVaultClient } from '../src/lib/project-vault-client';

const id = 'da9c1eb2-62f6-45fb-b7f9-a989521270ae';
const another = 'ba9c1eb2-62f6-45fb-b7f9-a989521270ae';
const sealed = {
  format: 'luqi.vault.sealed.v1' as const, kdf: 'PBKDF2-SHA256-310000' as const,
  salt: 'BwcHBwcHBwcHBwcHBwcHBw==', nonce: 'CAgICAgICAgICAgI',
  ciphertext: 'CQkJCQkJCQkJCQkJCQkJCQkJCQk=',
};
const response = (body: unknown, code = 200) =>
  new Response(JSON.stringify(body), { status: code, headers: { 'Content-Type': 'application/json' } });
afterEach(() => { vi.unstubAllGlobals(); });

describe('bounded encrypted vault transport', () => {
  it('uses the exact authenticated same-origin API and does not send a provider call', async () => {
    const fetcher = vi.fn().mockResolvedValue(response({
      availability: 'disabled', syncing: false, subscriptionActive: false,
    }));
    const state = await projectVaultClient('synthetic-in-memory-token', fetcher).status();
    expect(state.availability).toBe('disabled');
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0][0]).toBe('/api/v1/projects/status');
    const init = fetcher.mock.calls[0][1] as RequestInit;
    expect(init.credentials).toBe('omit');
    expect(init.redirect).toBe('error');
    expect(init.cache).toBe('no-store');
    expect(init.mode).toBe('same-origin');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer synthetic-in-memory-token');
    expect(init.body).toBeUndefined();
  });
  it('validates ownership-shaped response and rejects mismatched project identities', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response({
      projects: [{ id, kind: 'quote', revision: 1, updatedAt: '2026-10-25T09:00:00.000000Z' }],
    })).mockResolvedValueOnce(response({
      project: { id: another, kind: 'quote', revision: 1,
        updatedAt: '2026-10-25T09:00:00.000000Z', sealed },
    }));
    const api = projectVaultClient('fixture', fetcher);
    expect((await api.list())[0].id).toBe(id);
    await expect(api.get(id)).rejects.toMatchObject({ status: 0 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('acknowledges only the exact intended revision and never auto-retries an ambiguous write', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response({
      saved: true, id, revision: 1, created: true,
    })).mockResolvedValueOnce(response({
      saved: true, id, revision: 4, created: false,
    })).mockRejectedValueOnce(new Error('No response'));
    const api = projectVaultClient('fixture', fetcher);
    expect((await api.save(id, 'quote', 0, sealed)).revision).toBe(1);
    await expect(api.save(id, 'quote', 1, sealed)).rejects.toMatchObject({ status: 0 });
    await expect(api.save(id, 'quote', 1, sealed)).rejects.toMatchObject({ status: 0 });
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(JSON.stringify(fetcher.mock.calls)).not.toContain('passphrase');
  });
  it('requires explicit removal and passes exact revision, distinguishing conflicts from failures', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response({ code: 'PROJECT_CONFLICT' }, 409))
      .mockResolvedValueOnce(response({ removed: true, id }));
    const api = projectVaultClient('fixture', fetcher);
    await expect(api.remove(id, 1)).rejects.toMatchObject({ status: 409 });
    expect((await api.remove(id, 2)).removed).toBe(true);
    expect(JSON.parse((fetcher.mock.calls[1][1] as RequestInit).body as string))
      .toEqual({ confirm: true, expectedRevision: 2 });
  });
  it('refuses arbitrary paths and oversized or malformed responses', async () => {
    const fetcher = vi.fn().mockResolvedValue(response({ projects: [] }));
    const api = projectVaultClient('fixture', fetcher);
    await expect(api.get('../admin')).rejects.toBeInstanceOf(ProjectVaultRequestError);
    await expect(api.save(id, 'quote', -1, sealed)).rejects.toBeInstanceOf(ProjectVaultRequestError);
    expect(fetcher).not.toHaveBeenCalled();
    fetcher.mockResolvedValueOnce(new Response('{}', {
      headers: { 'Content-Type': 'application/json', 'Content-Length': '999999' },
    }));
    await expect(api.list()).rejects.toMatchObject({ status: 0 });
  });
});
