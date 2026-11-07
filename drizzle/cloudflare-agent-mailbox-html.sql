ALTER TABLE agentMailboxEmails ADD COLUMN htmlBody TEXT;

UPDATE agentEmailSettings SET lastImapSyncAt=NULL;
