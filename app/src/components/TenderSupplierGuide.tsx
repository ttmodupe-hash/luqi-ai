import {useEffect, useId, useRef, useState} from 'react';
import {SBD1_FIELDS, type SupplierField, type SupplierValues} from '../lib/tender-document-contract';
import {SBD1_FIELD_GUIDANCE, supplierFieldProgress} from '../lib/tender-field-guide';

const inputStyle='mt-1 block w-full min-w-0 rounded-lg border border-slate-500 bg-slate-950 p-3 text-white';
const buttonStyle='rounded-lg border border-cyan-400 px-3 py-3 text-sm font-semibold text-cyan-100 disabled:opacity-50';
/** Controlled values belong to TenderOriginalForms. Changing view never copies,
 * invents, stores or submits answers and does not itself revoke approvals.
 */
export function TenderSupplierGuide({values, onChange, disabled=false}: {
  values: SupplierValues; onChange: (field: SupplierField, value: string) => void; disabled?: boolean;
}) {
  const [guided, setGuided]=useState(false), [step, setStep]=useState(0);
  const [focusRequest, setFocusRequest]=useState(0);
  const inputs=useRef<Partial<Record<SupplierField, HTMLInputElement>>>({});
  const focusedRequest=useRef(0);
  const id=useId();
  const progress=supplierFieldProgress(values,SBD1_FIELDS);
  useEffect(()=>{
    if(focusRequest>focusedRequest.current && !disabled) {
      const target=inputs.current[SBD1_FIELDS[step].id];
      if(target) { target.focus(); focusedRequest.current=focusRequest; }
    }
  },[focusRequest,step,guided,disabled]);
  function move(index: number) {
    if(disabled || index<0 || index>=SBD1_FIELDS.length) return;
    setStep(index);setFocusRequest(value=>value+1);
  }
  function changeView(next: boolean) {
    if(disabled || next===guided) return;
    setGuided(next);setFocusRequest(value=>value+1);
  }
  return <fieldset disabled={disabled} className="min-w-0 space-y-3">
    <legend className="font-semibold">Supplier contact facts you enter</legend>
    <p className="text-xs text-slate-300">Only facts you type are inserted. Leave unknown or inapplicable fields blank. No certificates, tax compliance, eligibility or experience are invented. Do not enter passwords, OTPs, tax PINs, ID numbers or bank details.</p>
    <div className="flex flex-wrap gap-3" role="group" aria-label="Supplier entry view">
      <button type="button" className={buttonStyle} aria-pressed={!guided} onClick={()=>changeView(false)}>Show all contact fields</button>
      <button type="button" className={buttonStyle} aria-pressed={guided} onClick={()=>changeView(true)}>Guide me step by step</button>
    </div>
    <p role="status" aria-live="polite" className="text-sm text-cyan-100">{progress.entered} of {progress.total} supported contact fields have valid-format entries.</p>
    <p className="text-xs text-amber-200">This is not overall application completion or verification of your facts. Other official fields, declarations, prices and signatures remain for you. A blank field allowed in this partial export may still be required by your issuer.</p>
    {progress.attention.length>0 && <div className="space-y-2 rounded-lg border border-amber-600 p-3" aria-label="Contact fields needing attention">
      <p className="text-sm">Fields to check before preparing the partial original:</p>
      {progress.attention.map(({field,issue})=><div key={field.id} className="min-w-0 text-sm">
        <button type="button" className={buttonStyle} onClick={()=>move(SBD1_FIELDS.findIndex(item=>item.id===field.id))}>Go to {field.label}</button>
        <p className="break-words text-xs text-amber-200">{issue}</p>
      </div>)}
    </div>}
    {progress.blank>0 && <details className="min-w-0 space-y-2 rounded-lg border border-slate-700 p-3" aria-label="Blank optional contact field review">
      <summary className="cursor-pointer text-sm font-semibold">Review {progress.blank} blank optional contact fields</summary>
      <p className="mt-2 text-xs text-slate-300">These fields are optional for Luqi's partial export only; the issuer may still require them. Leave unknown answers empty rather than entering examples.</p>
      <ul className="mt-2 space-y-2">{progress.rows.filter(row=>row.state==='blank'&&!row.field.required).map(({field})=>
        <li key={field.id} className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
          <button type="button" className={buttonStyle} onClick={()=>move(SBD1_FIELDS.findIndex(item=>item.id===field.id))}>Go to {field.label}</button>
          <span className="break-words text-slate-300">Blank in the partial export; confirm the issuer's requirements.</span>
        </li>)}</ul>
    </details>}
    {guided && <p className="text-sm font-semibold">Contact field {step+1} of {SBD1_FIELDS.length}</p>}
    <div className={guided?'space-y-3':'grid gap-3 sm:grid-cols-2'}>
      {progress.rows.filter((_,index)=>!guided||index===step).map(({field,issue})=>{
        const help=SBD1_FIELD_GUIDANCE[field.id], inputId=id+'-'+field.id;
        return <div key={field.id} className="min-w-0 space-y-1 rounded-lg border border-slate-700 p-3">
          <label htmlFor={inputId} className="block text-sm font-semibold">{field.label}{field.required?' (required for this export)':''}</label>
          <p className="text-sm">{help.question}</p>
          <input ref={node=>{if(node)inputs.current[field.id]=node;else delete inputs.current[field.id];}}
            id={inputId} aria-label={'SBD 1 '+field.label} maxLength={field.max}
            type={field.id==='email'?'email':'text'} autoComplete="off" value={values[field.id]}
            aria-invalid={Boolean(issue)} aria-required={field.required}
            aria-describedby={inputId+'-help'+(issue?' '+inputId+'-issue':'')} className={inputStyle}
            onFocus={()=>{if(!guided)setStep(SBD1_FIELDS.findIndex(item=>item.id===field.id));}}
            onChange={event=>{if(!disabled)onChange(field.id,event.target.value);}}/>
          <p id={inputId+'-help'} className="text-xs text-slate-300">{help.explanation} Maximum {field.max} characters.</p>
          {issue && <p id={inputId+'-issue'} className="text-xs text-amber-200">{issue}</p>}
        </div>;
      })}
    </div>
    {guided && <div className="flex flex-wrap gap-3" role="group" aria-label="Supplier field navigation">
      <button type="button" className={buttonStyle} disabled={step===0} onClick={()=>move(step-1)}>Previous contact field</button>
      {step<SBD1_FIELDS.length-1
        ?<button type="button" className={buttonStyle} onClick={()=>move(step+1)}>Next contact field</button>
        :<button type="button" className={buttonStyle} onClick={()=>changeView(false)}>Review all contact fields</button>}
    </div>}
    <p className="text-xs text-slate-300">Switching views keeps your entries in this tab. Clearing, leaving, reloading or changing accounts removes this work. No automatic save or submission.</p>
  </fieldset>;
}
