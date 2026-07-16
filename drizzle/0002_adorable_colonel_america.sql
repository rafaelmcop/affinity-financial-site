CREATE TABLE `policies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`affiliateId` int NOT NULL,
	`policyNumber` varchar(100) NOT NULL,
	`clientName` text NOT NULL,
	`clientEmail` varchar(320),
	`clientPhone` varchar(20),
	`policyType` varchar(100) NOT NULL,
	`status` enum('pending','approved','rejected','active','cancelled') NOT NULL DEFAULT 'pending',
	`points` int NOT NULL DEFAULT 0,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `policies_id` PRIMARY KEY(`id`),
	CONSTRAINT `policies_policyNumber_unique` UNIQUE(`policyNumber`)
);
--> statement-breakpoint
ALTER TABLE `affiliates` ADD `status` enum('pending','approved','rejected') DEFAULT 'pending' NOT NULL;