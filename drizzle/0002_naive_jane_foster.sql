ALTER TABLE `enquiries` ADD `status` text DEFAULT 'submitted' NOT NULL;--> statement-breakpoint
ALTER TABLE `enquiries` ADD `updated_at` integer;--> statement-breakpoint
ALTER TABLE `enquiries` ADD `revision` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `business_responses` ADD `status` text DEFAULT 'submitted' NOT NULL;--> statement-breakpoint
ALTER TABLE `business_responses` ADD `updated_at` integer;--> statement-breakpoint
ALTER TABLE `business_responses` ADD `revision` integer DEFAULT 0 NOT NULL;
