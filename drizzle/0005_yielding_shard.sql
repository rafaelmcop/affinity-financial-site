CREATE TABLE `testimonials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`role` varchar(255) NOT NULL,
	`quote` text NOT NULL,
	`mediaUrl` varchar(500),
	`mediaType` enum('image','video') DEFAULT 'image',
	`isActive` int NOT NULL DEFAULT 1,
	`language` enum('pt','en','es') NOT NULL DEFAULT 'pt',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `testimonials_id` PRIMARY KEY(`id`)
);
