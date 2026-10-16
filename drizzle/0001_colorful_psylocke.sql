CREATE TABLE `enquiries` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`company` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`country` text NOT NULL,
	`business` text NOT NULL,
	`products` text NOT NULL,
	`use` text NOT NULL,
	`volume` text NOT NULL,
	`timeline` text NOT NULL,
	`details` text NOT NULL,
	`consent` integer NOT NULL,
	`test` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sheet_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`version` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`synced_at` integer,
	`last_error` text
);
--> statement-breakpoint
ALTER TABLE `business_responses` ADD `test` integer DEFAULT 0 NOT NULL;
