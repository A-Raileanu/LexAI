CREATE TABLE `context_files` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`file_id` text NOT NULL,
	`name` text NOT NULL,
	`text` text DEFAULT '' NOT NULL,
	`status` text NOT NULL,
	`error` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `context_files_project` ON `context_files` (`project_id`);