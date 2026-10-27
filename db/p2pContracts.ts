/** Feature-specific contracts; no DDL or data writes. */
export const P2P_RUNTIME_GRANTS:Readonly<Record<string,string>>={
  luqi_p2p_circles_v1:'SELECT, INSERT, UPDATE',luqi_p2p_blocks_v1:'SELECT, INSERT',
  luqi_p2p_messages_v1:'SELECT, INSERT',luqi_p2p_audit_head_v1:'SELECT, UPDATE',luqi_p2p_reports_v1:'SELECT, INSERT',
};
const uuid={type:'char(36)',collation:'ascii_bin'},id={type:'bigint unsigned'};
export const P2P_RUNTIME_TABLES={
  luqi_p2p_circles_v1:{columns:['id','owner_id','peer_id','requested_by','name','category','invite_digest','invite_expires_at','active','student_lock','created_at'],unique:[['id'],['invite_digest']],critical:{id:uuid,owner_id:id,invite_digest:{type:'char(64)',collation:'ascii_bin'},student_lock:{type:'tinyint'}}},
  luqi_p2p_blocks_v1:{columns:['owner_id','peer_id','created_at'],unique:[['owner_id','peer_id']],critical:{owner_id:id,peer_id:id}},
  luqi_p2p_messages_v1:{columns:['id','circle_id','sender_id','recipient_id','iv','ciphertext','client_timestamp','created_at'],unique:[['id'],['circle_id','iv']],critical:{id:uuid,circle_id:uuid,sender_id:id,recipient_id:id,iv:{type:'char(16)',collation:'ascii_bin'}}},
  luqi_p2p_audit_head_v1:{columns:['id','seal'],unique:[['id']],critical:{id:{type:'int unsigned'},seal:{type:'char(64)',collation:'ascii_bin'}}},
  luqi_p2p_reports_v1:{columns:['sequence','id','reporter_id','offender_id','message_id','reason','sealed_evidence','timestamp','previous_seal','seal'],unique:[['sequence'],['id'],['reporter_id','message_id']],critical:{sequence:id,id:uuid,reporter_id:id,offender_id:id,sealed_evidence:{type:'json'},previous_seal:{type:'char(64)',collation:'ascii_bin'},seal:{type:'char(64)',collation:'ascii_bin'}}},
};
