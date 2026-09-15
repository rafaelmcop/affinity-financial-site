ALTER TABLE agentMailboxEmails ADD COLUMN topic TEXT DEFAULT 'general';

CREATE INDEX IF NOT EXISTS idx_agent_mailbox_topic
  ON agentMailboxEmails(agentEmail, topic, sentAt DESC);

UPDATE agentMailboxEmails
SET topic = CASE
  WHEN paymentStatus = 'attention' THEN 'returned_payment'
  WHEN lower(subject || ' ' || body) LIKE '%medical exam%'
    OR lower(subject || ' ' || body) LIKE '%paramed%'
    OR lower(subject || ' ' || body) LIKE '%laborator%'
    OR lower(subject || ' ' || body) LIKE '%exame%' THEN 'exams'
  WHEN lower(subject || ' ' || body) LIKE '%additional information%'
    OR lower(subject || ' ' || body) LIKE '%information required%'
    OR lower(subject || ' ' || body) LIKE '%outstanding requirement%'
    OR lower(subject || ' ' || body) LIKE '%informação adicional%'
    OR lower(subject || ' ' || body) LIKE '%informacao adicional%' THEN 'extra_information'
  WHEN lower(subject || ' ' || body) LIKE '%document%'
    OR lower(subject || ' ' || body) LIKE '%signature%'
    OR lower(subject || ' ' || body) LIKE '%assinatura%' THEN 'documents'
  WHEN lower(subject || ' ' || body) LIKE '%underwriting%'
    OR lower(subject || ' ' || body) LIKE '%policy status%'
    OR lower(subject || ' ' || body) LIKE '%status da apólice%' THEN 'underwriting'
  ELSE 'general'
END;
