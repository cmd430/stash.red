CREATE TABLE IF NOT EXISTS "albums" (
  "id" TEXT NOT NULL UNIQUE,
  "title" TEXT NOT NULL DEFAULT "Untitled Album",
  "uploadedBy" TEXT NOT NULL DEFAULT "SYSTEM",
  "uploadedAt" DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
  "uploadedUntil" DATETIME NOT NULL DEFAULT Infinity,
  "isPrivate" BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY("id"),
  FOREIGN KEY("uploadedBy") REFERENCES "accounts"("username") ON UPDATE CASCADE ON DELETE CASCADE
);
