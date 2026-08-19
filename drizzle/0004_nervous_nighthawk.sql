CREATE TABLE `consent_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`eventType` enum('granted','withdrawn','expired','bounced','imported') NOT NULL,
	`consentBasis_ce` enum('express','implied_business_relationship','implied_inquiry','implied_published','none'),
	`source` text,
	`evidence` text,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	`recordedBy` varchar(320),
	CONSTRAINT `consent_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `leads` ADD `consentBasis` enum('express','implied_business_relationship','implied_inquiry','implied_published','none') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `consentSource` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `consentObtainedAt` timestamp;--> statement-breakpoint
ALTER TABLE `leads` ADD `consentExpiresAt` timestamp;