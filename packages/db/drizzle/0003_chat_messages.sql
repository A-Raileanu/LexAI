CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`scope` text,
	`proposals` text,
	`job_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `chat_messages_document` ON `chat_messages` (`document_id`,`created_at`);