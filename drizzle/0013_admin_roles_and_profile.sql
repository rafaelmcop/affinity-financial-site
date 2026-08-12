ALTER TABLE `adminAccounts` ADD COLUMN `phone` varchar(30);
ALTER TABLE `adminAccounts` ADD COLUMN `adminRole` enum('master','standard') NOT NULL DEFAULT 'standard';

UPDATE `adminAccounts`
SET `adminRole` = 'master';
