/** Owner-scoped MySQL project storage.
 * Never issues membership, payment requests or provider calls.
 */
import { randomUUID } from 'node:crypto';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPersistentMySqlPool } from '../queries/connection';
import { MEMBER_LIMITS,newMemberProject,projectId,savedQuote,VaultError,
  type MemberPlan,type MemberProjectInput } from './memberVaultContract';

const SELECT_FIELDS =
  "id,title,document,revision,kind,DATE_FORMAT(created_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS created_at,"+
  "DATE_FORMAT(updated_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS updated_at";
const listFields =
  "id,title,revision,DATE_FORMAT(updated_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS updated_at";
function ownerId(userId:number){
  if(!Number.isSafeInteger(userId)||userId<=0)throw new VaultError('AUTH_REQUIRED');
}
async function tx<T>(fn:(conn:PoolConnection)=>Promise<T>):Promise<T>{
  const db=await getPersistentMySqlPool().getConnection();
  try{
    await db.query("SET time_zone = '+00:00'");
    await db.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
    await db.beginTransaction();
    const result=await fn(db);
    await db.commit();
    return result;
  }catch(error){
    await db.rollback().catch(()=>undefined);
    throw error;
  }finally{db.release();}
}
async function activeUser(db:PoolConnection,userId:number){
  const [rows]=await db.execute<RowDataPacket[]>(
    'SELECT id,is_active FROM users WHERE id=? FOR UPDATE',[userId]);
  if(!rows[0]||rows[0].is_active!==1)throw new VaultError('AUTH_REQUIRED');
}
async function validMember(db:PoolConnection,userId:number,lock=false):Promise<MemberPlan|null>{
  const query="SELECT plan FROM luqi_member_entitlements_v1 WHERE user_id=? "+
    "AND status='active' AND source='merchant_verified' "+
    "AND valid_until>UTC_TIMESTAMP(6) "+(lock?'FOR UPDATE':'');
  const [rows]=await db.execute<RowDataPacket[]>(query,[userId]);
  const plan=rows[0]?.plan;
  return plan==='starter'||plan==='creator'?plan:null;
}
function rowView(row:RowDataPacket){
  const value=typeof row.document==='string'?JSON.parse(row.document):row.document;
  if(row.kind!=='quote'||!Number.isSafeInteger(row.revision)||row.revision<1||
      row.revision>999999||typeof row.title!=='string')throw Error('Invalid persisted project');
  const quote=savedQuote.parse(value);
  return {
    id:projectId.parse(row.id),
    title:newMemberProject.shape.title.parse(row.title),
    revision:row.revision as number,
    quote,
    createdAt:row.created_at as string,
    updatedAt:row.updated_at as string,
  };
}
async function owned(db:PoolConnection,userId:number,id:string,lock=false){
  const query='SELECT '+SELECT_FIELDS+' FROM luqi_member_projects_v1 WHERE id=? AND user_id=? '+
    (lock?'FOR UPDATE':'');
  const [rows]=await db.execute<RowDataPacket[]>(query,[id,userId]);
  if(!rows[0])throw new VaultError('VAULT_NOT_FOUND');
  return rows[0];
}
export const memberVaultStore={
  async status(userId:number){
    ownerId(userId);
    const db=await getPersistentMySqlPool().getConnection();
    try{
      await db.query("SET time_zone = '+00:00'");
      const plan=await validMember(db,userId);
      if(!plan)return {enabled:true as const,member:false as const};
      const [rows]=await db.execute<RowDataPacket[]>(
        'SELECT COUNT(*) AS total FROM luqi_member_projects_v1 WHERE user_id=?',[userId]);
      return {enabled:true as const,member:true as const,plan,
        maxProjects:MEMBER_LIMITS[plan],used:Number(rows[0].total)};
    }finally{db.release();}
  },
  async create(userId:number,submitted:MemberProjectInput){
    ownerId(userId);
    const input=newMemberProject.parse(submitted);
    return tx(async db=>{
      await activeUser(db,userId);
      const plan=await validMember(db,userId,true);
      if(!plan)throw new VaultError('MEMBERSHIP_REQUIRED');
      const [counts]=await db.execute<RowDataPacket[]>(
        'SELECT COUNT(*) AS total FROM luqi_member_projects_v1 WHERE user_id=?',[userId]);
      if(Number(counts[0].total)>=MEMBER_LIMITS[plan])throw new VaultError('VAULT_LIMIT');
      const id=randomUUID();
      await db.execute(
        "INSERT INTO luqi_member_projects_v1 "+
        "(id,user_id,kind,title,document,revision) VALUES (?,?,'quote',?,?,1)",
        [id,userId,input.title,JSON.stringify(input.quote)]);
      return rowView(await owned(db,userId,id));
    });
  },
  async list(userId:number){
    ownerId(userId);
    const [rows]=await getPersistentMySqlPool().execute<RowDataPacket[]>(
      'SELECT '+listFields+' FROM luqi_member_projects_v1 WHERE user_id=? '+
      'ORDER BY updated_at DESC,id DESC LIMIT 60',[userId]);
    return rows.map(row=>({
      id:projectId.parse(row.id),title:newMemberProject.shape.title.parse(row.title),
      revision:row.revision as number,updatedAt:row.updated_at as string,
    }));
  },
  async get(userId:number,id:string){
    ownerId(userId);
    projectId.parse(id);
    const db=await getPersistentMySqlPool().getConnection();
    try{
      await db.query("SET time_zone = '+00:00'");
      return rowView(await owned(db,userId,id));
    }finally{db.release();}
  },
  async update(userId:number,id:string,version:number,submitted:MemberProjectInput){
    ownerId(userId);
    projectId.parse(id);
    const input=newMemberProject.parse(submitted);
    return tx(async db=>{
      await activeUser(db,userId);
      if(!await validMember(db,userId,true))throw new VaultError('MEMBERSHIP_REQUIRED');
      const row=await owned(db,userId,id,true);
      rowView(row);
      if(row.revision!==version||version>=999999)throw new VaultError('VAULT_CONFLICT');
      const [result]=await db.execute<ResultSetHeader>(
        'UPDATE luqi_member_projects_v1 SET title=?,document=?,revision=revision+1,'+
        'updated_at=UTC_TIMESTAMP(6) WHERE id=? AND user_id=? AND revision=? AND kind=?',
        [input.title,JSON.stringify(input.quote),id,userId,version,'quote']);
      if(result.affectedRows!==1)throw new VaultError('VAULT_CONFLICT');
      return rowView(await owned(db,userId,id));
    });
  },
  async remove(userId:number,id:string,version:number){
    ownerId(userId);
    projectId.parse(id);
    return tx(async db=>{
      await activeUser(db,userId);
      const row=await owned(db,userId,id,true);
      rowView(row);
      if(row.revision!==version)throw new VaultError('VAULT_CONFLICT');
      const [result]=await db.execute<ResultSetHeader>(
        "DELETE FROM luqi_member_projects_v1 WHERE id=? AND user_id=? AND "+
        "revision=? AND kind='quote'",[id,userId,version]);
      if(result.affectedRows!==1)throw new VaultError('VAULT_CONFLICT');
      return {id,deleted:true as const};
    });
  },
};
