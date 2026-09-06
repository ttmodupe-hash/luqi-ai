import { mysqlTable, serial, varchar, text, int, timestamp, boolean, json, decimal, mysqlEnum } from "drizzle-orm/mysql-core";

/* ───────── Companion Tables ───────── */

export const companionPersonalities = mysqlTable("companion_personalities", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  systemPrompt: text("system_prompt"),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  personalityTraits: json("personality_traits"),
  communicationStyle: varchar("communication_style", { length: 100 }),
  expertiseAreas: json("expertise_areas"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const companionConversations = mysqlTable("companion_conversations", {
  id: serial("id").primaryKey(),
  personalityId: int("personality_id").notNull(),
  userId: int("user_id"),
  title: varchar("title", { length: 500 }),
  status: varchar("status", { length: 50 }).default("active"),
  trustScore: decimal("trust_score", { precision: 5, scale: 2 }),
  lastMessageAt: timestamp("last_message_at"),
  messageCount: int("message_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const companionMessages = mysqlTable("companion_messages", {
  id: serial("id").primaryKey(),
  conversationId: int("conversation_id").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  metadata: json("metadata"),
  tokensUsed: int("tokens_used"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const companionMemories = mysqlTable("companion_memories", {
  id: serial("id").primaryKey(),
  conversationId: int("conversation_id"),
  userId: int("user_id"),
  memoryType: varchar("memory_type", { length: 100 }),
  category: varchar("category", { length: 100 }),
  content: text("content").notNull(),
  importance: decimal("importance", { precision: 4, scale: 2 }).default("5.00"),
  createdAt: timestamp("created_at").defaultNow(),
});

/* ───────── Video Tables ───────── */

export const videoProjects = mysqlTable("video_projects", {
  id: serial("id").primaryKey(),
  userId: int("user_id"),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  prompt: text("prompt"),
  language: varchar("language", { length: 10 }).default("en"),
  status: varchar("status", { length: 50 }).default("draft"),
  progress: int("progress").default(0),
  sourceUrl: varchar("source_url", { length: 1000 }),
  outputUrl: varchar("output_url", { length: 1000 }),
  videoUrl: varchar("video_url", { length: 1000 }),
  thumbnailUrl: varchar("thumbnail_url", { length: 1000 }),
  duration: int("duration"),
  durationSeconds: int("duration_seconds"),
  resolution: varchar("resolution", { length: 50 }),
  format: varchar("format", { length: 20 }),
  fileSize: int("file_size"),
  modelUsed: varchar("model_used", { length: 255 }),
  errorMessage: text("error_message"),
  processedAt: timestamp("processed_at"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const videoJobs = mysqlTable("video_jobs", {
  id: serial("id").primaryKey(),
  projectId: int("project_id").notNull(),
  jobType: varchar("job_type", { length: 100 }),
  status: varchar("status", { length: 50 }).default("pending"),
  progress: int("progress").default(0),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

/* ───────── Botanical Tables ───────── */

export const botanicalEntries = mysqlTable("botanical_entries", {
  id: serial("id").primaryKey(),
  userId: int("user_id"),
  plantName: varchar("plant_name", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  scientificName: varchar("scientific_name", { length: 255 }),
  category: varchar("category", { length: 100 }),
  description: text("description"),
  traditionalUse: text("traditional_use"),
  safetyNotes: text("safety_notes"),
  region: varchar("region", { length: 255 }),
  imageUrl: varchar("image_url", { length: 1000 }),
  careInstructions: json("care_instructions"),
  growingConditions: json("growing_conditions"),
  commonIssues: json("common_issues"),
  verified: boolean("verified").default(false),
  verifiedBy: varchar("verified_by", { length: 255 }),
  verificationNotes: text("verification_notes"),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

/* ───────── User & Auth Tables ───────── */

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  role: varchar("role", { length: 50 }).default("user"),
  isActive: boolean("is_active").default(true),
  emailVerified: boolean("email_verified").default(false),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const sessions = mysqlTable("sessions", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(),
  token: varchar("token", { length: 500 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

/* ───────── Analytics & Tracking Tables ───────── */

export const analyticsEvents = mysqlTable("analytics_events", {
  id: serial("id").primaryKey(),
  userId: int("user_id"),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  eventName: varchar("event_name", { length: 255 }).notNull(),
  properties: json("properties"),
  pageUrl: varchar("page_url", { length: 1000 }),
  sessionId: varchar("session_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pageViews = mysqlTable("page_views", {
  id: serial("id").primaryKey(),
  userId: int("user_id"),
  pagePath: varchar("page_path", { length: 500 }).notNull(),
  referrer: varchar("referrer", { length: 1000 }),
  sessionId: varchar("session_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

/* ───────── Notification Tables ───────── */

export const notifications = mysqlTable("notifications", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  message: text("message"),
  priority: varchar("priority", { length: 20 }).default("medium"),
  read: boolean("read").default(false),
  actionUrl: varchar("action_url", { length: 1000 }),
  actionLabel: varchar("action_label", { length: 255 }),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

/* ───────── Lab & Experiment Tables ───────── */

export const labs = mysqlTable("labs", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).default("active"),
  config: json("config"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const experiments = mysqlTable("experiments", {
  id: serial("id").primaryKey(),
  labId: int("lab_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  hypothesis: text("hypothesis"),
  status: varchar("status", { length: 50 }).default("draft"),
  results: json("results"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

/* ───────── Self-Healing Tables ───────── */

export const healingEvents = mysqlTable("healing_events", {
  id: serial("id").primaryKey(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  severity: varchar("severity", { length: 50 }),
  description: text("description"),
  resolution: text("resolution"),
  status: varchar("status", { length: 50 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const errorLogs = mysqlTable("error_logs", {
  id: serial("id").primaryKey(),
  errorType: varchar("error_type", { length: 100 }).notNull(),
  severity: varchar("severity", { length: 50 }).notNull(),
  message: text("message").notNull(),
  sourceModule: varchar("source_module", { length: 255 }),
  sourceFile: varchar("source_file", { length: 500 }),
  stackTrace: text("stack_trace"),
  metadataJson: text("metadata_json"),
  patchId: int("patch_id"),
  resolved: boolean("resolved").default(false),
  resolvedAt: timestamp("resolved_at"),
  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const healingPatches = mysqlTable("healing_patches", {
  id: serial("id").primaryKey(),
  errorLogId: int("error_log_id"),
  patchType: varchar("patch_type", { length: 100 }),
  targetModule: varchar("target_module", { length: 255 }),
  targetFile: varchar("target_file", { length: 500 }),
  agentName: varchar("agent_name", { length: 255 }),
  description: text("description"),
  codeDiff: text("code_diff"),
  abTestPercent: int("ab_test_percent"),
  appliedAt: timestamp("applied_at"),
  rolledBackAt: timestamp("rolled_back_at"),
  rollbackReason: text("rollback_reason"),
  status: varchar("status", { length: 50 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const systemMetrics = mysqlTable("system_metrics", {
  id: serial("id").primaryKey(),
  metricName: varchar("metric_name", { length: 255 }),
  metricType: varchar("metric_type", { length: 100 }),
  module: varchar("module", { length: 255 }),
  metricValue: decimal("metric_value", { precision: 15, scale: 4 }),
  value: decimal("value", { precision: 15, scale: 4 }),
  metricUnit: varchar("metric_unit", { length: 50 }),
  unit: varchar("unit", { length: 50 }),
  threshold: decimal("threshold", { precision: 15, scale: 4 }),
  isAnomaly: boolean("is_anomaly").default(false),
  tags: json("tags"),
  timestamp: timestamp("timestamp").defaultNow(),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

export const agentActivityLog = mysqlTable("agent_activity_log", {
  id: serial("id").primaryKey(),
  agentId: varchar("agent_id", { length: 255 }).notNull(),
  agentName: varchar("agent_name", { length: 255 }),
  action: varchar("action", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).default("success"),
  inputData: json("input_data"),
  outputData: json("output_data"),
  errorMessage: text("error_message"),
  durationMs: int("duration_ms"),
  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const benchmarkFeeds = mysqlTable("benchmark_feeds", {
  id: serial("id").primaryKey(),
  feedName: varchar("feed_name", { length: 255 }),
  feedSource: varchar("feed_source", { length: 255 }),
  feedType: varchar("feed_type", { length: 100 }),
  region: varchar("region", { length: 255 }),
  frameworkKey: varchar("framework_key", { length: 255 }),
  updateType: varchar("update_type", { length: 100 }),
  payloadJson: text("payload_json"),
  processed: boolean("processed").default(false),
  status: varchar("status", { length: 50 }).default("active"),
  lastSyncAt: timestamp("last_sync_at"),
  recordCount: int("record_count").default(0),
  config: json("config"),
  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

/* ───────── Knowledge Base Tables ───────── */

export const knowledgeArticles = mysqlTable("knowledge_articles", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 100 }),
  tags: json("tags"),
  sourceUrl: varchar("source_url", { length: 1000 }),
  author: varchar("author", { length: 255 }),
  status: varchar("status", { length: 50 }).default("published"),
  viewCount: int("view_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

/* ───────── Content Tables ───────── */

export const contentItems = mysqlTable("content_items", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content"),
  category: varchar("category", { length: 100 }),
  contentType: varchar("content_type", { length: 100 }),
  imageUrl: varchar("image_url", { length: 1000 }),
  sourceUrl: varchar("source_url", { length: 1000 }),
  author: varchar("author", { length: 255 }),
  status: varchar("status", { length: 50 }).default("published"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

/* ───────── Prediction Tables ───────── */

export const predictions = mysqlTable("predictions", {
  id: serial("id").primaryKey(),
  modelName: varchar("model_name", { length: 255 }).notNull(),
  inputData: json("input_data"),
  outputData: json("output_data"),
  confidence: decimal("confidence", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

/* ───────── AB Test Tables ───────── */

export const abTests = mysqlTable("ab_tests", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).default("draft"),
  variants: json("variants"),
  trafficAllocation: json("traffic_allocation"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const abTestResults = mysqlTable("ab_test_results", {
  id: serial("id").primaryKey(),
  testId: int("test_id").notNull(),
  variantId: varchar("variant_id", { length: 100 }).notNull(),
  metricName: varchar("metric_name", { length: 255 }),
  metricValue: decimal("metric_value", { precision: 10, scale: 4 }),
  sampleSize: int("sample_size"),
  createdAt: timestamp("created_at").defaultNow(),
});

/* ───────── Adaptive Learning Tables ───────── */

export const studentProfiles = mysqlTable("student_profiles", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(),
  frameworkKey: varchar("framework_key", { length: 255 }),
  currentDifficulty: varchar("current_difficulty", { length: 50 }).default("beginner"),
  masteryScore: decimal("mastery_score", { precision: 5, scale: 2 }).default("0"),
  streakDays: int("streak_days").default(0),
  learningStyle: varchar("learning_style", { length: 100 }),
  preferredLanguage: varchar("preferred_language", { length: 10 }).default("en"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const adaptiveHistory = mysqlTable("adaptive_history", {
  id: serial("id").primaryKey(),
  studentId: int("student_id").notNull(),
  labSlug: varchar("lab_slug", { length: 255 }),
  difficultyAttempted: varchar("difficulty_attempted", { length: 50 }),
  score: int("score"),
  timeSpentSeconds: int("time_spent_seconds"),
  hintsUsed: int("hints_used").default(0),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

/* ───────── Grading Tables ───────── */

export const labReports = mysqlTable("lab_reports", {
  id: serial("id").primaryKey(),
  studentId: int("student_id").notNull(),
  labSlug: varchar("lab_slug", { length: 255 }),
  sessionDataJson: text("session_data_json"),
  observations: text("observations"),
  conclusion: text("conclusion"),
  createdAt: timestamp("created_at").defaultNow(),
});

/* ───────── Guardian Tables ───────── */

export const guardianLinks = mysqlTable("guardian_links", {
  id: serial("id").primaryKey(),
  guardianUserId: int("guardian_user_id").notNull(),
  studentUserId: int("student_user_id").notNull(),
  relationship: varchar("relationship", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const progressAlerts = mysqlTable("progress_alerts", {
  id: serial("id").primaryKey(),
  guardianId: int("guardian_id").notNull(),
  studentId: int("student_id").notNull(),
  alertType: varchar("alert_type", { length: 100 }),
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow(),
});

/* ───────── Offline Sync Tables ───────── */

export const offlineSyncQueue = mysqlTable("offline_sync_queue", {
  id: serial("id").primaryKey(),
  userId: int("user_id"),
  deviceId: varchar("device_id", { length: 255 }).notNull(),
  action: varchar("action", { length: 255 }),
  payloadJson: text("payload_json"),
  synced: boolean("synced").default(false),
  syncedAt: timestamp("synced_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

/* ───────── Voice Command Tables ───────── */

export const voiceCommands = mysqlTable("voice_commands", {
  id: serial("id").primaryKey(),
  userId: int("user_id"),
  labSlug: varchar("lab_slug", { length: 255 }),
  commandText: text("command_text"),
  interpretedAction: varchar("interpreted_action", { length: 255 }),
  confidence: decimal("confidence", { precision: 3, scale: 2 }),
  language: varchar("language", { length: 10 }).default("en"),
  executed: boolean("executed").default(false),
  executedAt: timestamp("executed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

/* ───────── Chat Session Tables ───────── */

export const chatSessions = mysqlTable("chat_sessions", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
