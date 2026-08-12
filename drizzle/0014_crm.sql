ALTER TABLE `adminAccounts` ADD COLUMN `contactEmail` varchar(320);
ALTER TABLE `adminAccounts` ADD COLUMN `whatsapp` varchar(30);

CREATE TABLE `crmClients` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `email` varchar(320), `phone` varchar(30), `whatsapp` varchar(30),
  `status` enum('new','contacted','meeting','proposal','client','closed') NOT NULL DEFAULT 'new',
  `source` varchar(100), `assignedAdminEmail` varchar(320), `nextFollowUpAt` timestamp NULL,
  `notes` text, `createdAt` timestamp NOT NULL DEFAULT now(), `updatedAt` timestamp NOT NULL DEFAULT now() ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE `crmActivities` (
  `id` int AUTO_INCREMENT PRIMARY KEY, `clientId` int NOT NULL,
  `type` enum('note','call','email','sms','whatsapp','status') NOT NULL DEFAULT 'note',
  `content` text NOT NULL, `createdBy` varchar(320) NOT NULL, `createdAt` timestamp NOT NULL DEFAULT now()
);
