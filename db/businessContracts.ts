/** Contracts only. The web runtime never imports migration DDL. */
export const BUSINESS_SCHEMA_DIGEST='7283d970bfb5666320df56c17ee1a99869cdec56f15aaa6c283bcf2021573e39';
export const BUSINESS_RUNTIME_GRANTS:Readonly<Record<string,string>>={
 luqi_business_meta_v1:'SELECT',luqi_business_reviewers_v1:'SELECT',
 luqi_business_profiles_v1:'SELECT, INSERT, UPDATE, DELETE',
 luqi_business_audit_v1:'SELECT, INSERT, DELETE',
 luqi_business_usage_v1:'SELECT, INSERT, UPDATE, DELETE',
 luqi_business_reports_v1:'SELECT, INSERT, UPDATE, DELETE',
};
const id={type:'bigint unsigned'},uuid={type:'char(36)',collation:'ascii_bin'};
export const BUSINESS_RUNTIME_TABLES={
 luqi_business_reviewers_v1:{columns:['user_id','active','assigned_at'],unique:[['user_id']],critical:{user_id:{type:'bigint unsigned'},active:{type:'tinyint'}}},
 luqi_business_meta_v1:{columns:['id','digest','prepared_at'],unique:[['id']],critical:{id:{type:'tinyint unsigned'},digest:{type:'char(64)',collation:'ascii_bin'}}},
 luqi_business_profiles_v1:{columns:['id','owner_id','revision','state','province','category','fingerprint','draft','public_document','public_search','reason','consent_at','consent_version','created_at','updated_at'],unique:[['id'],['owner_id','fingerprint']],critical:{id:uuid,owner_id:id,draft:{type:'json'},public_document:{type:'json',nullable:true},fingerprint:{type:'char(64)',collation:'ascii_bin'}}},
 luqi_business_audit_v1:{columns:['id','profile_id','actor_id','action','reason','created_at'],unique:[['id']],critical:{id,profile_id:uuid,actor_id:id}},
 luqi_business_usage_v1:{columns:['owner_id','day_utc','attempts','reports'],unique:[['owner_id','day_utc']],critical:{owner_id:id,day_utc:{type:'char(10)',collation:'ascii_bin'},attempts:{type:'int unsigned'},reports:{type:'int unsigned'}}},
 luqi_business_reports_v1:{columns:['profile_id','reporter_id','reason','note','created_at'],unique:[['profile_id','reporter_id']],critical:{profile_id:uuid,reporter_id:id}},
};
