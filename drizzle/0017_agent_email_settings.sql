CREATE TABLE `agentEmailSettings` (
  `id` int AUTO_INCREMENT NOT NULL,
  `agentEmail` varchar(320) NOT NULL,
  `host` varchar(255) NOT NULL,
  `port` int NOT NULL DEFAULT 587,
  `secure` int NOT NULL DEFAULT 0,
  `user` varchar(320) NOT NULL,
  `password` text NOT NULL,
  `fromEmail` varchar(320) NOT NULL,
  `fromName` varchar(255) NOT NULL DEFAULT 'Affinity Financial',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `agentEmailSettings_id` PRIMARY KEY(`id`),
  CONSTRAINT `agentEmailSettings_agentEmail_unique` UNIQUE(`agentEmail`)
);
