ALTER TABLE clientEmails ADD COLUMN readAt TEXT;
CREATE INDEX IF NOT EXISTS idx_client_emails_unread ON clientEmails(agentEmail, direction, readAt, sentAt);
