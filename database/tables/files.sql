CREATE TABLE IF NOT EXISTS "files" (
  "id" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "file" TEXT NOT NULL,
  "size" INTEGER NOT NULL DEFAULT 0,
  "type" TEXT NOT NULL,
  "uploadedAt" DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
  "uploadedBy" TEXT NOT NULL DEFAULT "SYSTEM",
  "ttl" INTEGER,
  "isPrivate" INTEGER NOT NULL DEFAULT 0,
  "inAlbum" TEXT,
  "albumOrder" INTEGER,
  PRIMARY KEY("id")
);
