// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { readFileSync } from 'node:fs';
import UnifiedCompanionPage from '../src/pages/UnifiedCompanionPage';

vi.mock('../src/pages/AiPilotPage', () => ({
  default: ({ embedded, workspaceMode }: { embedded?: boolean; workspaceMode?: boolean }) =>
    <div data-testid="existing-ai-chat" data-embedded={String(embedded)} data-workspace={String(workspaceMode)} />,
}));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

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
      expect(routes).toContain('path="/companion" element={<UnifiedCompanionPage />}');
      expect(routes).toContain('path="/mentor" element={<UnifiedCompanionPage />}');
    }
    const companion = readFileSync('src/pages/UnifiedCompanionPage.tsx', 'utf8');
    expect(companion).not.toMatch(/conversationClient|private-conversations|downloadPrivateNotesExport/);
    expect(companion.match(/<AiPilotPage embedded workspaceMode \/>/g)).toHaveLength(1);
  });
});
