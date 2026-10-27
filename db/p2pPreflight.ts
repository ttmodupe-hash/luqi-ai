/** Read-only pre-listener privilege and key preflight. No repair/grant path. */
import mysql from 'mysql2/promise';
import { parseMySqlConnectionSettings } from '../api/lib/mysqlConfig';
import { P2P_RUNTIME_GRANTS } from './p2pContracts';
import { WEB_RUNTIME_GRANTS } from './runtimeRole';
export async function checkP2PReadiness(environment:Record<string,string|undefined>=process.env){
  if(environment.LUQI_P2P_ENABLED!=='true')return;
  const key=environment.LUQI_P2P_REPORT_KEY??'';
  if(!/^[A-Za-z0-9_-]{43}$/.test(key)||Buffer.from(key,'base64url').length!==32)throw Error('P2P_PREFLIGHT_UNAVAILABLE');
  const settings=parseMySqlConnectionSettings(environment);if(!settings)throw Error('P2P_PREFLIGHT_UNAVAILABLE');
  const c=await mysql.createConnection({...settings,connectTimeout:4000});
  try{
    const [roles]=await c.query<mysql.RowDataPacket[]>({sql:'SELECT CURRENT_ROLE() AS roles,CURRENT_USER() AS identity',timeout:4000});
    const [grants]=await c.query<mysql.RowDataPacket[]>({sql:'SHOW GRANTS',timeout:4000});
    const entries=grants.map(row=>String(Object.values(row)[0])),schema=mysql.escapeId(settings.database);
    const identity=String(roles[0]?.identity??''),at=identity.lastIndexOf('@');
    if(roles[0]?.roles!=='NONE'||at<1)throw Error('P2P_PREFLIGHT_UNAVAILABLE');
    const account=mysql.escapeId(identity.slice(0,at))+'@'+mysql.escapeId(identity.slice(at+1));
    const expected=new Set(['GRANT USAGE ON *.* TO '+account,...Object.entries({...WEB_RUNTIME_GRANTS,...P2P_RUNTIME_GRANTS,
      ...(environment.LUQI_OMEGA_WEB_ENABLED==='true'?{omega_tasks_v1:'SELECT, INSERT, UPDATE, DELETE'}:{}),
      ...(environment.LUQI_PROJECT_VAULT_ENABLED==='true'?{luqi_project_vault_v1:'SELECT, INSERT, UPDATE, DELETE'}:{})
    }).map(([table,privileges])=>'GRANT '+privileges+' ON '+schema+'.'+mysql.escapeId(table)+' TO '+account)]);
    // Inactive role grants also fail: a role that could later be activated is excess access.
    if(entries.length!==expected.size||entries.some(g=>!expected.delete(g))||expected.size)throw Error('P2P_PREFLIGHT_UNAVAILABLE');
    const [head]=await c.query<mysql.RowDataPacket[]>({sql:'SELECT seal FROM luqi_p2p_audit_head_v1 WHERE id=1',timeout:4000});
    if(head.length!==1||!/^[a-f0-9]{64}$/.test(head[0].seal))throw Error('P2P_PREFLIGHT_UNAVAILABLE');
  }finally{await c.end().catch(()=>c.destroy())}
}
