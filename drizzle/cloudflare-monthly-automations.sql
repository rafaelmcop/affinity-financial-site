ALTER TABLE scheduledMessages ADD COLUMN monthNumber INTEGER;
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_month ON scheduledMessages(occasion, monthNumber, isActive);
