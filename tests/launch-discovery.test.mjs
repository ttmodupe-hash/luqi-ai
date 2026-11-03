import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { findWorkspaceTools, workspaceTools } from '../src/components/workspace-catalog.ts';
for (const query of ['AI text', 'Gemini', 'OpenAI']) {
  test(`the limited trial is discoverable by ${query}`, () => {
    const matches = findWorkspaceTools(query, 'ready');
    assert.ok(matches.some(tool => tool.id === 'ai-trial' && tool.path === '/chat'));
  });
}
test('trial listing describes sign-in, separate availability checks and private-note exclusion', () => {
  const entry = workspaceTools.find(tool => tool.id === 'ai-trial');
  assert.equal(workspaceTools.filter(tool => tool.id === 'ai-trial').length, 1);
  assert.match(entry.status, /Limited trial/); assert.match(entry.status, /sign-in required/);
  assert.match(entry.description, /Availability is checked/);
  assert.match(entry.description, /private notes are not sent automatically/);
  assert.equal(findWorkspaceTools('AI text', 'preview').length, 0);
});
for (const path of ['components/workspace-catalog.ts', 'components/WorkspaceLayout.tsx', 'pages/StartPage.tsx']) {
  test(`both frontend trees have identical launch discovery: ${path}`, async () => {
    assert.equal(await readFile(new URL('../src/' + path, import.meta.url), 'utf8'),
      await readFile(new URL('../app/src/' + path, import.meta.url), 'utf8'));
  });
}
test('search accurately separates guest and signed-in AI availability without claiming generated voice', async () => {
  const content = await readFile(new URL('../src/components/WorkspaceLayout.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(content, /AI chat and payments are not/);
  assert.match(content, /Guest AI trial and signed-in AI have separate availability and allowance checks/);
  assert.match(content, /Recorded Studio audio is local/);
  assert.match(content, /generated voice and autonomous workers are not enabled/);
  assert.match(content, /Check Payments for any currently published offer/);
});

test('Luqi local budget and vehicle tools are discoverable without implying active workers', () => {
  const matches = findWorkspaceTools('Luqi travel budget', 'ready');
  assert.equal(matches.length, 1);
  assert.equal(matches[0].id, 'agents');
  assert.equal(matches[0].path, '/omega-tasks');
  assert.match(matches[0].description, /without an account or paid AI/);
  assert.match(matches[0].description, /workers are not activated/);
  assert.deepEqual(findWorkspaceTools('omega autonomous workers', 'ready'), []);
  assert.deepEqual(findWorkspaceTools('weather official alerts', 'ready'), []);
});

test('business quotation and pricing calculations are discoverable without billing or provider calls', () => {
  const tools = findWorkspaceTools('business quotation', 'ready');
  assert.equal(tools.length, 1);
  assert.equal(tools[0].id, 'business');
  assert.equal(tools[0].path, '/business-desk');
  assert.match(tools[0].description, /No AI calls/);
  assert.deepEqual(findWorkspaceTools('business payment processing', 'preview'), []);
});

test('local study practice and the certification academy are independently discoverable', () => {
  const matches = findWorkspaceTools('study flashcards exam', 'ready');
  const localStudy = matches.find(tool => tool.id === 'study');
  assert.ok(localStudy);
  assert.equal(localStudy.path, '/study-desk');
  assert.match(localStudy.description, /No AI calls/);
  const academy = findWorkspaceTools('CCNA network certification', 'ready').find(tool => tool.id === 'cert-academy');
  assert.ok(academy);
  assert.equal(academy.path, '/ccna');
  assert.equal(findWorkspaceTools('automated exam grading', 'ready').some(t => t.id === 'study'), false);
});
