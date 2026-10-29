/** Operator-only, READ-ONLY proof that a P2P test cohort and moderator roles
 * exist before asking for production activation. Not proof of age documents,
 * identity, staffing commitment, abuse response readiness or live messaging.
 * Read aggregate roles only. No names, emails, IDs or secrets are returned.
 */
import mysql, {type RowDataPacket} from 'mysql2/promise';
import {parseMySqlConnectionSettings} from '../api/lib/mysqlConfig';
export interface P2PCohortSafety {moderatorPresent:boolean;mutualTestPairPresent:boolean;}
export function evaluateP2PTestCohort(rows:readonly {role:unknown;n:unknown}[]):P2PCohortSafety{
 let moderators=0,adults=0,studentPair=false;
 for(const row of rows){
  if(typeof row.role!=='string')continue;
  const amount=Number(row.n);
  if(!Number.isSafeInteger(amount)||amount<0)continue;
  if(row.role==='p2p_moderator'){moderators+=amount;adults+=amount;}
  else if(row.role==='p2p_adult')adults+=amount;
  else if(/^p2p_student:[a-z0-9_-]{1,32}$/.test(row.role)&&amount>=2)studentPair=true;
 }
 return {moderatorPresent:moderators>=1,mutualTestPairPresent:adults>=2||studentPair};
}
export async function checkP2POperatorTestCohort(environment:Record<string,string|undefined>):Promise<P2PCohortSafety>{
 const settings=parseMySqlConnectionSettings(environment);
 if(!settings)throw Error('P2P_OPERATOR_AUDIT_UNAVAILABLE');
 const c=await mysql.createConnection({...settings,connectTimeout:4000});
 try{
  const [rows]=await c.query<RowDataPacket[]>({
   sql:"SELECT role, COUNT(*) AS n FROM users WHERE is_active=1 AND (role IN ('p2p_moderator','p2p_adult') OR role LIKE 'p2p_student:%') GROUP BY role LIMIT 200",
   timeout:4000
  });
  // This aggregate is only a prerequisite. Manual verified-age and moderation
  // sign-off remain separately compulsory; absence fails closed.
  return evaluateP2PTestCohort(rows);
 }finally{await c.end().catch(()=>c.destroy());}
}
