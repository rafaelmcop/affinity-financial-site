CREATE TABLE IF NOT EXISTS clientDeletionRequests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clientId INTEGER NOT NULL,
  agentEmail TEXT NOT NULL,
  clientName TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  requestedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewedAt TEXT,
  reviewedBy TEXT,
  adminNote TEXT
);
CREATE INDEX IF NOT EXISTS idx_client_deletion_agent ON clientDeletionRequests(agentEmail, status);
CREATE INDEX IF NOT EXISTS idx_client_deletion_status ON clientDeletionRequests(status, requestedAt);
