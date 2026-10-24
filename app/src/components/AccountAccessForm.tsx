import { useEffect, useRef, useState } from 'react';
import { ConversationError, signIn, signUp, validAccountPassword, type AccountSession } from '../lib/private-conversations';

export default function AccountAccessForm({ initialMode = 'signin', purpose = 'notes', onAuthenticated }: {
  initialMode?: 'signin' | 'signup'; purpose?: 'notes' | 'ai'; onAuthenticated: (session: AccountSession) => void;
}) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [ambiguous, setAmbiguous] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const epoch = useRef(0);
  const locked = useRef(false);
  const pending = useRef<AbortController | null>(null);
  const cooling = cooldown > 0;
  useEffect(() => () => { epoch.current++; pending.current?.abort(); pending.current = null; }, []);
  useEffect(() => {
    if (!cooling) return;
    const timer = setInterval(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooling]);
  function changeMode() {
    epoch.current++; pending.current?.abort(); pending.current = null; locked.current = false;
    setMode(mode === 'signup' ? 'signin' : 'signup');
    setPassword(''); setConfirmation(''); setNotice(''); setAmbiguous(false); setBusy(false);
  }
  function uncertainSignup() {
    setAmbiguous(true);
    setNotice('Account creation could not be confirmed. Your account may already exist. Use “Use an existing account” to try signing in. We will not retry registration automatically.');
  }
  async function submit() {
    if (locked.current || cooling || ambiguous) return;
    if (mode === 'signup' && (!validAccountPassword(password) || password !== confirmation)) {
      setNotice(password !== confirmation ? 'The passwords do not match.' : 'Use at least 12 characters and at most 72 UTF-8 bytes for your password.');
      return;
    }
    locked.current = true; setBusy(true); setNotice('');
    const version = epoch.current;
    const controller = new AbortController(); pending.current = controller;
    try {
      const result = await (mode === 'signup' ? signUp : signIn)(email, password, controller.signal);
      if (version !== epoch.current) return;
      setPassword(''); setConfirmation('');
      onAuthenticated(result);
    } catch (error) {
      if (version !== epoch.current) return;
      setPassword(''); setConfirmation('');
      if (error instanceof ConversationError && error.status === 429) {
        setCooldown(error.retryAfter ?? 30);
        setNotice('Too many authentication attempts. We will not retry automatically.');
      } else if (mode === 'signup' && error instanceof ConversationError && error.status === 409) {
        setNotice('An account already uses this email. Use an existing account to sign in. Password recovery currently requires the LUQI administrator.');
      } else if (mode === 'signup' && error instanceof ConversationError && error.status === 400) {
        setNotice('Check your email and the password requirements, then try again.');
      } else if (mode === 'signup') uncertainSignup();
      else setNotice(error instanceof ConversationError && error.status === 401
        ? 'Email or password was not accepted. Please try again.'
        : 'Sign-in is temporarily unavailable. Try again when the service is available.');
    } finally {
      if (version === epoch.current) { pending.current = null; locked.current = false; setBusy(false); }
    }
  }
  return <section className="luqi-access" aria-labelledby="account-access-heading">
    <p className="luqi-eyebrow">YOUR OWN SPACE</p>
    <h2 id="account-access-heading">{mode === 'signup' ? 'Create your LUQI account' : 'Sign in to your LUQI account'}</h2>
    <p>{purpose === 'ai' ? 'Use your LUQI account for the limited text trial. Signing in does not send a question to an AI provider.' : 'Keep notes in your account and return to them later. This notes page does not generate AI replies.'}</p>
    {(notice || cooling) && <p role="status" className="luqi-access-notice">{notice}{cooling && <> Wait {cooldown} seconds before trying again.</>}</p>}
    <form onSubmit={event => { event.preventDefault(); void submit(); }} className="space-y-4">
      <label className="block">Email<input className="luqi-access-input" type="email" autoComplete="username"
        maxLength={254} required disabled={busy} value={email} onChange={event => setEmail(event.target.value)} /></label>
      <label className="block">Password<input className="luqi-access-input" type="password"
        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required disabled={busy}
        aria-describedby={mode === 'signup' ? 'account-password-help' : undefined}
        value={password} onChange={event => setPassword(event.target.value)} /></label>
      {mode === 'signup' && <>
        <p id="account-password-help" className="luqi-access-help">At least 12 characters; at most 72 UTF-8 bytes. Use a unique password from a password manager.</p>
        <label className="block">Confirm password<input className="luqi-access-input" type="password"
          autoComplete="new-password" required disabled={busy} value={confirmation}
          onChange={event => setConfirmation(event.target.value)} /></label>
      </>}
      <div className="luqi-access-actions">
        <button className="luqi-primary" disabled={busy || ambiguous || cooling}>
          {busy ? (mode === 'signup' ? 'Creating account…' : 'Signing in…') : (mode === 'signup' ? 'Create account' : 'Sign in')}
        </button>
        {busy && <button type="button" className="luqi-secondary" onClick={() => {
          epoch.current++; pending.current?.abort(); pending.current = null; locked.current = false; setBusy(false); setPassword(''); setConfirmation('');
          if (mode === 'signup') uncertainSignup(); else setNotice('Sign-in cancelled.');
        }}>Cancel request</button>}
      </div>
    </form>
    <button type="button" className="luqi-access-switch" disabled={busy} onClick={changeMode}>
      {mode === 'signup' ? 'Use an existing account' : 'Create an account'}
    </button>
    <p className="luqi-access-help">Your session stays in this page’s memory and ends when you leave or reload it. Email verification and automatic password-reset emails are not available. Read the <a href="#/privacy">pilot privacy information</a> before saving notes.</p>
  </section>;
}
