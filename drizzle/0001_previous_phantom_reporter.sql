CREATE TABLE `affiliateReferrals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`affiliateId` int NOT NULL,
	`referralCode` varchar(50) NOT NULL,
	`visitorEmail` varchar(320),
	`visitorName` text,
	`visitorPhone` varchar(20),
	`status` enum('pending','converted','closed') NOT NULL DEFAULT 'pending',
	`commissionAmount` decimal(10,2) DEFAULT '0.00',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `affiliateReferrals_id` PRIMARY KEY(`id`),
	CONSTRAINT `affiliateReferrals_referralCode_unique` UNIQUE(`referralCode`)
);
--> statement-breakpoint
CREATE TABLE `affiliates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`name` text NOT NULL,
	`company` text,
	`phone` varchar(20),
	`commissionRate` decimal(5,2) NOT NULL DEFAULT '10.00',
	`affiliateCode` varchar(50) NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `affiliates_id` PRIMARY KEY(`id`),
	CONSTRAINT `affiliates_email_unique` UNIQUE(`email`),
	CONSTRAINT `affiliates_affiliateCode_unique` UNIQUE(`affiliateCode`)
);
