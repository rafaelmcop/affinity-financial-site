ALTER TABLE clientEmails ADD COLUMN visibility TEXT NOT NULL DEFAULT 'client';

-- Messages sent by a collective automation remain available to administrators,
-- but no longer appear as if they were an individual conversation with a client.
UPDATE clientEmails
SET visibility='central'
WHERE direction='sent'
  AND EXISTS (
    SELECT 1
    FROM automationDeliveries d
    JOIN scheduledMessages m ON m.id=d.messageId
    WHERE d.clientId=clientEmails.clientId
      AND lower(m.agentEmail)=lower(clientEmails.agentEmail)
      AND coalesce(m.audience,'all')<>'individual'
      AND abs((julianday(d.sentAt)-julianday(clientEmails.sentAt))*86400)<600
  );

CREATE INDEX IF NOT EXISTS idx_client_emails_audit
ON clientEmails(visibility,agentEmail,clientId,sentAt DESC);
