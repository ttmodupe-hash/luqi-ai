// @vitest-environment jsdom
import React,{useState} from 'react';
import {afterEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor,within} from '@testing-library/react';
import {TenderSupplierGuide} from '../src/components/TenderSupplierGuide';
import {EMPTY_SUPPLIER_VALUES,SBD1_FIELDS} from '../src/lib/tender-document-contract';
import {supplierFieldProgress} from '../src/lib/tender-field-guide';
import {validateSupplierValues} from '../src/lib/tender-document-engine';
function Fixture({disabled=false}:{disabled?:boolean}){const[values,setValues]=useState({...EMPTY_SUPPLIER_VALUES});return <TenderSupplierGuide disabled={disabled} values={values} onChange={(id,value)=>setValues(v=>({...v,[id]:value}))}/>}
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();});
it('starts with existing fields, specific help and no guessed personal details',()=>{
 const network=vi.fn();vi.stubGlobal('fetch',network);render(<Fixture/>);
 for(const field of SBD1_FIELDS){const input=screen.getByLabelText('SBD 1 '+field.label) as HTMLInputElement;expect(input.value).toBe('');expect(input.getAttribute('aria-describedby')).toBeTruthy();}
 expect(screen.getByText('0 of 7 supported contact fields have valid-format entries.')).toBeTruthy();
 expect(screen.getByText('Supplier contact facts you enter')).toBeTruthy();
 expect(screen.queryByText('Your verified supplier facts')).toBeNull();
 expect(screen.getAllByRole('textbox')).toHaveLength(7);expect(network).not.toHaveBeenCalled();
});
it('moves through the selected field and preserves controlled values across views',async()=>{
 render(<Fixture/>);fireEvent.change(screen.getByLabelText('SBD 1 Name of bidder'),{target:{value:'Synthetic bidder'}});
 fireEvent.click(screen.getByRole('button',{name:'Guide me step by step'}));
 await waitFor(()=>expect(document.activeElement).toBe(screen.getByLabelText('SBD 1 Name of bidder')));
 expect(screen.queryByLabelText('SBD 1 Postal address')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Next contact field'}));
 await waitFor(()=>expect(document.activeElement).toBe(screen.getByLabelText('SBD 1 Postal address')));
 fireEvent.change(screen.getByLabelText('SBD 1 Postal address'),{target:{value:'Synthetic postal address'}});
 fireEvent.click(screen.getByRole('button',{name:'Show all contact fields'}));
 expect((screen.getByLabelText('SBD 1 Name of bidder') as HTMLInputElement).value).toBe('Synthetic bidder');
 expect((screen.getByLabelText('SBD 1 Postal address') as HTMLInputElement).value).toBe('Synthetic postal address');
});
it('a named missing or invalid field action focuses that exact input',async()=>{
 render(<Fixture/>);fireEvent.change(screen.getByLabelText('SBD 1 Email address'),{target:{value:'bad'}});
 fireEvent.click(screen.getByRole('button',{name:'Guide me step by step'}));
 fireEvent.click(screen.getByRole('button',{name:'Go to Email address'}));
 await waitFor(()=>expect(document.activeElement).toBe(screen.getByLabelText('SBD 1 Email address')));
 expect(screen.getByLabelText('SBD 1 Email address').getAttribute('aria-invalid')).toBe('true');
 fireEvent.change(screen.getByLabelText('SBD 1 Email address'),{target:{value:'test@example.test'}});
 expect(screen.queryByRole('button',{name:'Go to Email address'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Go to Name of bidder'}));
 await waitFor(()=>expect(document.activeElement).toBe(screen.getByLabelText('SBD 1 Name of bidder')));
});
it('blank optional fields do not block navigation and final review returns to all inputs',()=>{
 render(<Fixture/>);fireEvent.click(screen.getByRole('button',{name:'Guide me step by step'}));
 for(let i=0;i<6;i++)fireEvent.click(screen.getByRole('button',{name:'Next contact field'}));
 expect(screen.getByText('Contact field 7 of 7')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Review all contact fields'}));expect(screen.getAllByRole('textbox')).toHaveLength(7);
 expect(screen.getByRole('button',{name:'Go to Name of bidder'})).toBeTruthy();
 expect(screen.getAllByRole('button',{name:/Go to /})).toHaveLength(7); // 1 required attention + 6 optional blanks
});
it('view-only changes never invoke the answer callback',()=>{
 const edit=vi.fn();render(<TenderSupplierGuide values={{...EMPTY_SUPPLIER_VALUES}} onChange={edit}/>);
 fireEvent.click(screen.getByRole('button',{name:'Guide me step by step'}));fireEvent.click(screen.getByRole('button',{name:'Next contact field'}));
 fireEvent.click(screen.getByRole('button',{name:'Show all contact fields'}));expect(edit).not.toHaveBeenCalled();
});
it('disabled work cannot be edited or navigated',()=>{
 const edit=vi.fn();render(<TenderSupplierGuide disabled values={{...EMPTY_SUPPLIER_VALUES}} onChange={edit}/>);
 fireEvent.click(screen.getByRole('button',{name:'Guide me step by step'}));fireEvent.change(screen.getByLabelText('SBD 1 Name of bidder'),{target:{value:'must not apply'}});
 expect(edit).not.toHaveBeenCalled();expect(screen.getAllByRole('textbox')).toHaveLength(7);
});
it('format guidance agrees with the existing worker validator for bounded inputs',()=>{
 for(const field of SBD1_FIELDS)for(const value of ['', ' ', 'valid@example.test', 'A & B', 'x'.repeat(field.max+1), 'a\nb','x\u202e','\ud800']){
  const values={...EMPTY_SUPPLIER_VALUES,bidderName:'Synthetic', [field.id]:value};
  const accepted=supplierFieldProgress(values,SBD1_FIELDS).attention.length===0;
  if(accepted)expect(()=>validateSupplierValues(values)).not.toThrow();else expect(()=>validateSupplierValues(values)).toThrow();
 }
});
it('updates optional-blank progress as contact facts change without treating invalid entries as blanks',()=>{
 const writes=vi.fn(),edits=vi.fn();vi.stubGlobal('fetch',writes);
 function LiveFixture(){const[values,setValues]=useState({...EMPTY_SUPPLIER_VALUES,bidderName:'Synthetic bidder'});return <TenderSupplierGuide values={values} onChange={(id,value)=>{edits(id,value);setValues(v=>({...v,[id]:value}));}}/>;}
 render(<LiveFixture/>);
 const originalReview=screen.getByText('Review 6 blank optional contact fields');
 fireEvent.click(originalReview);
 const disclosure=originalReview.closest('details')!;
 expect(within(disclosure).getAllByRole('button')).toHaveLength(6);
 fireEvent.change(screen.getByLabelText('SBD 1 Postal address'),{target:{value:'Synthetic postbox'}});
 expect(screen.getByText('Review 5 blank optional contact fields')).toBeTruthy();
 expect(within(disclosure).queryByRole('button',{name:'Go to Postal address'})).toBeNull();
 fireEvent.change(screen.getByLabelText('SBD 1 Email address'),{target:{value:'invalid-email'}});
 expect(screen.getByText('Review 4 blank optional contact fields')).toBeTruthy();
 expect(within(disclosure).queryByRole('button',{name:'Go to Email address'})).toBeNull();
 expect(screen.getByLabelText('SBD 1 Email address').getAttribute('aria-invalid')).toBe('true');
 expect(screen.getByRole('status').textContent).toContain('2 of 7 supported contact fields');
 fireEvent.change(screen.getByLabelText('SBD 1 Email address'),{target:{value:'synthetic@example.test'}});
 expect(screen.getByText('Review 4 blank optional contact fields')).toBeTruthy();
 expect(screen.getByRole('status').textContent).toContain('3 of 7 supported contact fields');
 expect(edits).toHaveBeenCalledTimes(3);
 expect(writes).not.toHaveBeenCalled();
});
it('unmounting and reopening does not restore an old answer',()=>{
 const app=render(<Fixture/>);fireEvent.change(screen.getByLabelText('SBD 1 Name of bidder'),{target:{value:'Private synthetic bidder'}});app.unmount();render(<Fixture/>);
 expect(screen.queryByDisplayValue('Private synthetic bidder')).toBeNull();
});

it('unlocking the form after processing does not repeat an old navigation focus',async()=>{
 const values={...EMPTY_SUPPLIER_VALUES};const edit=vi.fn();
 const frame=(disabled:boolean)=><><button type="button">Review controls</button><TenderSupplierGuide disabled={disabled} values={values} onChange={edit}/></>;
 const app=render(frame(false));fireEvent.click(screen.getByRole('button',{name:'Guide me step by step'}));
 await waitFor(()=>expect(document.activeElement).toBe(screen.getByLabelText('SBD 1 Name of bidder')));
 screen.getByRole('button',{name:'Review controls'}).focus();
 app.rerender(frame(true));app.rerender(frame(false));
 expect(document.activeElement).toBe(screen.getByRole('button',{name:'Review controls'}));
});

it('reviews optional blank contacts by opening the selected field without inventing answers',async()=>{
 const network=vi.fn(),edits=vi.fn();vi.stubGlobal('fetch',network);
 render(<TenderSupplierGuide values={{...EMPTY_SUPPLIER_VALUES,bidderName:'Synthetic bidder'}} onChange={edits}/>);
 const disclosure=screen.getByText('Review 6 blank optional contact fields');
 fireEvent.click(disclosure);
 expect(screen.getByText(/optional for Luqi's partial export only/)).toBeTruthy();
 expect(screen.getByRole('button',{name:'Go to Email address'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Guide me step by step'}));
 fireEvent.click(screen.getByRole('button',{name:'Go to Email address'}));
 await waitFor(()=>expect(document.activeElement).toBe(screen.getByLabelText('SBD 1 Email address')));
 expect((screen.getByLabelText('SBD 1 Email address') as HTMLInputElement).value).toBe('');
 expect(screen.getByRole('status').textContent).toContain('1 of 7 supported contact fields');
 expect(edits).not.toHaveBeenCalled();expect(network).not.toHaveBeenCalled();
});


it('a blank optional jump focuses the matching visible field in complete-form mode without entering data',async()=>{
 const writes=vi.fn(),edits=vi.fn();vi.stubGlobal('fetch',writes);
 render(<TenderSupplierGuide values={{...EMPTY_SUPPLIER_VALUES,bidderName:'Synthetic bidder'}} onChange={edits}/>);
 const review=screen.getByText('Review 6 blank optional contact fields');
 fireEvent.click(review);
 const disclosure=review.closest('details')!;
 const jump=within(disclosure).getByRole('button',{name:'Go to Cellphone number'});
 jump.focus();fireEvent.click(jump);
 await waitFor(()=>expect(document.activeElement).toBe(screen.getByLabelText('SBD 1 Cellphone number')));
 expect(screen.getAllByRole('textbox')).toHaveLength(7);
 expect((screen.getByLabelText('SBD 1 Cellphone number') as HTMLInputElement).value).toBe('');
 expect(screen.getByRole('status').textContent).toContain('1 of 7 supported contact fields');
 expect(edits).not.toHaveBeenCalled();
 expect(writes).not.toHaveBeenCalled();
});
