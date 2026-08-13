CREATE TABLE `activity_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`action` varchar(128) NOT NULL,
	`description` text NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `unsubscribes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`leadId` int,
	`reason` text,
	`unsubscribedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `unsubscribes_id` PRIMARY KEY(`id`),
	CONSTRAINT `unsubscribes_email_unique` UNIQUE(`email`)
);
