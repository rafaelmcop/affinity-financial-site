ALTER TABLE clientEmails ADD COLUMN deletedAt TEXT;
ALTER TABLE clientEmails ADD COLUMN deletedBy TEXT;

CREATE TABLE IF NOT EXISTS portalMessages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  senderEmail TEXT NOT NULL,
  recipientEmail TEXT NOT NULL,
  body TEXT NOT NULL,
  sentAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  readAt TEXT,
  deletedAt TEXT,
  deletedBy TEXT
);

CREATE INDEX IF NOT EXISTS idx_portal_messages_participants
ON portalMessages(senderEmail,recipientEmail,sentAt DESC);

CREATE INDEX IF NOT EXISTS idx_portal_messages_unread
ON portalMessages(recipientEmail,readAt,deletedAt);
