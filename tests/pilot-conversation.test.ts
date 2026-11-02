import { describe, expect, it } from 'vitest';
import { previewPilotHistory } from '../src/lib/pilot-conversation';
import { MAX_PILOT_HISTORY_TEXT_CHARS } from '../src/lib/pilot-input';

describe('opt-in in-memory AI conversation preview', () => {
  it('keeps only the last four explicit turns and never mutates the local conversation', () => {
    const turns = [
      { sender: 'user' as const, text: 'first' },
      { sender: 'ai' as const, text: 'second' },
      { sender: 'user' as const, text: 'third' },
      { sender: 'ai' as const, text: 'fourth' },
      { sender: 'user' as const, text: 'fifth' },
    ];
    const preview = previewPilotHistory(turns);
    expect(preview.map(x => x.text)).toEqual(['second', 'third', 'fourth', 'fifth']);
    expect(turns).toHaveLength(5);
    preview[0].text = 'changed preview';
    expect(turns[1].text).toBe('second');
  });
  it('shows shortened content explicitly, bounded to 350 UTF-16 code units per turn', () => {
    const original = 'a'.repeat(420);
    const preview = previewPilotHistory([{ sender: 'ai', text: original }]);
    expect(preview).toHaveLength(1);
    expect(preview[0].text.length).toBeLessThanOrEqual(MAX_PILOT_HISTORY_TEXT_CHARS);
    expect(preview[0].text).toMatch(/…$/u);
    expect(original).toHaveLength(420);
  });
  it('never adds notes, email, identity or hidden context', () => {
    expect(previewPilotHistory([])).toEqual([]);
    expect(previewPilotHistory([{ sender: 'user', text: 'Travel to Ghana' }]))
      .toEqual([{ sender: 'user', text: 'Travel to Ghana' }]);
  });
});
