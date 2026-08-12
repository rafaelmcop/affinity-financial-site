CREATE TABLE adminAccounts_next (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  passwordHash TEXT NOT NULL,
  isActive INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  phone TEXT,
  adminRole TEXT NOT NULL DEFAULT 'standard' CHECK (adminRole IN ('master', 'standard')),
  contactEmail TEXT,
  whatsapp TEXT,
  accountType TEXT NOT NULL DEFAULT 'admin' CHECK (accountType IN ('admin', 'agent', 'both')),
  address TEXT
);

INSERT INTO adminAccounts_next (
  id, email, name, passwordHash, isActive, createdAt, updatedAt,
  phone, adminRole, contactEmail, whatsapp, accountType, address
)
SELECT
  id, email, name, passwordHash, isActive, createdAt, updatedAt,
  phone, adminRole, contactEmail, whatsapp, accountType, address
FROM adminAccounts;

DROP TABLE adminAccounts;
ALTER TABLE adminAccounts_next RENAME TO adminAccounts;
