CREATE TABLE `adminAccounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(255) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `adminAccounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `adminAccounts_email_unique` UNIQUE(`email`)
);
