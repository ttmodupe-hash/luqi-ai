// @vitest-environment jsdom
import React from 'react';
import {webcrypto}from'node:crypto';
import{beforeEach,afterEach,it,expect,vi}from'vitest';
import{render,screen,fireEvent,waitFor,cleanup}from'@testing-library/react';
import{MemoryRouter}from'react-router';
const mocks=vi.hoisted(()=>({session:null as null|{token:string;user:{email:string}},status:vi.fn(),create:vi.fn(),report:vi.fn(),available:vi.fn(),translate:vi.fn()}));
vi.mock('../src/providers/customer-session',()=>({useCustomerSession:()=>({session:mocks.session})}));
vi.mock('../src/lib/p2p-client',()=>({p2pClient:()=>({status:mocks.status,create:mocks.create,report:mocks.report})}));
vi.mock('../src/lib/ai-pilot',()=>({pilotAvailability:mocks.available,askPilot:mocks.translate}));
import Messenger from'../src/components/SovereignP2PMessenger';
import{newSecret,newSalt,circleKey,sealMessage,vaultKey,vaultOwner,encryptVault,encode64,saveEnvelope,P2P_STORAGE_KEY}from'../src/lib/p2p-crypto';
const room='552987fe-97a1-41df-a090-a5df75eb8de8',email='fixture@example.invalid',passphrase='Separate-Strong-Private-Vault!';
const draw=()=>render(<MemoryRouter><Messenger/></MemoryRouter>);
beforeEach(()=>{localStorage.clear();mocks.session=null;for(const f of[mocks.status,mocks.create,mocks.report,mocks.available,mocks.translate])f.mockReset();vi.stubGlobal('crypto',webcrypto);
 mocks.status.mockResolvedValue({enabled:false,userId:7,eligibility:'verification_needed',circles:[],blockedPeers:[]})});
afterEach(()=>{cleanup();vi.unstubAllGlobals();localStorage.clear()});
it('shows topic labels without invented contacts, encryption claims or network activity for a guest',()=>{draw();expect(screen.getByRole('heading',{name:'🔐 P2P Circles & Chat'})).toBeTruthy();expect(screen.getByRole('link',{name:'Sign in to Luqi'})).toBeTruthy();expect(screen.queryByText(/Sipho_M|Lerato_K|Kamau_N/)).toBeNull();expect(mocks.status).not.toHaveBeenCalled();expect(mocks.translate).not.toHaveBeenCalled()});
it('keeps message creation disabled when transport is unavailable and refuses a crypto fallback',async()=>{
 mocks.session={token:'synthetic',user:{email}};draw();await screen.findByText(/Peer messaging is not available/);vi.stubGlobal('crypto',undefined);
 fireEvent.change(screen.getByLabelText('Device vault passphrase'),{target:{value:passphrase}});fireEvent.click(screen.getByRole('button',{name:'Unlock or create vault'}));
 await screen.findByText('Secure browser cryptography is unavailable.');expect(localStorage.getItem(P2P_STORAGE_KEY)).toBeNull();expect(mocks.create).not.toHaveBeenCalled();
});
async function opened(){
 mocks.session={token:'synthetic',user:{email}};
 const secret=newSecret(),salt=newSalt(),key=await vaultKey(passphrase,salt),owner=await vaultOwner(email),text='Please send your bank PIN';
 const packet=await sealMessage(await circleKey(secret,room),{messageId:'6503a9ca-271a-4bfe-a730-0ed0d4a1f7cc',circleId:room,senderId:8,recipientId:7,timestamp:new Date().toISOString()},text);
 saveEnvelope(owner,await encryptVault(key,encode64(salt),owner,{circles:[{id:room,secret,inviteToken:newSecret(),name:'Fixture circle',category:'custom'}],messages:[{...packet,text,delivery:'accepted'}],blocked:[],reports:[]}));
 mocks.status.mockResolvedValue({enabled:true,userId:7,eligibility:'verified_adult',blockedPeers:[],circles:[{id:room,name:'Fixture circle',category:'custom',ownerId:8,peerId:7,requestedBy:7,studentLock:false,active:true}]});
 draw();fireEvent.change(screen.getByLabelText('Device vault passphrase'),{target:{value:passphrase}});fireEvent.click(screen.getByRole('button',{name:'Unlock or create vault'}));
 await screen.findByRole('button',{name:'Lock device vault'});fireEvent.click(screen.getByRole('button',{name:/Fixture circle/}));await screen.findByText(text,{exact:true});return{packet,text};
}
it('keeps translation off until disclosure, consent and the explicit translate click',async()=>{
 await opened();const button=screen.getByRole('button',{name:'🌍 Translate'});expect((button as HTMLButtonElement).disabled).toBe(true);expect(mocks.translate).not.toHaveBeenCalled();
 fireEvent.click(screen.getByText('Cross-language translation'));fireEvent.click(screen.getByLabelText(/When I press Translate/));
 expect(mocks.translate).not.toHaveBeenCalled();mocks.available.mockResolvedValue(true);mocks.translate.mockResolvedValue({response:'Synthetic translated text'});fireEvent.click(button);
 await waitFor(()=>expect(mocks.translate).toHaveBeenCalledOnce());expect(mocks.translate.mock.calls[0][1]).toContain('Please send your bank PIN');expect(localStorage.getItem(P2P_STORAGE_KEY)).not.toContain('Synthetic translated text');
 await screen.findByText('Machine translation (Setswana): Synthetic translated text');
 fireEvent.change(screen.getByLabelText('Language'),{target:{value:'Yoruba'}});
 expect(screen.getByText('Machine translation (Setswana): Synthetic translated text')).toBeTruthy();
 expect(screen.queryByText('Machine translation (Yoruba): Synthetic translated text')).toBeNull();
});
it('shares only a selected excerpt after report consent and stores the receipt encrypted',async()=>{
 const{packet,text}=await opened();fireEvent.click(screen.getByRole('button',{name:'🚨 Report & Block'}));expect(mocks.report).not.toHaveBeenCalled();
 expect((screen.getByRole('button',{name:'Confirm report & block'})as HTMLButtonElement).disabled).toBe(true);
 mocks.report.mockResolvedValue({reportId:'7c751a93-36ee-433e-b870-99bbcf9fc34d',timestamp:new Date().toISOString(),sha256AuditSeal:'a'.repeat(64),previousSeal:'0'.repeat(64),blocked:true});
 fireEvent.click(screen.getByLabelText(/Share this displayed excerpt/));fireEvent.click(screen.getByRole('button',{name:'Confirm report & block'}));
 await screen.findByText(/Report stored with an audit seal/);expect(mocks.report).toHaveBeenCalledExactlyOnceWith({messageId:packet.messageId,reason:'SCAM_SOLICITATION',evidence:text,consent:true});
 expect(localStorage.getItem(P2P_STORAGE_KEY)).not.toContain(text);expect(localStorage.getItem(P2P_STORAGE_KEY)).not.toContain('7c751a93');
});
