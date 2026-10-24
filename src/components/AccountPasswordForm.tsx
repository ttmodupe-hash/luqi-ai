import { useEffect, useRef, useState } from 'react';
import { changePassword, PasswordChangeRequestError } from '../lib/account-security';
import { validAccountPassword } from '../lib/private-conversations';
import PasswordField from './PasswordField';

export default function AccountPasswordForm({ token, email, disabled, onBusyChange, onSessionEnd }: {
  token: string; email: string; disabled: boolean;
  onBusyChange: (busy: boolean) => void; onSessionEnd: (notice: string) => void;
}) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState(''), [next, setNext] = useState(''), [confirmation, setConfirmation] = useState('');
  const [notice, setNotice] = useState(''), [cooldown, setCooldown] = useState(0);
  const active = useRef<AbortController | null>(null), epoch = useRef(0);
  useEffect(() => () => { epoch.current++; active.current?.abort(); }, []);
  const cooling = cooldown > 0;
  useEffect(() => {
    if (!cooling) return;
    const timer = setInterval(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooling]);
  function clearPasswords() { setCurrent(''); setNext(''); setConfirmation(''); }
  async function submit() {
    if (active.current || disabled || cooling) return;
    if (!current || !validAccountPassword(next) || next !== confirmation) {
      setNotice(next !== confirmation ? 'The new passwords do not match.' : 'Enter your current password and a new password with at least 12 characters and at most 72 UTF-8 bytes.');
      return;
    }
    const controller = new AbortController(), version = epoch.current;
    active.current = controller; setBusy(true); onBusyChange(true); setNotice('');
    const previousPassword = current, newPassword = next;
    clearPasswords();
    try {
      await changePassword(token, previousPassword, newPassword, controller.signal);
      if (version !== epoch.current) return;
      onSessionEnd('Password changed. Older sign-ins will be rejected on their next account check. Sign in again with your new password. Your saved notes are unchanged.');
    } catch (error) {
      if (version !== epoch.current) return;
      const code = error instanceof PasswordChangeRequestError ? error.code : 'UNCONFIRMED';
      if (code === 'CURRENT_PASSWORD_INVALID') setNotice('Your current password was not accepted. No password was changed.');
      else if (code === 'PASSWORD_REUSED' || code === 'INVALID_INPUT') setNotice('Use a different new password with at least 12 characters and at most 72 UTF-8 bytes. No password was changed.');
      else if (code === 'AUTH_RATE_LIMITED') {
        setCooldown(error instanceof PasswordChangeRequestError ? error.retryAfter : 30);
        setNotice('Too many password-change attempts. We will not retry automatically.');
      } else onSessionEnd(code === 'AUTH_REQUIRED' || code === 'PASSWORD_CHANGE_CONFLICT'
        ? 'Your account sign-in changed or expired. Sign in again before changing a password.'
        : 'Password change could not be confirmed. We cleared this page’s sign-in and will not retry. Try signing in with your new password first; if it is not accepted, try your previous password.');
    } finally {
      if (version === epoch.current) { active.current = null; setBusy(false); onBusyChange(false); }
    }
  }
  return <section className="rounded-lg border border-slate-700 p-4 space-y-3" aria-label="Account password settings">
    <button type="button" className="rounded-lg border border-slate-500 bg-slate-900 p-3 text-white disabled:opacity-50" disabled={disabled || busy} aria-expanded={open}
      aria-controls="account-password-form" onClick={() => { clearPasswords(); setNotice(''); setOpen(!open); }}>
      {open ? 'Close password settings' : 'Change password'}
    </button>
    <p className="text-sm text-slate-300">Changing your password requires your current password and ends older sign-ins on their next account check. Save drafts and resolve uncertain saves first. If you leave while a change is saving, it may still complete; try your new password first when signing in again.</p>
    {open && <form id="account-password-form" onSubmit={event => { event.preventDefault(); void submit(); }} className="space-y-3 max-w-lg">
      <input type="text" autoComplete="username" value={email} readOnly hidden aria-hidden="true" />
      <fieldset disabled={disabled || busy} className="space-y-3">
        <legend className="font-semibold">Choose a new account password</legend>
        <PasswordField label="Current password" autoComplete="current-password" maxLength={72}
          value={current} onChange={setCurrent} disabled={disabled || busy} />
        <PasswordField label="New password" autoComplete="new-password" maxLength={72} describedBy="new-password-help"
          value={next} onChange={setNext} disabled={disabled || busy} />
        <p id="new-password-help" className="text-sm text-slate-300">At least 12 characters and at most 72 UTF-8 bytes. Choose a unique password. You will need to sign in again.</p>
        <PasswordField label="Confirm new password" autoComplete="new-password" maxLength={72} describedBy="new-password-help"
          value={confirmation} onChange={setConfirmation} disabled={disabled || busy} />
        <button className="luqi-primary" disabled={cooling}>{busy ? 'Changing password…' : 'Change password and sign out'}</button>
      </fieldset>
      {(notice || cooling) && <p role="status">{notice}{cooling && <> Wait {cooldown} seconds before trying again.</>}</p>}
    </form>}
  </section>;
}
