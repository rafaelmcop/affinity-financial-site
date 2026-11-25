ALTER TABLE testimonials ADD COLUMN city TEXT;
ALTER TABLE testimonials ADD COLUMN state TEXT;
ALTER TABLE testimonials ADD COLUMN agentEmail TEXT;
ALTER TABLE testimonials ADD COLUMN agentDecision TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE testimonials ADD COLUMN agentReviewedAt TEXT;
ALTER TABLE testimonials ADD COLUMN adminDecision TEXT NOT NULL DEFAULT 'pending';
UPDATE testimonials SET adminDecision = CASE WHEN isActive = 1 THEN 'approved' ELSE 'pending' END WHERE source = 'client';
CREATE INDEX IF NOT EXISTS idx_testimonials_agent_decision ON testimonials(agentEmail, agentDecision);
PRAGMA optimize;
