// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import SafePilotText from '../src/components/SafePilotText';
afterEach(cleanup);
it('renders basic emphasis without raw asterisks or unsafe HTML', () => {
  render(<div data-testid="message"><SafePilotText text={'A **strong** point and *careful* reading. <script>untrusted</script>'}/></div>);
  const root = screen.getByTestId('message');
  expect(root.querySelector('strong')?.textContent).toBe('strong');
  expect(root.querySelector('em')?.textContent).toBe('careful');
  expect(root.textContent).toContain('<script>untrusted</script>');
  expect(root.textContent).not.toContain('**strong**');
  expect(root.querySelector('script')).toBeNull();
});
it('leaves nested and unsupported markup inert without inventing formatting', () => {
  render(<div data-testid="message"><SafePilotText text={'unsafe [link](javascript:alert(1)) and <img src=x onerror=alert(1)>'}/></div>);
  expect(screen.getByTestId('message').querySelector('a')).toBeNull();
  expect(screen.getByTestId('message').querySelector('img')).toBeNull();
});
