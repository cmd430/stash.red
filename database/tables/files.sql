CREATE TABLE IF NOT EXISTS "files" (
  "id" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "file" TEXT NOT NULL,
  "size" INTEGER NOT NULL DEFAULT 0,
  "type" TEXT NOT NULL,
  "uploadedBy" TEXT NOT NULL DEFAULT "SYSTEM",
  "uploadedAt" DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
  "uploadedUntil" DATETIME NOT NULL DEFAULT Infinity,
  "isPrivate" BOOLEAN NOT NULL DEFAULT FALSE,
  "inAlbum" TEXT,
  "albumOrder" INTEGER,
  PRIMARY KEY("id"),
  FOREIGN KEY("uploadedBy") REFERENCES "accounts"("username") ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY("inAlbum") REFERENCES "albums"("id") ON UPDATE CASCADE ON DELETE CASCADE
);
