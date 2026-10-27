/** Read-only pre-listener privilege and key preflight. No repair/grant path. */
import mysql from 'mysql2/promise';
import { parseMySqlConnectionSettings } from '../api/lib/mysqlConfig';
import { P2P_RUNTIME_GRANTS } from './p2pContracts';
export async function checkP2PReadiness(environment:Record<string,string|undefined>=process.env){
  if(environment.LUQI_P2P_ENABLED!=='true')return;
  const key=environment.LUQI_P2P_REPORT_KEY??'';
  if(!/^[A-Za-z0-9_-]{43}$/.test(key)||Buffer.from(key,'base64url').length!==32)throw Error('P2P_PREFLIGHT_UNAVAILABLE');
  const settings=parseMySqlConnectionSettings(environment);if(!settings)throw Error('P2P_PREFLIGHT_UNAVAILABLE');
  const c=await mysql.createConnection({...settings,connectTimeout:4000});
  try{
    const [roles]=await c.query<mysql.RowDataPacket[]>({sql:'SELECT CURRENT_ROLE() AS roles',timeout:4000});
    const [grants]=await c.query<mysql.RowDataPacket[]>({sql:'SHOW GRANTS',timeout:4000});
    const entries=grants.map(row=>String(Object.values(row)[0])),schema=mysql.escapeId(settings.database);
    if(roles[0]?.roles!=='NONE'||entries.some(g=>g.includes('WITH GRANT OPTION')||
      (!g.startsWith('GRANT USAGE ON *.* TO ')&&(g.includes(' ON *.* ')||g.includes(' ON '+schema+'.* ')))))throw Error('P2P_PREFLIGHT_UNAVAILABLE');
    for(const [table,privileges] of Object.entries(P2P_RUNTIME_GRANTS)){
      const scope=' ON '+schema+'.'+mysql.escapeId(table)+' TO ';
      const matches=entries.filter(g=>g.includes(scope));
      if(matches.length!==1||!matches[0].startsWith('GRANT '+privileges+scope))throw Error('P2P_PREFLIGHT_UNAVAILABLE');
    }
    const [head]=await c.query<mysql.RowDataPacket[]>({sql:'SELECT seal FROM luqi_p2p_audit_head_v1 WHERE id=1',timeout:4000});
    if(head.length!==1||!/^[a-f0-9]{64}$/.test(head[0].seal))throw Error('P2P_PREFLIGHT_UNAVAILABLE');
  }finally{await c.end().catch(()=>c.destroy())}
}
