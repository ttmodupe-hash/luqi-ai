// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import LuqiPersonalWelcome from '../src/components/LuqiPersonalWelcome';
import { LANGUAGES, setStoredLanguage } from '../src/lib/languages';
import { askPilot } from '../src/lib/ai-pilot';
afterEach(cleanup);
it('greets the signed-in name as text and updates the greeting language', () => {
  const { rerender } = render(<LuqiPersonalWelcome name="Naledi" language={LANGUAGES[0]} />);
  expect(screen.getByRole('heading').textContent).toBe('Hello, Naledi.');
  rerender(<LuqiPersonalWelcome name="Naledi" language={LANGUAGES.find(l => l.code === 'tn')!} />);
  expect(screen.getByRole('heading').textContent).toBe('Dumela, Naledi.');
  expect(screen.getByText('Luqi e ka go thusa jang gompieno?')).toBeTruthy();
});
it('asks for a name without guessing from an email and removes it on unmount', () => {
  const { unmount } = render(<LuqiPersonalWelcome language={LANGUAGES[0]} />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Amina' } });
  expect(screen.getByRole('heading').textContent).toBe('Hello, Amina.');
  unmount(); render(<LuqiPersonalWelcome language={LANGUAGES[0]} />);
  expect(screen.getByRole('heading').textContent).toBe('Hello.');
});
it('still broadcasts a language change when storage is unavailable', () => {
  const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('unavailable'); });
  const listener = vi.fn(); window.addEventListener('luqi:language-changed', listener);
  try { setStoredLanguage(LANGUAGES[1]); expect(listener).toHaveBeenCalledOnce(); }
  finally { spy.mockRestore(); window.removeEventListener('luqi:language-changed', listener); }
});
it('sends the explicit reply language without the customer name', async () => {
  const request = vi.fn(async () => Response.json({status:'success',response:'Dumela',provider:'gemini',provider_model:'fixture'}));
  await askPilot('fixture', 'Help me study', new AbortController().signal, request, [], undefined, 'Tswana');
  const body = JSON.parse((request.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
  expect(body).toEqual({user_input:'Help me study',language:'Tswana'});
});
