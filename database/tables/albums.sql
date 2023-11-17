CREATE TABLE IF NOT EXISTS "albums" (
  "id" TEXT NOT NULL UNIQUE,
  "title" TEXT NOT NULL DEFAULT "Untitled Album",
  "uploadedAt" DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
  "uploadedBy" TEXT NOT NULL DEFAULT "SYSTEM",
  "ttl" INTEGER,
  "isPrivate" INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY("id"),
  FOREIGN KEY("uploadedBy") REFERENCES "accounts"("username") ON UPDATE CASCADE ON DELETE CASCADE
);
