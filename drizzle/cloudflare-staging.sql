CREATE TABLE IF NOT EXISTS testimonials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  quote TEXT NOT NULL,
  email TEXT,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  amountReceived REAL NOT NULL DEFAULT 0 CHECK (amountReceived >= 0),
  mediaUrl TEXT,
  mediaType TEXT NOT NULL DEFAULT 'image' CHECK (mediaType IN ('image', 'video')),
  thumbnailUrl TEXT,
  isActive INTEGER NOT NULL DEFAULT 0 CHECK (isActive IN (0, 1)),
  language TEXT NOT NULL DEFAULT 'pt' CHECK (language IN ('pt', 'en', 'es')),
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS testimonials_active_created_idx
  ON testimonials (isActive, createdAt DESC);

CREATE INDEX IF NOT EXISTS testimonials_email_created_idx
  ON testimonials (email, createdAt DESC);
