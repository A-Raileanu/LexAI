CREATE TABLE `ai_usage` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_id` text,
	`etapa` text NOT NULL,
	`model` text NOT NULL,
	`input` integer DEFAULT 0 NOT NULL,
	`cache_write` integer DEFAULT 0 NOT NULL,
	`cache_read` integer DEFAULT 0 NOT NULL,
	`output` integer DEFAULT 0 NOT NULL,
	`apeluri` integer DEFAULT 0 NOT NULL,
	`cost_usd` real DEFAULT 0 NOT NULL,
	`limit_5h_pct` real,
	`limit_5h_reset` integer,
	`limit_7d_pct` real,
	`limit_7d_reset` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ai_usage_created` ON `ai_usage` (`created_at`);--> statement-breakpoint
CREATE TABLE `analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`version_id` text NOT NULL,
	`job_id` text,
	`data_referinta` text NOT NULL,
	`status` text NOT NULL,
	`result` text,
	`created_at` integer NOT NULL,
	`finished_at` integer,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `analyses_document` ON `analyses` (`document_id`);--> statement-breakpoint
CREATE TABLE `auth_attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`failures` integer DEFAULT 0 NOT NULL,
	`locked_until` integer,
	`last_failure_at` integer
);
--> statement-breakpoint
CREATE TABLE `document_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`number` integer NOT NULL,
	`content` text NOT NULL,
	`origin` text NOT NULL,
	`note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `document_versions_number` ON `document_versions` (`document_id`,`number`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`kind` text NOT NULL,
	`source_file_id` text,
	`current_version_id` text,
	`draft_content` text,
	`draft_updated_at` integer,
	`meta` text NOT NULL,
	`data_referinta` text,
	`archived_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_file_id`) REFERENCES `files`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `documents_project` ON `documents` (`project_id`);--> statement-breakpoint
CREATE TABLE `drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`job_id` text,
	`tip` text NOT NULL,
	`parametri` text NOT NULL,
	`conformitate` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `files` (
	`id` text PRIMARY KEY NOT NULL,
	`sha256` text NOT NULL,
	`name` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`path` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `files_sha256` ON `files` (`sha256`);--> statement-breakpoint
CREATE TABLE `finding_actions` (
	`analysis_id` text NOT NULL,
	`finding_id` text NOT NULL,
	`action` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`analysis_id`) REFERENCES `analyses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `finding_actions_pk` ON `finding_actions` (`analysis_id`,`finding_id`);--> statement-breakpoint
CREATE TABLE `job_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_id` text NOT NULL,
	`seq` integer NOT NULL,
	`type` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `job_events_seq` ON `job_events` (`job_id`,`seq`);--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`project_id` text,
	`document_id` text,
	`input` text NOT NULL,
	`result` text,
	`error` text,
	`progress` text,
	`cancel_requested` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`started_at` integer,
	`finished_at` integer
);
--> statement-breakpoint
CREATE INDEX `jobs_status` ON `jobs` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `jobs_document` ON `jobs` (`document_id`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`client` text,
	`description` text,
	`archived_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`ip` text,
	`user_agent` text,
	`sudo_until` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_hash` ON `sessions` (`token_hash`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`pin_hash` text,
	`pin_updated_at` integer,
	`model` text DEFAULT 'claude-sonnet-5-5' NOT NULL,
	`worker_concurrency` integer DEFAULT 2 NOT NULL,
	`default_reference_date` text
);
--> statement-breakpoint
CREATE TABLE `source_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`value` text NOT NULL,
	`fetched_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `source_cache_expires` ON `source_cache` (`expires_at`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`priority` integer DEFAULT 100 NOT NULL,
	`config` text DEFAULT '{}' NOT NULL
);
