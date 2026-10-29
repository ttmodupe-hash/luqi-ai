import {it,expect} from 'vitest';
import {expectedWebRuntimeGrants,WEB_RUNTIME_GRANTS} from '../db/runtimeRole';
it('keeps both session and P2P grants while composing all optional features',()=>{
 const grants=expectedWebRuntimeGrants({LUQI_CUSTOMER_RESUME_ENABLED:'true',LUQI_P2P_ENABLED:'true',LUQI_OMEGA_WEB_ENABLED:'true',LUQI_PROJECT_VAULT_ENABLED:'true'});
 expect(Object.keys(grants)).toHaveLength(16);
 expect(grants.customer_device_sessions_v1).toBe('SELECT, INSERT, UPDATE');
 expect(grants.luqi_p2p_reports_v1).toBe('SELECT, INSERT');
 expect(grants.luqi_p2p_blocks_v1).toBe('SELECT, INSERT');
 expect(grants.luqi_p2p_messages_v1).toBe('SELECT, INSERT');
 expect(grants.omega_tasks_v1).toBe('SELECT, INSERT, UPDATE, DELETE');
 expect(grants.luqi_project_vault_v1).toBe('SELECT, INSERT, UPDATE, DELETE');
 expect(expectedWebRuntimeGrants({})).toEqual(WEB_RUNTIME_GRANTS);
});
