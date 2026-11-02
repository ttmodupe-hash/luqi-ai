import { afterEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { signUserToken, verifyUserToken, verifyUserCredential, LUQI_JWT_ISSUER as iss, LUQI_JWT_AUDIENCE as aud } from '../api/lib/userToken';
const key = 'isolated-test-key-at-least-32-characters';
const hash = '$2b$12$' + 'a'.repeat(53);
const changedHash = '$2b$12$' + 'b'.repeat(53);
const now = Math.floor(Date.now() / 1000);
afterEach(() => vi.unstubAllEnvs());
describe('strict user token contract', () => {
  it('roundtrips issued tokens with exactly 24 hour expiry', () => {
    vi.stubEnv('JWT_SECRET', key);
    const token = signUserToken(42, hash);
    expect(verifyUserToken(token)).toBe(42);
    const claims = jwt.decode(token) as jwt.JwtPayload;
    expect(claims.exp! - claims.iat!).toBe(86400);
  });
  it('rejects missing, future, overlong and ambiguous claims', () => {
    for (const change of [
      { exp: undefined }, { cv: undefined }, { cv: "not-hex" }, { iat: now + 120, exp: now + 86400 },
      { exp: now + 86401 }, { exp: now }, { aud: [aud, 'another-service'] },
      { userId: 0 }, { userId: '42' }, { iss: 'foreign-service' },
    ]) {
      const payload = { cv: "a".repeat(64), userId: 42, iss, aud, iat: now, exp: now + 86400, ...change };
      const token = jwt.sign(JSON.parse(JSON.stringify(payload)), key);
      expect(() => verifyUserToken(token, key)).toThrow();
    }
    const noTimestamp = jwt.sign({ userId: 42, iss, aud, exp: now + 3600 }, key, { noTimestamp: true });
    expect(() => verifyUserToken(noTimestamp, key)).toThrow();
  });
  it('revokes tokens after credential changes without exposing the stored hash', () => {
    vi.stubEnv('JWT_SECRET', key);
    const token = signUserToken(42, hash);
    expect(() => verifyUserCredential(token, 42, hash)).not.toThrow();
    expect(() => verifyUserCredential(token, 42, changedHash)).toThrow();
    expect(() => verifyUserCredential(token, 43, hash)).toThrow();
    expect(JSON.stringify(jwt.decode(token))).not.toContain(hash);
    expect(() => signUserToken(42, 'not-a-password-hash')).toThrow();
  });
  it('never permits a short signing secret or invalid account id', () => {
    vi.stubEnv('JWT_SECRET', 'short');
    expect(() => signUserToken(42, hash)).toThrow();
    const token = jwt.sign({ userId: 42, iss, aud, exp: now + 3600 }, 'short');
    expect(() => verifyUserToken(token, 'short')).toThrow();
    vi.stubEnv('JWT_SECRET', key);
    for (const id of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) expect(() => signUserToken(id, hash)).toThrow();
  });
});
