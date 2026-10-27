import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const files = [
  'components/ChatSidebar.tsx', 'components/SavedNotesPeek.tsx', 'providers/chat-workspace.tsx',
  'pages/LuqiChatWorkspacePage.tsx', 'pages/AiPilotPage.tsx',
  'components/WorkspaceLayout.tsx', 'chat-workspace.css',
];
test('both frontend trees retain the identical sidebar, chat, styling and account boundary', () => {
  for (const path of files) assert.equal(read('src/' + path), read('app/src/' + path), path);
});
test('chat is primary in both routers, while previous goal guide remains available', () => {
  for (const root of ['src','app/src']) {
    const app = read(root + '/App.tsx');
    assert.match(app, /path="\/chat" element=\{<LuqiChatWorkspacePage \/>\}/);
    assert.match(app, /path="\/ask" element=\{<AskLuqiPage \/>\}/);
    assert.match(app, /<CustomerSessionProvider><ChatWorkspaceProvider>/);
  }
});
test('local history cannot add silent persistence, a payment route or another AI transport', () => {
  for (const path of ['src/providers/chat-workspace.tsx', 'src/components/ChatSidebar.tsx']) {
    const source = read(path);
    assert.doesNotMatch(source, /(?:localStorage|sessionStorage)\s*\.\s*(?:getItem|setItem|removeItem)|indexedDB\.open|document\.cookie|\/api\/v1\/luqi-core|sk_live_|LUQI_HOSTED_CHECKOUT_ENABLED/);
    assert.doesNotMatch(source, /fetch\(/);
  }
  const pilot = read('src/pages/AiPilotPage.tsx');
  assert.match(pilot, /workspace\?\.recordConfirmedReply\(submittedQuestion, result\)/);
  assert.match(pilot, /const result = await askPilot\(/);
  assert.match(pilot, /disabled=\{!canSend\}/);
  assert.match(pilot, /checked=\{consent\}/);
  assert.match(pilot, /setConsent\(false\)/);
});

test('mobile navigation exposes Chat, Services, Recents and Account without new payment endpoints', () => {
  const sidebar = read('src/components/ChatSidebar.tsx');
  assert.match(sidebar, /aria-label="Mobile chat navigation"/);
  for (const title of ['Browse services', 'Show recent chats', 'Showing ', 'Forget recent chat', 'SavedNotesPeek']) {
    assert.ok(sidebar.includes(title), 'Missing mobile/history contract: ' + title);
  }
  const saved = read('src/components/SavedNotesPeek.tsx');
  assert.match(saved, /conversationClient\(token\)\.list/);
  assert.match(saved, /phase === 'error'/);
  assert.match(saved, /'Try again'|Try again/);
  assert.doesNotMatch(saved, /localStorage|sessionStorage|indexedDB|fetch\('/);
});
