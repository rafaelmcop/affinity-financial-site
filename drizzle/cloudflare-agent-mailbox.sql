CREATE TABLE IF NOT EXISTS agentMailboxEmails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agentEmail TEXT NOT NULL,
  clientId INTEGER,
  externalId TEXT NOT NULL,
  imapUid TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('received','sent')),
  fromEmail TEXT NOT NULL,
  toEmail TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sentAt TEXT NOT NULL,
  readAt TEXT,
  paymentStatus TEXT,
  actionStatus TEXT,
  actionDetail TEXT,
  policyNumber TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(agentEmail, externalId, direction)
);
CREATE INDEX IF NOT EXISTS idx_agent_mailbox_owner_date ON agentMailboxEmails(agentEmail, sentAt DESC);
CREATE INDEX IF NOT EXISTS idx_agent_mailbox_owner_unread ON agentMailboxEmails(agentEmail, direction, readAt);
CREATE INDEX IF NOT EXISTS idx_agent_mailbox_payment ON agentMailboxEmails(agentEmail, paymentStatus, actionStatus);
PRAGMA optimize;
