ALTER TABLE adminAccounts ADD COLUMN status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected','blocked'));

CREATE INDEX IF NOT EXISTS idx_admin_accounts_status ON adminAccounts(status);

PRAGMA optimize;
