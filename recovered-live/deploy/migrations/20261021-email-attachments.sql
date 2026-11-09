-- Private sent-email attachment archives and read-only recovery jobs.
CREATE TABLE IF NOT EXISTS emailAttachmentArchives(id TEXT PRIMARY KEY,owner TEXT NOT NULL,externalId TEXT NOT NULL,clientId INTEGER,filename TEXT NOT NULL,mime TEXT NOT NULL,size INTEGER NOT NULL,digest TEXT NOT NULL,origin TEXT NOT NULL DEFAULT 'portal_send',position INTEGER NOT NULL DEFAULT 0,state TEXT NOT NULL DEFAULT 'pending',readingState TEXT NOT NULL DEFAULT 'pending',createdAt TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS emailAttachmentMessage ON emailAttachmentArchives(owner,externalId,state);
CREATE TABLE IF NOT EXISTS emailAttachmentChunks(attachmentId TEXT NOT NULL,chunkIndex INTEGER NOT NULL,data TEXT NOT NULL,PRIMARY KEY(attachmentId,chunkIndex));
CREATE TABLE IF NOT EXISTS emailDocumentJobs(owner TEXT NOT NULL,externalId TEXT NOT NULL,lockedUntil INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(owner,externalId));
CREATE TABLE IF NOT EXISTS emailAttachmentRecovery(owner TEXT NOT NULL,externalId TEXT NOT NULL,clientId INTEGER,state TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(owner,externalId));
