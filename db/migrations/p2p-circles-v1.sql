-- Additive, separately reviewed operator migration. Never run by web startup.
CREATE TABLE luqi_p2p_circles_v1 (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 owner_id BIGINT UNSIGNED NOT NULL, peer_id BIGINT UNSIGNED NULL, requested_by BIGINT UNSIGNED NULL,
 name VARCHAR(100) NOT NULL, category VARCHAR(16) NOT NULL,
 invite_digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
 invite_expires_at TIMESTAMP(3) NOT NULL, active BOOLEAN NOT NULL DEFAULT FALSE,
 student_lock BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 INDEX p2p_owner(owner_id), INDEX p2p_peer(peer_id), INDEX p2p_request(requested_by),
 FOREIGN KEY(owner_id) REFERENCES users(id), FOREIGN KEY(peer_id) REFERENCES users(id),
 FOREIGN KEY(requested_by) REFERENCES users(id)
) ENGINE=InnoDB;
CREATE TABLE luqi_p2p_blocks_v1 (
 owner_id BIGINT UNSIGNED NOT NULL, peer_id BIGINT UNSIGNED NOT NULL,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY(owner_id,peer_id),
 FOREIGN KEY(owner_id) REFERENCES users(id), FOREIGN KEY(peer_id) REFERENCES users(id)
) ENGINE=InnoDB;
CREATE TABLE luqi_p2p_messages_v1 (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 circle_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 sender_id BIGINT UNSIGNED NOT NULL, recipient_id BIGINT UNSIGNED NOT NULL,
 iv CHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, ciphertext VARCHAR(14000) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 client_timestamp CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 UNIQUE p2p_nonce(circle_id,iv), INDEX p2p_inbox(circle_id,created_at), INDEX p2p_send_limit(sender_id,created_at),
 FOREIGN KEY(circle_id) REFERENCES luqi_p2p_circles_v1(id), FOREIGN KEY(sender_id) REFERENCES users(id), FOREIGN KEY(recipient_id) REFERENCES users(id)
) ENGINE=InnoDB;
CREATE TABLE luqi_p2p_audit_head_v1 (
 id INT UNSIGNED PRIMARY KEY, seal CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL
) ENGINE=InnoDB;
INSERT INTO luqi_p2p_audit_head_v1(id,seal) VALUES(1,REPEAT('0',64));
CREATE TABLE luqi_p2p_reports_v1 (
 sequence BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
 reporter_id BIGINT UNSIGNED NOT NULL, offender_id BIGINT UNSIGNED NOT NULL,
 message_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 reason VARCHAR(32) NOT NULL, sealed_evidence JSON NOT NULL,
 timestamp CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 previous_seal CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 seal CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 UNIQUE p2p_report_once(reporter_id,message_id), FOREIGN KEY(reporter_id) REFERENCES users(id),
 FOREIGN KEY(offender_id) REFERENCES users(id), FOREIGN KEY(message_id) REFERENCES luqi_p2p_messages_v1(id)
) ENGINE=InnoDB;
