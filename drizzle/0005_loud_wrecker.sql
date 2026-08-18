CREATE TABLE `sender_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`senderName` varchar(256) NOT NULL,
	`senderEmail` varchar(320) NOT NULL,
	`senderTitle` varchar(256),
	`tone` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sender_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `activity_log` ADD `senderProfileId` int;--> statement-breakpoint
ALTER TABLE `engagement_events` ADD `senderProfileId` int;