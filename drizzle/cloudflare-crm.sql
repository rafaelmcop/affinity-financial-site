ALTER TABLE adminAccounts ADD COLUMN contactEmail TEXT;
ALTER TABLE adminAccounts ADD COLUMN whatsapp TEXT;

CREATE TABLE crmClients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','meeting','proposal','client','closed')),
  source TEXT,
  assignedAdminEmail TEXT,
  nextFollowUpAt TEXT,
  notes TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE crmActivities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clientId INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT 'note' CHECK (type IN ('note','call','email','sms','whatsapp','status')),
  content TEXT NOT NULL,
  createdBy TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (clientId) REFERENCES crmClients(id) ON DELETE CASCADE
);

CREATE INDEX idx_crm_clients_status_followup ON crmClients(status, nextFollowUpAt);
CREATE INDEX idx_crm_clients_assignee ON crmClients(assignedAdminEmail);
CREATE INDEX idx_crm_activities_client ON crmActivities(clientId, createdAt DESC);
PRAGMA optimize;
