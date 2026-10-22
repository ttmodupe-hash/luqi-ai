import { describe, expect, it, vi } from 'vitest';
vi.mock('../api/queries/connection', () => ({
  getDb: vi.fn(), getPersistentDb: vi.fn(() => { throw new Error('must not access DB'); }),
}));
import { restCompat } from '../api/rest-compat';
import { getPersistentDb } from '../api/queries/connection';
describe('authentication input boundary', () => {
  it('reports assisted recovery without pretending an email was sent or looking up accounts', async () => {
    for (const path of ['/auth/forgot-password', '/api/v1/auth/forgot-password']) {
      for (const email of ['known@example.invalid', 'unknown@example.invalid']) {
        const response = await restCompat.request(path, { method: 'POST',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
        expect(response.status).toBe(503);
        expect(response.headers.get('Cache-Control')).toBe('no-store');
        expect(await response.json()).toMatchObject({ code: 'ACCOUNT_RECOVERY_ASSISTED_ONLY' });
      }
    }
    expect(getPersistentDb).not.toHaveBeenCalled();
  });
  for (const path of ['/auth/signup', '/auth/register', '/api/v1/auth/register', '/auth/login', '/api/v1/auth/login']) {
    it(`rejects malformed or bcrypt-truncated passwords before database access: ${path}`, async () => {
      for (const body of ['null', '[]', 'true', 'invalid-json', JSON.stringify({email:'fixture@example.invalid', password:'a'.repeat(73)}), JSON.stringify({email:'fixture@example.invalid', password:'界'.repeat(25)})]) {
        const response = await restCompat.request(path, { method:'POST', headers:{'Content-Type':'application/json'}, body });
        expect(response.status).toBe(400);
        expect(response.headers.get('Cache-Control')).toBe('no-store');
      }
      expect(getPersistentDb).not.toHaveBeenCalled();
    });
  }
  it('requires an explicit bearer scheme on account lookup', async () => {
    for (const authorization of ['', 'a.b.c', 'Basic a.b.c', 'Bearer a b']) {
      const response = await restCompat.request('/auth/me', {headers:{authorization}});
      expect(response.status).toBe(401);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    }
    expect(getPersistentDb).not.toHaveBeenCalled();
  });
});
