import type { TableContract } from './runtimeSchema';
/** Conditional contracts only: core startup and grants stay identical while off. */
export const BUSINESS_RUNTIME_TABLES: Record<string, TableContract> = {
  luqi_business_profiles_v1: { columns: ['id','owner_id','revision','state','dedupe_key','province','municipality',
    'trading_name','search_text','document','verification','created_at','updated_at'], unique: [['id'],['dedupe_key']],
    critical: { id: { type: 'char(36)', collation: 'ascii_bin' }, owner_id: { type: 'bigint unsigned' },
      revision: { type: 'int unsigned' }, document: { type: 'json' }, verification: { type: 'json' },
      dedupe_key: { type: 'char(64)', collation: 'ascii_bin' } } },
  luqi_business_audit_v1: { columns: ['id','business_id','actor_id','action','revision','metadata','created_at'], unique: [['id']],
    critical: { id: { type: 'bigint unsigned' }, metadata: { type: 'json' } } },
  luqi_business_reports_v1: { columns: ['id','business_id','reporter_id','kind','details','state','created_at','resolved_at'], unique: [['id']],
    critical: { id: { type: 'char(36)', collation: 'ascii_bin' }, reporter_id: { type: 'bigint unsigned' } } },
  luqi_business_limits_v1: { columns: ['actor_id','day_utc','writes','reports'], unique: [['actor_id','day_utc']],
    critical: { actor_id: { type: 'bigint unsigned' }, day_utc: { type: 'char(10)', collation: 'ascii_bin' } } },
};
export const BUSINESS_RUNTIME_GRANTS = {
  luqi_business_profiles_v1: 'SELECT, INSERT, UPDATE, DELETE',
  luqi_business_audit_v1: 'SELECT, INSERT, DELETE',
  luqi_business_reports_v1: 'SELECT, INSERT, UPDATE, DELETE',
  luqi_business_limits_v1: 'SELECT, INSERT, UPDATE, DELETE',
};
