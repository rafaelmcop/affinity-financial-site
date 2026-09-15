ALTER TABLE agentMailboxEmails ADD COLUMN folderId INTEGER;
ALTER TABLE agentMailboxEmails ADD COLUMN deletedAt TEXT;

CREATE TABLE IF NOT EXISTS agentMailboxFolders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agentEmail TEXT NOT NULL,
  name TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(agentEmail, name)
);

CREATE INDEX IF NOT EXISTS idx_agent_mailbox_folder
  ON agentMailboxEmails(agentEmail, folderId, deletedAt, sentAt DESC);

CREATE INDEX IF NOT EXISTS idx_agent_mailbox_folders_owner
  ON agentMailboxFolders(agentEmail, name);
