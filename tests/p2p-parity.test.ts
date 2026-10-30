import {readFileSync} from 'node:fs';
import {it,expect} from 'vitest';
it('ships standalone contracts and matching P2P safety code in both frontend builds',()=>{
  expect(readFileSync('app/contracts/p2p.ts','utf8')).toBe(readFileSync('contracts/p2p.ts','utf8'));
  for(const path of ['components/SovereignP2PMessenger.tsx','components/P2PAbuseLedger.tsx','components/sovereign-p2p.css',
    'lib/p2p-client.ts','lib/p2p-crypto.ts','lib/p2p-shield.ts','components/ChatSidebar.tsx','components/WorkspaceLayout.tsx',
    'components/useContactPresence.ts','components/CollaborationDock.tsx','components/ApprovedContactsPanel.tsx','components/collaboration-dock.css']){
    expect(readFileSync('app/src/'+path,'utf8'),path).toBe(readFileSync('src/'+path,'utf8'));
  }
});
