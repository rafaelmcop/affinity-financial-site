ALTER TABLE adminAccounts ADD COLUMN phone TEXT;
ALTER TABLE adminAccounts ADD COLUMN adminRole TEXT NOT NULL DEFAULT 'standard' CHECK (adminRole IN ('master', 'standard'));

UPDATE adminAccounts
SET adminRole = 'master';
