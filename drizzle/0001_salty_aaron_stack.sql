CREATE TABLE `campaign_leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`leadId` int NOT NULL,
	`currentStep` int DEFAULT 1,
	`status` enum('queued','active','completed','unsubscribed','bounced') NOT NULL DEFAULT 'queued',
	`enrolledAt` timestamp NOT NULL DEFAULT (now()),
	`lastSentAt` timestamp,
	`completedAt` timestamp,
	CONSTRAINT `campaign_leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(256) NOT NULL,
	`track` enum('existing_customers','new_local','new_national') NOT NULL,
	`status` enum('draft','active','paused','completed') NOT NULL DEFAULT 'draft',
	`description` text,
	`sendingDomain` varchar(256),
	`fromName` varchar(128),
	`fromEmail` varchar(320),
	`totalLeads` int DEFAULT 0,
	`sentCount` int DEFAULT 0,
	`openCount` int DEFAULT 0,
	`clickCount` int DEFAULT 0,
	`replyCount` int DEFAULT 0,
	`scheduledAt` timestamp,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `engagement_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`campaignId` int,
	`stepId` int,
	`eventType` enum('sent','opened','clicked','replied','bounced','unsubscribed') NOT NULL,
	`metadata` json,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `engagement_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `integration_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` enum('salesforce','scotts_directories','linkedin','email_provider') NOT NULL,
	`configData` json,
	`isActive` boolean DEFAULT false,
	`lastSyncAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `integration_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`firstName` varchar(128) NOT NULL,
	`lastName` varchar(128) NOT NULL,
	`email` varchar(320),
	`phone` varchar(32),
	`jobTitle` varchar(256),
	`company` varchar(256),
	`companyType` enum('municipality','general_contractor','home_builder','civil','other') DEFAULT 'other',
	`city` varchar(128),
	`province` varchar(64) DEFAULT 'Alberta',
	`region` enum('edmonton','calgary','red_deer','other') DEFAULT 'other',
	`source` enum('scotts_directories','linkedin','manual','import') DEFAULT 'manual',
	`sourceUrl` text,
	`segment` enum('existing_customer','new_local','new_national'),
	`status` enum('new','verified','contacted','qualified','warm','hot','converted','archived') NOT NULL DEFAULT 'new',
	`verificationStatus` enum('pending','verified','bounced','invalid') DEFAULT 'pending',
	`tags` json,
	`notes` text,
	`linkedinUrl` text,
	`engagementScore` int DEFAULT 0,
	`lastContactedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rollout_milestones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phase` enum('poc','staged_beta','full_alberta_rollout') NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text,
	`status` enum('not_started','in_progress','completed') NOT NULL DEFAULT 'not_started',
	`targetDate` timestamp,
	`completedDate` timestamp,
	`leadsProcessed` int DEFAULT 0,
	`emailsSent` int DEFAULT 0,
	`openRate` int DEFAULT 0,
	`clickRate` int DEFAULT 0,
	`warmLeads` int DEFAULT 0,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rollout_milestones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `salesforce_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`taskType` enum('call','follow_up','meeting') NOT NULL DEFAULT 'call',
	`subject` varchar(512),
	`description` text,
	`priority` enum('low','medium','high','urgent') DEFAULT 'medium',
	`status` enum('pending','synced','failed','completed') NOT NULL DEFAULT 'pending',
	`salesforceId` varchar(64),
	`syncedAt` timestamp,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `salesforce_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sending_domains` (
	`id` int AUTO_INCREMENT NOT NULL,
	`domain` varchar(256) NOT NULL,
	`status` enum('pending','warming','active','paused','blacklisted') NOT NULL DEFAULT 'pending',
	`spfVerified` boolean DEFAULT false,
	`dkimVerified` boolean DEFAULT false,
	`dmarcVerified` boolean DEFAULT false,
	`warmupDay` int DEFAULT 0,
	`dailySendLimit` int DEFAULT 50,
	`totalSent` int DEFAULT 0,
	`bounceRate` int DEFAULT 0,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sending_domains_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sequence_steps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`stepOrder` int NOT NULL,
	`subject` varchar(512),
	`body` text,
	`delayDays` int DEFAULT 0,
	`stepType` enum('email','follow_up','final') DEFAULT 'email',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sequence_steps_id` PRIMARY KEY(`id`)
);
