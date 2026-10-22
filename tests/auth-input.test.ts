import { describe, expect, it, vi } from 'vitest';
vi.mock('../api/queries/connection', () => ({
  getDb: vi.fn(), getPersistentDb: vi.fn(() => { throw new Error('must not access DB'); }),
}));
import { restCompat } from '../api/rest-compat';
import { getPersistentDb } from '../api/queries/connection';
describe('authentication input boundary', () => {
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
