import { useEffect, useId, useState } from 'react';

export type PasswordFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  disabled?: boolean;
  describedBy?: string;
  maxLength?: number;
};

/** Visibility is local to this field. Never copy credentials to storage or text. */
export default function PasswordField({ label, value, onChange, autoComplete, disabled = false,
  describedBy, maxLength }: PasswordFieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  useEffect(() => { if (disabled || !value) setVisible(false); }, [disabled, value]);
  useEffect(() => {
    const hide = () => setVisible(false);
    const visibility = () => { if (document.hidden) hide(); };
    window.addEventListener('blur', hide);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('blur', hide);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  const revealed = visible && !disabled;
  return <div className="min-w-0" onKeyDown={event => {
    if (event.key === 'Escape') setVisible(false);
  }} onBlur={event => {
    // Moving between the input and its visibility button keeps the choice.
    // Leaving the field, changing windows, clearing it or submitting re-masks it.
    if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setVisible(false);
  }}>
    <label className="block" htmlFor={id}>{label}</label>
    <div className="flex min-w-0 items-center gap-2">
      <input id={id} className="luqi-access-input min-w-0 flex-1" type={revealed ? 'text' : 'password'}
        autoComplete={autoComplete} autoCapitalize="none" autoCorrect="off" spellCheck={false}
        required disabled={disabled} maxLength={maxLength} aria-describedby={describedBy}
        value={value} onChange={event => onChange(event.target.value)} />
      <button type="button" className="shrink-0 rounded-lg border border-slate-500 bg-slate-900 px-3 py-2 text-white disabled:opacity-50"
        style={{ minWidth: 56, minHeight: 44 }} disabled={disabled} aria-controls={id}
        aria-label={`${revealed ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
        onClick={() => setVisible(previous => !previous)}>{revealed ? 'Hide' : 'Show'}</button>
    </div>
  </div>;
}
