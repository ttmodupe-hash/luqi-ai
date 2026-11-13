// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { readFileSync } from 'node:fs';
import UnifiedCompanionPage from '../src/pages/UnifiedCompanionPage';

const sessionFixture = vi.hoisted(() => ({ current: null as null | { token: string; user: { email: string } } }));
vi.mock('../src/providers/customer-session', () => ({
  useOptionalCustomerSession: () => ({ session: sessionFixture.current }),
}));

vi.mock('../src/pages/AiPilotPage', () => ({
  default: ({ embedded, workspaceMode }: { embedded?: boolean; workspaceMode?: boolean }) =>
    <div data-testid="existing-ai-chat" data-embedded={String(embedded)} data-workspace={String(workspaceMode)} />,
}));
afterEach(() => { cleanup(); vi.restoreAllMocks(); sessionFixture.current = null; });

describe('Luqi Companion keeps real chat and private notes in separate customer paths', () => {
  it('embeds exactly one existing Chat with a separate private-notes link and accurate guest copy', () => {
    render(<MemoryRouter><UnifiedCompanionPage /></MemoryRouter>);
    expect(screen.getAllByTestId('existing-ai-chat')).toHaveLength(1);
    expect(screen.getByTestId('existing-ai-chat').getAttribute('data-embedded')).toBe('true');
    expect(screen.getByTestId('existing-ai-chat').getAttribute('data-workspace')).toBe('true');
    expect(screen.getByRole('link', { name: /my private notes/i }).getAttribute('href')).toBe('/companion/notes');
    expect(screen.getByText(/Guest and signed-in AI access/)).toBeTruthy();
  });

  it('preserves exact mirrored components and separate notes/archive routing', () => {
    for (const path of ['components/WorkspaceLayout.tsx', 'pages/LuqiChatWorkspacePage.tsx', 'pages/UnifiedCompanionPage.tsx']) {
      expect(readFileSync('src/' + path, 'utf8')).toBe(readFileSync('app/src/' + path, 'utf8'));
    }
    for (const path of ['src/App.tsx', 'app/src/App.tsx']) {
      const routes = readFileSync(path, 'utf8');
      expect(routes).toContain('path="/companion/notes" element={<CompanionPage />}');
      // Preserve the existing saved-notes route for real bookmarks and login flows.
      expect(routes).toContain('path="/companion" element={<CompanionPage />}');
      // AI Companion remains a real chat on its own discoverable route.
      expect(routes).toContain('path="/ai-companion" element={<UnifiedCompanionPage />}');
      // Keep the original Mentor bookmark pointing to saved notes, never silently repurpose it.
      expect(routes).toContain('path="/mentor" element={<CompanionPage />}');
    }
    for (const prefix of ['src/', 'app/src/']) {
      const navigation = readFileSync(prefix + 'components/WorkspaceLayout.tsx', 'utf8');
      const chat = readFileSync(prefix + 'pages/LuqiChatWorkspacePage.tsx', 'utf8');
      expect(navigation).toContain('["/ai-companion", "AI Companion"]');
      expect(navigation).toContain('["/companion/notes", "Private notes"]');
      expect(chat).toContain('<Link to="/ai-companion">AI Companion and next steps</Link>');
      expect(chat).toContain('<Link to="/companion/notes">Open saved private notes</Link>');
    }
    const companion = readFileSync('src/pages/UnifiedCompanionPage.tsx', 'utf8');
    expect(companion).not.toMatch(/conversationClient|private-conversations|downloadPrivateNotesExport/);
    expect(companion.match(/<AiPilotPage embedded workspaceMode \/>/g)).toHaveLength(1);
  });
  it("conceals a previous user's device-local goal until explicitly revealed", () => {
    const key = 'luqi:capability-journey:v1';
    const goal = 'My private business cash-flow goal';
    window.localStorage.setItem(key, JSON.stringify({
      version: 1, goal, track: 'business', completed: [0], startedAt: 10, updatedAt: 10,
    }));
    try {
      render(<MemoryRouter><UnifiedCompanionPage /></MemoryRouter>);
      expect(screen.queryByText('Goal: ' + goal)).toBeNull();
      expect(screen.getByText(/may belong to someone else who used this device/)).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Show a saved goal on this device' }));
      expect(screen.getByText('Goal: ' + goal)).toBeTruthy();
      expect(screen.getByText(/not included in AI requests/)).toBeTruthy();
      expect(screen.getAllByTestId('existing-ai-chat')).toHaveLength(1);
    } finally {
      window.localStorage.removeItem(key);
    }
  });

  it('snapshots the revealed goal, supports hiding and revokes reveal when the account changes', () => {
    const key = 'luqi:capability-journey:v1';
    const firstGoal = 'A previous user private business plan';
    const secondGoal = 'Another person personal goal';
    const save = (goal: string) => window.localStorage.setItem(key, JSON.stringify({
      version: 1, goal, track: 'general', completed: [], startedAt: 10, updatedAt: 10,
    }));
    const accountA = { token: 'opaque-a', user: { email: 'a@example.test' } };
    sessionFixture.current = accountA;
    save(firstGoal);
    try {
      const view = render(<MemoryRouter><UnifiedCompanionPage /></MemoryRouter>);
      fireEvent.click(screen.getByRole('button', { name: 'Show a saved goal on this device' }));
      expect(screen.getByText('Goal: ' + firstGoal)).toBeTruthy();
      save(secondGoal);
      view.rerender(<MemoryRouter><UnifiedCompanionPage /></MemoryRouter>);
      expect(screen.queryByText('Goal: ' + secondGoal)).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Hide saved goal' }));
      expect(screen.queryByText('Goal: ' + firstGoal)).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Show a saved goal on this device' }));
      expect(screen.getByText('Goal: ' + secondGoal)).toBeTruthy();
      sessionFixture.current = { token: 'opaque-b', user: { email: 'b@example.test' } };
      view.rerender(<MemoryRouter><UnifiedCompanionPage /></MemoryRouter>);
      expect(screen.queryByText('Goal: ' + secondGoal)).toBeNull();
      sessionFixture.current = accountA;
      view.rerender(<MemoryRouter><UnifiedCompanionPage /></MemoryRouter>);
      expect(screen.queryByText('Goal: ' + secondGoal)).toBeNull();
      expect(screen.getByRole('button', { name: 'Show a saved goal on this device' })).toBeTruthy();
    } finally { window.localStorage.removeItem(key); }
  });


  it('conceals a revealed shared-device goal when the desktop window loses focus, without re-revealing it on focus', () => {
    const key = 'luqi:capability-journey:v1';
    const goal = 'Private goal hidden after changing desktop windows';
    window.localStorage.setItem(key, JSON.stringify({
      version: 1, goal, track: 'general', completed: [], startedAt: 10, updatedAt: 10,
    }));
    try {
      render(<MemoryRouter><UnifiedCompanionPage /></MemoryRouter>);
      fireEvent.click(screen.getByRole('button', { name: 'Show a saved goal on this device' }));
      expect(screen.getByText('Goal: ' + goal)).toBeTruthy();
      fireEvent.blur(window);
      expect(screen.queryByText('Goal: ' + goal)).toBeNull();
      fireEvent.focus(window);
      expect(screen.queryByText('Goal: ' + goal)).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Show a saved goal on this device' }));
      expect(screen.getByText('Goal: ' + goal)).toBeTruthy();
      fireEvent(window, new Event('pagehide'));
      expect(screen.queryByText('Goal: ' + goal)).toBeNull();
    } finally { window.localStorage.removeItem(key); }
  });

  it('does not misreport an inaccessible saved goal as absent and permits a safe retry', () => {
    const key = 'luqi:capability-journey:v1';
    const goal = 'A previous user personal goal still saved';
    window.localStorage.setItem(key, JSON.stringify({
      version: 1, goal, track: 'general', completed: [], startedAt: 10, updatedAt: 10,
    }));
    const getItem = vi.spyOn(Storage.prototype, 'getItem');
    try {
      render(<MemoryRouter><UnifiedCompanionPage /></MemoryRouter>);
      getItem.mockImplementation(() => { throw new DOMException('Synthetic denied read', 'SecurityError'); });
      fireEvent.click(screen.getByRole('button', { name: 'Show a saved goal on this device' }));
      expect(screen.getByRole('status').textContent).toMatch(/storage could not be read/i);
      expect(screen.getByRole('status').textContent).toMatch(/saved journey may still exist/i);
      expect(screen.queryByText(/no readable saved journey was found/i)).toBeNull();
      expect(screen.queryByText('Goal: ' + goal)).toBeNull();
      getItem.mockRestore();
      fireEvent.click(screen.getByRole('button', { name: 'Show a saved goal on this device' }));
      expect(screen.getByText('Goal: ' + goal)).toBeTruthy();
      expect(screen.queryByText(/storage could not be read/i)).toBeNull();
    } finally { getItem.mockRestore(); window.localStorage.removeItem(key); }
  });
});
