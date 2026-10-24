from pathlib import Path
import hashlib
root=Path('.')
expected={'api/services/aiPilotBudget.ts':'30c3310e2e2683cbc619755f571618d795821a69','api/services/aiPilotGateway.ts':'dd236440dad747ea888ac3b6fe030e365474c131','api/ai-pilot.ts':'d6850ce765b9ab6b2f847c743353bfc9fcc00572','src/lib/ai-pilot.ts':'9711a063a161a12e46a2dd6b1ae39fc948a5f74c','src/pages/AiPilotPage.tsx':'d81bc8b027e716f88cd4a824ff8f4d448eb1436f','app/src/lib/ai-pilot.ts':'9711a063a161a12e46a2dd6b1ae39fc948a5f74c','app/src/pages/AiPilotPage.tsx':'d81bc8b027e716f88cd4a824ff8f4d448eb1436f','tests/ai-pilot-route.test.ts':'8b4f33a336cd74e76691701bea93d94a39832754','tests/ai-pilot-client.test.ts':'d497a8d3d52e95877b75ab580b4f548b1a14903f','tests/ai-pilot-page.test.tsx':'caf7ca3bc6b280cdc3f498ab0e7e13dede61fe21','tests/ai-pilot-transport.test.ts':'49908c6db49b5bcf452c51721d45d7efcafa6443'}
for path,sha in expected.items():
 b=(root/path).read_bytes()
 assert hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()==sha, 'Source changed: '+path

def read(p):return (root/p).read_text()
def write(p,s):(root/p).write_text(s)
def replace(p,old,new):
 s=read(p)
 assert s.count(old)==1,(p,'Unexpected replacement count')
 write(p,s.replace(old,new))
replace('api/services/aiPilotBudget.ts','import mysql, { type Pool } from "mysql2/promise";', 'import mysql, { type Pool } from "mysql2/promise";\nimport { MAX_PILOT_INPUT_CHARS } from "../../src/lib/pilot-input";')
replace('api/services/aiPilotBudget.ts','export const MAX_INPUT_CHARS = 6000;','export const MAX_INPUT_CHARS = MAX_PILOT_INPUT_CHARS;')
s=read('api/services/aiPilotGateway.ts')
s=s.replace('import { PILOT_MODELS } from "./pilotModels";','import { PILOT_MODELS } from "./pilotModels";\nimport { buildPilotInput } from "../../src/lib/pilot-input";')
s=s.replace('assertPilotEnabled, MAX_INPUT_CHARS, MAX_OUTPUT_TOKENS,','assertPilotEnabled, MAX_OUTPUT_TOKENS,')
start=s.index('  if (!prompt.trim()');end=s.index('\n  const geminiKey',start)
s=s[:start]+'''  // Validate the complete formatted input BEFORE keys, reservations or requests.
  // A late qualifier in a long question must never be silently cut off.
  const input = buildPilotInput(prompt, language, history);
'''+s[end:]
write('api/services/aiPilotGateway.ts',s)
replace('api/ai-pilot.ts',"import { Hono } from 'hono';", "import { Hono } from 'hono';\nimport { buildPilotInput, PilotInputError } from '../src/lib/pilot-input';")
replace('api/ai-pilot.ts',"aiPilot.onError((error, c) => {", """aiPilot.onError((error, c) => {
  if (error instanceof PilotInputError) return c.json({ status: 'error', code: error.code,
    message: error.code === 'AI_INPUT_TOO_LARGE'
      ? 'Your complete question, language and history exceed the 6000-character input limit. Shorten them; no provider attempt was started.'
      : 'The question or conversation context is invalid. No provider attempt was started.' }, 400);""")
replace('api/ai-pilot.ts',"  const { user_input, prompt, language, history } = parsed.data;", """  const { user_input, prompt, language, history } = parsed.data;
  // Keep the HTTP boundary truthful even if the gateway implementation changes.
  buildPilotInput((user_input ?? prompt)!, language, history);""")
replace('src/lib/ai-pilot.ts',"import { z } from 'zod';", "import { z } from 'zod';\nimport { buildPilotInput, PilotInputError } from './pilot-input';")
replace('src/lib/ai-pilot.ts',"  try {\n    const response = await request('/api/v1/luqi-core', {", """  try {
    // Validate the same formatted limit as the server, without sending context.
    buildPilotInput(prompt.trim());
    const response = await request('/api/v1/luqi-core', {""")
replace('src/lib/ai-pilot.ts',"'AI_PROVIDER_BUDGET_EXHAUSTED', 'AI_USER_DAILY_QUOTA_EXHAUSTED', 'AI_PROVIDER_UNAVAILABLE'", "'AI_PROVIDER_BUDGET_EXHAUSTED', 'AI_USER_DAILY_QUOTA_EXHAUSTED', 'AI_PROVIDER_UNAVAILABLE', 'AI_INPUT_TOO_LARGE', 'INVALID_INPUT'")
replace('src/lib/ai-pilot.ts',"    if (error instanceof PilotChatError) throw error;", "    if (error instanceof PilotInputError) throw new PilotChatError(error.code);\n    if (error instanceof PilotChatError) throw error;")
replace('src/pages/AiPilotPage.tsx',"import type { AccountSession } from '../lib/private-conversations';", "import type { AccountSession } from '../lib/private-conversations';\nimport { MAX_PILOT_QUESTION_CHARS } from '../lib/pilot-input';")
replace('src/pages/AiPilotPage.tsx',"  const [uncertain, setUncertain] = useState(false);", """  const [uncertain, setUncertain] = useState(false);
  const questionLength = prompt.trim().length;
  const tooLong = questionLength > MAX_PILOT_QUESTION_CHARS;""")
replace('src/pages/AiPilotPage.tsx',"if (!session || !consent || !available || locked.current || uncertain || !prompt.trim()) return;", "if (!session || !consent || !available || locked.current || uncertain || !prompt.trim() || tooLong) return;")
replace('src/pages/AiPilotPage.tsx',"      } else if (code === 'AI_USER_DAILY_QUOTA_EXHAUSTED')", """      } else if (code === 'AI_INPUT_TOO_LARGE' || code === 'INVALID_INPUT') {
        setNotice('Your question could not be sent as entered. Shorten or correct it; no provider attempt was started.');
      } else if (code === 'AI_USER_DAILY_QUOTA_EXHAUSTED')""")
replace('src/pages/AiPilotPage.tsx','rows={5} maxLength={6000}', 'rows={5}\n            aria-describedby="ai-question-limit" aria-invalid={tooLong || undefined}')
replace('src/pages/AiPilotPage.tsx','<p>{prompt.length}/6000 characters</p>', '''<p id="ai-question-limit">{questionLength}/{MAX_PILOT_QUESTION_CHARS} characters. Request formatting uses the rest of the 6000-character input limit.
            {tooLong && ' Shorten your question. It will not be sent or shortened automatically.'}</p>''')
replace('src/pages/AiPilotPage.tsx','disabled={!available || !consent || !prompt.trim() || busy || uncertain}', 'disabled={!available || !consent || !prompt.trim() || tooLong || busy || uncertain}')
for p in ['lib/ai-pilot.ts','pages/AiPilotPage.tsx']:write('app/src/'+p,read('src/'+p))
replace('tests/ai-pilot-route.test.ts',"import { aiPilot } from '../api/ai-pilot';", "import { aiPilot } from '../api/ai-pilot';\nimport { buildPilotInput, MAX_PILOT_INPUT_CHARS } from '../src/lib/pilot-input';")
replace('tests/ai-pilot-route.test.ts',"""    expect((await send({ prompt: 'x'.repeat(6000), language: 'isiZulu', history })).status).toBe(200);
    expect(chat).toHaveBeenCalledExactlyOnceWith('x'.repeat(6000), 42, 'isiZulu', history);""", """    const room = MAX_PILOT_INPUT_CHARS - buildPilotInput('x', 'isiZulu', history).length + 1;
    const question = 'x'.repeat(room - 8) + 'END-TEST';
    expect((await send({ prompt: question, language: 'isiZulu', history })).status).toBe(200);
    expect(chat).toHaveBeenCalledExactlyOnceWith(question, 42, 'isiZulu', history);
  });

  it('rejects combined overflow before the gateway rather than silently truncating the question', async () => {
    const response = await send({ prompt: 'x'.repeat(6000), language: 'isiZulu',
      history: [{ sender: 'user', text: 'explicit context' }] });
    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = await response.json();
    expect(body.code).toBe('AI_INPUT_TOO_LARGE');
    expect(body.message).toContain('no provider attempt was started');
    expect(chat).not.toHaveBeenCalled();""")
s=read('tests/ai-pilot-client.test.ts');s="import { MAX_PILOT_QUESTION_CHARS } from '../src/lib/pilot-input';\n"+s
s+='''
it('refuses a question that fits the raw API field but not the complete input', async () => {
  const request = vi.fn();
  await expect(askPilot('token', 'x'.repeat(MAX_PILOT_QUESTION_CHARS + 1), new AbortController().signal, request))
    .rejects.toMatchObject({ code: 'AI_INPUT_TOO_LARGE' });
  expect(request).not.toHaveBeenCalled();
});
it('sends the full exact-limit question including its final qualifier', async () => {
  const question = 'x'.repeat(MAX_PILOT_QUESTION_CHARS - 8) + 'END-TEST';
  const request = vi.fn(async () => Response.json({ status: 'success', response: 'Hello', provider: 'gemini', provider_model: 'fixture-model' }));
  await askPilot('token', question, new AbortController().signal, request);
  expect(JSON.parse((request.mock.calls[0] as unknown as [string, RequestInit])[1].body as string).user_input).toBe(question);
  expect(request).toHaveBeenCalledTimes(1);
});
it.each(['AI_INPUT_TOO_LARGE', 'INVALID_INPUT'])('recognizes a server pre-spend rejection: %s', async code => {
  const request = vi.fn(async () => Response.json({ code }, { status: 400 }));
  await expect(askPilot('token', 'Hello', new AbortController().signal, request)).rejects.toMatchObject({ code });
  expect(request).toHaveBeenCalledTimes(1);
});
'''
write('tests/ai-pilot-client.test.ts',s)
s=read('tests/ai-pilot-page.test.tsx');s=s.replace("import AiPilotPage from '../src/pages/AiPilotPage';","import AiPilotPage from '../src/pages/AiPilotPage';\nimport { MAX_PILOT_QUESTION_CHARS } from '../src/lib/pilot-input';")
s+='''
it('keeps an over-limit draft intact and blocks both button and form submission', async () => {
  await login(); consent();
  const question = 'x'.repeat(MAX_PILOT_QUESTION_CHARS) + 'END-TEST';
  const input = screen.getByLabelText('Your question') as HTMLTextAreaElement;
  fireEvent.change(input, { target: { value: question } });
  expect(input.value).toBe(question);
  expect(input.getAttribute('aria-invalid')).toBe('true');
  expect(screen.getByText(/It will not be sent or shortened automatically/)).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Send question' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.submit(input.closest('form')!);
  expect(inference).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: 'A corrected question' } });
  expect(input.hasAttribute('aria-invalid')).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
  await screen.findByRole('heading', { name: 'AI reply' });
  expect(inference).toHaveBeenCalledTimes(1);
});
it('reports pre-spend input failure without a charged-attempt warning or clearing the draft', async () => {
  inference.mockResolvedValue(Response.json({ code: 'AI_INPUT_TOO_LARGE' }, { status: 400 }));
  await login(); draft(); consent(); fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
  await screen.findByText(/no provider attempt was started/);
  expect((screen.getByLabelText('Your question') as HTMLTextAreaElement).value).toBe('Say hello in isiZulu');
  expect(screen.queryByText(/Failed provider attempts may/)).toBeNull();
  expect(inference).toHaveBeenCalledTimes(1);
});
'''
write('tests/ai-pilot-page.test.tsx',s)
s=read('tests/ai-pilot-transport.test.ts');s="import { buildPilotInput, MAX_PILOT_INPUT_CHARS } from '../src/lib/pilot-input';\n"+s
s+='''
describe('complete paid input boundary', () => {
  it.each(['gemini', 'openai'] as const)('preserves the entire exact-limit prompt on %s', async provider => {
    if (provider === 'openai') vi.stubEnv('LUQI_PILOT_GEMINI_API_KEY', '');
    const history = [{ sender: 'user', text: 'x'.repeat(350) }, { sender: 'ai', text: 'y'.repeat(350) },
      { sender: 'user', text: 'z'.repeat(350) }, { sender: 'ai', text: 'w'.repeat(342) + 'HIST-END' }];
    const language = 'isiZulu';
    const room = MAX_PILOT_INPUT_CHARS - buildPilotInput('x', language, history).length + 1;
    const prompt = 'p'.repeat(room - 8) + 'END-TEST';
    const expected = buildPilotInput(prompt, language, history);
    const fetcher = vi.fn(async (_url: string, options: RequestInit) => {
      expect(reserve.mock.calls).toEqual([[provider, 42]]);
      const body = JSON.parse(options.body as string);
      const sent = provider === 'gemini' ? body.contents[0].parts[0].text : body.input;
      expect(sent).toBe(expected); expect(sent.length).toBe(6000);
      expect(sent).toContain('HIST-END'); expect(sent.endsWith('END-TEST')).toBe(true);
      return provider === 'gemini'
        ? Response.json({ candidates: [{ content: { role: 'model', parts: [{ text: 'Fixture reply' }] } }] })
        : Response.json({ output: [{ content: [{ type: 'output_text', text: 'Fixture reply' }] }] });
    });
    vi.stubGlobal('fetch', fetcher);
    expect((await runBudgetedPilotChat(prompt, 42, language, history)).provider).toBe(provider);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('rejects formatted overflow before reservations, transport or fallback', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    await expect(runBudgetedPilotChat('x'.repeat(6000), 42)).rejects.toMatchObject({ code: 'AI_INPUT_TOO_LARGE' });
    expect(reserve).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled();
  });
  it('rejects an oversized history turn rather than clipping it at the service boundary', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    await expect(runBudgetedPilotChat('Hello', 42, 'auto', [{ sender: 'user', text: 'x'.repeat(351) }]))
      .rejects.toMatchObject({ code: 'INVALID_INPUT' });
    expect(reserve).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled();
  });
});
'''
write('tests/ai-pilot-transport.test.ts',s)
print('Applied fixed, source-hash-guarded input repair to',len(expected),'files')
