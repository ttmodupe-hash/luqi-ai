/** Real, limited anonymous Luqi replies: same-origin, signed guest cookie,
 * durable per-visitor/global quota and existing provider cap. No guest account,
 * browser API key, anonymous uploads or model fallback.
 */
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { countGuestInputTokens } from './services/guestTokenCount';
import { PILOT_MODELS } from './services/pilotModels';
import { buildPilotInput, PilotInputError } from '../src/lib/pilot-input';
import { readGeminiText, PilotOutputError } from './services/pilotOutput';
import { reserveGuestAttempt, guestTrialEnabled, guestTrialSnapshot, GuestTrialError, guestCapacity, guestNetworkId } from './services/guestTrialBudget';

const GUEST_COOKIE = 'luqi_guest_trial_v1';
const MAX_GUEST_INPUT = 800;
const guestBody = z.object({
  prompt: z.string().trim().min(1).max(MAX_GUEST_INPUT),
  history: z.array(z.object({
    sender: z.enum(['user', 'ai']), text: z.string().trim().min(1).max(250),
  }).strict()).max(2).optional(),
}).strict();

export function signGuestIdentifier(id: string, secret: string, now = new Date()): string {
  if (!/^[a-f0-9]{32}$/.test(id) || secret.length < 32) throw new GuestTrialError('GUEST_TRIAL_UNAVAILABLE');
  const expiry = Math.floor(now.getTime() / 1000) + 2592000;
  const payload = id + '.' + expiry;
  return payload + '.' + createHmac('sha256', secret).update('luqi-guest-cookie-v2|' + payload).digest('hex');
}
export function validateGuestCookie(value: string | undefined, secret: string, now = new Date()): string | null {
  if (secret.length < 32) return null;
  // Preserve the already-issued pilot identity during migration; expanded mode
  // accepts only expiring v2 cookies. A normal GET upgrades the same identity.
  if (/^[a-f0-9]{32}\.[a-f0-9]{64}$/.test(value ?? '')) {
    if (guestCapacity().expanded) return null;
    const [id, signature] = value!.split('.');
    const expected = createHmac('sha256', secret).update('luqi-guest-cookie-v1|' + id).digest('hex');
    return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex')) ? id : null;
  }
  if (!/^[a-f0-9]{32}\.\d{10}\.[a-f0-9]{64}$/.test(value ?? '')) return null;
  const [id, expires, signature] = value!.split('.');
  const expiry = Number(expires), seconds = Math.floor(now.getTime() / 1000);
  if (expiry <= seconds || expiry > seconds + 2592000) return null;
  const expected = createHmac('sha256', secret).update('luqi-guest-cookie-v2|' + id + '.' + expires).digest('hex');
  return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex')) ? id : null;
}
export function guestCounterId(id: string, secret: string): number {
  if (!/^[a-f0-9]{32}$/.test(id) || secret.length < 32) throw new GuestTrialError('GUEST_TRIAL_UNAVAILABLE');
  const digest = createHmac('sha256', secret).update('luqi-guest-ledger-v1|' + id).digest();
  return -(1000 + digest.readUIntBE(0, 6)); // distinct from real positive account IDs and -1/-2 sentinels.
}
function cookieValue(header: string | undefined): string | undefined {
  if (!header || header.length > 4096) return undefined;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === GUEST_COOKIE) return rest.join('=');
  }
  return undefined;
}
function guestCookie(id: string, secret: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${GUEST_COOKIE}=${signGuestIdentifier(id, secret)}; Path=/api/v1/guest-chat; Max-Age=2592000; HttpOnly; SameSite=Strict${secure}`;
}
/** Browsers may only spend from the origin hosting this route.
 * Explicit POST and application/json prevent simple third-party forms.
 */
export function permittedGuestOrigin(source: string | undefined, target: string): boolean {
  if (!source || !/^https?:\/\//.test(source)) return false;
  try {
    const a = new URL(source), b = new URL(target);
    if (a.username || a.password || a.search || a.hash || a.pathname !== '/') return false;
    if (a.hostname !== b.hostname || a.port !== b.port) return false;
    if (a.protocol === 'https:') return true;
    return process.env.NODE_ENV !== 'production' && a.protocol === 'http:' &&
      ['localhost', '127.0.0.1'].includes(a.hostname);
  } catch { return false; }
}

const GUEST_POLICY = `You are Luqi, an accessible multilingual African AI learning and practical assistant.
This is a very short guest introduction, not a full subscription or authorised professional service.
Answer the actual question directly with friendly, useful detail. Interpret follow-up corrections by using only the short, explicitly submitted guest history.
Use simple language for children when asked; support practical planning, learning, writing and creativity.
Give a complete answer in a few clear paragraphs (typically under 180 words).
Do not claim to browse, search live providers, make a booking, generate video/audio, store an account or verify current legal/medical/financial facts.
If someone asks for an advanced capability, give the best first explanation and point out that the signed-in tools may have additional functions. Do not pressure someone to register.
Never claim KHORO is a separate assistant or ask for credentials. You are Luqi.`;

export const guestTrial = new Hono();
guestTrial.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store');
  c.header('Pragma', 'no-cache');
  return next();
});
guestTrial.get('/', async c => {
  if (!guestTrialEnabled()) return c.json({ enabled: false, remaining: 0, limit: 3, reason: 'paused' });
  const secret = process.env.JWT_SECRET!;
  let id = validateGuestCookie(cookieValue(c.req.header('cookie')), secret);
  if (!id) {
    id = randomBytes(16).toString('hex');
    c.header('Set-Cookie', guestCookie(id, secret));
  } else if (cookieValue(c.req.header('cookie'))?.split('.').length === 2) {
    c.header('Set-Cookie', guestCookie(id, secret));
  }
  const status = await guestTrialSnapshot(guestCounterId(id, secret));
  return c.json(status);
});
guestTrial.post('/', bodyLimit({ maxSize: 4 * 1024,
  onError: c => c.json({ code: 'INVALID_INPUT' }, 413),
}));
guestTrial.post('/', async c => {
  if (!guestTrialEnabled()) return c.json({ code: 'GUEST_TRIAL_PAUSED' }, 503);
  if (!permittedGuestOrigin(c.req.header('origin'), c.req.url)) return c.json({ code: 'GUEST_ORIGIN_DENIED' }, 403);
  if (!/^application\/json(?:\s*;|$)/i.test(c.req.header('content-type') ?? ''))
    return c.json({ code: 'INVALID_INPUT' }, 415);
  const secret = process.env.JWT_SECRET!;
  const id = validateGuestCookie(cookieValue(c.req.header('cookie')), secret);
  if (!id) return c.json({ code: 'GUEST_START_REQUIRED' }, 428);
  const parsed = guestBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ code: 'INVALID_INPUT' }, 400);
  const { prompt, history } = parsed.data;
  let input: string;
  try { input = buildPilotInput(prompt, 'auto', history); }
  catch (e) { return c.json({ code: e instanceof PilotInputError ? e.code : 'INVALID_INPUT' }, 400); }
  try {
    const capacity = guestCapacity();
    await reserveGuestAttempt(guestCounterId(id, secret), new Date(),
      capacity.expanded ? guestNetworkId(c.req.header('x-real-ip'), secret) : undefined);
    // No OpenAI fallback, no auto-retry, no tools, no implicit provider calls.
    const model = new GoogleGenAI({ apiKey: process.env.LUQI_PILOT_GEMINI_API_KEY! });
    if (capacity.expanded) {
      // Count complete system + user context; never infer tokens from English characters.
      const tokens = await countGuestInputTokens(input, GUEST_POLICY);
      if (!Number.isSafeInteger(tokens.totalTokens) || tokens.totalTokens! < 1 || tokens.totalTokens! > 4096)
        throw new GuestTrialError('GUEST_TRIAL_UNAVAILABLE');
    }
    const output = await model.models.generateContent({
      model: PILOT_MODELS.gemini, contents: input,
      config: { systemInstruction: GUEST_POLICY, maxOutputTokens: 512,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        httpOptions: { timeout: 20_000, retryOptions: { attempts: 1 } } },
    });
    const text = readGeminiText(output);
    const status = await guestTrialSnapshot(guestCounterId(id, secret));
    return c.json({ status: 'success', provider: 'gemini',
      provider_model: PILOT_MODELS.gemini, response: text, remaining: status.remaining });
  } catch (error) {
    if (error instanceof GuestTrialError) {
      const isLimit = error.code === 'GUEST_TRIAL_COMPLETE' || error.code === 'GUEST_TRIAL_PAUSED' || error.code === 'GUEST_RATE_LIMITED';
      if (error.code === 'GUEST_RATE_LIMITED') c.header('Retry-After', String(error.retryAfter));
      return c.json({ status: 'unavailable', code: error.code }, isLimit ? 429 : 503);
    }
    if (error instanceof PilotOutputError)
      return c.json({ status: 'unavailable', code: error.code }, error.code === 'AI_RESPONSE_BLOCKED' ? 422 : 502);
    // Failed or lost provider replies may still have consumed an attempt.
    return c.json({ status: 'unavailable', code: 'RESPONSE_UNCONFIRMED' }, 503);
  }
});
