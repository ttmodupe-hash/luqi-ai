// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { omegaSubmission } from '../api/services/omegaTaskContract';
import { privateNotesExportSchema } from '../src/lib/private-conversations';

const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
function oversizedArray(max: number): unknown[] {
  const input = Array(max + 1).fill(null);
  Object.defineProperty(input, 0, { get() { throw new Error('Oversized collection children must not be visited'); } });
  return input;
}
function rejectsForSize(result: ReturnType<z.ZodType['safeParse']>) {
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues).toHaveLength(1);
    expect(result.error.issues[0].code).toBe('too_big');
  }
}

describe('patched validator and SDK resolutions', () => {
  it.each(['package.json', 'app/package.json'])('pins reviewed runtime versions in %s', path => {
    const manifest = json(path);
    expect(manifest.dependencies.zod).toBe('4.6.7');
    expect(manifest.dependencies.openai).toBe('7.43.0');
  });
  it.each(['package-lock.json', 'app/package-lock.json'])('has no older resolved Zod copy in %s', path => {
    const packages = json(path).packages;
    const validators = Object.entries(packages).filter(([name]) => name.endsWith('node_modules/zod'));
    expect(validators.length).toBeGreaterThan(0);
    for (const [, value] of validators) expect((value as { version: string }).version).toBe('4.6.7');
    expect(packages['node_modules/openai'].version).toBe('7.43.0');
    expect(packages['node_modules/openai'].peerDependencies.zod).toContain('^4.');
  });
  it('patches the isolated edge child without downgrading Wrangler', () => {
    const packages = json('edge/package-lock.json').packages;
    expect(packages['node_modules/wrangler'].version).toBe('4.152.0');
    const clients = Object.entries(packages).filter(([name]) => name.endsWith('node_modules/undici'));
    expect(clients.length).toBeGreaterThan(0);
    for (const [, value] of clients) expect((value as { version: string }).version).toBe('7.30.1');
  });
  it('does not disguise first-party v3 imports inside the patched package', () => {
    function scan(directory: string) {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) scan(path);
        else if (/\.(?:ts|tsx|js|mjs)$/.test(path)) {
          expect(readFileSync(path, 'utf8'), path).not.toMatch(/['"]zod\/v3(?:\/[^'"]*)?['"]/);
        }
      }
    }
    for (const root of ['api', 'src', 'app/src']) scan(root);
  });
});

describe('bounded collection validation and existing contracts', () => {
  it('rejects an oversized array before accessing any child', () => {
    rejectsForSize(z.array(z.string()).max(4).safeParse(oversizedArray(4)));
  });
  it('rejects oversized maps before accumulating child validation issues', () => {
    const visit = vi.fn();
    const child = z.string().superRefine(visit);
    rejectsForSize(z.map(child, child).max(1).safeParse(new Map([['a', 'a'], ['b', 'b']])));
    expect(visit).not.toHaveBeenCalled();
  });
  it('rejects oversized sets before accumulating child validation issues', () => {
    const visit = vi.fn();
    rejectsForSize(z.set(z.string().superRefine(visit)).max(1).safeParse(new Set(['a', 'b'])));
    expect(visit).not.toHaveBeenCalled();
  });
  it('preserves explicit record key/value validation', () => {
    const record = z.record(z.string(), z.number());
    expect(record.parse({ a: 2 })).toEqual({ a: 2 });
    expect(record.parse({})).toEqual({});
    expect(record.safeParse({ a: '2' }).success).toBe(false);
  });
  it('preserves bounded pagination defaults and rejects unsafe numeric IDs', () => {
    const page = z.object({ limit: z.coerce.number().int().min(1).max(100).default(20), before: z.number().int().positive().optional() }).strict();
    expect(page.parse({})).toEqual({ limit: 20 });
    expect(page.parse({ limit: '50' })).toEqual({ limit: 50 });
    expect(page.safeParse({ before: Number.MAX_SAFE_INTEGER + 1 }).success).toBe(false);
    expect(page.safeParse({ limit: 101 }).success).toBe(false);
    expect(page.safeParse({ userId: 99 }).success).toBe(false);
  });
  it('accepts the actual Omega budget boundary and rejects 51 items before inspecting them', () => {
    const request = { handler: 'travel.budget', idempotencyKey: 'synthetic-test-123', payload: { currency: 'ZAR', amounts: Array(50).fill('1.25') } };
    expect(omegaSubmission.parse(request)).toEqual(request);
    rejectsForSize(omegaSubmission.safeParse({ ...request, payload: { currency: 'ZAR', amounts: oversizedArray(50) } }));
  });
  it.each([['conversations', 500], ['messages', 5000], ['memories', 5000]] as const)('bounds the actual private-notes %s export before child parsing', (field, max) => {
    const archive = { format: 'luqi.private-notes.v1', scope: 'saved_notes_only', exportedAt: '2026-10-24T00:00:00.000Z', conversations: [], messages: [], memories: [] };
    expect(privateNotesExportSchema.safeParse(archive).success).toBe(true);
    rejectsForSize(privateNotesExportSchema.safeParse({ ...archive, [field]: oversizedArray(max) }));
  });
});

describe('OpenAI SDK compatibility without provider traffic', () => {
  it('converts the actual v4 schema through the supported SDK helper', () => {
    const format = zodResponseFormat(z.object({ answer: z.string(), labels: z.array(z.string()).max(4) }).strict(), 'synthetic_result');
    expect(format.type).toBe('json_schema');
    expect(format.json_schema.strict).toBe(true);
    expect(format.json_schema.schema).toMatchObject({ type: 'object', required: ['answer', 'labels'], additionalProperties: false });
  });
  it('preserves the legacy chat call shape using only a synthetic local fetch', async () => {
    const transport = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe('https://unit-test.invalid/v1/chat/completions');
      return new Response(JSON.stringify({ id: 'synthetic-response', object: 'chat.completion', created: 1, model: 'synthetic-model',
        choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: 'Synthetic reply', refusal: null } }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    const client = new OpenAI({ apiKey: 'synthetic-not-a-real-key', baseURL: 'https://unit-test.invalid/v1', maxRetries: 0, fetch: transport });
    const result = await client.chat.completions.create({ model: 'synthetic-model', messages: [{ role: 'user', content: 'Synthetic input' }] });
    expect(result.choices[0].message.content).toBe('Synthetic reply');
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it('propagates a synthetic upstream failure without fabricating a reply or retrying', async () => {
    const transport = vi.fn(async () => new Response(JSON.stringify({ error: { message: 'Synthetic outage', type: 'server_error' } }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }));
    const client = new OpenAI({ apiKey: 'synthetic-not-a-real-key', baseURL: 'https://unit-test.invalid/v1', maxRetries: 0, fetch: transport });
    await expect(client.chat.completions.create({ model: 'synthetic-model', messages: [{ role: 'user', content: 'Synthetic input' }] })).rejects.toMatchObject({ status: 503 });
    expect(transport).toHaveBeenCalledTimes(1);
  });
});
