ALTER TABLE agentEmailSettings ADD COLUMN imapHost TEXT NOT NULL DEFAULT 'imap.mail.me.com';
ALTER TABLE agentEmailSettings ADD COLUMN imapPort INTEGER NOT NULL DEFAULT 993;
ALTER TABLE agentEmailSettings ADD COLUMN imapUser TEXT;
ALTER TABLE agentEmailSettings ADD COLUMN lastImapSyncAt TEXT;
CREATE TABLE IF NOT EXISTS clientEmails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agentEmail TEXT NOT NULL,
  clientId INTEGER NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('sent','received')),
  externalId TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  fromEmail TEXT NOT NULL,
  toEmail TEXT NOT NULL,
  sentAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_emails_external ON clientEmails(agentEmail,externalId) WHERE externalId IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_emails_conversation ON clientEmails(agentEmail,clientId,sentAt DESC);
