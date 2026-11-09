CREATE TABLE IF NOT EXISTS portalReleaseMigrations(version TEXT PRIMARY KEY,appliedAt TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS agentBusinessProfiles(owner TEXT PRIMARY KEY,company TEXT,title TEXT,website TEXT,updatedAt TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS agentExternalUplines(agentEmail TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL,phone TEXT,reviewState TEXT NOT NULL DEFAULT 'pending',reviewedBy TEXT,reviewedAt TEXT);
CREATE TABLE IF NOT EXISTS testimonialAttribution(testimonialId INTEGER PRIMARY KEY,showAgent INTEGER NOT NULL DEFAULT 0,updatedBy TEXT,updatedAt TEXT DEFAULT CURRENT_TIMESTAMP);
UPDATE testimonials SET agentEmail=(SELECT lower(email) FROM adminAccounts WHERE lower(trim(name))='rafael cunha' AND accountType IN ('both','admin') ORDER BY id LIMIT 1) WHERE NOT EXISTS(SELECT 1 FROM portalReleaseMigrations WHERE version='review-origin-baseline-20261105') AND EXISTS(SELECT 1 FROM adminAccounts WHERE lower(trim(name))='rafael cunha' AND accountType IN ('both','admin'));
INSERT OR IGNORE INTO portalReleaseMigrations(version) VALUES('review-origin-baseline-20261105');
