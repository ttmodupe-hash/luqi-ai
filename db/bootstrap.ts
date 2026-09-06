// =====================================================================
// DATABASE BOOTSTRAP
// Creates all 32 tables on startup when they do not exist yet.
// DDL is generated from db/schema.ts (drizzle-kit) so the table
// definitions can never drift from the Drizzle schema.
// Idempotent (IF NOT EXISTS) and never throws — a database that is
// unreachable or already provisioned must not block server startup.
// Also ensures the demo login account (demo@luqi.ai) exists.
// =====================================================================

import mysql from "mysql2/promise";

const CREATE_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS \`ab_test_results\` (
	\`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
	\`test_id\` int NOT NULL,
	\`variant_id\` varchar(100) NOT NULL,
	\`metric_name\` varchar(255),
	\`metric_value\` decimal(10,4),
	\`sample_size\` int,
	\`created_at\` timestamp DEFAULT (now()),
	CONSTRAINT \`ab_test_results_id\` PRIMARY KEY(\`id\`)
);`,
  `CREATE TABLE IF NOT EXISTS \`ab_tests\` (
	\`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
	\`name\` varchar(255) NOT NULL,
	\`description\` text,
	\`status\` varchar(50) DEFAULT 'draft',
	\`variants\` json,
	\`traffic_allocation\` json,
	\`start_date\` timestamp,
	\`end_date\` timestamp,
	\`created_at\` timestamp DEFAULT (now()),
	\`updated_at\` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`ab_tests_id\` PRIMARY KEY(\`id\`)
);`,
  `CREATE TABLE IF NOT EXISTS \`adaptive_history\` (
	\`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
	\`student_id\` int NOT NULL,
	\`lab_slug\` varchar(255),
	\`difficulty_attempted\` varchar(50),
	\`score\` int,
	\`time_spent_seconds\` int,
	\`hints_used\` int DEFAULT 0,
	\`completed\` boolean DEFAULT false,
	\`created_at\` timestamp DEFAULT (now()),
	CONSTRAINT \`adaptive_history_id\` PRIMARY KEY(\`id\`)
);`,
  `CREATE TABLE IF NOT EXISTS \`agent_activity_log\` (
	\`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
	\`agent_id\` varchar(255) NOT NULL,
	\`agent_name\` varchar(255),
	\`action\` varchar(255) NOT NULL,
	\`status\` varchar(50) DEFAULT 'success',
	\`input_data\` json,
	\`output_data\` json,
	\`error_message\` text,
	\`duration_ms\` int,
	\`timestamp\` timestamp DEFAULT (now()),
	\`created_at\` timestamp DEFAULT (now()),
	CONSTRAINT \`agent_activity_log_id\` PRIMARY KEY(\`id\`)
);`,
  `CREATE TABLE IF NOT EXISTS \`analytics_events\` (
	\`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
	\`user_id\` int,
	\`event_type\` varchar(100) NOT NULL,
	\`event_name\` varchar(255) NOT NULL,
	\`properties\` json,
	\`page_url\` varchar(1000),
	\`session_id\` varchar(255),
	\`created_at\` timestamp DEFAULT (now()),
	CONSTRAINT \`analytics_events_id\` PRIMARY KEY(\`id\`)
);`,
  `CREATE TABLE IF NOT EXISTS \`benchmark_feeds\` (
	\`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
	\`feed_name\` varchar(255),
	\`feed_source\` varchar(255),
	\`feed_type\` varchar(100),
	\`region\` varchar(255),
	\`framework_key\` varchar(255),
	\`update_type\` varchar(100),
	\`payload_json\` text,
	\`processed\` boolean DEFAULT false,
	\`status\` varchar(50) DEFAULT 'active',
	\`last_sync_at\` timestamp,
	\`record_count\` int DEFAULT 0,
	\`config\` json,
	\`timestamp\` timestamp DEFAULT (now()),
	\`created_at\` timestamp DEFAULT (now()),
	\`updated_at\` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`benchmark_feeds_id\` PRIMARY KEY(\`id\`)
);`,
  `CREATE TABLE IF NOT EXISTS \`botanical_entries\` (
	\`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
	\`user_id\` int,
	\`plant_name\` varchar(255) NOT NULL,
	\`name\` varchar(255),
	\`scientific_name\` varchar(255),
	\`category\` varchar(100),
	\`description\` text,
	\`traditional_use\` text,
	\`safety_notes\` text,
	\`region\` varchar(255),
	\`image_url\` varchar(1000),
	\`care_instructions\` json,
	\`growing_conditions\` json,
	\`common_issues\` json,
	\`verified\` boolean DEFAULT false,
	\`verified_by\` varchar(255),
	\`verification_notes\` text,
	\`verified_at\` timestamp,
	\`created_at\` timestamp DEFAULT (now()),
	\`updated_at\` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`botanical_entries_id\` PRIMARY KEY(\`id\`)
);`,
  `CREATE TABLE IF NOT EXISTS \`companion_conversations\` (
	\`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
	\`personality_id\` int NOT NULL,
	\`user_id\` int,
	\`title\` varchar(500),
	\`status\` varchar(50) DEFAULT 'active',
	\`trust_score\` decimal(5,2),
	\`last_message_at\` timestamp,
	\`message_count\` int DEFAULT 0,
	\`created_at\` timestamp DEFAULT (now()),
	\`updated_at\` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`companion_conversations_id\` PRIMARY KEY(\`id\`)
);`,
  `CREATE TABLE IF NOT EXISTS \`companion_memories\` (
	\`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
	\`conversation_id\` int,
	\`user_id\` int,
	\`memory_type\` varchar(100),
	\`category\` varchar(100),
	\`content\` text NOT NULL,
	\`importance\` decimal(4,2) DEFAULT '5.00',
	\`created_at\` timestamp DEFAULT (now()),
	CONSTRAINT \`companion_memories_id\` PRIMARY KEY(\`id\`)
);`,
  `CREATE TABLE IF NOT EXISTS \`companion_messages\` (
	\`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
	\`conversation_id\` int NOT NULL,
	\`role\` enum('user','assistant','system') NOT NULL,
	\`content\` text NOT NULL,
	\`metadata\` json,
	\`tokens_used\` int,
	\`created_at\` timestamp DEFAULT (now()),
	CONSTRAINT \`companion_messages_id\` PRIMARY KEY(\`id\`)
);`,
  `CREATE TABLE IF NOT EXISTS \`companion_personalities\` (
	\`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
	\`name\` varchar(255) NOT NULL,
	\`description\` text,
	\`system_prompt\` text,
	\`avatar_url\` varchar(500),
	\`personality_traits\` json,
	\`communication_style\` varchar(100),
	\`expertise_areas\` json,
	\`is_default\` boolean DEFAULT false,
	\`created_at\` timestamp DEFAULT (now()),
	\`updated_at\` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`companion_personalities_id\` PRIMARY KEY(\`id\`)
);`,
  `CREATE TABLE IF NOT EXISTS \`content_items\` (
	\`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
	\`title\` varchar(500) NOT NULL,
	\`content\` text,
	\`category\` varchar(100),
	\`content_type\` varchar(100),
	\`image_url\` varchar(1000),
	\`source_url\` varchar(1000),
	\`author\` varchar(255),
	\`status\` varchar(50) DEFAULT 'published',
	\`metadata\` json,
	\`created_at\` timestamp DEFAULT (now()),
	\`updated_at\` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`content_items_id\` PRIMARY KEY(\`id\`)
);`,
  `CREATE TABLE IF NOT EXISTS \`error_logs\` (
	\`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
	\`error_type\` varchar(100) NOT NULL,
	\`severity\` varchar(50) NOT NULL,
	\`message\` text NOT NULL,
	\`source_module\` varchar(255),
	\`source_file\` varchar(500),
	\`stack_trace\` text,
	\`metadata_json\` text,
	\`patch_id\` int,
	\`resolved\` boolean DEFAULT false,
	\`resolved_at\` timestamp,
	\`timestamp\` timestamp DEFAULT (now()),
	\`created_at\` timestamp DEFAULT (now()),
	CONSTRAINT \`error_logs_id\` PRIMARY KEY(\`id\`)
);`,
  `CREATE TABLE IF NOT EXISTS \`experiments\` (
	\`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
	\`lab_id\` int NOT NULL,
	\`name\` varchar(255) NOT NULL,
	\`hypothesis\` text,
	\`status\` varchar(50) DEFAULT 'draft',
	\`results\` json,
	\`created_at\` timestamp DEFAULT (now()),
	\`updated_at\` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`experiments_id\` PRIMARY KEY(\`id\`)
);`,
  `CREATE TABLE IF NOT EXISTS \`guardian_links\` (
	\`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
	\`guardian_user_id\` int NOT NULL,
	\`student_user_id\` int NOT NULL,
	\`relationship\` varchar(50),
	\`created_at\` timestamp DEFAULT (now()),
	CONSTRAINT \`guardian_links_id\` PRIMARY KEY(\`id\`)
);`,
  `CREATE TABLE IF NOT EXISTS \`healing_events\` (
	\`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
	\`event_type\` varchar(100) NOT NULL,
	\`severity\` varchar(50),
	\`description\` text,
	\`resolution\` text,
	\`status\` varchar(50) DEFAULT 'pending',
	\`created_at\` timestamp DEFAULT (now()),
	\`resolved_at\` timestamp,
	CONSTRAINT \`healing_events_id\` PRIMARY KEY(\`id\`)
);`,
  `CREATE TABLE IF NOT EXISTS \`healing_patches\` (
	\`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
	\`error_log_id\` int,
	\`patch_type\` varchar(100),
	\`target_module\` varchar(255),
	\`target_file\` varchar(500),
	\`agent_name\` varchar(255),
	\`description\` text,
	\`code_diff\` text,
	\`ab_test_percent\` int,
	\`applied_at\` timestamp,
	\`rolled_back_at\` timestamp,
	\`rollback_reason\` text,
	\`status\` varchar(50) DEFAULT 'pending',
	\`created_at\` timestamp DEFAULT (now()),
	CONSTRAINT \`healing_patches_id\` PRIMARY KEY(\`id\`)
);`,
  `CREATE TABLE IF NOT EXISTS \`knowledge_articles\` (
	\`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
	\`title\` varchar(500) NOT NULL,
	\`content\` text NOT NULL,
	\`category\` varchar(100),
	\`tags\` json,
	\`source_url\` varchar(1000),
	\`author\` varchar(255),
	\`status\` varchar(50) DEFAULT 'published',
	\`view_count\` int DEFAULT 0,
	\`created_at\` timestamp DEFAULT (now()),
	\`updated_at\` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`knowledge_articles_id\` PRIMARY KEY(\`id\`)
);`,
  `CREATE TABLE IF NOT EXISTS \`lab_reports\` (
	\`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
	\`student_id\` int NOT NULL,
	\`lab_slug\` varchar(255),
	\`session_data_json\` text,
	\`observations\` text,
	\`conclusion\` text,
	\`created_at\` timestamp DEFAULT (now()),
	CONSTRAINT \`lab_reports_id\` PRIMARY KEY(\`id\`)
);`,
  `CREATE TABLE IF NOT EXISTS \`labs\` (
	\`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
	\`name\` varchar(255) NOT NULL,
	\`description\` text,
	\`status\` varchar(50) DEFAULT 'active',
	\`config\` json,
	\`created_at\` timestamp DEFAULT (now()),
	\`updated_at\` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`labs_id\` PRIMARY KEY(\`id\`)
);`,
  `CREATE TABLE IF NOT EXISTS \`notifications\` (
	\`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
	\`user_id\` int NOT NULL,
	\`type\` varchar(50) NOT NULL,
	\`title\` varchar(500) NOT NULL,
	\`message\` text,
	\`priority\` varchar(20) DEFAULT 'medium',
	\`read\` boolean DEFAULT false,
	\`action_url\` varchar(1000),
	\`action_label\` varchar(255),
	\`metadata\` json,
	\`created_at\` timestamp DEFAULT (now()),
	CONSTRAINT \`notifications_id\` PRIMARY KEY(\`id\`)
);`,
  `CREATE TABLE IF NOT EXISTS \`offline_sync_queue\` (
	\`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
	\`user_id\` int,
	\`device_id\` varchar(255) NOT NULL,
	\`action\` varchar(255),
	\`payload_json\` text,
	\`synced\` boolean DEFAULT false,
	\`synced_at\` timestamp,
	\`created_at\` timestamp DEFAULT (now()),
	CONSTRAINT \`offline_sync_queue_id\` PRIMARY KEY(\`id\`)
);`,
  `CREATE TABLE IF NOT EXISTS \`page_views\` (
	\`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
	\`user_id\` int,
	\`page_path\` varchar(500) NOT NULL,
	\`referrer\` varchar(1000),
	\`session_id\` varchar(255),
	\`created_at\` timestamp DEFAULT (now()),
	CONSTRAINT \`page_views_id\` PRIMARY KEY(\`id\`)
);`,
  `CREATE TABLE IF NOT EXISTS \`predictions\` (
	\`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
	\`model_name\` varchar(255) NOT NULL,
	\`input_data\` json,
	\`output_data\` json,
	\`confidence\` decimal(5,2),
	\`created_at\` timestamp DEFAULT (now()),
	CONSTRAINT \`predictions_id\` PRIMARY KEY(\`id\`)
);`,
  `CREATE TABLE IF NOT EXISTS \`progress_alerts\` (
	\`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
	\`guardian_id\` int NOT NULL,
	\`student_id\` int NOT NULL,
	\`alert_type\` varchar(100),
	\`message\` text,
	\`created_at\` timestamp DEFAULT (now()),
	CONSTRAINT \`progress_alerts_id\` PRIMARY KEY(\`id\`)
);`,
  `CREATE TABLE IF NOT EXISTS \`sessions\` (
	\`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
	\`user_id\` int NOT NULL,
	\`token\` varchar(500) NOT NULL,
	\`expires_at\` timestamp NOT NULL,
	\`created_at\` timestamp DEFAULT (now()),
	CONSTRAINT \`sessions_id\` PRIMARY KEY(\`id\`),
	CONSTRAINT \`sessions_token_unique\` UNIQUE(\`token\`)
);`,
  `CREATE TABLE IF NOT EXISTS \`student_profiles\` (
	\`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
	\`user_id\` int NOT NULL,
	\`framework_key\` varchar(255),
	\`current_difficulty\` varchar(50) DEFAULT 'beginner',
	\`mastery_score\` decimal(5,2) DEFAULT '0',
	\`streak_days\` int DEFAULT 0,
	\`learning_style\` varchar(100),
	\`preferred_language\` varchar(10) DEFAULT 'en',
	\`created_at\` timestamp DEFAULT (now()),
	\`updated_at\` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`student_profiles_id\` PRIMARY KEY(\`id\`)
);`,
  `CREATE TABLE IF NOT EXISTS \`system_metrics\` (
	\`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
	\`metric_name\` varchar(255),
	\`metric_type\` varchar(100),
	\`module\` varchar(255),
	\`metric_value\` decimal(15,4),
	\`value\` decimal(15,4),
	\`metric_unit\` varchar(50),
	\`unit\` varchar(50),
	\`threshold\` decimal(15,4),
	\`is_anomaly\` boolean DEFAULT false,
	\`tags\` json,
	\`timestamp\` timestamp DEFAULT (now()),
	\`recorded_at\` timestamp DEFAULT (now()),
	CONSTRAINT \`system_metrics_id\` PRIMARY KEY(\`id\`)
);`,
  `CREATE TABLE IF NOT EXISTS \`users\` (
	\`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
	\`email\` varchar(255) NOT NULL,
	\`password_hash\` varchar(255) NOT NULL,
	\`name\` varchar(255),
	\`avatar_url\` varchar(500),
	\`role\` varchar(50) DEFAULT 'user',
	\`is_active\` boolean DEFAULT true,
	\`email_verified\` boolean DEFAULT false,
	\`last_login_at\` timestamp,
	\`created_at\` timestamp DEFAULT (now()),
	\`updated_at\` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`users_id\` PRIMARY KEY(\`id\`),
	CONSTRAINT \`users_email_unique\` UNIQUE(\`email\`)
);`,
  `CREATE TABLE IF NOT EXISTS \`video_jobs\` (
	\`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
	\`project_id\` int NOT NULL,
	\`job_type\` varchar(100),
	\`status\` varchar(50) DEFAULT 'pending',
	\`progress\` int DEFAULT 0,
	\`error_message\` text,
	\`started_at\` timestamp,
	\`completed_at\` timestamp,
	\`created_at\` timestamp DEFAULT (now()),
	CONSTRAINT \`video_jobs_id\` PRIMARY KEY(\`id\`)
);`,
  `CREATE TABLE IF NOT EXISTS \`video_projects\` (
	\`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
	\`user_id\` int,
	\`title\` varchar(500) NOT NULL,
	\`description\` text,
	\`prompt\` text,
	\`language\` varchar(10) DEFAULT 'en',
	\`status\` varchar(50) DEFAULT 'draft',
	\`progress\` int DEFAULT 0,
	\`source_url\` varchar(1000),
	\`output_url\` varchar(1000),
	\`video_url\` varchar(1000),
	\`thumbnail_url\` varchar(1000),
	\`duration\` int,
	\`duration_seconds\` int,
	\`resolution\` varchar(50),
	\`format\` varchar(20),
	\`file_size\` int,
	\`model_used\` varchar(255),
	\`error_message\` text,
	\`processed_at\` timestamp,
	\`metadata\` json,
	\`created_at\` timestamp DEFAULT (now()),
	\`updated_at\` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`video_projects_id\` PRIMARY KEY(\`id\`)
);`,
  `CREATE TABLE IF NOT EXISTS \`voice_commands\` (
	\`id\` bigint unsigned NOT NULL AUTO_INCREMENT,
	\`user_id\` int,
	\`lab_slug\` varchar(255),
	\`command_text\` text,
	\`interpreted_action\` varchar(255),
	\`confidence\` decimal(3,2),
	\`language\` varchar(10) DEFAULT 'en',
	\`executed\` boolean DEFAULT false,
	\`executed_at\` timestamp,
	\`created_at\` timestamp DEFAULT (now()),
	CONSTRAINT \`voice_commands_id\` PRIMARY KEY(\`id\`)
);`
];

function resolveConnectionConfig(): mysql.ConnectionOptions | null {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    return { uri: databaseUrl };
  }

  const host = process.env.DB_HOST;
  if (!host) {
    return null;
  }

  return {
    host,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "luqi_ai",
    port: parseInt(process.env.DB_PORT || "3306", 10),
  };
}

export async function bootstrapDatabase(): Promise<void> {
  const config = resolveConnectionConfig();

  if (!config) {
    console.log("[Bootstrap] No database configuration found (DATABASE_URL or DB_HOST) — skipping table creation");
    return;
  }

  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection(config);

    for (const statement of CREATE_STATEMENTS) {
      await connection.execute(statement);
    }

    console.log(`[Bootstrap] Verified/created ${CREATE_STATEMENTS.length} tables`);

    // Ensure the demo account exists (it is advertised on the login page)
    try {
      const bcrypt = (await import("bcryptjs")).default;
      const [rows] = await connection.query("SELECT id FROM users WHERE email = ? LIMIT 1", ["demo@luqi.ai"]);
      if ((rows as Array<unknown>).length === 0) {
        const hash = await bcrypt.hash("demo123", 10);
        await connection.execute(
          "INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)",
          ["demo@luqi.ai", hash, "Demo User", "user"]
        );
        console.log("[Bootstrap] Demo account created: demo@luqi.ai");
      }
    } catch (seedError) {
      console.error("[Bootstrap] Demo account seed failed (non-fatal):", seedError);
    }
  } catch (error) {
    console.error("[Bootstrap] Table creation failed (non-fatal):", error);
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch {
        // Connection cleanup failure is non-fatal
      }
    }
  }
}
