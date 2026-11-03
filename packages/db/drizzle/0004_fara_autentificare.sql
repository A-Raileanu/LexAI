DROP TABLE `auth_attempts`;--> statement-breakpoint
DROP TABLE `sessions`;--> statement-breakpoint
ALTER TABLE `settings` DROP COLUMN `pin_hash`;--> statement-breakpoint
ALTER TABLE `settings` DROP COLUMN `pin_updated_at`;