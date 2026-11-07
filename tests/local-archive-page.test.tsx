// @vitest-environment jsdom
import React from 'react';
import { webcrypto } from 'node:crypto';
import { beforeAll, beforeEach, afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { createLocalArchive } from '../src/features/archive/archive-crypto';
import type { LocalArchiveBundle } from '../src/features/archive/archive-contract';
import ArchiveVaultPage from '../src/pages/ArchiveVaultPage';

const identity=vi.hoisted(()=>({email:null as string|null}));
vi.mock('../src/providers/customer-session',()=>({useOptionalCustomerSession:()=>identity.email?
  {session:{user:{email:identity.email}}}:null}));
const secret='Synthetic long recovery passphrase for UI tests';
const document={title:'Fixture title',text:'Only synthetic record content'};
let bundle:LocalArchiveBundle;
class FakeWorker{
  static instances:FakeWorker[]=[];
  onmessage:((event:{data:unknown})=>void)|null=null;onerror:(()=>void)|null=null;
  postMessage=vi.fn();terminate=vi.fn();
  constructor(){FakeWorker.instances.push(this);}
  emit(data:unknown){this.onmessage?.({data});}
}
beforeAll(async()=>{vi.stubGlobal('crypto',webcrypto);bundle=await createLocalArchive(document,secret);vi.unstubAllGlobals();});
beforeEach(()=>{
  identity.email=null;FakeWorker.instances=[];localStorage.clear();sessionStorage.clear();
  vi.stubGlobal('crypto',webcrypto);vi.stubGlobal('Worker',FakeWorker);vi.stubGlobal('fetch',vi.fn());
  Object.defineProperty(URL,'createObjectURL',{configurable:true,value:vi.fn(()=> 'blob:synthetic-archive')});
  Object.defineProperty(URL,'revokeObjectURL',{configurable:true,value:vi.fn()});
  vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();});
function view(){return render(<MemoryRouter><ArchiveVaultPage/></MemoryRouter>);}
function fill(){
  fireEvent.change(screen.getByLabelText('Record title'),{target:{value:document.title}});
  fireEvent.change(screen.getByLabelText('Record text'),{target:{value:document.text}});
  fireEvent.change(screen.getByLabelText('New recovery passphrase'),{target:{value:secret}});
  fireEvent.change(screen.getByLabelText('Repeat recovery passphrase'),{target:{value:secret}});
}
function file(raw:string){const value=new File([raw],'synthetic.json',{type:'application/json'});
  Object.defineProperty(value,'text',{value:async()=>raw});return value;}

it('does not send input, persists nothing and requires a matching passphrase before starting a worker',()=>{
  view();fill();fireEvent.change(screen.getByLabelText('Repeat recovery passphrase'),{target:{value:secret+'wrong'}});
  fireEvent.click(screen.getByRole('button',{name:'Encrypt record'}));
  expect(screen.getByRole('alert').textContent).toContain('do not match');
  expect(FakeWorker.instances).toHaveLength(0);expect(fetch).not.toHaveBeenCalled();
  expect((screen.getByLabelText('New recovery passphrase') as HTMLInputElement).value).toBe('');
  expect(localStorage.length).toBe(0);expect(sessionStorage.length).toBe(0);
});
it('validates the worker reply, saves recovery first and requires the explicit saved-file acknowledgement',()=>{
  view();fill();fireEvent.click(screen.getByRole('button',{name:'Encrypt record'}));
  const worker=FakeWorker.instances[0];expect(worker.postMessage).toHaveBeenCalledExactlyOnceWith({kind:'seal',document,passphrase:secret});
  act(()=>worker.emit({ok:true,kind:'sealed',result:bundle}));
  expect(worker.terminate).toHaveBeenCalled();
  const archive=screen.getByRole('button',{name:'Download encrypted archive'}) as HTMLButtonElement;
  expect(archive.disabled).toBe(true);expect(URL.createObjectURL).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Download recovery file'}));expect(archive.disabled).toBe(true);
  fireEvent.click(screen.getByRole('checkbox'));expect(archive.disabled).toBe(false);
  fireEvent.click(archive);expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
  expect(fetch).not.toHaveBeenCalled();expect(localStorage.length).toBe(0);expect(sessionStorage.length).toBe(0);
  fireEvent.change(screen.getByLabelText('Record text'),{target:{value:'Changed draft'}});
  expect(screen.queryByRole('button',{name:'Download encrypted archive'})).toBeNull();
});
it('ignores cancelled and late worker results and clears plaintext at an account boundary',()=>{
  const rendered=view();fill();fireEvent.click(screen.getByRole('button',{name:'Encrypt record'}));
  const worker=FakeWorker.instances[0];
  fireEvent.click(screen.getByRole('button',{name:'Clear this tab / cancel'}));
  act(()=>worker.emit({ok:true,kind:'sealed',result:bundle}));
  expect(worker.terminate).toHaveBeenCalled();expect(screen.queryByLabelText('Save encrypted pair')).toBeNull();
  expect((screen.getByLabelText('Record text') as HTMLTextAreaElement).value).toBe('');
  fill();identity.email='another@example.invalid';rendered.rerender(<MemoryRouter><ArchiveVaultPage/></MemoryRouter>);
  expect((screen.getByLabelText('Record text') as HTMLTextAreaElement).value).toBe('');
  expect((screen.getByLabelText('New recovery passphrase') as HTMLInputElement).value).toBe('');
});
it('does not expose an unconfirmed or malformed worker result',()=>{
  view();fill();fireEvent.click(screen.getByRole('button',{name:'Encrypt record'}));
  act(()=>FakeWorker.instances[0].emit({ok:true,kind:'sealed',result:{...bundle,envelope:'not valid'}}));
  expect(screen.getByRole('alert').textContent).toContain('Could not verify');
  expect(screen.queryByLabelText('Save encrypted pair')).toBeNull();expect(URL.createObjectURL).not.toHaveBeenCalled();
});
it('restores only after explicit action, preserves the draft, clears the secret and discards failed plaintext',async()=>{
  view();fill();
  fireEvent.change(screen.getByLabelText('Encrypted archive file (.json)'),{target:{files:[file(bundle.envelope)]}});
  fireEvent.change(screen.getByLabelText('Matching recovery file (.json)'),{target:{files:[file(bundle.recoveryFile)]}});
  fireEvent.change(screen.getByLabelText('Recovery unlock passphrase'),{target:{value:secret}});
  expect(FakeWorker.instances).toHaveLength(0);
  fireEvent.click(screen.getByRole('button',{name:'Verify and unlock record'}));
  await waitFor(()=>expect(FakeWorker.instances).toHaveLength(1));
  expect((screen.getByLabelText('Recovery unlock passphrase') as HTMLInputElement).value).toBe('');
  act(()=>FakeWorker.instances[0].emit({ok:true,kind:'opened',result:document}));
  expect(screen.getByLabelText('Verified restored record').textContent).toContain(document.text);
  expect((screen.getByLabelText('Record text') as HTMLTextAreaElement).value).toBe(document.text);
  fireEvent.change(screen.getByLabelText('Matching recovery file (.json)'),{target:{files:[file(bundle.recoveryFile)]}});
  expect(screen.queryByLabelText('Verified restored record')).toBeNull();
  fireEvent.change(screen.getByLabelText('Recovery unlock passphrase'),{target:{value:secret}});
  fireEvent.click(screen.getByRole('button',{name:'Verify and unlock record'}));
  await waitFor(()=>expect(FakeWorker.instances).toHaveLength(2));
  act(()=>FakeWorker.instances[1].emit({ok:false}));
  expect(screen.queryByLabelText('Verified restored record')).toBeNull();expect(fetch).not.toHaveBeenCalled();
});
