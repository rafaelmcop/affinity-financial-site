ALTER TABLE crmClients ADD COLUMN birthDate TEXT;
CREATE TABLE agentPolicies (id INTEGER PRIMARY KEY AUTOINCREMENT,agentEmail TEXT NOT NULL,clientId INTEGER,clientName TEXT NOT NULL,clientEmail TEXT,clientPhone TEXT,birthDate TEXT,policyNumber TEXT NOT NULL,product TEXT,premiumAmount NUMERIC DEFAULT 0,premiumFrequency TEXT,coverageAmount NUMERIC DEFAULT 0,beneficiaries TEXT,issuedAt TEXT,createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE agentTasks (id INTEGER PRIMARY KEY AUTOINCREMENT,agentEmail TEXT NOT NULL,clientId INTEGER,title TEXT NOT NULL,dueAt TEXT,status TEXT NOT NULL DEFAULT 'pending',createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE scheduledMessages (id INTEGER PRIMARY KEY AUTOINCREMENT,agentEmail TEXT NOT NULL,clientId INTEGER,occasion TEXT NOT NULL DEFAULT 'custom',channel TEXT NOT NULL,message TEXT NOT NULL,scheduledAt TEXT,isActive INTEGER NOT NULL DEFAULT 1,createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX idx_agent_policies_owner ON agentPolicies(agentEmail, createdAt);
CREATE INDEX idx_agent_tasks_owner_due ON agentTasks(agentEmail, status, dueAt);
CREATE INDEX idx_scheduled_messages_owner ON scheduledMessages(agentEmail, isActive, scheduledAt);
PRAGMA optimize;
