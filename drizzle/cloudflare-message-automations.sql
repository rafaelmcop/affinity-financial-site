ALTER TABLE scheduledMessages ADD COLUMN title TEXT;
ALTER TABLE scheduledMessages ADD COLUMN audience TEXT NOT NULL DEFAULT 'individual' CHECK (audience IN ('individual','group','all'));
ALTER TABLE scheduledMessages ADD COLUMN recipientGroup TEXT;
ALTER TABLE scheduledMessages ADD COLUMN subject TEXT;
ALTER TABLE scheduledMessages ADD COLUMN lastSentAt TEXT;
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_due ON scheduledMessages(isActive, occasion, scheduledAt);
CREATE INDEX IF NOT EXISTS idx_crm_clients_owner_birthday ON crmClients(assignedAdminEmail, birthDate);
CREATE TABLE IF NOT EXISTS automationDeliveries (id INTEGER PRIMARY KEY AUTOINCREMENT,messageId INTEGER NOT NULL,clientId INTEGER NOT NULL,sentKey TEXT NOT NULL,sentAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(messageId,clientId,sentKey));
PRAGMA optimize;
