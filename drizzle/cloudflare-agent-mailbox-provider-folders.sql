ALTER TABLE agentMailboxFolders ADD COLUMN providerName TEXT;
ALTER TABLE agentMailboxFolders ADD COLUMN isProvider INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_agent_mailbox_provider_folder
  ON agentMailboxFolders(agentEmail, providerName);
