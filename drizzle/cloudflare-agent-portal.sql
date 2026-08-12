ALTER TABLE adminAccounts ADD COLUMN accountType TEXT NOT NULL DEFAULT 'admin' CHECK (accountType IN ('admin','agent'));
CREATE INDEX IF NOT EXISTS idx_admin_accounts_type_active ON adminAccounts(accountType, isActive);
PRAGMA optimize;
