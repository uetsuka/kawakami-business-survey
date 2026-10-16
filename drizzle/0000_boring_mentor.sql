CREATE TABLE `business_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`answers` text NOT NULL,
	`notes` text NOT NULL,
	`company` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`consent` integer NOT NULL
);
