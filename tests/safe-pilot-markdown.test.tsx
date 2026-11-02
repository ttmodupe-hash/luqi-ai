// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import SafePilotText from '../src/components/SafePilotText';

afterEach(cleanup);

describe('safe Luqi text formatting', () => {
  it('renders real bullet lists and strong labels without dangling emphasis characters', () => {
    render(<SafePilotText text={'### Equipment & Hardware\n* **Powerful Computer:** A useful machine.\n- **Drawing Tools:** Make a picture.\n***\n## Next steps'} />);
    expect(screen.getByRole('heading', { name: 'Equipment & Hardware' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Next steps' })).toBeTruthy();
    const list = screen.getByRole('list');
    expect(list.querySelectorAll('li')).toHaveLength(2);
    expect(list.querySelectorAll('strong')).toHaveLength(2);
    expect(screen.getByText('Powerful Computer:').tagName).toBe('STRONG');
    expect(list.textContent).not.toContain('Computer:*');
    expect(document.querySelectorAll('hr')).toHaveLength(1);
  });

  it('escapes untrusted HTML and Markdown links as plain text', () => {
    render(<SafePilotText text={'<script>alert(1)</script>\n- <img src=x onerror=alert(1)>\n[click](javascript:alert(1))'} />);
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(document.querySelector('a')).toBeNull();
    expect(screen.getByText('<script>alert(1)</script>')).toBeTruthy();
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeTruthy();
  });

  it('renders fenced code as inert text without evaluating it', () => {
    render(<SafePilotText text={'\`\`\`js\nconst x = "<script>";\n\`\`\`'} />);
    const code = document.querySelector('pre code');
    expect(code?.textContent).toContain('const x = "<script>";');
    expect(document.querySelector('script')).toBeNull();
  });

  it('still renders plain text and asterisks literally when unmatched', () => {
    render(<SafePilotText text={'Sawubona!\nA helpful answer *without matching punctuation'} />);
    expect(document.querySelector('em')).toBeNull();
    expect(screen.getByText(/Sawubona!/)).toBeTruthy();
  });
});
