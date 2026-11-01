import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('local course illustration and draft boundaries', () => {
  it('keeps both application builds complete and identical', () => {
    const root = readFileSync('src/components/CertMasterVideoCoach.tsx', 'utf8');
    expect(root).toBe(readFileSync('app/src/components/CertMasterVideoCoach.tsx', 'utf8'));
    expect(root).not.toMatch(/fetch\s*\(|\/api\/gemini|100% factually accurate/);
    expect(root).toContain('No matching local example. Your text is retained');
    expect(root).toContain('is NOT an answer to this question');
    expect(root).toContain('const [voiceEnabled, setVoiceEnabled] = useState<boolean>(false)');
    expect(root).toContain('terms.includes(q)');
  });
  it('prevents embedded helpers from consuming a draft meant for main Chat', () => {
    const source = readFileSync('src/pages/AiPilotPage.tsx', 'utf8');
    expect(source).toMatch(/if \(!workspaceMode\) return;[^\n]*\n\s*const draft = readChatReturn/);
    expect(source).toBe(readFileSync('app/src/pages/AiPilotPage.tsx', 'utf8'));
  });
});
