ALTER TABLE scheduledMessages ADD COLUMN selectedClientIds TEXT;
ALTER TABLE agentPolicies ADD COLUMN targetPremium REAL NOT NULL DEFAULT 0;
ALTER TABLE agentPolicies ADD COLUMN points REAL NOT NULL DEFAULT 0;
UPDATE agentPolicies SET targetPremium=COALESCE(premiumAmount,0)*12,points=COALESCE(premiumAmount,0)*12 WHERE targetPremium=0 AND points=0;
CREATE INDEX IF NOT EXISTS idx_agent_policies_anniversary ON agentPolicies(agentEmail, issuedAt);
UPDATE scheduledMessages SET isActive=0 WHERE title IS NULL AND occasion IN ('birthday','christmas','new_year');
