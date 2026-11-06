import { RESPONSE_APPROACHES, type ResponseApproach } from '../lib/response-approach';
import { useId } from 'react';

export default function LuqiResponseApproach({ value, onChange, disabled = false }: {
  value: ResponseApproach; onChange: (value: ResponseApproach) => void; disabled?: boolean;
}) {
  const id = useId();
  const selected = RESPONSE_APPROACHES.find(item => item.id === value)!;
  return <div className="luqi-response-approach">
    <label htmlFor={id}>How should Luqi help?</label>
    <select id={id} value={value} disabled={disabled}
      aria-describedby={id + '-help'} onChange={event => onChange(event.target.value as ResponseApproach)}>
      {RESPONSE_APPROACHES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
    </select>
    <p id={id + '-help'}>{selected.description} Uses your normal AI allowance when you Send.</p>
  </div>;
}
