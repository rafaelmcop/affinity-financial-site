ALTER TABLE adminAccounts ADD COLUMN presenceStatus TEXT NOT NULL DEFAULT 'available';
ALTER TABLE adminAccounts ADD COLUMN lastSeenAt TEXT;

CREATE TABLE IF NOT EXISTS portalAuditLogs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actorEmail TEXT NOT NULL,
  action TEXT NOT NULL,
  entityType TEXT,
  targetId TEXT,
  details TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_portal_audit_actor_created
ON portalAuditLogs(actorEmail, createdAt DESC);

CREATE INDEX IF NOT EXISTS idx_admin_presence
ON adminAccounts(lastSeenAt, presenceStatus);

PRAGMA optimize;
